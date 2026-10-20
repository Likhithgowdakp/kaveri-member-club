from typing import List, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.campaign import Campaign, CampaignSendJob
from app.models.admin import AdminUser
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignPreviewResponse,
    CampaignResponse,
    CampaignCancelRequest,
)
from app.security.auth import get_current_admin, require_role
from app.services.campaign_service import (
    preview_campaign,
    create_campaign,
    approve_campaign,
    schedule_and_queue_campaign,
    cancel_campaign,
    dispatch_campaign_jobs,
)
from app.api.deps import log_admin_action
from app.security.rate_limiter import get_client_ip

router = APIRouter(prefix="/admin/campaigns", tags=["Admin Campaigns"])


@router.post("/preview", response_model=CampaignPreviewResponse)
async def preview_campaign_audience(
    request_data: CampaignCreateRequest,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Renders message sample and counts eligible opted-in audience across channels.
    """
    return await preview_campaign(db, request_data)


@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_new_campaign(
    request_data: CampaignCreateRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new campaign in 'draft' status."""
    camp = await create_campaign(db, request_data, current_user)
    await log_admin_action(
        db,
        current_user,
        "CREATE_CAMPAIGN",
        "campaign",
        str(camp.id),
        f"Created campaign '{camp.name}'",
        get_client_ip(request),
    )
    return CampaignResponse.model_validate(camp)


@router.get("/")
async def list_all_campaigns(
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lists all campaigns with their current status and metrics."""
    stmt = select(Campaign).order_by(desc(Campaign.id))
    res = await db.execute(stmt)
    campaigns = list(res.scalars().all())

    results = []
    for c in campaigns:
        # Count jobs
        jobs_stmt = select(CampaignSendJob).where(CampaignSendJob.campaign_id == c.id)
        jobs_res = await db.execute(jobs_stmt)
        jobs = list(jobs_res.scalars().all())

        c_resp = CampaignResponse.model_validate(c)
        c_resp.send_jobs_count = len(jobs)
        c_resp.delivered_count = sum(1 for j in jobs if j.status in {"delivered", "submitted"})
        c_resp.failed_count = sum(1 for j in jobs if j.status == "failed")
        c_resp.skipped_opt_out_count = sum(1 for j in jobs if j.status == "skipped_opt_out")
        results.append(c_resp)

    return results


@router.get("/{campaign_id}")
async def get_campaign_detail(
    campaign_id: int,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Campaign).where(Campaign.id == campaign_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    jobs_stmt = select(CampaignSendJob).where(CampaignSendJob.campaign_id == campaign_id)
    jobs_res = await db.execute(jobs_stmt)
    jobs = list(jobs_res.scalars().all())

    return {
        "campaign": CampaignResponse.model_validate(campaign),
        "jobs": jobs,
    }


@router.post("/{campaign_id}/approve", response_model=CampaignResponse)
async def approve_existing_campaign(
    campaign_id: int,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """Requires Owner or Manager role to approve a promotional campaign."""
    camp = await approve_campaign(db, campaign_id, current_user)
    await log_admin_action(
        db,
        current_user,
        "APPROVE_CAMPAIGN",
        "campaign",
        str(camp.id),
        f"Approved campaign '{camp.name}'",
        get_client_ip(request),
    )
    return CampaignResponse.model_validate(camp)


@router.post("/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: int,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """Schedules campaign and creates durable send jobs in queue."""
    camp, jobs_count = await schedule_and_queue_campaign(db, campaign_id)
    await log_admin_action(
        db,
        current_user,
        "SCHEDULE_CAMPAIGN",
        "campaign",
        str(camp.id),
        f"Scheduled campaign '{camp.name}' with {jobs_count} queued jobs",
        get_client_ip(request),
    )
    return {
        "message": f"Campaign '{camp.name}' scheduled successfully with {jobs_count} queued send jobs.",
        "campaign": CampaignResponse.model_validate(camp),
        "queued_jobs": jobs_count,
    }


@router.post("/{campaign_id}/cancel")
async def cancel_existing_campaign(
    campaign_id: int,
    cancel_req: CampaignCancelRequest,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """Emergency kill-switch to cancel an active or scheduled campaign."""
    camp = await cancel_campaign(db, campaign_id, cancel_req.reason)
    await log_admin_action(
        db,
        current_user,
        "CANCEL_CAMPAIGN",
        "campaign",
        str(camp.id),
        f"Cancelled campaign '{camp.name}': {cancel_req.reason}",
        get_client_ip(request),
    )
    return {
        "message": f"Campaign '{camp.name}' has been cancelled. All pending jobs terminated.",
        "campaign": CampaignResponse.model_validate(camp),
    }


@router.post("/{campaign_id}/dispatch-now")
async def dispatch_campaign_now(
    campaign_id: int,
    request: Request,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes scheduled campaign send jobs:
    - Pre-send real-time consent verification!
    - Dispatches to WhatsApp/SMS provider or executes safe dry-run.
    """
    stats = await dispatch_campaign_jobs(db, campaign_id)
    await log_admin_action(
        db,
        current_user,
        "DISPATCH_CAMPAIGN",
        "campaign",
        str(campaign_id),
        f"Dispatched campaign: {stats}",
        get_client_ip(request),
    )
    return {"message": "Dispatch cycle completed.", "stats": stats}
