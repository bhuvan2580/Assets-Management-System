from flask import Blueprint, jsonify, request

from extensions import db
from models.vendor import Vendor

from routes.auth import roles_required


vendors_bp = Blueprint(
    "vendors",
    __name__,
    url_prefix="/api/vendors"
)


# ============================================================
# GET ALL VENDORS
# SUPERUSER / ADMIN / IT
# ============================================================

@vendors_bp.route("", methods=["GET"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
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
# SUPERUSER / ADMIN
# ============================================================

@vendors_bp.route("", methods=["POST"])
@roles_required(
    "SUPERUSER",
    "ADMIN"
)
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

    vendor = Vendor(
        vendor_name=vendor_name,
        contact_person=data.get("contact_person"),
        email=data.get("email"),
        phone=data.get("phone"),
        address=data.get("address")
    )

    db.session.add(vendor)
    db.session.commit()

    return jsonify({
        "message": "Vendor created successfully",
        "vendor": vendor_to_dict(vendor)
    }), 201


# ============================================================
# UPDATE VENDOR
# SUPERUSER / ADMIN
# ============================================================

@vendors_bp.route(
    "/<int:vendor_id>",
    methods=["PUT"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN"
)
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

        vendor_name = data[
            "vendor_name"
        ].strip()

        if not vendor_name:
            return jsonify({
                "message": "Vendor name is required"
            }), 400

        vendor.vendor_name = vendor_name

    if "contact_person" in data:
        vendor.contact_person = data[
            "contact_person"
        ]

    if "email" in data:
        vendor.email = data[
            "email"
        ]

    if "phone" in data:
        vendor.phone = data[
            "phone"
        ]

    if "address" in data:
        vendor.address = data[
            "address"
        ]

    db.session.commit()

    return jsonify({
        "message": "Vendor updated successfully",
        "vendor": vendor_to_dict(vendor)
    })


# ============================================================
# DELETE VENDOR
# SUPERUSER / ADMIN
# ============================================================

@vendors_bp.route(
    "/<int:vendor_id>",
    methods=["DELETE"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN"
)
def delete_vendor(vendor_id):

    vendor = db.session.get(
        Vendor,
        vendor_id
    )

    if not vendor:
        return jsonify({
            "message": "Vendor not found"
        }), 404

    # Do not delete a vendor that is currently
    # referenced by assets.
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


# ============================================================
# SERIALIZER
# ============================================================

def vendor_to_dict(vendor):

    return {
        "id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "contact_person": vendor.contact_person,
        "email": vendor.email,
        "phone": vendor.phone,
        "address": vendor.address
    }