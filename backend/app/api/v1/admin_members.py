from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func, desc
from app.database import get_db
from app.models.member import Member
from app.models.consent import MarketingConsent, ConsentAuditLog
from app.models.loyalty import LoyaltyTransaction
from app.models.admin import AdminUser
from app.models.setting import StoreSetting
from app.schemas.member import MemberResponse, MemberUpdateRequest, PaymentRejectionRequest, PaymentApprovalRequest
from app.security.auth import get_current_admin, require_role
from pydantic import BaseModel
import urllib.parse
from app.services.messaging.sms import DLTSmsProvider
from app.services.messaging import whatsapp_provider
from app.services.member_service import washout_member_data
from app.api.deps import log_admin_action
from app.security.rate_limiter import get_client_ip

router = APIRouter(prefix="/admin/members", tags=["Admin Member Management"])


@router.get("/")
async def list_members(
    q: Optional[str] = Query(None, description="Search by name, phone (+91...) or Member ID (KAV-...)"),
    status_filter: Optional[str] = Query(None, description="active, suspended, closed"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and paginated list of members for owner/staff.
    """
    stmt = select(Member)

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Member.member_number.ilike(term),
                Member.full_name.ilike(term),
                Member.primary_phone.ilike(term),
            )
        )

    if status_filter:
        stmt = stmt.where(Member.status == status_filter.lower())

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(Member.id)).offset(offset).limit(page_size)
    res = await db.execute(stmt)
    members = list(res.scalars().all())

    return {
        "items": [MemberResponse.model_validate(m) for m in members],
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
    }


@router.get("/pending-approvals")
async def list_pending_payment_members(
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List all customer membership applications awaiting ₹499 UPI payment verification and approval.
    """
    stmt = (
        select(Member)
        .where(or_(Member.payment_status == "pending", Member.status == "pending_verification"))
        .order_by(desc(Member.id))
    )
    res = await db.execute(stmt)
    members = list(res.scalars().all())
    return {
        "items": [MemberResponse.model_validate(m) for m in members],
        "count": len(members),
    }


@router.post("/{member_id}/approve-payment")
async def approve_member_payment(
    member_id: int,
    request: Request,
    data: Optional[PaymentApprovalRequest] = None,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Store Administrator approves ₹499 membership payment:
    - Changes payment_status to 'approved' and status to 'active'.
    - Activates official digital membership card.
    - Dispatches official Welcome SMS under 'KAVERI CLUB HALAGURU'.
    - Logs admin action in audit trail.
    """
    if data and not data.verified_with_bank_statement:
        raise HTTPException(
            status_code=400,
            detail="Bank statement reconciliation confirmation is required. You must verify that ₹499 was received in actual bank / UPI statements before approving.",
        )

    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    # Idempotency guard: Prevent multiple active cards from being generated
    if member.status == "active" and member.payment_status == "approved":
        return {
            "success": True,
            "message": f"Membership {member.member_number} ({member.full_name}) is already active and approved.",
            "member": MemberResponse.model_validate(member),
        }

    now = datetime.now(timezone.utc)
    member.payment_status = "approved"
    member.status = "active"
    member.payment_approved_at = now
    member.payment_approved_by = current_user.username
    member.rejection_reason = None
    member.updated_at = now

    await db.commit()
    await db.refresh(member)

    # Dispatch official welcome SMS under KAVERI CLUB HALAGURU
    clean_phone = "".join(filter(str.isdigit, member.primary_phone))[-10:]
    welcome_sms = (
        f"Namaskara {member.full_name}! Your payment of Rs {member.payment_amount} is verified against store bank records and approved. "
        f"Welcome to KAVERI CLUB HALAGURU! Member ID: {member.member_number} ({member.loyalty_points} loyalty pts). "
        f"Your digital card is now active! Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru."
    )

    stmt_key = select(StoreSetting).where(StoreSetting.key == "sms_api_key")
    res_key = await db.execute(stmt_key)
    row_key = res_key.scalar_one_or_none()
    active_sms_key = row_key.value if row_key and row_key.value else None

    stmt_sender = select(StoreSetting).where(StoreSetting.key == "sms_sender_id")
    res_sender = await db.execute(stmt_sender)
    row_sender = res_sender.scalar_one_or_none()
    active_sender = row_sender.value if row_sender and row_sender.value else None

    sms_provider = DLTSmsProvider(api_key=active_sms_key, sender_id=active_sender)
    await sms_provider.send_message(
        recipient_phone=clean_phone,
        message_text=welcome_sms,
    )

    await log_admin_action(
        db,
        current_user,
        "APPROVE_PAYMENT_AND_ISSUE_CARD",
        "member",
        str(member.id),
        f"Verified ₹{member.payment_amount} payment against store bank records for UPI ID 7353398831-2@naviaxis (UTR: {member.payment_utr or 'N/A'}). Approved for {member.member_number} ({member.full_name}, +91{clean_phone}). Digital membership card unlocked.",
        get_client_ip(request),
    )

    return {
        "success": True,
        "message": f"Payment approved for {member.member_number} ({member.full_name}). Card activated and welcome SMS dispatched.",
        "member": MemberResponse.model_validate(member),
    }


@router.post("/{member_id}/reject-payment")
async def reject_member_payment(
    member_id: int,
    data: PaymentRejectionRequest,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Store Administrator rejects a payment submission (e.g. invalid screenshot or UTR).
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    reason = data.reason.strip() if data.reason and data.reason.strip() else "Payment proof could not be verified by store manager."
    now = datetime.now(timezone.utc)
    member.payment_status = "rejected"
    member.status = "rejected"
    member.rejection_reason = reason
    member.updated_at = now

    await db.commit()
    await db.refresh(member)

    await log_admin_action(
        db,
        current_user,
        "REJECT_PAYMENT",
        "member",
        str(member.id),
        f"Rejected ₹{member.payment_amount} payment for {member.member_number} ({member.full_name}): {reason}",
        get_client_ip(request),
    )

    return {
        "success": True,
        "message": f"Payment submission rejected for {member.member_number}. Customer can re-upload screenshot.",
        "member": MemberResponse.model_validate(member),
    }


@router.get("/{member_id}")
async def get_member_detail(
    member_id: int,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Detailed member profile with full consent audit history and loyalty points ledger.
    Sensitive action logged in audit trail.
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    # Consents
    consents_stmt = select(MarketingConsent).where(MarketingConsent.member_id == member_id)
    consents_res = await db.execute(consents_stmt)
    consents = list(consents_res.scalars().all())

    # Consent Audit Trail
    audit_stmt = (
        select(ConsentAuditLog)
        .where(ConsentAuditLog.member_id == member_id)
        .order_by(desc(ConsentAuditLog.id))
    )
    audit_res = await db.execute(audit_stmt)
    consent_history = list(audit_res.scalars().all())

    # Loyalty Transactions
    loyalty_stmt = (
        select(LoyaltyTransaction)
        .where(LoyaltyTransaction.member_id == member_id)
        .order_by(desc(LoyaltyTransaction.id))
    )
    loyalty_res = await db.execute(loyalty_stmt)
    loyalty_ledger = list(loyalty_res.scalars().all())

    await log_admin_action(
        db,
        current_user,
        "VIEW_MEMBER_DETAIL",
        "member",
        str(member.id),
        f"Viewed member {member.member_number}",
        get_client_ip(request),
    )

    return {
        "member": MemberResponse.model_validate(member),
        "consents": consents,
        "consent_history": consent_history,
        "loyalty_ledger": loyalty_ledger,
    }


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: int,
    update_data: MemberUpdateRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates member details or changes status (e.g. suspended, closed).
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    if update_data.full_name is not None:
        member.full_name = update_data.full_name
    if update_data.alt_phone is not None:
        member.alt_phone = update_data.alt_phone
    if update_data.email is not None:
        member.email = str(update_data.email) if update_data.email else None
    if update_data.address is not None:
        member.address = update_data.address
    if update_data.status is not None:
        member.status = update_data.status
    if update_data.notes is not None:
        member.notes = update_data.notes

    member.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(member)

    await log_admin_action(
        db,
        current_user,
        "UPDATE_MEMBER",
        "member",
        str(member.id),
        f"Updated member {member.member_number}",
        get_client_ip(request),
    )

    return MemberResponse.model_validate(member)


@router.post("/{member_id}/loyalty")
async def adjust_loyalty_points(
    member_id: int,
    points: int = Query(..., description="Points to add (positive) or deduct (negative)"),
    notes: str = Query(..., description="Reason for adjustment, e.g. In-store bill HMS-2026-091"),
    request: Request = None,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually add or redeem loyalty points with a mandatory note / invoice reference.
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    new_balance = member.loyalty_points + points
    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deduct {abs(points)} points. Current balance is {member.loyalty_points}.",
        )

    member.loyalty_points = new_balance
    tx_type = "purchase_reward" if points > 0 else "points_redemption"

    tx = LoyaltyTransaction(
        member_id=member.id,
        points=points,
        transaction_type=tx_type,
        reference_id=f"STAFF-{current_user.username}",
        notes=notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)
    await db.commit()

    await log_admin_action(
        db,
        current_user,
        "ADJUST_LOYALTY_POINTS",
        "member",
        str(member.id),
        f"Adjusted {points} pts for {member.member_number}: {notes}",
        get_client_ip(request),
    )

    return {
        "member_number": member.member_number,
        "new_balance": member.loyalty_points,
        "points_adjusted": points,
    }


class SendAppSmsRequest(BaseModel):
    message: str


@router.post("/{member_id}/send-app-sms")
async def send_app_sms_to_member(
    member_id: int,
    data: SendAppSmsRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Sends an official SMS to the customer directly from the app backend,
    under the business sender name 'KAVERI CLUB HALAGURU'.
    Never uses or exposes the owner's personal phone number!
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    clean_phone = "".join(filter(str.isdigit, member.primary_phone))[-10:]

    # Check store_settings table for dynamic SMS configuration
    stmt_key = select(StoreSetting).where(StoreSetting.key == "sms_api_key")
    res_key = await db.execute(stmt_key)
    row_key = res_key.scalar_one_or_none()
    active_sms_key = row_key.value if row_key and row_key.value else None

    stmt_sender = select(StoreSetting).where(StoreSetting.key == "sms_sender_id")
    res_sender = await db.execute(stmt_sender)
    row_sender = res_sender.scalar_one_or_none()
    active_sender = row_sender.value if row_sender and row_sender.value else None

    sms_provider = DLTSmsProvider(api_key=active_sms_key, sender_id=active_sender)
    result = await sms_provider.send_message(
        recipient_phone=clean_phone,
        message_text=data.message,
    )

    await log_admin_action(
        db,
        current_user,
        "SEND_APP_SMS",
        "member",
        str(member.id),
        f"Sent App SMS to +91{clean_phone} under KAVERI CLUB HALAGURU (Status: {result.status}, DryRun: {result.is_dry_run}): {data.message[:60]}...",
        get_client_ip(request),
    )

    return {
        "success": result.success,
        "status": result.status,
        "is_dry_run": result.is_dry_run,
        "provider_message_id": result.provider_message_id,
        "sender": "KAVERI CLUB HALAGURU",
        "recipient": f"+91{clean_phone}",
        "clean_phone": clean_phone,
        "error_message": result.error_message,
        "details": result.details,
        "message": f"Dispatched SMS to +91{clean_phone} under 'KAVERI CLUB HALAGURU'."
        if result.success
        else f"SMS dispatch failed: {result.error_message}",
    }


@router.delete("/{member_id}")
async def delete_member_by_admin(
    member_id: int,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Administrative deletion & permanent data washout of a member:
    Permanently erases all member details, consents, points, and history from the database.
    """
    stmt = select(Member).where(Member.id == member_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found.")

    member_num = member.member_number
    member_name = member.full_name
    member_phone = member.primary_phone

    # Permanent washout
    await washout_member_data(db, member.id)

    await log_admin_action(
        db,
        current_user,
        "DELETE_MEMBER_WASHOUT",
        "member",
        str(member_id),
        f"Permanently washed out member {member_num} ({member_name}, {member_phone}) from the database.",
        get_client_ip(request),
    )

    return {
        "success": True,
        "message": f"Member {member_num} ({member_name}) and all associated records have been permanently washed out from the system.",
    }
