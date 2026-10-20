from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Text, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # festival, discount, new_arrival, member_only, service_reminder, welcome, loyalty
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp, sms, both
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    offer_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discount_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="draft", nullable=False
    )  # draft, pending_approval, approved, scheduled, running, completed, cancelled
    target_filter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON filters
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # Relationships
    send_jobs: Mapped[List["CampaignSendJob"]] = relationship(
        "CampaignSendJob", back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignSendJob(Base):
    __tablename__ = "campaign_send_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), index=True, nullable=False
    )
    member_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("members.id", ondelete="CASCADE"), index=True, nullable=False
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp, sms
    recipient_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )  # pending, queued, submitted, delivered, failed, skipped_opt_out, cancelled, dry_run
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="send_jobs")
    member: Mapped["Member"] = relationship("Member", back_populates="send_jobs")
    events: Mapped[List["MessageDeliveryEvent"]] = relationship(
        "MessageDeliveryEvent", back_populates="send_job", cascade="all, delete-orphan"
    )


class MessageDeliveryEvent(Base):
    __tablename__ = "message_delivery_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    send_job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("campaign_send_jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # whatsapp_cloud, dlt_sms, mock
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # queued, sent, delivered, read, failed, rejected
    raw_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    send_job: Mapped["CampaignSendJob"] = relationship("CampaignSendJob", back_populates="events")
