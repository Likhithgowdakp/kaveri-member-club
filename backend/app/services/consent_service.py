from datetime import datetime, timezone
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
from app.config import settings
from app.models.consent import MarketingConsent, ConsentAuditLog
from app.models.member import Member
from app.schemas.member import normalize_indian_phone


async def get_member_by_credentials(
    db: AsyncSession, member_number: str, phone: str
) -> Member:
    """Verifies customer identity securely using member number AND primary phone."""
    try:
        norm_phone = normalize_indian_phone(phone)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid mobile number format.",
        )

    stmt = select(Member).where(
        and_(
            Member.member_number == member_number.strip().upper(),
            Member.primary_phone == norm_phone,
        )
    )
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching member record found with this Membership ID and Mobile Number.",
        )
    return member


async def check_channel_consent(
    db: AsyncSession, member_id: int, channel: str
) -> bool:
    """
    Checks if a member has active, granted consent for a specific channel.
    Must be called immediately before dispatching any message.
    """
    stmt = select(MarketingConsent).where(
        and_(
            MarketingConsent.member_id == member_id,
            MarketingConsent.channel == channel.lower(),
        )
    )
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()
    return consent is not None and consent.consent_state == "granted"


async def update_member_channel_consent(
    db: AsyncSession,
    member_id: int,
    channel: str,
    grant: bool,
    source: str = "customer_portal",
    reason: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> MarketingConsent:
    """
    Updates marketing consent for a channel and records an auditable entry.
    """
    channel = channel.lower()
    now = datetime.now(timezone.utc)
    new_state = "granted" if grant else "withdrawn"

    stmt = select(MarketingConsent).where(
        and_(
            MarketingConsent.member_id == member_id,
            MarketingConsent.channel == channel,
        )
    )
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()

    prev_state = consent.consent_state if consent else None

    if consent:
        consent.consent_state = new_state
        consent.source = source
        consent.notice_version = settings.DPDP_NOTICE_VERSION
        consent.ip_address = ip_address
        consent.updated_at = now
        if grant:
            consent.granted_at = now
        else:
            consent.withdrawn_at = now
    else:
        consent = MarketingConsent(
            member_id=member_id,
            channel=channel,
            consent_state=new_state,
            source=source,
            notice_version=settings.DPDP_NOTICE_VERSION,
            granted_at=now if grant else None,
            withdrawn_at=now if not grant else None,
            ip_address=ip_address,
            created_at=now,
            updated_at=now,
        )
        db.add(consent)

    # Add audit log entry
    audit = ConsentAuditLog(
        member_id=member_id,
        channel=channel,
        previous_state=prev_state,
        new_state=new_state,
        action_source=source,
        reason=reason or ("User requested opt-out" if not grant else "User granted opt-in"),
        notice_version=settings.DPDP_NOTICE_VERSION,
        ip_address=ip_address,
        created_at=now,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(consent)
    return consent


async def get_all_consents_for_member(
    db: AsyncSession, member_id: int
) -> List[MarketingConsent]:
    stmt = (
        select(MarketingConsent)
        .where(MarketingConsent.member_id == member_id)
        .order_by(MarketingConsent.channel)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
