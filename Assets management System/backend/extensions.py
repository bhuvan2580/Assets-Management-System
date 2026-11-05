from flask import jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
mail = Mail()


def rate_limit_response(limit):
    return make_response(
        jsonify({
            "success": False,
            "message": (
                "Too many requests. Please wait before trying again."
            ),
            "error": "rate_limit_exceeded"
        }),
        429
    )


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    on_breach=rate_limit_response,
    storage_uri="memory://"
)