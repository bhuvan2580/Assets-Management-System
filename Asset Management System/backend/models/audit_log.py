from datetime import datetime
from extensions import db


class AuditLog(db.Model):
    """Append-only record of successful state-changing API requests."""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, nullable=True, index=True)
    actor_type = db.Column(db.String(20), nullable=False, default="UNKNOWN")
    actor_name = db.Column(db.String(150), nullable=False, default="System")
    actor_email = db.Column(db.String(255), nullable=True, index=True)
    actor_role = db.Column(db.String(30), nullable=True)
    action = db.Column(db.String(30), nullable=False, index=True)
    entity_type = db.Column(db.String(80), nullable=False, index=True)
    entity_id = db.Column(db.String(100), nullable=True, index=True)
    description = db.Column(db.String(500), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    endpoint = db.Column(db.String(255), nullable=False)
    status_code = db.Column(db.Integer, nullable=False)
    ip_address = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id, "actor_id": self.actor_id,
            "actor_type": self.actor_type, "actor_name": self.actor_name,
            "actor_email": self.actor_email, "actor_role": self.actor_role,
            "action": self.action, "entity_type": self.entity_type,
            "entity_id": self.entity_id, "description": self.description,
            "method": self.method, "endpoint": self.endpoint,
            "status_code": self.status_code, "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
