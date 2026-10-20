import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.member import Member
from app.models.consent import MarketingConsent
from app.models.loyalty import LoyaltyTransaction


@pytest.mark.asyncio
async def test_member_login_success_and_failure(client: AsyncClient):
    """Member can log in using mobile number and member ID; fails if mismatch."""
    # 1. Register a new member
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Ramesh Halaguru",
        "primary_phone": "9845011223",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    assert reg.status_code == 201
    member_num = reg.json()["member"]["member_number"]

    # 2. Log in with correct mobile number and member ID
    login_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": member_num,
        "phone": "9845011223",
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["member_number"] == member_num
    assert data["full_name"] == "Ramesh Halaguru"
    assert data["loyalty_points"] == 50

    # 3. Log in with wrong phone number -> Must fail with 404
    wrong_phone_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": member_num,
        "phone": "9999988888",
    })
    assert wrong_phone_res.status_code == 404

    # 4. Log in with wrong member ID -> Must fail with 404
    wrong_id_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": "KAV-999999",
        "phone": "9845011223",
    })
    assert wrong_id_res.status_code == 404


@pytest.mark.asyncio
async def test_admin_member_deletion_washout(
    client: AsyncClient, test_db: AsyncSession, auth_headers_owner: dict
):
    """Admin can permanently delete a member and completely wash out all data."""
    # 1. Register a member
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Manjunath Gowda",
        "primary_phone": "9900112233",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    assert reg.status_code == 201
    member_id = reg.json()["member"]["id"]
    member_num = reg.json()["member"]["member_number"]

    # 2. Admin deletes member using auth_headers_owner
    del_res = await client.delete(f"/api/v1/admin/members/{member_id}", headers=auth_headers_owner)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 3. Verify complete washout in database
    m_res = await test_db.execute(select(Member).where(Member.id == member_id))
    assert m_res.scalar_one_or_none() is None

    c_res = await test_db.execute(select(MarketingConsent).where(MarketingConsent.member_id == member_id))
    assert len(c_res.scalars().all()) == 0

    tx_res = await test_db.execute(select(LoyaltyTransaction).where(LoyaltyTransaction.member_id == member_id))
    assert len(tx_res.scalars().all()) == 0

    # 4. Customer cannot log in anymore
    verify_res = await client.post("/api/v1/preferences/verify", json={
        "member_number": member_num,
        "phone": "9900112233",
    })
    assert verify_res.status_code == 404


@pytest.mark.asyncio
async def test_admin_send_app_sms_under_business_sender(
    client: AsyncClient, auth_headers_owner: dict
):
    """Admin can send official SMS directly from Kaveri app under sender 'KAVERI CLUB HALAGURU'."""
    # 1. Register a member
    reg = await client.post("/api/v1/members/register", json={
        "full_name": "Sunil Kumar",
        "primary_phone": "9880011223",
        "consent_whatsapp": True,
        "consent_sms": True,
        "accept_privacy_notice": True,
    })
    assert reg.status_code == 201
    member_id = reg.json()["member"]["id"]

    # 2. Dispatch SMS from Kaveri App using auth_headers_owner
    sms_res = await client.post(
        f"/api/v1/admin/members/{member_id}/send-app-sms",
        headers=auth_headers_owner,
        json={"message": "Your festival discount is ready at Kaveri Electronic!"},
    )
    assert sms_res.status_code == 200
    data = sms_res.json()
    assert data["success"] is True
    assert data["sender"] == "KAVERI CLUB HALAGURU"
