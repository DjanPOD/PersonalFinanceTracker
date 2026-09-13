import re

from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.user import User
from app.utils.auth import create_access_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    errors = {}

    if not name:
        errors["name"] = "Name is required."
    elif len(name) > 100:
        errors["name"] = "Name must be 100 characters or fewer."

    if not email:
        errors["email"] = "Email is required."
    elif len(email) > 255 or not EMAIL_PATTERN.fullmatch(email):
        errors["email"] = "Enter a valid email address."

    if not isinstance(password, str):
        errors["password"] = "Password must be a string."
    elif len(password) < 12:
        errors["password"] = "Password must be at least 12 characters."

    if errors:
        return jsonify({"errors": errors}), 400

    existing_user = db.session.scalar(
        db.select(User).where(User.email == email)
    )

    if existing_user is not None:
        return jsonify(
            {"error": "An account with that email already exists."}
        ), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"user": user.to_dict()}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not email or not isinstance(password, str):
        return jsonify({"error": "Email and password are required."}), 400

    user = db.session.scalar(
        db.select(User).where(User.email == email)
    )

    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    access_token = create_access_token(user.id)

    return jsonify(
        {
            "access_token": access_token,
            "token_type": "Bearer",
            "user": user.to_dict(),
        }
    ), 200


@auth_bp.get("/me")
@token_required
def get_current_user():
    return jsonify({"user": g.current_user.to_dict()}), 200