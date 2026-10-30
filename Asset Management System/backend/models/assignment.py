from datetime import datetime
from extensions import db


class AssetAssignment(db.Model):
    __tablename__ = "asset_assignments"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # ASSET HISTORY
    # ============================================================

    # Permanent historical reference.
    # NOT a foreign key.
    original_asset_id = db.Column(
        db.Integer,
        nullable=True
    )

    # Current asset relationship.
    # If the asset is deleted, this becomes NULL.
    asset_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "assets.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    # Permanent snapshot of asset information
    asset_tag = db.Column(
        db.String(100),
        nullable=True
    )

    # ============================================================
    # EMPLOYEE HISTORY
    # ============================================================

    # Current employee relationship.
    # If employee is deleted, this becomes NULL.
    employee_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "employees.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    # Permanent employee snapshot
    employee_code = db.Column(
        db.String(50),
        nullable=True
    )

    employee_name = db.Column(
        db.String(150),
        nullable=True
    )

    employee_email = db.Column(
        db.String(150),
        nullable=True
    )

    # ============================================================
    # ASSIGNMENT DETAILS
    # ============================================================

    issue_date = db.Column(
        db.Date,
        nullable=False
    )

    expected_return_date = db.Column(
        db.Date
    )

    actual_return_date = db.Column(
        db.Date
    )

    issued_by = db.Column(
        db.String(150)
    )

    returned_to = db.Column(
        db.String(150)
    )

    condition_at_issue = db.Column(
        db.String(50)
    )

    condition_at_return = db.Column(
        db.String(50)
    )

    remarks = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # ============================================================
    # RELATIONSHIPS
    # ============================================================

    asset = db.relationship(
        "Asset",
        back_populates="assignments"
    )

    employee = db.relationship(
        "Employee",
        back_populates="assignments"
    )