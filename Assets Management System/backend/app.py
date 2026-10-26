from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from extensions import db, migrate, jwt, mail

from routes.assets import assets_bp
from routes.vendors import vendors_bp
from routes.assignments import assignments_bp
from routes.employees import employees_bp
from routes.dashboard import dashboard_bp
from routes.auth import auth_bp
from routes.users import users_bp
from routes.asset_requests import asset_requests_bp
from routes.employee_assets import employee_assets_bp
from routes.employee_dashboard import employee_dashboard_bp


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)
    
    app.register_blueprint(assets_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(assignments_bp)
    app.register_blueprint(employees_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(asset_requests_bp)
    app.register_blueprint(employee_assets_bp)
    app.register_blueprint(employee_dashboard_bp)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:4173",
                    "http://localhost:4173"
                ],
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "Content-Type",
                    "Authorization"
                ],
                "supports_credentials": True
            }
        }
    )

    from models import (
        Employee,
        Vendor,
        Asset,
        AssetAssignment,
        User
    )

    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "success",
            "message": "Asset Management API is running"
        })

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )