from datetime import datetime, timezone

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from extensions import db
from models.token_blocklist import TokenBlocklist


def cleanup_expired_tokens():
    now = datetime.now(timezone.utc)

    deleted_count = (
        db.session.query(TokenBlocklist)
        .filter(TokenBlocklist.expires_at < now)
        .delete(synchronize_session=False)
    )

    db.session.commit()
    return deleted_count


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        try:
            count = cleanup_expired_tokens()
            print(f"Removed {count} expired token records.")
        except Exception:
            db.session.rollback()
            raise