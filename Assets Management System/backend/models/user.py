from datetime import datetime

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    # ============================================================
    # ROLE
    # ============================================================
    #
    # Users are only system-level accounts.
    #
    # Allowed roles:
    #   SUPERUSER
    #   ADMIN
    #   IT
    #
    # EMPLOYEE is no longer stored in the users table.
    # Employee authentication will be handled by the Employee model.
    #

    role = db.Column(
        db.String(20),
        nullable=False,
        default="IT"
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    email_verified = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    must_change_password = db.Column(
        db.Boolean,
        nullable=False,
        default=True
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

    # Stores the HASHED OTP.
    # The actual OTP is never stored in the database.

    password_reset_otp_hash = db.Column(
        db.String(255),
        nullable=True
    )

    # Time at which the OTP expires.

    password_reset_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    # Number of incorrect OTP attempts.

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
    
    profile_image = db.Column(
    db.String(255),
    nullable=True
    )

    # ============================================================
    # REPRESENTATION
    # ============================================================

    def __repr__(self):
        return (
            f"<User {self.id} "
            f"{self.email} "
            f"{self.role}>"
        )