from datetime import datetime
from flask import Blueprint, jsonify, request

from extensions import db
from models.assignment import AssetAssignment
from models.asset import Asset
from models.employee import Employee
from routes.auth import roles_required


assignments_bp = Blueprint(
    "assignments",
    __name__,
    url_prefix="/api/assignments"
)


@assignments_bp.route("", methods=["GET"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def get_assignments():

    assignments = AssetAssignment.query.order_by(
        AssetAssignment.created_at.desc()
    ).all()

    return jsonify([
        assignment_to_dict(assignment)
        for assignment in assignments
    ])


@assignments_bp.route(
    "/<int:assignment_id>",
    methods=["GET"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def get_assignment(assignment_id):

    assignment = db.session.get(
        AssetAssignment,
        assignment_id
    )

    if not assignment:
        return jsonify({
            "message": "Assignment not found"
        }), 404

    return jsonify(
        assignment_to_dict(assignment)
    )


@assignments_bp.route("", methods=["POST"])
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def create_assignment():

    data = request.get_json() or {}

    required_fields = [
        "asset_id",
        "employee_id",
        "issue_date"
    ]

    for field in required_fields:

        if not data.get(field):
            return jsonify({
                "message":
                    f"{field.replace('_', ' ').title()} is required"
            }), 400

    asset = db.session.get(
        Asset,
        data["asset_id"]
    )

    if not asset:
        return jsonify({
            "message": "Asset not found"
        }), 404

    employee = db.session.get(
        Employee,
        data["employee_id"]
    )

    if not employee:
        return jsonify({
            "message": "Employee not found"
        }), 404

    # Only available assets can be assigned
    if asset.status != "AVAILABLE":
        return jsonify({
            "message":
                f"Asset cannot be assigned because its current "
                f"status is {asset.status}"
        }), 400

    # Employee must be active
    if employee.status != "ACTIVE":
        return jsonify({
            "message":
                "Asset cannot be assigned to an inactive employee"
        }), 400

    # --------------------------------------------------------
    # Validate dates
    # --------------------------------------------------------

    issue_date = parse_date(
        data["issue_date"]
    )

    expected_return_date = parse_date(
        data.get("expected_return_date")
    )

    # Expected return cannot be before issue date
    if (
        expected_return_date
        and expected_return_date < issue_date
    ):
        return jsonify({
            "message":
                "Expected return date cannot be before the issue date"
        }), 400


    # --------------------------------------------------------
    # Create assignment
    # --------------------------------------------------------

    assignment = AssetAssignment(
        original_asset_id=asset.id,

        asset_id=asset.id,

        asset_tag=asset.asset_tag,

        employee_id=employee.id,

        employee_code=employee.employee_id,
        employee_name=employee.name,
        employee_email=employee.email,

        issue_date=issue_date,

        expected_return_date=expected_return_date,

        issued_by=data.get("issued_by"),

        condition_at_issue=data.get(
            "condition_at_issue"
        ),

        remarks=data.get(
            "remarks"
        )
    )

    # Change asset status
    asset.status = "ASSIGNED"

    db.session.add(assignment)
    db.session.commit()

    return jsonify({
        "message":
            "Asset assigned successfully",
        "assignment":
            assignment_to_dict(assignment)
    }), 201


@assignments_bp.route(
    "/<int:assignment_id>/return",
    methods=["POST"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def return_asset(assignment_id):

    assignment = db.session.get(
        AssetAssignment,
        assignment_id
    )

    if not assignment:
        return jsonify({
            "message": "Assignment not found"
        }), 404

    # Prevent returning an already returned asset
    if assignment.actual_return_date:
        return jsonify({
            "message":
                "This asset has already been returned"
        }), 400

    data = request.get_json() or {}

    actual_return_date = data.get(
        "actual_return_date"
    )

    if actual_return_date:
        return_date = parse_date(
            actual_return_date
        )
    else:
        return_date = datetime.utcnow().date()


    # --------------------------------------------------------
    # Validate actual return date
    # --------------------------------------------------------

    if (
        assignment.issue_date
        and return_date < assignment.issue_date
    ):
        return jsonify({
            "message":
                "Actual return date cannot be before the issue date"
        }), 400

    assignment.actual_return_date = return_date

    assignment.returned_to = data.get(
        "returned_to"
    )

    assignment.condition_at_return = data.get(
        "condition_at_return"
    )

    assignment.remarks = data.get(
        "remarks",
        assignment.remarks
    )

    # Make the asset available again
    assignment.asset.status = "AVAILABLE"

    db.session.commit()

    return jsonify({
        "message":
            "Asset returned successfully",
        "assignment":
            assignment_to_dict(assignment)
    })


    
@assignments_bp.route(
    "/<int:assignment_id>",
    methods=["DELETE"]
)
@roles_required(
    "SUPERUSER",
    "ADMIN",
    "IT"
)
def delete_assignment(assignment_id):

    return jsonify({
        "message":
            "Asset assignments are permanent records and cannot be deleted"
    }), 405


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

        # Keep the original asset ID even if the asset is deleted
        "asset_id": assignment.original_asset_id,

        # Permanent snapshot
        "asset_tag":
            assignment.asset.asset_tag
            if assignment.asset
            else assignment.asset_tag,

        # Asset type can only be obtained while asset exists
         "asset_type":
            assignment.asset.asset_type
            if assignment.asset
            else "Deleted Asset",

        "employee_id": assignment.employee_id,

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

        "issued_by": assignment.issued_by,

        "returned_to": assignment.returned_to,

        "condition_at_issue":
            assignment.condition_at_issue,

        "condition_at_return":
            assignment.condition_at_return,

        "remarks": assignment.remarks,

        "status":
            "RETURNED"
            if assignment.actual_return_date
            else "ACTIVE",

        "created_at":
            assignment.created_at.isoformat()
            if assignment.created_at
            else None
    }