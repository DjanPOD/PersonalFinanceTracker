from datetime import date, datetime, timezone
from decimal import Decimal

from app.extensions import db


class Budget(db.Model):
    __tablename__ = "budgets"

    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "category_id",
            "month",
            name="uq_budgets_user_category_month",
        ),
        db.CheckConstraint(
            "amount > 0",
            name="ck_budgets_amount_positive",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    month = db.Column(db.Date, nullable=False, index=True)
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

    user = db.relationship("User", back_populates="budgets")
    category = db.relationship("Category", back_populates="budgets")

    def to_dict(
        self,
        spent: Decimal | None = None,
    ) -> dict:
        spent_amount = spent or Decimal("0.00")
        remaining = Decimal(self.amount) - spent_amount

        progress_percentage = (
            (spent_amount / Decimal(self.amount)) * Decimal("100")
        )

        return {
            "id": self.id,
            "month": self.month.strftime("%Y-%m"),
            "amount": str(self.amount),
            "spent": str(spent_amount),
            "remaining": str(remaining),
            "progress_percentage": round(
                float(progress_percentage),
                2,
            ),
            "category": self.category.to_dict() if self.category else None,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<Budget {self.id}: "
            f"{self.month.strftime('%Y-%m')} {Decimal(self.amount)}>"
        )