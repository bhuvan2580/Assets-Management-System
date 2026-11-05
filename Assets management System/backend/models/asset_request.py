from datetime import datetime

from extensions import db


class AssetRequest(db.Model):
    __tablename__ = "asset_requests"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # EMPLOYEE
    # ============================================================

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "employees.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    # ============================================================
    # ASSET
    # ============================================================

    asset_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "assets.id",
            ondelete="CASCADE"
        ),
        nullable=True
    )
    
    requested_asset = db.Column(
        db.String(255),
        nullable=False
    )

    # ============================================================
    # REQUEST DETAILS
    # ============================================================

    request_date = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="PENDING"
    )

    remarks = db.Column(
        db.Text,
        nullable=True
    )

    # ============================================================
    # REVIEW DETAILS
    # ============================================================

    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    reviewed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    review_remarks = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    employee = db.relationship(
        "Employee",
        backref=db.backref(
            "asset_requests",
            lazy=True
        )
    )

    asset = db.relationship(
        "Asset",
        backref=db.backref(
            "asset_requests",
            lazy=True
        )
    )

    reviewer = db.relationship(
        "User",
        foreign_keys=[reviewed_by]
    )

    def __repr__(self):

        return (
            f"<AssetRequest "
            f"{self.id} "
            f"employee={self.employee_id} "
            f"requested={self.requested_asset} "
            f"asset={self.asset_id} "
            f"status={self.status}>"
        )