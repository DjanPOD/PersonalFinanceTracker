from flask import Flask
from flask_cors import CORS

from config import Config


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "http://localhost:5173",
            }
        },
    )

    from app.routes.health import health_bp

    app.register_blueprint(health_bp)

    return app