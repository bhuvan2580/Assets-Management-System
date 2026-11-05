from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from extensions import db
from models.user import User
from models.asset import Asset
from models.asset_request import AssetRequest
from models.assignment import AssetAssignment
from models.employee import Employee


asset_requests_bp = Blueprint(
    "asset_requests",
    __name__,
    url_prefix="/api/asset-requests"
)


# ============================================================
# HELPER
# ============================================================

def get_current_employee():
    """
    Get the authenticated Employee from the JWT.

    Employee accounts are stored in the employees table,
    while system accounts are stored in the users table.

    Employee JWT:
        identity = "EMPLOYEE:<employee_id>"
        account_type = "EMPLOYEE"
        account_id = <employee_id>
    """

    identity = get_jwt_identity()
    claims = get_jwt()

    account_type = claims.get("account_type")
    account_id = claims.get("account_id")

    # ============================================================
    # NEW TOKEN FORMAT
    # ============================================================

    if account_type == "EMPLOYEE":

        if not account_id:
            return None

        try:
            account_id = int(account_id)
        except (TypeError, ValueError):
            return None

        employee = db.session.get(
            Employee,
            account_id
        )

        if not employee:
            return None

        if str(employee.status).upper() != "ACTIVE":
            return None

        return employee

    # ============================================================
    # BACKWARD COMPATIBILITY
    # ============================================================

    # Handle identity like:
    # EMPLOYEE:1

    if isinstance(identity, str) and identity.startswith("EMPLOYEE:"):

        try:
            employee_id = int(
                identity.split(":", 1)[1]
            )
        except (TypeError, ValueError, IndexError):
            return None

        employee = db.session.get(
            Employee,
            employee_id
        )

        if not employee:
            return None

        if str(employee.status).upper() != "ACTIVE":
            return None

        return employee

    return None

# ============================================================
# EMPLOYEE - CREATE REQUEST
# ============================================================

@asset_requests_bp.route(
    "",
    methods=["POST"]
)
@jwt_required()
def create_asset_request():

    employee = get_current_employee()

    if not employee:
        return jsonify({
            "success": False,
            "message":
                "Unauthorized or inactive employee account."
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    requested_asset = (
        data.get("requested_asset")
        or ""
    ).strip()

    remarks = (
        data.get("remarks")
        or ""
    ).strip()

    # --------------------------------------------------------
    # REQUESTED ASSET REQUIRED
    # --------------------------------------------------------

    if not requested_asset:
        return jsonify({
            "success": False,
            "message":
                "Asset selection is required."
        }), 400

    # --------------------------------------------------------
    # PREVENT EMPTY OTHER REQUEST
    # --------------------------------------------------------

    if (
        requested_asset.lower() == "others"
        or requested_asset.lower() == "other"
    ):
        return jsonify({
            "success": False,
            "message":
                "Please specify the asset you want."
        }), 400

    # --------------------------------------------------------
    # ALLOWED STANDARD REQUEST TYPES
    # --------------------------------------------------------

    allowed_assets = {
        "laptop",
        "monitor",
        "mouse",
        "charger",
        "bag",
        "pendrive"
    }

    if requested_asset.lower() not in allowed_assets:
        return jsonify({
            "success": False,
            "message": (
                "Invalid asset type. Please select a valid "
                "asset type or specify a custom asset under Others."
            )
        }), 400

    # --------------------------------------------------------
    # PREVENT DUPLICATE PENDING REQUEST
    #
    # Employee cannot have another pending request
    # for the same requested asset.
    # --------------------------------------------------------

    existing_request = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id,
        AssetRequest.requested_asset.ilike(
            requested_asset
        ),
        AssetRequest.status == "PENDING"
    ).first()

    if existing_request:

        return jsonify({
            "success": False,
            "message": (
                "You already have a pending request "
                f"for {requested_asset}."
            )
        }), 409

    # --------------------------------------------------------
    # CREATE REQUEST
    # --------------------------------------------------------

    asset_request = AssetRequest(
        employee_id=employee.id,
        asset_id=None,
        requested_asset=requested_asset,
        remarks=remarks or None,
        status="PENDING"
    )

    db.session.add(
        asset_request
    )

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Asset request submitted successfully."
        ),
        "request":
            asset_request_to_dict(
                asset_request
            )
    }), 201


# ============================================================
# EMPLOYEE - MY REQUESTS
# ============================================================

@asset_requests_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_requests():

    employee = get_current_employee()

    if not employee:
        return jsonify({
            "success": False,
            "message": "Unauthorized or inactive employee account."
        }), 401

    requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id
    ).order_by(
        AssetRequest.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "requests": [
            asset_request_to_dict(
                asset_request
            )
            for asset_request in requests
        ]
    }), 200


# ============================================================
# EMPLOYEE - CANCEL REQUEST
# ============================================================

@asset_requests_bp.route(
    "/<int:request_id>",
    methods=["DELETE"]
)
@jwt_required()
def cancel_asset_request(request_id):

    employee = get_current_employee()

    if not employee:
        return jsonify({
            "success": False,
            "message": "Unauthorized or inactive employee account."
        }), 401

    asset_request = db.session.get(
        AssetRequest,
        request_id
    )

    if not asset_request:
        return jsonify({
            "success": False,
            "message": "Asset request not found."
        }), 404

    # --------------------------------------------------------
    # Ownership check
    # --------------------------------------------------------

    if asset_request.employee_id != employee.id:
        return jsonify({
            "success": False,
            "message": "You are not authorized to cancel this request."
        }), 403

    # --------------------------------------------------------
    # Only pending requests can be cancelled
    # --------------------------------------------------------

    if asset_request.status != "PENDING":
        return jsonify({
            "success": False,
            "message": (
                "Only pending requests can be cancelled."
            )
        }), 409

    asset_request.status = "CANCELLED"
    asset_request.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Asset request cancelled successfully."
    }), 200


def parse_date(value):

    if not value:
        return None

    if hasattr(value, "year"):
        return value

    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        raise ValueError(
            "Date must be in YYYY-MM-DD format"
        )
        
        
def assignment_to_dict(assignment):

    return {
        "id": assignment.id,

        "asset_id": assignment.original_asset_id,

        "asset_tag":
            assignment.asset.asset_tag
            if assignment.asset
            else assignment.asset_tag,

        "asset_type":
            assignment.asset.asset_type
            if assignment.asset
            else "Deleted Asset",

        "employee_id":
            assignment.employee_id,

        "employee_code":
            assignment.employee.employee_id
            if assignment.employee
            else assignment.employee_code,

        "employee_name":
            assignment.employee.name
            if assignment.employee
            else assignment.employee_name,

        "employee_email":
            assignment.employee.email
            if assignment.employee
            else assignment.employee_email,

        "issue_date":
            assignment.issue_date.isoformat()
            if assignment.issue_date
            else None,

        "expected_return_date":
            assignment.expected_return_date.isoformat()
            if assignment.expected_return_date
            else None,

        "actual_return_date":
            assignment.actual_return_date.isoformat()
            if assignment.actual_return_date
            else None,

        "issued_by":
            assignment.issued_by,

        "returned_to":
            assignment.returned_to,

        "condition_at_issue":
            assignment.condition_at_issue,

        "condition_at_return":
            assignment.condition_at_return,

        "remarks":
            assignment.remarks,

        "status":
            "RETURNED"
            if assignment.actual_return_date
            else "ACTIVE",

        "created_at":
            assignment.created_at.isoformat()
            if assignment.created_at
            else None
    }


# ============================================================
# SERIALIZER
# ============================================================

def asset_request_to_dict(asset_request):

    asset = asset_request.asset
    employee = asset_request.employee

    return {

        "id":
            asset_request.id,

        "employee_id":
            asset_request.employee_id,

        "employee_name":
            employee.name
            if employee
            else None,

        "employee_code":
            employee.employee_id
            if employee
            else None,

        "employee_email":
            employee.email
            if employee
            else None,

        # ----------------------------------------------------
        # REQUESTED ASSET
        # ----------------------------------------------------

        "requested_asset":
            asset_request.requested_asset,

        # ----------------------------------------------------
        # ACTUAL ASSIGNED ASSET
        # ----------------------------------------------------

        "asset_id":
            asset_request.asset_id,

        "asset_tag":
            asset.asset_tag
            if asset
            else None,

        "asset_type":
            asset.asset_type
            if asset
            else asset_request.requested_asset,

        "category":
            asset.category
            if asset
            else None,

        "brand":
            asset.brand
            if asset
            else None,

        "model":
            asset.model
            if asset
            else None,

        "request_date":
            asset_request.request_date.isoformat()
            if asset_request.request_date
            else None,

        "status":
            asset_request.status,

        "remarks":
            asset_request.remarks,

        "reviewed_by":
            asset_request.reviewed_by,

        "reviewed_at":
            asset_request.reviewed_at.isoformat()
            if asset_request.reviewed_at
            else None,

        "review_remarks":
            asset_request.review_remarks,

        "created_at":
            asset_request.created_at.isoformat()
            if asset_request.created_at
            else None,

        "updated_at":
            asset_request.updated_at.isoformat()
            if asset_request.updated_at
            else None
    }
# ============================================================
# REVIEWER HELPER
# SUPERUSER / ADMIN / IT_TEAM
# ============================================================

def get_current_reviewer():
    """
    Get the authenticated system User.

    Reviewer accounts are stored in the users table.

    Valid reviewer roles:
        SUPERUSER
        ADMIN
        IT
    """

    identity = get_jwt_identity()
    claims = get_jwt()

    account_type = claims.get("account_type")
    account_id = claims.get("account_id")

    # ============================================================
    # NEW TOKEN FORMAT
    # ============================================================

    if account_type == "USER":

        if not account_id:
            return None

        try:
            account_id = int(account_id)
        except (TypeError, ValueError):
            return None

        user = db.session.get(
            User,
            account_id
        )

        if not user:
            return None

        if not user.is_active:
            return None

        if user.role not in [
            "SUPERUSER",
            "ADMIN",
            "IT"
        ]:
            return None

        return user

    # ============================================================
    # BACKWARD COMPATIBILITY
    # ============================================================

    # Handle identity like:
    # USER:1

    if isinstance(identity, str) and identity.startswith("USER:"):

        try:
            user_id = int(
                identity.split(":", 1)[1]
            )
        except (TypeError, ValueError, IndexError):
            return None

        user = db.session.get(
            User,
            user_id
        )

        if not user:
            return None

        if not user.is_active:
            return None

        if user.role not in [
            "SUPERUSER",
            "ADMIN",
            "IT"
        ]:
            return None

        return user

    return None


# ============================================================
# GET ALL ASSET REQUESTS
# SUPERUSER / ADMIN / IT_TEAM
# ============================================================

@asset_requests_bp.route(
    "/review",
    methods=["GET"]
)
@jwt_required()
def get_all_asset_requests():

    user = get_current_reviewer()

    if not user:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to review "
                "asset requests."
            )
        }), 403

    status = request.args.get("status")

    query = AssetRequest.query

    if status:
        query = query.filter(
            AssetRequest.status == status.upper()
        )

    requests = query.order_by(
        AssetRequest.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "requests": [
            asset_request_to_dict(
                asset_request
            )
            for asset_request in requests
        ]
    }), 200
    
    
# ============================================================
# REVIEWER - AVAILABLE ASSETS
# SUPERUSER / ADMIN / IT
# ============================================================

@asset_requests_bp.route(
    "/review/available-assets",
    methods=["GET"]
)
@jwt_required()
def get_reviewer_available_assets():

    user = get_current_reviewer()

    if not user:
        return jsonify({
            "success": False,
            "message":
                "You are not authorized to view available assets."
        }), 403

    requested_asset = (
        request.args.get(
            "asset_type",
            ""
        )
        .strip()
    )

    query = Asset.query.filter(
        Asset.status == "AVAILABLE"
    )

    # --------------------------------------------------------
    # Filter by requested asset type
    # --------------------------------------------------------

    if requested_asset:

        query = query.filter(
            db.func.lower(
                Asset.asset_type
            ) == requested_asset.lower()
        )

    assets = query.order_by(
        Asset.asset_tag.asc()
    ).all()

    return jsonify({
        "success": True,
        "assets": [
            {
                "id": asset.id,

                "asset_tag":
                    asset.asset_tag,

                "asset_type":
                    asset.asset_type,

                "category":
                    asset.category,

                "brand":
                    asset.brand,

                "model":
                    asset.model,

                "serial_number":
                    asset.serial_number,

                "location":
                    asset.location,

                "description":
                    asset.description,

                "processor":
                    asset.processor,

                "ram":
                    asset.ram,

                "storage":
                    asset.storage,

                "display":
                    asset.display,

                "operating_system":
                    asset.operating_system
            }

            for asset in assets
        ]
    }), 200


# ============================================================
# APPROVE ASSET REQUEST
# SUPERUSER / ADMIN / IT_TEAM
# ============================================================

@asset_requests_bp.route(
    "/<int:request_id>/approve",
    methods=["POST"]
)
@jwt_required()
def approve_asset_request(request_id):

    user = get_current_reviewer()

    if not user:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to approve "
                "asset requests."
            )
        }), 403

    asset_request = db.session.get(
        AssetRequest,
        request_id
    )

    if not asset_request:
        return jsonify({
            "success": False,
            "message": "Asset request not found."
        }), 404

    # --------------------------------------------------------
    # Request must still be pending
    # --------------------------------------------------------

    if asset_request.status != "PENDING":
        return jsonify({
            "success": False,
            "message": (
                f"This request cannot be approved because "
                f"its current status is "
                f"{asset_request.status}."
            )
        }), 409

    data = request.get_json(
        silent=True
    ) or {}

    asset_id = data.get(
        "asset_id"
    )

    if not asset_id:
        return jsonify({
            "success": False,
            "message":
                "Please select an asset before approving the request."
        }), 400

    asset = db.session.get(
        Asset,
        asset_id
    )

    if not asset:
        return jsonify({
            "success": False,
            "message":
                "Selected asset was not found."
        }), 404

    employee = asset_request.employee

    if not employee:
        return jsonify({
            "success": False,
            "message": (
                "The employee associated with this request "
                "no longer exists."
            )
        }), 409

    # --------------------------------------------------------
    # Employee must still be active
    # --------------------------------------------------------

    if employee.status != "ACTIVE":
        return jsonify({
            "success": False,
            "message": (
                "This employee is no longer active."
            )
        }), 409

    # --------------------------------------------------------
    # CRITICAL SECURITY CHECK
    #
    # The asset might have been assigned after the employee
    # submitted the request.
    # --------------------------------------------------------

    if asset.status != "AVAILABLE":
        return jsonify({
            "success": False,
            "message": (
                "This asset is no longer available. "
                "It may have already been assigned, "
                "put into repair, or otherwise changed."
            )
        }), 409
        
    if (
        str(asset.asset_type).strip().lower()
        != str(asset_request.requested_asset).strip().lower()
    ):
        return jsonify({
            "success": False,
            "message": (
                "The selected asset does not match "
                "the requested asset type."
            )
        }), 409

    data = request.get_json(
        silent=True
    ) or {}

    # --------------------------------------------------------
    # Create permanent assignment record
    # --------------------------------------------------------

    assignment = AssetAssignment(

        original_asset_id=asset.id,

        asset_id=asset.id,

        asset_tag=asset.asset_tag,

        employee_id=employee.id,

        employee_code=employee.employee_id,

        employee_name=employee.name,

        employee_email=employee.email,

        issue_date=datetime.utcnow().date(),

        expected_return_date=parse_date(
            data.get("expected_return_date")
        ),

        issued_by=user.name,

        condition_at_issue=data.get(
            "condition_at_issue"
        ),

        remarks=data.get(
            "remarks"
        )
    )

    # --------------------------------------------------------
    # Update request
    # --------------------------------------------------------

    asset_request.status = "APPROVED"

    asset_request.reviewed_by = user.id

    asset_request.reviewed_at = datetime.utcnow()

    asset_request.review_remarks = data.get(
        "review_remarks"
    )

    # --------------------------------------------------------
    # Change asset status
    # --------------------------------------------------------

    asset.status = "ASSIGNED"

    db.session.add(assignment)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Asset request approved and asset "
            "assigned successfully."
        ),
        "request": asset_request_to_dict(
            asset_request
        ),
        "assignment": assignment_to_dict(
            assignment
        )
    }), 200


# ============================================================
# REJECT ASSET REQUEST
# SUPERUSER / ADMIN / IT_TEAM
# ============================================================

@asset_requests_bp.route(
    "/<int:request_id>/reject",
    methods=["POST"]
)
@jwt_required()
def reject_asset_request(request_id):

    user = get_current_reviewer()

    if not user:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to reject "
                "asset requests."
            )
        }), 403

    asset_request = db.session.get(
        AssetRequest,
        request_id
    )

    if not asset_request:
        return jsonify({
            "success": False,
            "message": "Asset request not found."
        }), 404

    if asset_request.status != "PENDING":
        return jsonify({
            "success": False,
            "message": (
                f"This request cannot be rejected because "
                f"its current status is "
                f"{asset_request.status}."
            )
        }), 409

    data = request.get_json(
        silent=True
    ) or {}

    review_remarks = data.get(
        "review_remarks"
    )

    if not review_remarks:
        return jsonify({
            "success": False,
            "message": (
                "A reason is required when rejecting "
                "an asset request."
            )
        }), 400

    asset_request.status = "REJECTED"

    asset_request.reviewed_by = user.id

    asset_request.reviewed_at = datetime.utcnow()

    asset_request.review_remarks = review_remarks

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Asset request rejected successfully."
        ),
        "request": asset_request_to_dict(
            asset_request
        )
    }), 200