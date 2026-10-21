import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.campaign import Campaign, CampaignSendJob


@pytest.mark.asyncio
async def test_campaign_creation_and_preview(
    client: AsyncClient, auth_headers_owner: dict
):
    """Admin creates and previews a campaign targeting opted-in members."""
    # Register 2 members: 1 WhatsApp only, 1 both
    r1 = await client.post("/api/v1/members/register", json={
        "full_name": "Member One",
        "primary_phone": "9448200001",
        "consent_whatsapp": True,
        "consent_sms": False,
        "accept_privacy_notice": True,
    })
    await client.post(f"/api/v1/admin/members/{r1.json()['member']['id']}/approve-payment", headers=auth_headers_owner)

    r2 = await client.post("/api/v1/members/register", json={
        "full_name": "Member Two",
        "primary_phone": "9448200002",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    await client.post(f"/api/v1/admin/members/{r2.json()['member']['id']}/approve-payment", headers=auth_headers_owner)

    # Preview WhatsApp campaign
    preview_res = await client.post(
        "/api/v1/admin/campaigns/preview",
        headers=auth_headers_owner,
        json={
            "name": "Diwali Smart TV Offer",
            "purpose": "Promote festival discounts on LG and Samsung TVs",
            "campaign_type": "festival",
            "channel": "whatsapp",
            "message_template": "Hello {{name}}! Exclusive Diwali festival offer on Smart TVs for Kaveri Club members (ID: {{member_id}}).",
        },
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["whatsapp_recipients_count"] == 2
    assert pdata["sms_recipients_count"] == 0
    assert "KAV-000001" in pdata["rendered_message_sample"]


@pytest.mark.asyncio
async def test_pre_send_consent_withdrawal_skips_message(
    client: AsyncClient, auth_headers_owner: dict, test_db: AsyncSession
):
    """
    CRITICAL DPDP REQUIREMENT:
    If a customer withdraws consent after a campaign is scheduled,
    the dispatcher checks real-time consent immediately pre-send and skips them!
    """
    # 1. Register customer with WhatsApp consent
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Pre-send Tester",
        "primary_phone": "9448200003",
        "consent_whatsapp": True,
        "consent_sms": False,
        "accept_privacy_notice": True,
    })
    m_id = reg.json()["member"]["id"]
    m_num = reg.json()["member"]["member_number"]
    await client.post(f"/api/v1/admin/members/{m_id}/approve-payment", headers=auth_headers_owner)

    # 2. Create campaign
    create_res = await client.post(
        "/api/v1/admin/campaigns/",
        headers=auth_headers_owner,
        json={
            "name": "Monsoon Refrigerator Sale",
            "purpose": "Promote refrigerator exchange",
            "campaign_type": "discount",
            "channel": "whatsapp",
            "message_template": "Hi {{name}}, monsoon discount active!",
        },
    )
    camp_id = create_res.json()["id"]

    # 3. Approve and Schedule
    await client.post(f"/api/v1/admin/campaigns/{camp_id}/approve", headers=auth_headers_owner)
    sched_res = await client.post(f"/api/v1/admin/campaigns/{camp_id}/schedule", headers=auth_headers_owner)
    assert sched_res.status_code == 200
    assert sched_res.json()["queued_jobs"] >= 1

    # 4. Customer withdraws consent via Customer Portal BEFORE dispatch
    opt_out_res = await client.post("/api/v1/preferences/update-consent", json={
        "member_number": m_num,
        "phone": "9448200003",
        "whatsapp_consent": False,
        "reason": "Changed mind before campaign",
    })
    assert opt_out_res.status_code == 200

    # 5. Admin triggers dispatch
    disp_res = await client.post(f"/api/v1/admin/campaigns/{camp_id}/dispatch-now", headers=auth_headers_owner)
    assert disp_res.status_code == 200
    stats = disp_res.json()["stats"]
    assert stats["skipped_opt_out"] == 1
    assert stats["dispatched"] == 0

    # 6. Verify job status in DB is skipped_opt_out
    stmt = select(CampaignSendJob).where(CampaignSendJob.campaign_id == camp_id)
    res = await test_db.execute(stmt)
    job = res.scalars().first()
    assert job.status == "skipped_opt_out"
    assert "withdrew marketing consent" in job.error_message


@pytest.mark.asyncio
async def test_campaign_kill_switch_cancellation(
    client: AsyncClient, auth_headers_owner: dict, test_db: AsyncSession
):
    """Admin can cancel a scheduled campaign with an emergency kill-switch."""
    await client.post("/api/v1/members/register", json={
        "full_name": "Cancel Test User",
        "primary_phone": "9448200004",
        "consent_whatsapp": True,
        "accept_privacy_notice": True,
    })

    create_res = await client.post(
        "/api/v1/admin/campaigns/",
        headers=auth_headers_owner,
        json={
            "name": "Accidental Launch Campaign",
            "purpose": "Test cancellation",
            "campaign_type": "welcome",
            "channel": "whatsapp",
            "message_template": "Draft content...",
        },
    )
    camp_id = create_res.json()["id"]
    await client.post(f"/api/v1/admin/campaigns/{camp_id}/approve", headers=auth_headers_owner)
    await client.post(f"/api/v1/admin/campaigns/{camp_id}/schedule", headers=auth_headers_owner)

    # Cancel via kill switch
    cancel_res = await client.post(
        f"/api/v1/admin/campaigns/{camp_id}/cancel",
        headers=auth_headers_owner,
        json={"reason": "Incorrect price posted by marketing team"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["campaign"]["status"] == "cancelled"

    # Verify pending jobs were set to cancelled
    stmt = select(CampaignSendJob).where(CampaignSendJob.campaign_id == camp_id)
    res = await test_db.execute(stmt)
    for j in res.scalars().all():
        assert j.status == "cancelled"
