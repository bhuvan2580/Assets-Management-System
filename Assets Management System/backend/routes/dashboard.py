from flask import Blueprint, jsonify

from extensions import db
from models.asset import Asset
from models.employee import Employee
from models.asset_request import AssetRequest

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
        Asset.status == "REPAIR"
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
        "pending_requests": pending_requests
    }), 200