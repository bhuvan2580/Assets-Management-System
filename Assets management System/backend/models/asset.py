from datetime import datetime
from extensions import db


class Asset(db.Model):
    __tablename__ = "assets"

    id = db.Column(db.Integer, primary_key=True)

    asset_tag = db.Column(
        db.String(50),
        unique=True,
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
        db.String(150)
    )

    serial_number = db.Column(
        db.String(150),
        unique=True
    )

    vendor_id = db.Column(
        db.Integer,
        db.ForeignKey("vendors.id")
    )

    purchase_date = db.Column(db.Date)

    received_date = db.Column(db.Date)

    purchase_cost = db.Column(db.Numeric(12, 2))

    warranty_start = db.Column(db.Date)

    warranty_end = db.Column(db.Date)

    status = db.Column(
        db.String(30),
        default="AVAILABLE",
        nullable=False
    )

    location = db.Column(
        db.String(150)
    )

    description = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    vendor = db.relationship(
        "Vendor",
        back_populates="assets"
    )

    assignments = db.relationship(
        "AssetAssignment",
        back_populates="asset",
        lazy=True,
        passive_deletes=True
    )
    
    item_specification = db.Column(
        db.Text,
        nullable=True
    )

    processor = db.Column(
        db.String(150),
        nullable=True
    )

    ram = db.Column(
        db.String(50),
        nullable=True
    )

    storage = db.Column(
        db.String(100),
        nullable=True
    )

    display = db.Column(
        db.String(100),
        nullable=True
    )

    operating_system = db.Column(
        db.String(100),
        nullable=True
    )

    mode_of_transport = db.Column(
        db.String(100),
        nullable=True
    )

    warranty_status = db.Column(
        db.String(50),
        nullable=True
    )

    department = db.Column(
        db.String(100),
        nullable=True
    )

    rental_cost = db.Column(
        db.Numeric(12, 2),
        nullable=True
    )

    remarks = db.Column(
        db.Text,
        nullable=True
    )