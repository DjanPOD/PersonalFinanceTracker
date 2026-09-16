from calendar import monthrange
from datetime import date
from decimal import Decimal

from flask import Blueprint, g, jsonify, request
from sqlalchemy import case, func

from app.extensions import db
from app.models.category import Category
from app.models.transaction import Transaction
from app.utils.auth import token_required

dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/v1/dashboard",
)


def parse_month(value: str | None) -> tuple[date, date]:
    if not value:
        today = date.today()

        return (
            date(today.year, today.month, 1),
            date(
                today.year,
                today.month,
                monthrange(today.year, today.month)[1],
            ),
        )

    try:
        year_text, month_text = value.split("-", maxsplit=1)
        year = int(year_text)
        month = int(month_text)
        last_day = monthrange(year, month)[1]

        return (
            date(year, month, 1),
            date(year, month, last_day),
        )
    except (TypeError, ValueError) as error:
        raise ValueError("Month must use YYYY-MM format.") from error


def money_to_string(value: Decimal | None) -> str:
    return str(value or Decimal("0.00"))


@dashboard_bp.get("/summary")
@token_required
def get_dashboard_summary():
    month_value = request.args.get("month")

    try:
        start_date, end_date = parse_month(month_value)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    totals_statement = db.select(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "income", Transaction.amount),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "expense", Transaction.amount),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("total_expenses"),
    ).where(
        Transaction.user_id == g.current_user.id,
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
    )

    totals = db.session.execute(totals_statement).one()

    total_income = totals.total_income
    total_expenses = totals.total_expenses
    balance = total_income - total_expenses

    category_totals_statement = (
        db.select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            func.sum(Transaction.amount).label("amount"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == g.current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )

    category_totals = db.session.execute(category_totals_statement).all()

    recent_transactions_statement = (
        db.select(Transaction)
        .where(
            Transaction.user_id == g.current_user.id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.id.desc(),
        )
        .limit(5)
    )

    recent_transactions = db.session.scalars(
        recent_transactions_statement
    ).all()

    return jsonify(
        {
            "period": {
                "month": start_date.strftime("%Y-%m"),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "summary": {
                "total_income": money_to_string(total_income),
                "total_expenses": money_to_string(total_expenses),
                "balance": money_to_string(balance),
            },
            "expenses_by_category": [
                {
                    "category_id": row.category_id,
                    "category_name": row.category_name,
                    "category_color": row.category_color,
                    "amount": money_to_string(row.amount),
                }
                for row in category_totals
            ],
            "recent_transactions": [
                transaction.to_dict()
                for transaction in recent_transactions
            ],
        }
    ), 200