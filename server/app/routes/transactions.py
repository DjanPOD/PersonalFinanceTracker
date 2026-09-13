from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models.category import Category
from app.models.transaction import Transaction
from app.utils.auth import token_required

transactions_bp = Blueprint(
    "transactions",
    __name__,
    url_prefix="/api/v1/transactions",
)

VALID_TRANSACTION_TYPES = {"income", "expense"}
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


def parse_transaction_date(value: object) -> date:
    if not isinstance(value, str):
        raise ValueError("Transaction date must use YYYY-MM-DD format.")

    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(
            "Transaction date must use YYYY-MM-DD format."
        ) from error


def parse_amount(value: object) -> Decimal:
    if isinstance(value, bool):
        raise ValueError("Amount must be a positive number.")

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ValueError("Amount must be a positive number.") from error

    if not amount.is_finite() or amount <= 0:
        raise ValueError("Amount must be a positive number.")

    if amount.as_tuple().exponent < -2:
        raise ValueError("Amount can have at most two decimal places.")

    if amount > Decimal("9999999999.99"):
        raise ValueError("Amount is too large.")

    return amount


def get_user_category(category_id: object, transaction_type: str) -> Category:
    if isinstance(category_id, bool):
        raise ValueError("Category ID must be a whole number.")

    try:
        category_id = int(category_id)
    except (TypeError, ValueError) as error:
        raise ValueError("Category ID must be a whole number.") from error

    category = db.session.scalar(
        db.select(Category).where(
            Category.id == category_id,
            Category.user_id == g.current_user.id,
        )
    )

    if category is None:
        raise LookupError("Category not found.")

    if category.type != transaction_type:
        raise ValueError(
            "Transaction type must match the category type."
        )

    return category


def serialize_pagination(pagination: object) -> dict:
    return {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_previous": pagination.has_prev,
    }


@transactions_bp.get("")
@token_required
def list_transactions():
    transaction_type = request.args.get("type", "").strip().lower()
    category_id = request.args.get("category_id", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    if transaction_type and transaction_type not in VALID_TRANSACTION_TYPES:
        return jsonify(
            {"error": "Type must be 'income' or 'expense'."}
        ), 400

    statement = (
        db.select(Transaction)
        .where(Transaction.user_id == g.current_user.id)
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.id.desc(),
        )
    )

    if transaction_type:
        statement = statement.where(Transaction.type == transaction_type)

    if category_id:
        try:
            parsed_category_id = int(category_id)
        except ValueError:
            return jsonify(
                {"error": "Category ID must be a whole number."}
            ), 400

        statement = statement.where(
            Transaction.category_id == parsed_category_id
        )

    try:
        parsed_start_date = (
            parse_transaction_date(start_date) if start_date else None
        )
        parsed_end_date = (
            parse_transaction_date(end_date) if end_date else None
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    if (
        parsed_start_date is not None
        and parsed_end_date is not None
        and parsed_start_date > parsed_end_date
    ):
        return jsonify(
            {"error": "Start date cannot be after end date."}
        ), 400

    if parsed_start_date is not None:
        statement = statement.where(
            Transaction.transaction_date >= parsed_start_date
        )

    if parsed_end_date is not None:
        statement = statement.where(
            Transaction.transaction_date <= parsed_end_date
        )

    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get(
        "per_page",
        default=DEFAULT_PER_PAGE,
        type=int,
    )

    if page is None or page < 1:
        return jsonify({"error": "Page must be at least 1."}), 400

    if per_page is None or not 1 <= per_page <= MAX_PER_PAGE:
        return jsonify(
            {
                "error": (
                    f"Per-page value must be between 1 "
                    f"and {MAX_PER_PAGE}."
                )
            }
        ), 400

    pagination = db.paginate(
        statement,
        page=page,
        per_page=per_page,
        max_per_page=MAX_PER_PAGE,
        error_out=False,
    )

    return jsonify(
        {
            "transactions": [
                transaction.to_dict() for transaction in pagination.items
            ],
            "pagination": serialize_pagination(pagination),
        }
    ), 200


@transactions_bp.post("")
@token_required
def create_transaction():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    transaction_type = str(data.get("type", "")).strip().lower()
    description = data.get("description")
    errors = {}

    if transaction_type not in VALID_TRANSACTION_TYPES:
        errors["type"] = "Type must be 'income' or 'expense'."

    if description is not None:
        if not isinstance(description, str):
            errors["description"] = "Description must be a string."
        else:
            description = description.strip()
            if len(description) > 255:
                errors["description"] = (
                    "Description must be 255 characters or fewer."
                )
            elif not description:
                description = None

    try:
        amount = parse_amount(data.get("amount"))
    except ValueError as error:
        errors["amount"] = str(error)

    try:
        transaction_date = parse_transaction_date(
            data.get("transaction_date")
        )
    except ValueError as error:
        errors["transaction_date"] = str(error)

    category = None
    if transaction_type in VALID_TRANSACTION_TYPES:
        try:
            category = get_user_category(
                data.get("category_id"),
                transaction_type,
            )
        except LookupError as error:
            errors["category_id"] = str(error)
        except ValueError as error:
            errors["category_id"] = str(error)

    if errors:
        return jsonify({"errors": errors}), 400

    transaction = Transaction(
        amount=amount,
        type=transaction_type,
        description=description,
        transaction_date=transaction_date,
        user_id=g.current_user.id,
        category_id=category.id,
    )

    db.session.add(transaction)
    db.session.commit()

    return jsonify({"transaction": transaction.to_dict()}), 201


@transactions_bp.get("/<int:transaction_id>")
@token_required
def get_transaction(transaction_id: int):
    transaction = db.session.scalar(
        db.select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == g.current_user.id,
        )
    )

    if transaction is None:
        return jsonify({"error": "Transaction not found."}), 404

    return jsonify({"transaction": transaction.to_dict()}), 200


@transactions_bp.patch("/<int:transaction_id>")
@token_required
def update_transaction(transaction_id: int):
    transaction = db.session.scalar(
        db.select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == g.current_user.id,
        )
    )

    if transaction is None:
        return jsonify({"error": "Transaction not found."}), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    errors = {}
    new_type = transaction.type

    if "type" in data:
        new_type = str(data["type"]).strip().lower()
        if new_type not in VALID_TRANSACTION_TYPES:
            errors["type"] = "Type must be 'income' or 'expense'."

    if "amount" in data:
        try:
            transaction.amount = parse_amount(data["amount"])
        except ValueError as error:
            errors["amount"] = str(error)

    if "description" in data:
        description = data["description"]
        if description is not None and not isinstance(description, str):
            errors["description"] = "Description must be a string."
        elif isinstance(description, str):
            description = description.strip()
            if len(description) > 255:
                errors["description"] = (
                    "Description must be 255 characters or fewer."
                )
            else:
                transaction.description = description or None
        else:
            transaction.description = None

    if "transaction_date" in data:
        try:
            transaction.transaction_date = parse_transaction_date(
                data["transaction_date"]
            )
        except ValueError as error:
            errors["transaction_date"] = str(error)

    category_id = data.get("category_id", transaction.category_id)

    if not errors:
        try:
            category = get_user_category(category_id, new_type)
        except LookupError as error:
            errors["category_id"] = str(error)
        except ValueError as error:
            errors["category_id"] = str(error)
        else:
            transaction.type = new_type
            transaction.category_id = category.id

    if errors:
        db.session.rollback()
        return jsonify({"errors": errors}), 400

    db.session.commit()

    return jsonify({"transaction": transaction.to_dict()}), 200


@transactions_bp.delete("/<int:transaction_id>")
@token_required
def delete_transaction(transaction_id: int):
    transaction = db.session.scalar(
        db.select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == g.current_user.id,
        )
    )

    if transaction is None:
        return jsonify({"error": "Transaction not found."}), 404

    db.session.delete(transaction)
    db.session.commit()

    return "", 204