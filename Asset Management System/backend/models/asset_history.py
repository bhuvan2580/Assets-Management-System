from datetime import datetime

from extensions import db


class AssetHistory(db.Model):
    __tablename__ = "asset_history"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    original_asset_id = db.Column(
        db.Integer,
        nullable=False
    )

    asset_tag = db.Column(
        db.String(100),
        nullable=False
    )

    asset_type = db.Column(
        db.String(100),
        nullable=False
    )

    category = db.Column(
        db.String(100)
    )

    brand = db.Column(
        db.String(100)
    )

    model = db.Column(
        db.String(100)
    )

    serial_number = db.Column(
        db.String(150)
    )

    vendor_id = db.Column(
        db.Integer
    )

    vendor_name = db.Column(
        db.String(255)
    )

    purchase_date = db.Column(
        db.Date
    )

    received_date = db.Column(
        db.Date
    )

    purchase_cost = db.Column(
        db.Numeric(12, 2)
    )

    warranty_start = db.Column(
        db.Date
    )

    warranty_end = db.Column(
        db.Date
    )

    status = db.Column(
        db.String(50)
    )

    location = db.Column(
        db.String(255)
    )

    description = db.Column(
        db.Text
    )

    deleted_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )