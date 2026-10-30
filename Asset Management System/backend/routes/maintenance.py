from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from extensions import db
from models.asset import Asset
from models.vendor import Vendor
from models.maintenance import AssetMaintenance
from routes.auth import roles_required

maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/api/maintenance")

VALID_STATUSES = {"REPORTED", "UNDER_INSPECTION", "AWAITING_PARTS", "UNDER_REPAIR", "COMPLETED", "UNREPAIRABLE"}
ACTIVE_STATUSES = {"REPORTED", "UNDER_INSPECTION", "AWAITING_PARTS", "UNDER_REPAIR"}


def parse_date(value, field, required=False):
    if not value:
        if required:
            raise ValueError(f"{field} is required")
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a valid date (YYYY-MM-DD)")


@maintenance_bp.get("")
@roles_required("SUPERUSER", "ADMIN", "IT")
def list_maintenance():
    query = AssetMaintenance.query
    status = (request.args.get("status") or "").strip().upper()
    search = (request.args.get("search") or "").strip()
    if status and status != "ALL":
        query = query.filter(AssetMaintenance.status == status)
    if search:
        term = f"%{search}%"
        query = query.filter(db.or_(
            AssetMaintenance.asset_tag.ilike(term),
            AssetMaintenance.issue_title.ilike(term),
            AssetMaintenance.description.ilike(term),
            AssetMaintenance.assigned_to.ilike(term),
            AssetMaintenance.vendor_name.ilike(term),
        ))
    records = query.order_by(AssetMaintenance.created_at.desc(), AssetMaintenance.id.desc()).all()
    return jsonify({"items": [r.to_dict() for r in records], "total": len(records)})


@maintenance_bp.get("/summary")
@roles_required("SUPERUSER", "ADMIN", "IT")
def maintenance_summary():
    records = AssetMaintenance.query.all()
    active = [r for r in records if r.status in ACTIVE_STATUSES]
    month_start = date.today().replace(day=1)
    completed_this_month = [r for r in records if r.status == "COMPLETED" and r.completed_date and r.completed_date >= month_start]
    return jsonify({
        "open_records": len(active),
        "under_repair": sum(r.status == "UNDER_REPAIR" for r in active),
        "awaiting_parts": sum(r.status == "AWAITING_PARTS" for r in active),
        "completed_this_month": len(completed_this_month),
        "total_repair_cost": round(sum(float(r.repair_cost or 0) for r in records), 2),
    })


@maintenance_bp.post("")
@roles_required("SUPERUSER", "ADMIN", "IT")
def create_maintenance():
    data = request.get_json(silent=True) or {}
    issue_title = (data.get("issue_title") or "").strip()
    if not issue_title:
        return jsonify({"message": "Issue title is required"}), 400
    try:
        reported_date = parse_date(data.get("reported_date"), "Reported date", required=True)
        repair_cost = Decimal(str(data.get("repair_cost") or "0"))
        if repair_cost < 0:
            raise ValueError("Repair cost cannot be negative")
    except (ValueError, InvalidOperation) as exc:
        return jsonify({"message": str(exc)}), 400

    asset = db.session.get(Asset, data.get("asset_id")) if data.get("asset_id") else None
    if not asset:
        return jsonify({"message": "Please select a valid asset"}), 400
    if asset.status in {"RETIRED", "LOST", "UNREPAIRABLE"}:
        return jsonify({"message": f"Cannot create maintenance for an asset with status {asset.status}"}), 409
    active = AssetMaintenance.query.filter(
        AssetMaintenance.asset_id == asset.id,
        AssetMaintenance.status.in_(ACTIVE_STATUSES)
    ).first()
    if active:
        return jsonify({"message": f"Asset {asset.asset_tag} already has an open maintenance record"}), 409

    vendor = db.session.get(Vendor, data.get("vendor_id")) if data.get("vendor_id") else None
    if data.get("vendor_id") and not vendor:
        return jsonify({"message": "Selected vendor was not found"}), 400

    record = AssetMaintenance(
        asset_id=asset.id,
        asset_tag=asset.asset_tag,
        asset_type=asset.asset_type,
        asset_brand_model=" ".join(filter(None, [asset.brand, asset.model])),
        previous_asset_status=asset.status,
        reported_by=(data.get("reported_by") or "").strip() or None,
        issue_title=issue_title,
        description=(data.get("description") or "").strip() or None,
        reported_date=reported_date,
        status="REPORTED",
        assigned_to=(data.get("assigned_to") or "").strip() or None,
        vendor_id=vendor.id if vendor else None,
        vendor_name=vendor.vendor_name if vendor else (data.get("vendor_name") or "").strip() or None,
        repair_cost=repair_cost,
        warranty_claim=bool(data.get("warranty_claim", False)),
        remarks=(data.get("remarks") or "").strip() or None,
    )
    # Keep assignment history intact. Asset is unavailable while repair is active.
    asset.status = "UNDER_REPAIR"
    db.session.add(record)
    db.session.commit()
    return jsonify({"message": "Maintenance record created", "item": record.to_dict()}), 201


@maintenance_bp.patch("/<int:record_id>")
@roles_required("SUPERUSER", "ADMIN", "IT")
def update_maintenance(record_id):
    record = db.session.get(AssetMaintenance, record_id)
    if not record:
        return jsonify({"message": "Maintenance record not found"}), 404
    data = request.get_json(silent=True) or {}
    if record.status in {"COMPLETED", "UNREPAIRABLE"}:
        return jsonify({"message": "Closed maintenance records cannot be edited"}), 409

    if "status" in data:
        new_status = str(data["status"]).strip().upper()
        if new_status not in VALID_STATUSES:
            return jsonify({"message": "Invalid maintenance status"}), 400
        record.status = new_status
    if "issue_title" in data:
        title = str(data["issue_title"] or "").strip()
        if not title:
            return jsonify({"message": "Issue title cannot be empty"}), 400
        record.issue_title = title
    for key in ("description", "assigned_to", "resolution", "remarks"):
        if key in data:
            setattr(record, key, (str(data[key]).strip() or None) if data[key] is not None else None)
    if "warranty_claim" in data:
        record.warranty_claim = bool(data["warranty_claim"])
    if "repair_cost" in data:
        try:
            cost = Decimal(str(data["repair_cost"] or "0"))
            if cost < 0:
                raise ValueError()
            record.repair_cost = cost
        except (InvalidOperation, ValueError):
            return jsonify({"message": "Repair cost must be a non-negative number"}), 400
    if "vendor_id" in data:
        vendor = db.session.get(Vendor, data["vendor_id"]) if data["vendor_id"] else None
        if data["vendor_id"] and not vendor:
            return jsonify({"message": "Selected vendor was not found"}), 400
        record.vendor_id = vendor.id if vendor else None
        record.vendor_name = vendor.vendor_name if vendor else (data.get("vendor_name") or None)
    if "completed_date" in data:
        try:
            record.completed_date = parse_date(data["completed_date"], "Completed date")
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400

    asset = db.session.get(Asset, record.asset_id) if record.asset_id else None
    if record.status == "COMPLETED":
        if not record.completed_date:
            record.completed_date = date.today()
        if asset and asset.status == "UNDER_REPAIR":
            # Restore ASSIGNED only if an active assignment exists; otherwise AVAILABLE.
            from models.assignment import AssetAssignment
            active_assignment = AssetAssignment.query.filter(
                AssetAssignment.asset_id == asset.id,
                AssetAssignment.actual_return_date.is_(None)
            ).first()
            asset.status = "ASSIGNED" if active_assignment else "AVAILABLE"
    elif record.status == "UNREPAIRABLE":
        if not record.resolution:
            record.resolution = "Asset marked unrepairable"
        if asset:
            asset.status = "UNREPAIRABLE"
        if not record.completed_date:
            record.completed_date = date.today()
    elif asset and record.status in ACTIVE_STATUSES:
        asset.status = "UNDER_REPAIR"
        record.completed_date = None

    db.session.commit()
    return jsonify({"message": "Maintenance record updated", "item": record.to_dict()}), 200
