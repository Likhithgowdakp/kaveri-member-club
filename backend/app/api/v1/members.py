import re
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.config import settings
from app.database import get_db
from app.models.member import Member
from app.schemas.member import (
    MemberRegisterRequest,
    MemberRegistrationResult,
    MemberResponse,
    MemberLoginRequest,
    PaymentSubmissionRequest,
)
from app.schemas.consent import CustomerPreferencesResponse, ConsentItem
from app.services.consent_service import get_all_consents_for_member
from app.services.member_service import register_member
from app.services.messaging.sms import DLTSmsProvider
from app.security.hashing import verify_password
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

    if member.payment_status == "pending":
        welcome_msg = (
            f"Thank you {member.full_name}! Your application for Kaveri Member Club and ₹{member.payment_amount} payment verification have been submitted. "
            f"Reference ID: {member.member_number}. Once the store administrator approves your payment screenshot, your official membership card will be activated!"
        )
        sms_text = (
            f"Namaskara {member.full_name}! We received your Kaveri Member Club application (Ref: {member.member_number}) with Rs {member.payment_amount} payment details. "
            f"Store admin is verifying your payment. Once approved, your active card will be issued. Kaveri Electronic Halaguru."
        )
    else:
        welcome_msg = (
            f"Congratulations {member.full_name}! You are now an official member of Kaveri Member Club. "
            f"Your Membership ID is {member.member_number}. You have received {settings.REGISTRATION_BONUS_POINTS} welcome points!"
        )
        sms_text = (
            f"Namaskara {member.full_name}! Welcome to KAVERI CLUB HALAGURU. "
            f"Your Member ID is {member.member_number} with {settings.REGISTRATION_BONUS_POINTS} loyalty points. "
            f"Redeem instant discounts on TVs & home appliances at Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri."
        )

    # Automatically dispatch registration notification SMS directly from the Kaveri App to the registered phone number
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


@router.post("/{member_number}/submit-payment", response_model=MemberResponse)
async def submit_member_payment(
    member_number: str,
    payment_data: PaymentSubmissionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows a customer to upload or re-submit their ₹499 UPI payment screenshot and UTR.
    Moves status to pending_verification for admin review.
    """
    from datetime import datetime, timezone
    stmt = select(Member).where(Member.member_number == member_number.strip().upper())
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    now = datetime.now(timezone.utc)
    member.payment_screenshot = payment_data.payment_screenshot
    if payment_data.payment_utr:
        member.payment_utr = payment_data.payment_utr
    member.payment_status = "pending"
    member.status = "pending_verification"
    member.payment_submitted_at = now
    member.rejection_reason = None
    member.updated_at = now

    await db.commit()
    await db.refresh(member)
    return MemberResponse.model_validate(member)


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


@router.post("/login", response_model=CustomerPreferencesResponse)
async def member_login_with_password(
    login_data: MemberLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer portal login endpoint using Member ID (e.g. KAV-000001) or mobile number + password:
    - Validates Member ID or Phone.
    - Verifies password with Argon2id hash.
    - Sends automated login confirmation SMS directly from the app under KAVERI CLUB HALAGURU.
    - Returns full member profile and consent preferences.
    """
    identifier_clean = login_data.member_identifier.strip().upper()
    
    digits_only = re.sub(r"\D", "", login_data.member_identifier)
    phone_clean = f"+91{digits_only[-10:]}" if len(digits_only) >= 10 else None

    conditions = [func.upper(Member.member_number) == identifier_clean]
    if phone_clean:
        conditions.append(Member.primary_phone == phone_clean)
    else:
        conditions.append(Member.primary_phone == identifier_clean)

    stmt = select(Member).where(or_(*conditions))
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Member ID or Password. Please check your credentials.",
        )

    if member.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This membership account is closed.",
        )

    if member.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This membership account is currently suspended. Please contact Kaveri Electronic store.",
        )

    # Verify password
    if member.password_hash:
        if not verify_password(login_data.password, member.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Member ID or Password. Please check your credentials.",
            )
    else:
        # Fallback for members registered before password field
        if login_data.password not in member.primary_phone:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Member ID or Password. Please check your credentials.",
            )

    # Dispatch access notification SMS to the member's registered phone
    login_sms = (
        f"Namaskara {member.full_name}! You have successfully logged into KAVERI CLUB HALAGURU. "
        f"Member ID: {member.member_number}. Points Balance: {member.loyalty_points} pts. "
        f"Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri."
    )
    sms_provider = DLTSmsProvider()
    await sms_provider.send_message(
        recipient_phone=member.primary_phone,
        message_text=login_sms,
    )

    consents = await get_all_consents_for_member(db, member.id)

    return CustomerPreferencesResponse(
        member_number=member.member_number,
        full_name=member.full_name,
        primary_phone=member.primary_phone,
        email=member.email,
        address=member.address,
        loyalty_points=member.loyalty_points,
        consents=[ConsentItem.model_validate(c) for c in consents],
    )
