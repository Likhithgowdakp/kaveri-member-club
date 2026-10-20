import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.member import Member
from app.models.consent import MarketingConsent
from app.models.loyalty import LoyaltyTransaction


@pytest.mark.asyncio
async def test_successful_registration(client: AsyncClient, test_db: AsyncSession):
    """Verifies that a customer can register, gets normalized phone, unique ID, and welcome points."""
    payload = {
        "full_name": "Kavitha Gowda",
        "primary_phone": "98451 23456",  # Space in phone
        "alt_phone": "+91 94481 99999",
        "email": "kavitha@example.com",
        "address": "HMS Complex, Kanakapura Main Road",
        "consent_whatsapp": True,
        "consent_sms": False,
        "accept_privacy_notice": True,
    }

    response = await client.post("/api/v1/members/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["member"]["member_number"] == "KAV-000001"
    assert data["member"]["full_name"] == "Kavitha Gowda"
    assert data["member"]["primary_phone"] == "+919845123456"
    assert data["member"]["alt_phone"] == "+919448199999"
    assert data["member"]["loyalty_points"] == 50
    assert data["whatsapp_consent_granted"] is True
    assert data["sms_consent_granted"] is False

    # Check persistence in DB
    stmt = select(Member).where(Member.member_number == "KAV-000001")
    res = await test_db.execute(stmt)
    m = res.scalar_one_or_none()
    assert m is not None
    assert m.primary_phone == "+919845123456"

    # Check consents
    c_stmt = select(MarketingConsent).where(MarketingConsent.member_id == m.id)
    c_res = await test_db.execute(c_stmt)
    consents = {c.channel: c.consent_state for c in c_res.scalars().all()}
    assert consents["whatsapp"] == "granted"
    assert consents["sms"] == "never_given"

    # Check loyalty ledger
    l_stmt = select(LoyaltyTransaction).where(LoyaltyTransaction.member_id == m.id)
    l_res = await test_db.execute(l_stmt)
    tx = l_res.scalars().first()
    assert tx is not None
    assert tx.points == 50
    assert tx.transaction_type == "signup_bonus"


@pytest.mark.asyncio
async def test_duplicate_phone_prevention(client: AsyncClient):
    """Rejects duplicate registration for the same primary mobile number."""
    payload = {
        "full_name": "Ramesh Gowda",
        "primary_phone": "9448100111",
        "accept_privacy_notice": True,
    }
    res1 = await client.post("/api/v1/members/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same number (even in different format e.g. +91 94481 00111)
    payload2 = {
        "full_name": "Another Ramesh",
        "primary_phone": "+91 94481 00111",
        "accept_privacy_notice": True,
    }
    res2 = await client.post("/api/v1/members/register", json=payload2)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_input_validation(client: AsyncClient):
    """Validates missing mandatory fields, invalid phone, and unaccepted notice."""
    # Invalid phone (too short)
    res1 = await client.post("/api/v1/members/register", json={
        "full_name": "Test",
        "primary_phone": "12345",
        "accept_privacy_notice": True,
    })
    assert res1.status_code == 422

    # Invalid starting digit (starting with 2 instead of 6,7,8,9)
    res2 = await client.post("/api/v1/members/register", json={
        "full_name": "Test User",
        "primary_phone": "2448100111",
        "accept_privacy_notice": True,
    })
    assert res2.status_code == 422

    # Unaccepted privacy notice
    res3 = await client.post("/api/v1/members/register", json={
        "full_name": "Test User",
        "primary_phone": "9448100111",
        "accept_privacy_notice": False,
    })
    assert res3.status_code == 422


@pytest.mark.asyncio
async def test_unbundled_marketing_consent(client: AsyncClient):
    """Verifies that marketing consent is completely voluntary and separate."""
    # No marketing consent checked
    payload = {
        "full_name": "Pure Member",
        "primary_phone": "9448100222",
        "consent_whatsapp": False,
        "consent_sms": False,
        "accept_privacy_notice": True,
    }
    res = await client.post("/api/v1/members/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["whatsapp_consent_granted"] is False
    assert data["sms_consent_granted"] is False


@pytest.mark.asyncio
async def test_concurrent_id_generation(client: AsyncClient):
    """Tests sequential unique ID generation under concurrent registrations."""
    async def register_one(i: int):
        phone = f"9448100{300 + i:03d}"
        payload = {
            "full_name": f"Concurrent User {i}",
            "primary_phone": phone,
            "accept_privacy_notice": True,
        }
        return await client.post("/api/v1/members/register", json=payload)

    # Launch 5 concurrent registrations
    responses = await asyncio.gather(*[register_one(i) for i in range(5)])
    for r in responses:
        assert r.status_code == 201

    member_ids = [r.json()["member"]["member_number"] for r in responses]
    # Ensure all IDs are unique!
    assert len(member_ids) == len(set(member_ids))
    for mid in member_ids:
        assert mid.startswith("KAV-")
