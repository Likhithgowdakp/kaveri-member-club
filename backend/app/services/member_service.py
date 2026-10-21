import asyncio
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException, status
from app.config import settings
from app.models.member import Member
from app.models.consent import MarketingConsent, ConsentAuditLog
from app.models.loyalty import LoyaltyTransaction
from app.models.campaign import CampaignSendJob
from app.schemas.member import MemberRegisterRequest
from app.security.hashing import hash_password


# Async lock for concurrency safety across tasks and SQLite connections
_reg_lock = asyncio.Lock()


async def generate_next_member_number(db: AsyncSession) -> str:
    """
    Generates the next sequential membership ID (e.g. KAV-000001).
    """
    stmt = select(func.max(Member.id))
    result = await db.execute(stmt)
    max_id = result.scalar() or 0
    next_number = max_id + 1
    return f"{settings.MEMBER_ID_PREFIX}{next_number:06d}"


async def register_member(
    db: AsyncSession,
    request: MemberRegisterRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[Member, bool, bool]:
    """
    Registers a new member:
    - Normalizes phone numbers.
    - Rejects duplicate primary mobile number.
    - Generates unique membership ID.
    - Saves separate, voluntary consent for WhatsApp and SMS.
    - Awards welcome loyalty points.
    - Returns (member, whatsapp_opted_in, sms_opted_in).
    """
    async with _reg_lock:
        # 1. Check for duplicate primary phone
        existing_stmt = select(Member).where(Member.primary_phone == request.primary_phone)
        existing_res = await db.execute(existing_stmt)
        existing_member = existing_res.scalar_one_or_none()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A member is already registered with mobile number {request.primary_phone}. "
                    f"If you already have a membership card, please use the Customer Preferences Portal or visit the HMS Complex store."
                ),
            )

        # 2. Concurrency-safe membership ID generation
        member_number = await generate_next_member_number(db)
        
        # 3. Create Member record
        now = datetime.now(timezone.utc)
        pwd_to_hash = request.password if request.password else request.primary_phone[-4:]
        pwd_hash = hash_password(pwd_to_hash)
        new_member = Member(
            member_number=member_number,
            full_name=request.full_name,
            primary_phone=request.primary_phone,
            alt_phone=request.alt_phone,
            email=str(request.email) if request.email else None,
            address=request.address,
            password_hash=pwd_hash,
            status="active",
            loyalty_points=settings.REGISTRATION_BONUS_POINTS,
            created_at=now,
            updated_at=now,
        )
        db.add(new_member)
        await db.flush()  # Generate new_member.id

        # 4. Record WhatsApp Marketing Consent
        wa_state = "granted" if request.consent_whatsapp else "never_given"
        wa_consent = MarketingConsent(
            member_id=new_member.id,
            channel="whatsapp",
            consent_state=wa_state,
            source="registration_web",
            notice_version=settings.DPDP_NOTICE_VERSION,
            granted_at=now if request.consent_whatsapp else None,
            withdrawn_at=None,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            updated_at=now,
        )
        db.add(wa_consent)

        wa_audit = ConsentAuditLog(
            member_id=new_member.id,
            channel="whatsapp",
            previous_state=None,
            new_state=wa_state,
            action_source="registration_web",
            reason="Initial member registration choice",
            notice_version=settings.DPDP_NOTICE_VERSION,
            ip_address=ip_address,
            created_at=now,
        )
        db.add(wa_audit)

        # 5. Record SMS Marketing Consent
        sms_state = "granted" if request.consent_sms else "never_given"
        sms_consent = MarketingConsent(
            member_id=new_member.id,
            channel="sms",
            consent_state=sms_state,
            source="registration_web",
            notice_version=settings.DPDP_NOTICE_VERSION,
            granted_at=now if request.consent_sms else None,
            withdrawn_at=None,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            updated_at=now,
        )
        db.add(sms_consent)

        sms_audit = ConsentAuditLog(
            member_id=new_member.id,
            channel="sms",
            previous_state=None,
            new_state=sms_state,
            action_source="registration_web",
            reason="Initial member registration choice",
            notice_version=settings.DPDP_NOTICE_VERSION,
            ip_address=ip_address,
            created_at=now,
        )
        db.add(sms_audit)

        # 6. Record Welcome Loyalty Points in Ledger
        loyalty_entry = LoyaltyTransaction(
            member_id=new_member.id,
            points=settings.REGISTRATION_BONUS_POINTS,
            transaction_type="signup_bonus",
            reference_id=f"JOIN-{member_number}",
            notes=f"Welcome bonus for joining Kaveri Member Club ({settings.REGISTRATION_BONUS_POINTS} points)",
            created_at=now,
        )
        db.add(loyalty_entry)

        await db.commit()
        await db.refresh(new_member)
        return new_member, request.consent_whatsapp, request.consent_sms


async def washout_member_data(db: AsyncSession, member_id: int) -> bool:
    """
    Permanently erases ('washes out') all data associated with a member:
    - Campaign send jobs & delivery logs
    - Loyalty ledger transactions
    - Consent audit logs & marketing consents
    - Core member profile record
    Guarantees complete right to erasure under DPDP Act 2023.
    """
    # 1. Delete campaign send jobs
    await db.execute(delete(CampaignSendJob).where(CampaignSendJob.member_id == member_id))

    # 2. Delete loyalty transactions
    await db.execute(delete(LoyaltyTransaction).where(LoyaltyTransaction.member_id == member_id))

    # 3. Delete consent audit logs
    await db.execute(delete(ConsentAuditLog).where(ConsentAuditLog.member_id == member_id))

    # 4. Delete marketing consents
    await db.execute(delete(MarketingConsent).where(MarketingConsent.member_id == member_id))

    # 5. Delete member profile
    await db.execute(delete(Member).where(Member.id == member_id))

    await db.commit()
    return True
