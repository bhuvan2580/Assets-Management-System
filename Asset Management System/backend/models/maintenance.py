from datetime import date, datetime
from extensions import db


class AssetMaintenance(db.Model):
    __tablename__ = "asset_maintenance"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)
    asset_tag = db.Column(db.String(100), nullable=False, index=True)
    asset_type = db.Column(db.String(100), nullable=True)
    asset_brand_model = db.Column(db.String(255), nullable=True)
    previous_asset_status = db.Column(db.String(30), nullable=True)
    reported_by = db.Column(db.String(150), nullable=True)
    issue_title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    reported_date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(30), nullable=False, default="REPORTED", index=True)
    assigned_to = db.Column(db.String(150), nullable=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    vendor_name = db.Column(db.String(150), nullable=True)
    repair_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    warranty_claim = db.Column(db.Boolean, nullable=False, default=False)
    resolution = db.Column(db.Text, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    completed_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset = db.relationship("Asset", backref=db.backref("maintenance_records", lazy=True))
    vendor = db.relationship("Vendor")

    def to_dict(self):
        return {
            "id": self.id, "asset_id": self.asset_id, "asset_tag": self.asset_tag,
            "asset_type": self.asset_type, "asset_brand_model": self.asset_brand_model,
            "previous_asset_status": self.previous_asset_status, "reported_by": self.reported_by,
            "issue_title": self.issue_title, "description": self.description,
            "reported_date": self.reported_date.isoformat() if self.reported_date else None,
            "status": self.status, "assigned_to": self.assigned_to, "vendor_id": self.vendor_id,
            "vendor_name": self.vendor_name, "repair_cost": float(self.repair_cost or 0),
            "warranty_claim": bool(self.warranty_claim), "resolution": self.resolution,
            "remarks": self.remarks, "completed_date": self.completed_date.isoformat() if self.completed_date else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
