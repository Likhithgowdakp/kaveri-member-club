from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.member import Member
from app.models.consent import MarketingConsent
from app.models.campaign import Campaign, CampaignSendJob
from app.models.admin import AdminUser
from app.schemas.admin import DashboardStatsResponse
from app.security.auth import get_current_admin
from app.services.messaging import whatsapp_provider, sms_provider

router = APIRouter(prefix="/dashboard", tags=["Admin Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_statistics(
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes key executive metrics:
    - Total members, active members
    - Channel opt-in counts
    - Growth trends (last 7 and 30 days)
    - Campaign and message delivery performance
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # 1. Total & Active members
    total_members_res = await db.execute(select(func.count(Member.id)))
    total_members = total_members_res.scalar() or 0

    active_members_res = await db.execute(
        select(func.count(Member.id)).where(Member.status == "active")
    )
    active_members = active_members_res.scalar() or 0

    # 2. Opt-ins
    wa_optins_res = await db.execute(
        select(func.count(MarketingConsent.id)).where(
            and_(
                MarketingConsent.channel == "whatsapp",
                MarketingConsent.consent_state == "granted",
            )
        )
    )
    wa_optins = wa_optins_res.scalar() or 0

    sms_optins_res = await db.execute(
        select(func.count(MarketingConsent.id)).where(
            and_(
                MarketingConsent.channel == "sms",
                MarketingConsent.consent_state == "granted",
            )
        )
    )
    sms_optins = sms_optins_res.scalar() or 0

    # 3. New registrations over time
    new_7d_res = await db.execute(
        select(func.count(Member.id)).where(Member.created_at >= seven_days_ago)
    )
    new_7d = new_7d_res.scalar() or 0

    new_30d_res = await db.execute(
        select(func.count(Member.id)).where(Member.created_at >= thirty_days_ago)
    )
    new_30d = new_30d_res.scalar() or 0

    # 4. Campaigns and messages
    total_camps_res = await db.execute(select(func.count(Campaign.id)))
    total_camps = total_camps_res.scalar() or 0

    queued_res = await db.execute(
        select(func.count(CampaignSendJob.id)).where(
            CampaignSendJob.status.in_(["pending", "queued", "submitted", "dry_run"])
        )
    )
    queued_count = queued_res.scalar() or 0

    delivered_res = await db.execute(
        select(func.count(CampaignSendJob.id)).where(
            CampaignSendJob.status.in_(["delivered", "submitted"])
        )
    )
    delivered_count = delivered_res.scalar() or 0

    failed_res = await db.execute(
        select(func.count(CampaignSendJob.id)).where(CampaignSendJob.status == "failed")
    )
    failed_count = failed_res.scalar() or 0

    providers_status = {
        "whatsapp": {
            "name": "Meta WhatsApp Business Cloud API",
            "is_configured": whatsapp_provider.is_configured(),
            "status_label": "Ready (Live)" if whatsapp_provider.is_configured() else "Not Configured (Dry Run Mode)",
        },
        "sms": {
            "name": "Indian TRAI DLT SMS Gateway",
            "is_configured": sms_provider.is_configured(),
            "status_label": "Ready (Live)" if sms_provider.is_configured() else "Not Configured (Dry Run Mode)",
        },
    }

    return DashboardStatsResponse(
        total_members=total_members,
        active_members=active_members,
        whatsapp_opt_in_count=wa_optins,
        sms_opt_in_count=sms_optins,
        new_registrations_last_7_days=new_7d,
        new_registrations_last_30_days=new_30d,
        total_campaigns=total_camps,
        total_messages_queued=queued_count,
        total_messages_delivered=delivered_count,
        total_messages_failed=failed_count,
        messaging_providers_status=providers_status,
    )
