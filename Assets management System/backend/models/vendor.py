from datetime import datetime
from extensions import db


class Vendor(db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)

    vendor_name = db.Column(
        db.String(150),
        nullable=False
    )

    contact_person = db.Column(db.String(150))
    email = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)

    # New vendor fields
    nda = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false()
    )

    service_agreement = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false()
    )

    renewal_date = db.Column(db.Date, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    support = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    assets = db.relationship(
        "Asset",
        back_populates="vendor",
        lazy=True
    )