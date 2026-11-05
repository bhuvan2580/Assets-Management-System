from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.employee import Employee
from models.asset import Asset
from models.assignment import AssetAssignment


employee_assets_bp = Blueprint(
    "employee_assets",
    __name__,
    url_prefix="/api/asset-requests"
)


# ============================================================
# HELPER
# ============================================================

def get_current_employee():
    """
    Get the authenticated employee.

    Supports JWT identities such as:
        1
        "1"
        "EMPLOYEE:1"
    """

    identity = get_jwt_identity()

    if identity is None:
        return None, None

    # --------------------------------------------------------
    # Handle EMPLOYEE:<id> JWT identity
    # --------------------------------------------------------

    if isinstance(identity, str) and identity.startswith("EMPLOYEE:"):
        try:
            employee_id = int(identity.split(":", 1)[1])
        except (ValueError, TypeError):
            return None, None

        employee = db.session.get(Employee, employee_id)

        if not employee:
            return None, None

        if employee.status != "ACTIVE":
            return None, None

        # Find the corresponding User account
        user = User.query.filter_by(
            employee_id=employee.id
        ).first()

        if not user:
            return None, employee

        if not user.is_active:
            return None, None

        if user.role != "EMPLOYEE":
            return None, None

        return user, employee

    # --------------------------------------------------------
    # Handle normal numeric User ID
    # --------------------------------------------------------

    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None, None

    user = db.session.get(User, user_id)

    if not user:
        return None, None

    if not user.is_active:
        return None, None

    if user.role != "EMPLOYEE":
        return None, None

    if not user.employee_id:
        return user, None

    employee = db.session.get(
        Employee,
        user.employee_id
    )

    if not employee:
        return user, None

    if employee.status != "ACTIVE":
        return None, None

    return user, employee


# ============================================================
# AVAILABLE ASSETS
# ============================================================

@employee_assets_bp.route(
    "/available-assets",
    methods=["GET"]
)
@jwt_required()
def get_available_assets():

    user, employee = get_current_employee()

    if not user:
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 401

    if not employee:
        return jsonify({
            "success": False,
            "message": (
                "Your account is not linked to "
                "an employee record."
            )
        }), 400

    assets = Asset.query.filter(
        Asset.status == "AVAILABLE"
    ).order_by(
        Asset.asset_tag.asc()
    ).all()

    result = []

    for asset in assets:

        result.append({
            "id": asset.id,

            "asset_tag": asset.asset_tag,

            "asset_type": asset.asset_type,

            "category": asset.category,

            "brand": asset.brand,

            "model": asset.model,

            "serial_number": asset.serial_number,

            "location": asset.location,

            "processor": asset.processor,

            "ram": asset.ram,

            "storage": asset.storage,

            "display": asset.display,

            "operating_system": asset.operating_system,

            "description": asset.description,

            "warranty_start": (
                asset.warranty_start.isoformat()
                if asset.warranty_start
                else None
            ),

            "warranty_end": (
                asset.warranty_end.isoformat()
                if asset.warranty_end
                else None
            )
        })

    return jsonify({
        "success": True,
        "assets": result,
        "count": len(result)
    }), 200