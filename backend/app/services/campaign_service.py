import json
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from fastapi import HTTPException, status

from app.models.campaign import Campaign, CampaignSendJob, MessageDeliveryEvent
from app.models.member import Member
from app.models.consent import MarketingConsent
from app.models.admin import AdminUser
from app.schemas.campaign import CampaignCreateRequest, CampaignPreviewResponse
from app.services.consent_service import check_channel_consent
from app.services.messaging import whatsapp_provider, sms_provider, get_messaging_provider


def render_message_sample(template: str, member_name: str = "Ramesh Kumar", member_id: str = "KAV-000001") -> str:
    rendered = template.replace("{{name}}", member_name)
    rendered = rendered.replace("{{member_id}}", member_id)
    return rendered


async def get_eligible_audience(
    db: AsyncSession,
    channel: str,
    target_filter: Optional[Dict[str, Any]] = None,
) -> Tuple[List[Member], List[Member]]:
    """
    Finds active members who have granted consent for WhatsApp and/or SMS.
    Returns (whatsapp_eligible_members, sms_eligible_members).
    """
    channel = channel.lower()
    
    # 1. Base query for active members
    stmt = select(Member).where(Member.status == "active")
    
    # Filter by loyalty points if specified
    if target_filter and "min_points" in target_filter:
        min_pts = int(target_filter["min_points"])
        stmt = stmt.where(Member.loyalty_points >= min_pts)
        
    res = await db.execute(stmt)
    members = list(res.scalars().all())
    
    wa_members = []
    sms_members = []

    for m in members:
        # Check WhatsApp consent
        if channel in {"whatsapp", "both"}:
            if await check_channel_consent(db, m.id, "whatsapp"):
                wa_members.append(m)
                
        # Check SMS consent
        if channel in {"sms", "both"}:
            if await check_channel_consent(db, m.id, "sms"):
                sms_members.append(m)

    return wa_members, sms_members


async def preview_campaign(
    db: AsyncSession, request: CampaignCreateRequest
) -> CampaignPreviewResponse:
    wa_members, sms_members = await get_eligible_audience(
        db, request.channel, request.target_filter
    )
    
    all_eligible_ids = set([m.id for m in wa_members] + [m.id for m in sms_members])
    
    sample = render_message_sample(request.message_template)
    warnings = []
    
    wa_ready = whatsapp_provider.is_configured()
    sms_ready = sms_provider.is_configured()
    
    if request.channel in {"whatsapp", "both"} and not wa_ready:
        warnings.append("WhatsApp Cloud API is not configured. Campaigns will execute in safe Dry-Run mode.")
    if request.channel in {"sms", "both"} and not sms_ready:
        warnings.append("Indian DLT SMS Gateway is not configured. Campaigns will execute in safe Dry-Run mode.")
    if len(all_eligible_ids) == 0:
        warnings.append("No active members currently have opted-in marketing consent for the selected channel(s).")

    return CampaignPreviewResponse(
        name=request.name,
        channel=request.channel,
        campaign_type=request.campaign_type,
        rendered_message_sample=sample,
        eligible_members_count=len(all_eligible_ids),
        whatsapp_recipients_count=len(wa_members),
        sms_recipients_count=len(sms_members),
        whatsapp_provider_ready=wa_ready,
        sms_provider_ready=sms_ready,
        warnings=warnings,
    )


async def create_campaign(
    db: AsyncSession, request: CampaignCreateRequest, current_user: AdminUser
) -> Campaign:
    now = datetime.now(timezone.utc)
    campaign = Campaign(
        name=request.name,
        purpose=request.purpose,
        campaign_type=request.campaign_type,
        channel=request.channel.lower(),
        message_template=request.message_template,
        offer_details=request.offer_details,
        discount_pct=request.discount_pct,
        terms=request.terms,
        status="draft",
        target_filter=json.dumps(request.target_filter) if request.target_filter else None,
        scheduled_at=request.scheduled_at,
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def approve_campaign(
    db: AsyncSession, campaign_id: int, current_user: AdminUser
) -> Campaign:
    stmt = select(Campaign).where(Campaign.id == campaign_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.status not in {"draft", "pending_approval"}:
        raise HTTPException(status_code=400, detail=f"Cannot approve campaign in status {campaign.status}")

    now = datetime.now(timezone.utc)
    campaign.status = "approved"
    campaign.approved_by_id = current_user.id
    campaign.updated_at = now
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def schedule_and_queue_campaign(
    db: AsyncSession, campaign_id: int
) -> Tuple[Campaign, int]:
    """
    Queues all send jobs for an approved campaign.
    Generates deterministic idempotency keys.
    """
    stmt = select(Campaign).where(Campaign.id == campaign_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    target_filter = json.loads(campaign.target_filter) if campaign.target_filter else {}
    wa_members, sms_members = await get_eligible_audience(db, campaign.channel, target_filter)

    now = datetime.now(timezone.utc)
    jobs_created = 0

    # Create WhatsApp jobs
    if campaign.channel in {"whatsapp", "both"}:
        for m in wa_members:
            idempotency_key = f"camp_{campaign.id}_mem_{m.id}_wa"
            # Check if job already exists
            existing_stmt = select(CampaignSendJob).where(CampaignSendJob.idempotency_key == idempotency_key)
            existing_res = await db.execute(existing_stmt)
            if not existing_res.scalar_one_or_none():
                job = CampaignSendJob(
                    campaign_id=campaign.id,
                    member_id=m.id,
                    channel="whatsapp",
                    recipient_phone=m.primary_phone,
                    idempotency_key=idempotency_key,
                    status="pending",
                    created_at=now,
                    updated_at=now,
                )
                db.add(job)
                jobs_created += 1

    # Create SMS jobs
    if campaign.channel in {"sms", "both"}:
        for m in sms_members:
            idempotency_key = f"camp_{campaign.id}_mem_{m.id}_sms"
            existing_stmt = select(CampaignSendJob).where(CampaignSendJob.idempotency_key == idempotency_key)
            existing_res = await db.execute(existing_stmt)
            if not existing_res.scalar_one_or_none():
                job = CampaignSendJob(
                    campaign_id=campaign.id,
                    member_id=m.id,
                    channel="sms",
                    recipient_phone=m.primary_phone,
                    idempotency_key=idempotency_key,
                    status="pending",
                    created_at=now,
                    updated_at=now,
                )
                db.add(job)
                jobs_created += 1

    campaign.status = "scheduled"
    campaign.updated_at = now
    await db.commit()
    await db.refresh(campaign)
    return campaign, jobs_created


async def cancel_campaign(
    db: AsyncSession, campaign_id: int, reason: str
) -> Campaign:
    """
    Emergency kill-switch: cancels campaign and all pending jobs.
    """
    stmt = select(Campaign).where(Campaign.id == campaign_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=400, detail=f"Campaign is already {campaign.status}")

    now = datetime.now(timezone.utc)
    campaign.status = "cancelled"
    campaign.cancelled_at = now
    campaign.cancellation_reason = reason
    campaign.updated_at = now

    # Cancel pending jobs
    jobs_stmt = select(CampaignSendJob).where(
        and_(
            CampaignSendJob.campaign_id == campaign_id,
            CampaignSendJob.status.in_(["pending", "queued"]),
        )
    )
    jobs_res = await db.execute(jobs_stmt)
    pending_jobs = list(jobs_res.scalars().all())
    for j in pending_jobs:
        j.status = "cancelled"
        j.error_message = f"Campaign cancelled: {reason}"
        j.updated_at = now

    await db.commit()
    await db.refresh(campaign)
    return campaign


async def dispatch_campaign_jobs(
    db: AsyncSession, campaign_id: int
) -> Dict[str, int]:
    """
    Worker dispatch execution:
    - Pre-send real-time consent verification immediately prior to dispatch!
    - Respects channel opt-outs.
    - Handles dry-run / unconfigured provider without fake claims.
    - Dispatches to WhatsApp/SMS provider.
    """
    campaign_stmt = select(Campaign).where(Campaign.id == campaign_id)
    campaign_res = await db.execute(campaign_stmt)
    campaign = campaign_res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == "cancelled":
        return {"cancelled": 0}

    campaign.status = "running"
    await db.commit()

    jobs_stmt = (
        select(CampaignSendJob)
        .where(
            and_(
                CampaignSendJob.campaign_id == campaign_id,
                CampaignSendJob.status == "pending",
            )
        )
    )
    jobs_res = await db.execute(jobs_stmt)
    jobs = list(jobs_res.scalars().all())

    stats = {
        "dispatched": 0,
        "dry_run": 0,
        "skipped_opt_out": 0,
        "failed": 0,
    }

    for job in jobs:
        # Check if campaign was cancelled mid-run
        await db.refresh(campaign)
        if campaign.status == "cancelled":
            job.status = "cancelled"
            job.error_message = "Campaign killed during dispatch"
            await db.commit()
            continue

        # 1. CRITICAL DPDP CHECK: Real-time consent immediately pre-send
        has_consent = await check_channel_consent(db, job.member_id, job.channel)
        if not has_consent:
            job.status = "skipped_opt_out"
            job.error_message = f"Customer withdrew marketing consent for {job.channel} before message dispatch"
            job.updated_at = datetime.now(timezone.utc)
            stats["skipped_opt_out"] += 1
            await db.commit()
            continue

        # 2. Get Member for message rendering
        member_stmt = select(Member).where(Member.id == job.member_id)
        member_res = await db.execute(member_stmt)
        member = member_res.scalar_one_or_none()
        if not member:
            job.status = "failed"
            job.error_message = "Member record no longer exists"
            stats["failed"] += 1
            await db.commit()
            continue

        # 3. Render message text
        msg_text = render_message_sample(
            campaign.message_template,
            member_name=member.full_name,
            member_id=member.member_number,
        )

        # 4. Dispatch through provider
        provider = get_messaging_provider(job.channel)
        result = await provider.send_message(
            recipient_phone=job.recipient_phone,
            message_text=msg_text,
        )

        now = datetime.now(timezone.utc)
        job.dispatched_at = now
        job.provider_message_id = result.provider_message_id
        job.updated_at = now

        if result.is_dry_run:
            job.status = "dry_run"
            stats["dry_run"] += 1
        elif result.success:
            job.status = "submitted"
            stats["dispatched"] += 1
        else:
            job.status = "failed"
            job.error_message = result.error_message
            stats["failed"] += 1

        # Record event
        event = MessageDeliveryEvent(
            send_job_id=job.id,
            provider=f"{job.channel}_cloud" if not result.is_dry_run else "mock_dry_run",
            event_type=job.status,
            raw_payload=json.dumps(result.details) if result.details else None,
            created_at=now,
        )
        db.add(event)
        await db.commit()

    campaign.status = "completed"
    campaign.executed_at = datetime.now(timezone.utc)
    campaign.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return stats
