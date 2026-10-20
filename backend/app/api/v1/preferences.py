from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.member import MemberVerifyRequest
from app.schemas.consent import (
    CustomerPreferencesResponse,
    ConsentItem,
    CustomerConsentUpdateRequest,
    CustomerCorrectionRequest,
    CustomerDeletionRequest,
)
from app.services.consent_service import (
    get_member_by_credentials,
    get_all_consents_for_member,
    update_member_channel_consent,
)
from app.services.messaging.sms import DLTSmsProvider
from app.security.rate_limiter import get_client_ip

router = APIRouter(prefix="/preferences", tags=["Customer Preferences (Self-Service)"])


@router.post("/verify", response_model=CustomerPreferencesResponse)
async def verify_member_and_get_preferences(
    verify_req: MemberVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Secure customer verification endpoint:
    Requires both Member ID and Primary Phone.
    Returns customer details and active consent statuses.
    Sends automated account login notification SMS to customer's phone from Kaveri App.
    """
    member = await get_member_by_credentials(
        db, member_number=verify_req.member_number, phone=verify_req.phone
    )

    # Dispatch access notification SMS to the logged-in number
    login_sms = (
        f"Namaskara {member.full_name}! You have logged into KAVERI CLUB HALAGURU. "
        f"Member ID: {member.member_number}. Points Balance: {member.loyalty_points} pts. "
        f"Need assistance? Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri."
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


@router.post("/update-consent", response_model=CustomerPreferencesResponse)
async def update_customer_consent(
    update_req: CustomerConsentUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Self-service opt-in/opt-out endpoint:
    - Opt-out takes effect immediately!
    - Logs auditable consent change under DPDP Act.
    """
    member = await get_member_by_credentials(
        db, member_number=update_req.member_number, phone=update_req.phone
    )
    ip_addr = get_client_ip(request)

    if update_req.whatsapp_consent is not None:
        await update_member_channel_consent(
            db=db,
            member_id=member.id,
            channel="whatsapp",
            grant=update_req.whatsapp_consent,
            source="customer_portal",
            reason=update_req.reason,
            ip_address=ip_addr,
        )

    if update_req.sms_consent is not None:
        await update_member_channel_consent(
            db=db,
            member_id=member.id,
            channel="sms",
            grant=update_req.sms_consent,
            source="customer_portal",
            reason=update_req.reason,
            ip_address=ip_addr,
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


@router.post("/request-correction")
async def request_data_correction(
    req: CustomerCorrectionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows customer to request correction of personal details under DPDP Act.
    """
    member = await get_member_by_credentials(
        db, member_number=req.member_number, phone=req.phone
    )

    if req.requested_name:
        member.full_name = req.requested_name.strip()
    if req.requested_email:
        member.email = req.requested_email.strip()
    if req.requested_address:
        member.address = req.requested_address.strip()
    if req.notes:
        member.notes = f"{member.notes or ''}\nCorrection Note: {req.notes}".strip()

    await db.commit()
    return {"message": "Customer information successfully updated."}


@router.post("/request-deletion")
async def request_account_closure(
    req: CustomerDeletionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer request to close membership and opt out of all future communications.
    Preserves minimal suppression record to guarantee no future marketing.
    """
    member = await get_member_by_credentials(
        db, member_number=req.member_number, phone=req.phone
    )

    # 1. Close status
    member.status = "closed"
    member.notes = f"{member.notes or ''}\nClosed by customer request: {req.reason or 'Self-service'}".strip()

    # 2. Immediately withdraw all marketing consents
    await update_member_channel_consent(
        db=db,
        member_id=member.id,
        channel="whatsapp",
        grant=False,
        source="customer_portal_closure",
        reason="Account closure request",
    )
    await update_member_channel_consent(
        db=db,
        member_id=member.id,
        channel="sms",
        grant=False,
        source="customer_portal_closure",
        reason="Account closure request",
    )

    await db.commit()
    return {
        "message": "Your membership has been closed and all marketing consents have been revoked. No further messages will be sent."
    }
