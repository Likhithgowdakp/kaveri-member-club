from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MarketingConsent(Base):
    __tablename__ = "marketing_consents"
    __table_args__ = (
        UniqueConstraint("member_id", "channel", name="uq_member_channel_consent"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id", ondelete="CASCADE"), index=True, nullable=False
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp, sms
    consent_state: Mapped[str] = mapped_column(
        String(20), default="never_given", nullable=False
    )  # granted, withdrawn, never_given
    source: Mapped[str] = mapped_column(
        String(50), default="registration_web", nullable=False
    )  # registration_web, customer_portal, admin_portal
    notice_version: Mapped[str] = mapped_column(
        String(50), default="v1.0_2026_DPDP", nullable=False
    )
    granted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # Relationships
    member: Mapped["Member"] = relationship("Member", back_populates="consents")


class ConsentAuditLog(Base):
    __tablename__ = "consent_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id", ondelete="CASCADE"), index=True, nullable=False
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    previous_state: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    new_state: Mapped[str] = mapped_column(String(20), nullable=False)
    action_source: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notice_version: Mapped[str] = mapped_column(String(50), default="v1.0_2026_DPDP", nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
