from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.employee import Employee
from models.assignment import AssetAssignment
from models.asset_request import AssetRequest


employee_dashboard_bp = Blueprint(
    "employee_dashboard",
    __name__,
    url_prefix="/api/employee/dashboard"
)


# ============================================================
# GET EMPLOYEE DASHBOARD
# ============================================================

@employee_dashboard_bp.route("", methods=["GET"])
@jwt_required()
def get_employee_dashboard():

    # ========================================================
    # GET JWT IDENTITY
    # ========================================================

    identity = get_jwt_identity()

    if not identity:
        return jsonify({
            "success": False,
            "message": "Invalid authentication."
        }), 401

    identity = str(identity)

    # ========================================================
    # EMPLOYEE JWT FORMAT
    #
    # EMPLOYEE:1
    # EMPLOYEE:2
    # EMPLOYEE:3
    # ========================================================

    if not identity.startswith("EMPLOYEE:"):

        return jsonify({
            "success": False,
            "message": "This dashboard is only available to employees."
        }), 403

    try:

        employee_id = int(
            identity.split(":", 1)[1]
        )

    except (ValueError, IndexError):

        return jsonify({
            "success": False,
            "message": "Invalid employee authentication."
        }), 401

    # ========================================================
    # LOAD EMPLOYEE
    # ========================================================

    employee = db.session.get(
        Employee,
        employee_id
    )

    if not employee:

        return jsonify({
            "success": False,
            "message": "Employee record not found."
        }), 404

    # ========================================================
    # CHECK EMPLOYEE STATUS
    # ========================================================

    if str(employee.status).upper() != "ACTIVE":

        return jsonify({
            "success": False,
            "message": "Your employee account is inactive."
        }), 403

    # ========================================================
    # ASSIGNED ASSETS
    # ========================================================

    active_assignments = AssetAssignment.query.filter(
        AssetAssignment.employee_id == employee.id,
        AssetAssignment.actual_return_date.is_(None)
    ).order_by(
        AssetAssignment.issue_date.desc()
    ).all()

    # ========================================================
    # REQUEST COUNTS
    # ========================================================

    pending_requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id,
        AssetRequest.status == "PENDING"
    ).count()

    approved_requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id,
        AssetRequest.status == "APPROVED"
    ).count()

    rejected_requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id,
        AssetRequest.status == "REJECTED"
    ).count()

    cancelled_requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id,
        AssetRequest.status == "CANCELLED"
    ).count()

    total_requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id
    ).count()

    # ========================================================
    # RECENT ASSIGNED ASSETS
    # ========================================================

    recent_assets = []

    for assignment in active_assignments[:5]:

        asset = assignment.asset

        if not asset:
            continue

        recent_assets.append({

            "assignment_id":
                assignment.id,

            "asset_id":
                asset.id,

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

            "issue_date":
                assignment.issue_date.isoformat()
                if assignment.issue_date
                else None,

            "expected_return_date":
                assignment.expected_return_date.isoformat()
                if assignment.expected_return_date
                else None,

            "condition_at_issue":
                assignment.condition_at_issue
        })

    # ========================================================
    # RECENT REQUESTS
    # ========================================================

    requests = AssetRequest.query.filter(
        AssetRequest.employee_id == employee.id
    ).order_by(
        AssetRequest.created_at.desc()
    ).limit(5).all()

    recent_requests = []

    for asset_request in requests:

        asset = asset_request.asset

        recent_requests.append({

            "id":
                asset_request.id,

            "asset_id":
                asset_request.asset_id,

            "asset_tag":
                asset.asset_tag
                if asset
                else None,

            "asset_type":
                asset.asset_type
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

            "review_remarks":
                asset_request.review_remarks,

            "reviewed_at":
                asset_request.reviewed_at.isoformat()
                if asset_request.reviewed_at
                else None
        })

    # ========================================================
    # EMPLOYEE INFORMATION
    # ========================================================

    employee_data = {

        "id":
            employee.id,

        "employee_id":
            employee.employee_id,

        "name":
            employee.name,

        "email":
            employee.email,

        "phone":
            employee.phone,

        "department":
            employee.department,

        "designation":
            employee.designation,

        "joining_date":
            employee.joining_date.isoformat()
            if employee.joining_date
            else None,

        "status":
            employee.status
    }

    # ========================================================
    # RESPONSE
    # ========================================================

    return jsonify({

        "success": True,

        "employee":
            employee_data,

        "stats": {

            "assigned_assets":
                len(active_assignments),

            "pending_requests":
                pending_requests,

            "approved_requests":
                approved_requests,

            "rejected_requests":
                rejected_requests,

            "cancelled_requests":
                cancelled_requests,

            "total_requests":
                total_requests
        },

        "recent_assets":
            recent_assets,

        "recent_requests":
            recent_requests

    }), 200