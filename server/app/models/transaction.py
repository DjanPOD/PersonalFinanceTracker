from datetime import date, datetime, timezone
from decimal import Decimal

from app.extensions import db


class Transaction(db.Model):
    __tablename__ = "transactions"

    __table_args__ = (
        db.CheckConstraint(
            "amount > 0",
            name="ck_transactions_amount_positive",
        ),
        db.CheckConstraint(
            "type IN ('income', 'expense')",
            name="ck_transactions_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    transaction_date = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    user = db.relationship("User", back_populates="transactions")
    category = db.relationship("Category", back_populates="transactions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "amount": str(self.amount),
            "type": self.type,
            "description": self.description,
            "transaction_date": self.transaction_date.isoformat(),
            "category": self.category.to_dict() if self.category else None,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<Transaction {self.id}: "
            f"{self.type} {Decimal(self.amount)}>"
        )