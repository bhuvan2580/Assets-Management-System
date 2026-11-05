from datetime import date, datetime

from flask import Blueprint, jsonify, request

from extensions import db
from models.vendor import Vendor
from routes.auth import roles_required


vendors_bp = Blueprint(
    "vendors",
    __name__,
    url_prefix="/api/vendors"
)


def parse_yes_no(value):
    """Convert Yes/No values into booleans."""

    if isinstance(value, bool):
        return value

    if value is None or str(value).strip() == "":
        return False

    normalized = str(value).strip().lower()

    if normalized in {"yes", "true", "1"}:
        return True

    if normalized in {"no", "false", "0"}:
        return False

    raise ValueError("Value must be Yes or No")


def parse_vendor_date(value):
    """Convert the renewal date into a Python date."""

    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    try:
        return datetime.strptime(
            str(value),
            "%Y-%m-%d"
        ).date()

    except ValueError:
        raise ValueError(
            "Renewal date must be in YYYY-MM-DD format"
        )


def vendor_to_dict(vendor):
    """Serialize vendor details for the frontend."""

    return {
        "id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "contact_person": vendor.contact_person,
        "email": vendor.email,
        "phone": vendor.phone,
        "address": vendor.address,
        "nda": bool(vendor.nda),
        "service_agreement": bool(vendor.service_agreement),
        "renewal_date": (
            vendor.renewal_date.isoformat()
            if vendor.renewal_date else None
        ),
        "remarks": vendor.remarks,
        "support": vendor.support
    }


# ============================================================
# GET ALL VENDORS
# ============================================================

@vendors_bp.route("", methods=["GET"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def get_vendors():

    vendors = Vendor.query.order_by(
        Vendor.vendor_name.asc()
    ).all()

    return jsonify([
        vendor_to_dict(vendor)
        for vendor in vendors
    ])


# ============================================================
# CREATE VENDOR
# ============================================================

@vendors_bp.route("", methods=["POST"])
@roles_required("SUPERUSER", "ADMIN")
def create_vendor():

    data = request.get_json() or {}

    vendor_name = data.get(
        "vendor_name",
        ""
    ).strip()

    if not vendor_name:
        return jsonify({
            "message": "Vendor name is required"
        }), 400

    try:
        vendor = Vendor(
            vendor_name=vendor_name,
            contact_person=data.get("contact_person"),
            email=data.get("email"),
            phone=data.get("phone"),
            address=data.get("address"),

            nda=parse_yes_no(data.get("nda")),

            service_agreement=parse_yes_no(
                data.get("service_agreement")
            ),

            renewal_date=parse_vendor_date(
                data.get("renewal_date")
            ),

            remarks=data.get("remarks"),
            support=data.get("support")
        )

    except ValueError as error:
        return jsonify({
            "message": str(error)
        }), 400

    db.session.add(vendor)
    db.session.commit()

    return jsonify({
        "message": "Vendor created successfully",
        "vendor": vendor_to_dict(vendor)
    }), 201


# ============================================================
# UPDATE VENDOR
# ============================================================

@vendors_bp.route(
    "/<int:vendor_id>",
    methods=["PUT"]
)
@roles_required("SUPERUSER", "ADMIN")
def update_vendor(vendor_id):

    vendor = db.session.get(
        Vendor,
        vendor_id
    )

    if not vendor:
        return jsonify({
            "message": "Vendor not found"
        }), 404

    data = request.get_json() or {}

    if "vendor_name" in data:

        vendor_name = data["vendor_name"].strip()

        if not vendor_name:
            return jsonify({
                "message": "Vendor name is required"
            }), 400

        vendor.vendor_name = vendor_name

    if "contact_person" in data:
        vendor.contact_person = data["contact_person"]

    if "email" in data:
        vendor.email = data["email"]

    if "phone" in data:
        vendor.phone = data["phone"]

    if "address" in data:
        vendor.address = data["address"]

    try:
        if "nda" in data:
            vendor.nda = parse_yes_no(data["nda"])

        if "service_agreement" in data:
            vendor.service_agreement = parse_yes_no(
                data["service_agreement"]
            )

        if "renewal_date" in data:
            vendor.renewal_date = parse_vendor_date(
                data["renewal_date"]
            )

    except ValueError as error:
        return jsonify({
            "message": str(error)
        }), 400

    if "remarks" in data:
        vendor.remarks = data["remarks"]

    if "support" in data:
        vendor.support = data["support"]

    db.session.commit()

    return jsonify({
        "message": "Vendor updated successfully",
        "vendor": vendor_to_dict(vendor)
    })


# ============================================================
# DELETE VENDOR
# ============================================================

@vendors_bp.route(
    "/<int:vendor_id>",
    methods=["DELETE"]
)
@roles_required("SUPERUSER", "ADMIN")
def delete_vendor(vendor_id):

    vendor = db.session.get(
        Vendor,
        vendor_id
    )

    if not vendor:
        return jsonify({
            "message": "Vendor not found"
        }), 404

    # Prevent deletion if assets are associated
    if vendor.assets:

        return jsonify({
            "message": (
                "Cannot delete this vendor because "
                "assets are associated with it."
            )
        }), 409

    db.session.delete(vendor)
    db.session.commit()

    return jsonify({
        "message": "Vendor deleted successfully"
    })