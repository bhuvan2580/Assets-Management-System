from datetime import datetime, timezone

from extensions import db


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    jti = db.Column(db.String(36), primary_key=True)
    token_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
    )