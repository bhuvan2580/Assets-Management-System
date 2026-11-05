from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from models.audit_log import AuditLog
from routes.auth import roles_required

audit_logs_bp = Blueprint("audit_logs", __name__, url_prefix="/api/audit-logs")

@audit_logs_bp.route("", methods=["GET"])
@roles_required("SUPERUSER", "ADMIN")
def list_audit_logs():
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 25, type=int), 1), 100)
    query = AuditLog.query

    search = (request.args.get("search") or "").strip()
    action = (request.args.get("action") or "").strip().upper()
    entity_type = (request.args.get("entity_type") or "").strip().upper()
    if search:
        term = f"%{search}%"
        query = query.filter(or_(AuditLog.actor_name.ilike(term), AuditLog.actor_email.ilike(term), AuditLog.description.ilike(term), AuditLog.entity_id.ilike(term), AuditLog.endpoint.ilike(term)))
    if action and action != "ALL":
        query = query.filter(AuditLog.action == action)
    if entity_type and entity_type != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type)

    pagination = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "success": True, "items": [row.to_dict() for row in pagination.items],
        "total": pagination.total, "page": pagination.page,
        "per_page": pagination.per_page, "pages": pagination.pages,
    }), 200
