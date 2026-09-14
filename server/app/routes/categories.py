import re

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.category import Category
from app.utils.auth import token_required

categories_bp = Blueprint(
    "categories",
    __name__,
    url_prefix="/api/v1/categories",
)

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")
VALID_CATEGORY_TYPES = {"income", "expense"}


@categories_bp.get("")
@token_required
def list_categories():
    category_type = request.args.get("type", "").strip().lower()

    if category_type and category_type not in VALID_CATEGORY_TYPES:
        return jsonify(
            {"error": "Category type must be 'income' or 'expense'."}
        ), 400

    statement = (
        db.select(Category)
        .where(Category.user_id == g.current_user.id)
        .order_by(Category.type, Category.name)
    )

    if category_type:
        statement = statement.where(Category.type == category_type)

    categories = db.session.scalars(statement).all()

    return jsonify(
        {
            "categories": [
                category.to_dict() for category in categories
            ]
        }
    ), 200


@categories_bp.post("")
@token_required
def create_category():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    name = str(data.get("name", "")).strip()
    category_type = str(data.get("type", "")).strip().lower()
    color = data.get("color")

    errors = {}

    if not name:
        errors["name"] = "Name is required."
    elif len(name) > 100:
        errors["name"] = "Name must be 100 characters or fewer."

    if category_type not in VALID_CATEGORY_TYPES:
        errors["type"] = "Type must be 'income' or 'expense'."

    if color is not None:
        if not isinstance(color, str):
            errors["color"] = "Color must be a hex color string."
        else:
            color = color.strip()
            if not HEX_COLOR_PATTERN.fullmatch(color):
                errors["color"] = (
                    "Color must use the format '#RRGGBB'."
                )

    if errors:
        return jsonify({"errors": errors}), 400

    category = Category(
        name=name,
        type=category_type,
        color=color,
        user_id=g.current_user.id,
    )

    try:
        db.session.add(category)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            {
                "error": (
                    "A category with this name and type "
                    "already exists."
                )
            }
        ), 409

    return jsonify({"category": category.to_dict()}), 201