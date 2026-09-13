from datetime import datetime, timezone

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "name",
            "type",
            name="uq_categories_user_name_type",
        ),
        db.CheckConstraint(
            "type IN ('income', 'expense')",
            name="ck_categories_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    color = db.Column(db.String(7), nullable=True)
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

    user = db.relationship("User", back_populates="categories")
    transactions = db.relationship(
        "Transaction",
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "color": self.color,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Category {self.name} ({self.type})>"