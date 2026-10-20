import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.consent import MarketingConsent, ConsentAuditLog


@pytest.mark.asyncio
async def test_customer_verification_and_preferences(client: AsyncClient):
    """Customer must provide both Membership ID and matching phone to access preferences."""
    # 1. Register a member
    reg_res = await client.post("/api/v1/members/register", json={
        "full_name": "Suresh Gowda",
        "primary_phone": "9448100555",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    member_number = reg_res.json()["member"]["member_number"]

    # 2. Try verification with wrong phone -> 404
    bad_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": member_number,
        "phone": "9448199999",
    })
    assert bad_res.status_code == 404

    # 3. Correct verification -> 200
    good_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": member_number,
        "phone": "9448100555",
    })
    assert good_res.status_code == 200
    pref = good_res.json()
    assert pref["member_number"] == member_number
    assert len(pref["consents"]) == 2


@pytest.mark.asyncio
async def test_instant_opt_out_and_audit_trail(client: AsyncClient, test_db: AsyncSession):
    """Verifies that an opt-out updates consent immediately and creates an auditable record."""
    reg_res = await client.post("/api/v1/members/register", json={
        "full_name": "Deepa Rao",
        "primary_phone": "9448100666",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    member_id = reg_res.json()["member"]["id"]
    member_number = reg_res.json()["member"]["member_number"]

    # Withdraw WhatsApp consent
    opt_out_res = await client.post("/api/v1/preferences/update-consent", json={
        "member_number": member_number,
        "phone": "9448100666",
        "whatsapp_consent": False,
        "reason": "Too many promotional messages",
    })
    assert opt_out_res.status_code == 200

    # Verify WhatsApp is now withdrawn, SMS remains granted
    consents = {c["channel"]: c["consent_state"] for c in opt_out_res.json()["consents"]}
    assert consents["whatsapp"] == "withdrawn"
    assert consents["sms"] == "granted"

    # Check database audit log
    stmt = (
        select(ConsentAuditLog)
        .where(ConsentAuditLog.member_id == member_id)
        .order_by(ConsentAuditLog.id.desc())
    )
    res = await test_db.execute(stmt)
    latest_audit = res.scalars().first()
    assert latest_audit is not None
    assert latest_audit.channel == "whatsapp"
    assert latest_audit.new_state == "withdrawn"
    assert "Too many promotional messages" in latest_audit.reason


@pytest.mark.asyncio
async def test_account_closure_withdraws_all_consents(client: AsyncClient, test_db: AsyncSession):
    """Customer account closure revokes all marketing channels immediately."""
    reg_res = await client.post("/api/v1/members/register", json={
        "full_name": "Anil Kumar",
        "primary_phone": "9448100777",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    member_id = reg_res.json()["member"]["id"]
    member_number = reg_res.json()["member"]["member_number"]

    close_res = await client.post("/api/v1/preferences/request-deletion", json={
        "member_number": member_number,
        "phone": "9448100777",
        "reason": "Moving out of Halaguru",
        "confirm_closure": True,
    })
    assert close_res.status_code == 200

    # Consents in DB must be withdrawn
    stmt = select(MarketingConsent).where(MarketingConsent.member_id == member_id)
    res = await test_db.execute(stmt)
    consents = {c.channel: c.consent_state for c in res.scalars().all()}
    assert consents["whatsapp"] == "withdrawn"
    assert consents["sms"] == "withdrawn"
