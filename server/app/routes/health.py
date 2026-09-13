from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api/v1")


@health_bp.get("/health")
def health_check():
    return jsonify(
        {
            "service": "personal-finance-api",
            "status": "ok",
        }
    ), 200