from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.asset import Asset
from models.assignment import AssetAssignment
from models.employee import Employee



employee_portal_bp = Blueprint(
    "employee_portal",
    __name__,
    url_prefix="/api/employee"
)


# ============================================================
# HELPER
# ============================================================

def get_current_employee():
    """
    Resolve the authenticated employee using the current JWT claims.
    Employee accounts are stored in the Employee table.
    """

    claims = get_jwt() or {}

    account_type = (claims.get("account_type") or "").upper()
    account_id = claims.get("account_id")

    # The employee portal is only for employee accounts.
    if account_type != "EMPLOYEE" or account_id is None:
        return None, None

    try:
        account_id = int(account_id)
    except (TypeError, ValueError):
        return None, None

    employee = db.session.get(Employee, account_id)

    if not employee:
        return None, None

    if str(employee.status or "").upper() != "ACTIVE":
        return None, None

    return employee, employee


# ============================================================
# EMPLOYEE DASHBOARD
# ============================================================

@employee_portal_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def employee_dashboard():

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
                "Your account is not linked to an employee record."
            )
        }), 400

    # --------------------------------------------------------
    # ONLY this employee's active assignments
    # --------------------------------------------------------

    active_assignments = AssetAssignment.query.filter(
        AssetAssignment.employee_id == employee.id,
        AssetAssignment.actual_return_date.is_(None)
    ).all()

    return jsonify({
        "success": True,
        "employee": {
            "id": employee.id,
            "employee_id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "department": employee.department,
            "designation": employee.designation
        },
        "stats": {
            "assigned_assets": len(active_assignments)
        }
    }), 200


# ============================================================
# MY ASSETS
# ============================================================

@employee_portal_bp.route("/assets", methods=["GET"])
@jwt_required()
def get_my_assets():

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
                "Your account is not linked to an employee record."
            )
        }), 400

    assignments = AssetAssignment.query.filter(
        AssetAssignment.employee_id == employee.id
    ).order_by(
        AssetAssignment.created_at.desc()
    ).all()

    result = []

    for assignment in assignments:

        result.append({
            "assignment_id": assignment.id,

            "asset_id": assignment.original_asset_id,

            "asset_tag": (
                assignment.asset.asset_tag
                if assignment.asset
                else assignment.asset_tag
            ),

            "asset_type": (
                assignment.asset.asset_type
                if assignment.asset
                else "Deleted Asset"
            ),

            "category": (
                assignment.asset.category
                if assignment.asset
                else None
            ),

            "brand": (
                assignment.asset.brand
                if assignment.asset
                else None
            ),

            "model": (
                assignment.asset.model
                if assignment.asset
                else None
            ),

            "issue_date": (
                assignment.issue_date.isoformat()
                if assignment.issue_date
                else None
            ),

            "expected_return_date": (
                assignment.expected_return_date.isoformat()
                if assignment.expected_return_date
                else None
            ),

            "actual_return_date": (
                assignment.actual_return_date.isoformat()
                if assignment.actual_return_date
                else None
            ),

            "status": (
                "RETURNED"
                if assignment.actual_return_date
                else "ACTIVE"
            )
        })

    return jsonify({
        "success": True,
        "assets": result
    }), 200


# ============================================================
# AVAILABLE ASSETS
# ============================================================

@employee_portal_bp.route(
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
            "location": asset.location,
            "description": asset.description
        })

    return jsonify({
        "success": True,
        "assets": result
    }), 200