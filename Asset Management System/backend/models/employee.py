from datetime import datetime

from extensions import db


class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ============================================================
    # EMPLOYEE INFORMATION
    # ============================================================

    employee_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False,
        index=True
    )

    phone = db.Column(
        db.String(30)
    )

    department = db.Column(
        db.String(100)
    )

    designation = db.Column(
        db.String(100)
    )

    cost_center = db.Column(
        db.String(100)
    )

    joining_date = db.Column(
        db.Date
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="ACTIVE"
    )

    # ============================================================
    # EMPLOYEE AUTHENTICATION
    # ============================================================

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    must_change_password = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    email_verified = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    failed_login_attempts = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    locked_until = db.Column(
        db.DateTime,
        nullable=True
    )

    last_login = db.Column(
        db.DateTime,
        nullable=True
    )

    # ============================================================
    # PASSWORD RESET
    # ============================================================

    password_reset_otp_hash = db.Column(
        db.String(255),
        nullable=True
    )

    password_reset_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    password_reset_attempts = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

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
    # ASSET ASSIGNMENTS
    # ============================================================

    assignments = db.relationship(
        "AssetAssignment",
        back_populates="employee",
        lazy=True
    )
    
    profile_image = db.Column(
    db.String(255),
    nullable=True
    )

    # ============================================================
    # REPRESENTATION
    # ============================================================

    def __repr__(self):
        return (
            f"<Employee {self.id} "
            f"{self.employee_id} "
            f"{self.email}>"
        )