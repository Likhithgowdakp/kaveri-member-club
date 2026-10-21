from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    primary_phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    alt_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, suspended, closed
    loyalty_points: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # Relationships
    consents: Mapped[List["MarketingConsent"]] = relationship(
        "MarketingConsent", back_populates="member", cascade="all, delete-orphan"
    )
    loyalty_transactions: Mapped[List["LoyaltyTransaction"]] = relationship(
        "LoyaltyTransaction", back_populates="member", cascade="all, delete-orphan"
    )
    send_jobs: Mapped[List["CampaignSendJob"]] = relationship(
        "CampaignSendJob", back_populates="member", cascade="all, delete-orphan"
    )
