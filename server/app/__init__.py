from flask import Flask
from flask_cors import CORS

from app.extensions import db, migrate
from app.models import Budget, Category, Transaction, User
from config import Config


def create_app(config_object: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or Config)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "http://localhost:5173",
            }
        },
    )

    db.init_app(app)
    migrate.init_app(app, db)

    from app.routes.auth import auth_bp
    from app.routes.categories import categories_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.health import health_bp
    from app.routes.transactions import transactions_bp
    from app.routes.budgets import budgets_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(transactions_bp)

    return app