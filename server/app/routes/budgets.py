from calendar import monthrange
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.utils.auth import token_required


budgets_bp = Blueprint(
    "budgets",
    __name__,
    url_prefix="/api/v1/budgets",
)

MAX_BUDGET_AMOUNT = Decimal("9999999999.99")


def parse_budget_month(value: object) -> date:
    if not isinstance(value, str):
        raise ValueError("Month must use YYYY-MM format.")

    try:
        year_text, month_text = value.split("-", maxsplit=1)
        year = int(year_text)
        month = int(month_text)

        monthrange(year, month)

        return date(year, month, 1)
    except (TypeError, ValueError) as error:
        raise ValueError("Month must use YYYY-MM format.") from error


def get_month_end(month: date) -> date:
    return date(
        month.year,
        month.month,
        monthrange(month.year, month.month)[1],
    )


def parse_budget_amount(value: object) -> Decimal:
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

    if amount > MAX_BUDGET_AMOUNT:
        raise ValueError("Amount is too large.")

    return amount


def get_user_expense_category(category_id: object) -> Category:
    if isinstance(category_id, bool):
        raise ValueError("Category ID must be a whole number.")

    try:
        parsed_category_id = int(category_id)
    except (TypeError, ValueError) as error:
        raise ValueError("Category ID must be a whole number.") from error

    category = db.session.scalar(
        db.select(Category).where(
            Category.id == parsed_category_id,
            Category.user_id == g.current_user.id,
        )
    )

    if category is None:
        raise LookupError("Category not found.")

    if category.type != "expense":
        raise ValueError("Budgets can only be created for expense categories.")

    return category


def get_budget_spending(
    budget: Budget,
    month: date | None = None,
) -> Decimal:
    budget_month = month or budget.month
    month_end = get_month_end(budget_month)

    spent = db.session.scalar(
        db.select(
            func.coalesce(
                func.sum(Transaction.amount),
                Decimal("0.00"),
            )
        ).where(
            Transaction.user_id == budget.user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= budget_month,
            Transaction.transaction_date <= month_end,
        )
    )

    return Decimal(spent or Decimal("0.00"))


def serialize_budget(budget: Budget) -> dict:
    return budget.to_dict(spent=get_budget_spending(budget))


@budgets_bp.get("")
@token_required
def list_budgets():
    month_value = request.args.get("month")

    if month_value is None:
        today = date.today()
        month = date(today.year, today.month, 1)
    else:
        try:
            month = parse_budget_month(month_value)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

    budgets = db.session.scalars(
        db.select(Budget)
        .where(
            Budget.user_id == g.current_user.id,
            Budget.month == month,
        )
        .order_by(Budget.created_at.desc())
    ).all()

    return jsonify(
        {"budgets": [serialize_budget(budget) for budget in budgets]}
    ), 200


@budgets_bp.post("")
@token_required
def create_budget():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    errors = {}

    try:
        month = parse_budget_month(data.get("month"))
    except ValueError as error:
        errors["month"] = str(error)

    try:
        amount = parse_budget_amount(data.get("amount"))
    except ValueError as error:
        errors["amount"] = str(error)

    category = None
    try:
        category = get_user_expense_category(data.get("category_id"))
    except LookupError as error:
        errors["category_id"] = str(error)
    except ValueError as error:
        errors["category_id"] = str(error)

    if errors:
        return jsonify({"errors": errors}), 400

    budget = Budget(
        amount=amount,
        month=month,
        user_id=g.current_user.id,
        category_id=category.id,
    )

    try:
        db.session.add(budget)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            {
                "error": (
                    "A budget for this category and month "
                    "already exists."
                )
            }
        ), 409

    return jsonify({"budget": serialize_budget(budget)}), 201


@budgets_bp.patch("/<int:budget_id>")
@token_required
def update_budget(budget_id: int):
    budget = db.session.scalar(
        db.select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == g.current_user.id,
        )
    )

    if budget is None:
        return jsonify({"error": "Budget not found."}), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    errors = {}

    new_month = budget.month
    new_amount = budget.amount
    new_category = budget.category

    if "month" in data:
        try:
            new_month = parse_budget_month(data["month"])
        except ValueError as error:
            errors["month"] = str(error)

    if "amount" in data:
        try:
            new_amount = parse_budget_amount(data["amount"])
        except ValueError as error:
            errors["amount"] = str(error)

    if "category_id" in data:
        try:
            new_category = get_user_expense_category(data["category_id"])
        except LookupError as error:
            errors["category_id"] = str(error)
        except ValueError as error:
            errors["category_id"] = str(error)

    if errors:
        return jsonify({"errors": errors}), 400

    budget.month = new_month
    budget.amount = new_amount
    budget.category_id = new_category.id

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            {
                "error": (
                    "A budget for this category and month "
                    "already exists."
                )
            }
        ), 409

    return jsonify({"budget": serialize_budget(budget)}), 200


@budgets_bp.delete("/<int:budget_id>")
@token_required
def delete_budget(budget_id: int):
    budget = db.session.scalar(
        db.select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == g.current_user.id,
        )
    )

    if budget is None:
        return jsonify({"error": "Budget not found."}), 404

    db.session.delete(budget)
    db.session.commit()

    return "", 204