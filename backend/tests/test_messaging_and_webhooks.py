import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.campaign import CampaignSendJob, MessageDeliveryEvent


@pytest.mark.asyncio
async def test_messaging_unconfigured_dry_run_mode(
    client: AsyncClient, auth_headers_owner: dict, test_db: AsyncSession
):
    """
    When WhatsApp/SMS credentials are not configured, messages are NOT faked as delivered.
    They execute safely in 'dry_run' status with full audit logging.
    """
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Dry Run Member",
        "primary_phone": "9448300001",
        "consent_whatsapp": True,
        "accept_privacy_notice": True,
    })
    await client.post(f"/api/v1/admin/members/{reg.json()['member']['id']}/approve-payment", headers=auth_headers_owner)

    create_res = await client.post(
        "/api/v1/admin/campaigns/",
        headers=auth_headers_owner,
        json={
            "name": "Dry Run Verification Campaign",
            "purpose": "Verify safe unconfigured behavior",
            "campaign_type": "welcome",
            "channel": "whatsapp",
            "message_template": "Welcome to Kaveri Club {{name}}!",
        },
    )
    camp_id = create_res.json()["id"]
    await client.post(f"/api/v1/admin/campaigns/{camp_id}/approve", headers=auth_headers_owner)
    await client.post(f"/api/v1/admin/campaigns/{camp_id}/schedule", headers=auth_headers_owner)

    # Dispatch
    disp_res = await client.post(f"/api/v1/admin/campaigns/{camp_id}/dispatch-now", headers=auth_headers_owner)
    assert disp_res.status_code == 200
    stats = disp_res.json()["stats"]
    assert stats["dry_run"] == 1
    assert stats["dispatched"] == 0  # Does NOT claim real dispatch!

    stmt = select(CampaignSendJob).where(CampaignSendJob.campaign_id == camp_id)
    res = await test_db.execute(stmt)
    job = res.scalars().first()
    assert job.status == "dry_run"
    assert job.provider_message_id.startswith("DRYRUN-WA-")


@pytest.mark.asyncio
async def test_whatsapp_webhook_verification(client: AsyncClient):
    """Tests Meta WhatsApp webhook subscription handshake."""
    res = await client.get(
        "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=kaveri_webhook_verify_token_sample&hub.challenge=CHALLENGE_STRING_123"
    )
    assert res.status_code == 200
    assert res.text == "CHALLENGE_STRING_123"


@pytest.mark.asyncio
async def test_whatsapp_delivery_webhook_callback(
    client: AsyncClient, test_db: AsyncSession
):
    """Tests updating send job status to delivered upon receipt of Meta webhook."""
    # Insert a dummy send job with a known provider message ID
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Webhook Tester",
        "primary_phone": "9448300002",
        "consent_whatsapp": True,
        "accept_privacy_notice": True,
    })
    member_id = reg.json()["member"]["id"]

    job = CampaignSendJob(
        campaign_id=1,
        member_id=member_id,
        channel="whatsapp",
        recipient_phone="+919448300002",
        idempotency_key="webhook_test_job_1",
        status="submitted",
        provider_message_id="wamid.HBgLMTEyMjMzNDQ1NQ==",
    )
    test_db.add(job)
    await test_db.commit()
    await test_db.refresh(job)

    # Simulate WhatsApp delivery callback
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456789"},
                            "statuses": [
                                {
                                    "id": "wamid.HBgLMTEyMjMzNDQ1NQ==",
                                    "status": "delivered",
                                    "timestamp": "1730000000",
                                    "recipient_id": "919448300002",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }

    res = await client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res.status_code == 200

    # Verify job status in DB
    await test_db.refresh(job)
    assert job.status == "delivered"
    assert job.delivered_at is not None

    # Verify event recorded
    event_stmt = select(MessageDeliveryEvent).where(MessageDeliveryEvent.send_job_id == job.id)
    event_res = await test_db.execute(event_stmt)
    event = event_res.scalars().first()
    assert event is not None
    assert event.event_type == "delivered"


def test_indian_phone_number_validation():
    """Verify strict Indian mobile phone validation standards (TRAI)."""
    from app.services.messaging.sms import validate_and_format_indian_phone

    # Valid mobile numbers
    assert validate_and_format_indian_phone("9448300001") == (True, "9448300001", "+919448300001")
    assert validate_and_format_indian_phone("+919448300001") == (True, "9448300001", "+919448300001")
    assert validate_and_format_indian_phone("+91 94483 00001") == (True, "9448300001", "+919448300001")
    assert validate_and_format_indian_phone("09448300001") == (True, "9448300001", "+919448300001")
    assert validate_and_format_indian_phone("7204162882") == (True, "7204162882", "+917204162882")
    assert validate_and_format_indian_phone("6362000000") == (True, "6362000000", "+916362000000")
    assert validate_and_format_indian_phone("8123000000") == (True, "8123000000", "+918123000000")

    # Invalid mobile numbers (landlines, invalid prefixes, incorrect lengths)
    assert validate_and_format_indian_phone("02222334455")[0] is False  # 11-digit landline (Mumbai 022)
    assert validate_and_format_indian_phone("1234567890")[0] is False  # Starts with 1
    assert validate_and_format_indian_phone("5432109876")[0] is False  # Starts with 5
    assert validate_and_format_indian_phone("98765")[0] is False       # Too short
    assert validate_and_format_indian_phone("")[0] is False            # Empty


@pytest.mark.asyncio
async def test_sms_delivery_receipt_callback(
    client: AsyncClient, test_db: AsyncSession
):
    """Tests updating send job status upon receipt of SMS DLR callback."""
    job = CampaignSendJob(
        campaign_id=1,
        member_id=1,
        channel="sms",
        recipient_phone="+919448300003",
        idempotency_key="sms_webhook_test_job_1",
        status="submitted",
        provider_message_id="F2S-REQ-9876543210",
    )
    test_db.add(job)
    await test_db.commit()
    await test_db.refresh(job)

    # 1. Test POST /api/v1/webhooks/sms/dlr
    post_res = await client.post(
        "/api/v1/webhooks/sms/dlr",
        json={"request_id": "F2S-REQ-9876543210", "status": "delivered"},
    )
    assert post_res.status_code == 200
    await test_db.refresh(job)
    assert job.status == "delivered"

    # 2. Test GET /api/v1/webhooks/sms-delivery-report (query string callback)
    get_res = await client.get(
        "/api/v1/webhooks/sms-delivery-report?request_id=F2S-REQ-9876543210&status=delivered"
    )
    assert get_res.status_code == 200


@pytest.mark.asyncio
async def test_admin_test_sms_endpoint(
    client: AsyncClient, auth_headers_owner: dict
):
    """Tests admin test SMS dispatch endpoint."""
    res = await client.post(
        "/api/v1/settings/admin/test-sms",
        headers=auth_headers_owner,
        json={"phone": "7204162882", "message": "Test SMS"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "is_dry_run" in data


@pytest.mark.asyncio
async def test_sms_lifecycle_event_dispatchers():
    """Tests all 4 event notification dispatcher helpers."""
    from app.services.messaging.sms import (
        DLTSmsProvider,
        dispatch_payment_submitted_sms,
        dispatch_payment_approved_sms,
        dispatch_payment_rejected_sms,
        dispatch_card_link_sms,
    )

    provider = DLTSmsProvider()

    # Event 1: Payment submitted
    e1 = await dispatch_payment_submitted_sms(provider, "9448300001", "Ramesh", "KAV-000001", "123456789012")
    assert e1.is_dry_run is True
    assert "DRYRUN-SMS-" in e1.provider_message_id

    # Event 2: Payment approved
    e2 = await dispatch_payment_approved_sms(provider, "9448300001", "Ramesh", "KAV-000001", "https://example.com/card")
    assert e2.is_dry_run is True

    # Event 3: Payment rejected
    e3 = await dispatch_payment_rejected_sms(provider, "9448300001", "Ramesh", "KAV-000001", "Bank statement mismatch", "https://example.com/card")
    assert e3.is_dry_run is True

    # Event 4: Card link
    e4 = await dispatch_card_link_sms(provider, "9448300001", "Ramesh", "KAV-000001", "https://example.com/card")
    assert e4.is_dry_run is True

