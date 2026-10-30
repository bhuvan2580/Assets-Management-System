from datetime import datetime
from extensions import db


class AssetAuditSession(db.Model):
    __tablename__ = "asset_audit_sessions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    location = db.Column(db.String(150), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="IN_PROGRESS", index=True)
    created_by = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    scans = db.relationship("AssetAuditScan", back_populates="session", cascade="all, delete-orphan", lazy=True)

    def to_dict(self):
        scanned = len(self.scans)
        expected = self.expected_count if hasattr(self, "expected_count") else None
        return {
            "id": self.id, "name": self.name, "location": self.location,
            "notes": self.notes, "status": self.status, "created_by": self.created_by,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "completed_at": self.completed_at.isoformat() + "Z" if self.completed_at else None,
            "scanned_count": scanned, "expected_count": expected,
        }


class AssetAuditScan(db.Model):
    __tablename__ = "asset_audit_scans"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("asset_audit_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)
    asset_tag = db.Column(db.String(50), nullable=False, index=True)
    asset_name = db.Column(db.String(255), nullable=True)
    expected_location = db.Column(db.String(150), nullable=True)
    observed_location = db.Column(db.String(150), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    scanned_by = db.Column(db.String(150), nullable=True)
    scanned_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    session = db.relationship("AssetAuditSession", back_populates="scans")
    asset = db.relationship("Asset")

    def to_dict(self):
        return {
            "id": self.id, "session_id": self.session_id, "asset_id": self.asset_id,
            "asset_tag": self.asset_tag, "asset_name": self.asset_name,
            "expected_location": self.expected_location, "observed_location": self.observed_location,
            "notes": self.notes, "scanned_by": self.scanned_by,
            "scanned_at": self.scanned_at.isoformat() + "Z" if self.scanned_at else None,
        }
