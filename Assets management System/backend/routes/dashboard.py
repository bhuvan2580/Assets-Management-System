from flask import Blueprint, jsonify

from extensions import db
from models.asset import Asset
from models.employee import Employee
from models.asset_request import AssetRequest
from models.maintenance import AssetMaintenance
from models.it_support import ITRequest, SupportTicket
from models.vendor import Vendor
from models.asset_audit import AssetAuditSession


from routes.auth import roles_required


dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/dashboard"
)


@dashboard_bp.route("/stats", methods=["GET"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def get_dashboard_stats():

    # ============================================================
    # ASSET COUNTS
    # ============================================================

    total_assets = Asset.query.count()

    available_assets = Asset.query.filter(
        Asset.status == "AVAILABLE"
    ).count()

    assigned_assets = Asset.query.filter(
        Asset.status == "ASSIGNED"
    ).count()

    repair_assets = Asset.query.filter(
        Asset.status == "UNDER_REPAIR"
    ).count()

    lost_assets = Asset.query.filter(
        Asset.status == "LOST"
    ).count()

    retired_assets = Asset.query.filter(
        Asset.status == "RETIRED"
    ).count()

    # ============================================================
    # EMPLOYEE COUNT
    # ============================================================

    total_employees = Employee.query.count()

    # ============================================================
    # PENDING ASSET REQUESTS
    # ============================================================

    pending_requests = AssetRequest.query.filter(
        AssetRequest.status == "PENDING"
    ).count()
    
    # ============================================================
    # PENDING REPAIR AMOUNT
    # ============================================================

    ACTIVE_REPAIR_STATUSES = [
        "REPORTED",
        "UNDER_INSPECTION",
        "AWAITING_PARTS",
        "UNDER_REPAIR"
    ]

    pending_repair_records = AssetMaintenance.query.filter(
        AssetMaintenance.status.in_(ACTIVE_REPAIR_STATUSES)
    ).all()

    pending_repair_cost = round(
        sum(float(record.repair_cost or 0)
            for record in pending_repair_records),
        2
    )

    # ============================================================
    # PENDING IT SUPPORT REQUESTS
    # ============================================================

    pending_it_support_request = ITRequest.query.filter(
        ITRequest.status.in_([
            "SUBMITTED",
            "UNDER_REVIEW",
            "INFORMATION_REQUIRED",
            "APPROVED"
        ])
    ).count()

    # ============================================================
    # TOTAL VENDORS
    # ============================================================

    total_vendors = Vendor.query.count()

    # ============================================================
    # IN-PROGRESS AUDITS
    # ============================================================

    in_progress_audits = AssetAuditSession.query.filter(
        AssetAuditSession.status == "IN_PROGRESS"
    ).count()

    # ============================================================
    # RESPONSE
    # ============================================================

    return jsonify({
        "total_assets": total_assets,
        "available_assets": available_assets,
        "assigned_assets": assigned_assets,
        "repair_assets": repair_assets,
        "lost_assets": lost_assets,
        "retired_assets": retired_assets,
        "total_employees": total_employees,
        "pending_requests": pending_requests,
        "pending_repair_cost": pending_repair_cost,
        "pending_it_support_request": pending_it_support_request,
        "total_vendors": total_vendors,
        "in_progress_audits": in_progress_audits
    }), 200