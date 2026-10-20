from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.member import Member
from app.schemas.member import (
    MemberRegisterRequest,
    MemberRegistrationResult,
    MemberResponse,
)
from app.services.member_service import register_member
from app.services.messaging.sms import DLTSmsProvider
from app.security.rate_limiter import rate_limit, get_client_ip

router = APIRouter(prefix="/members", tags=["Members (Public)"])


@router.post(
    "/register",
    response_model=MemberRegistrationResult,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(settings.RATE_LIMIT_REGISTRATION_PER_MINUTE, window_seconds=60, key_prefix="reg"))],
)
async def register_new_member(
    request_data: MemberRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public customer registration endpoint for Kaveri Member Club:
    - Normalizes Indian mobile number (+91).
    - Checks duplicate primary mobile number.
    - Concurrency-safe unique membership ID (e.g. KAV-000001).
    - Stores separate, voluntary WhatsApp and SMS consent.
    - Awards welcome loyalty points.
    - Automatically dispatches welcome SMS from the app under KAVERI CLUB HALAGURU.
    """
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    member, wa_opted, sms_opted = await register_member(
        db=db,
        request=request_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    welcome_msg = (
        f"Congratulations {member.full_name}! You are now an official member of Kaveri Member Club. "
        f"Your Membership ID is {member.member_number}. You have received {settings.REGISTRATION_BONUS_POINTS} welcome points!"
    )

    # Automatically dispatch welcome SMS directly from the Kaveri App to the registered phone number
    sms_text = (
        f"Namaskara {member.full_name}! Welcome to KAVERI CLUB HALAGURU. "
        f"Your Member ID is {member.member_number} with {settings.REGISTRATION_BONUS_POINTS} loyalty points. "
        f"Redeem instant discounts on TVs & home appliances at Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri."
    )
    sms_provider = DLTSmsProvider()
    await sms_provider.send_message(
        recipient_phone=member.primary_phone,
        message_text=sms_text,
    )

    return MemberRegistrationResult(
        member=MemberResponse.model_validate(member),
        whatsapp_consent_granted=wa_opted,
        sms_consent_granted=sms_opted,
        whatsapp_group_url=settings.BUSINESS_WHATSAPP_GROUP_URL,
        welcome_message=welcome_msg,
    )


@router.get("/{member_number}/card", response_model=MemberResponse)
async def get_membership_card(
    member_number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint to view digital membership card details.
    Does not expose sensitive private contact numbers or addresses.
    """
    stmt = select(Member).where(Member.member_number == member_number.strip().upper())
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member card not found.")

    # Return member data for card display
    return MemberResponse.model_validate(member)
