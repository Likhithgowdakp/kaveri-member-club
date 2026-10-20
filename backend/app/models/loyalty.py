from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id", ondelete="CASCADE"), index=True, nullable=False
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # positive or negative
    transaction_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # signup_bonus, purchase_reward, points_redemption, adjustment
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # bill/invoice or promo ID
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    member: Mapped["Member"] = relationship("Member", back_populates="loyalty_transactions")
