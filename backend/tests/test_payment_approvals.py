import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_member_registration_and_admin_payment_approval(
    client: AsyncClient, auth_headers_owner: dict
):
    """
    Test end-to-end flow:
    1. Customer registers with ₹499 fee and transaction proof screenshot.
    2. Member starts in 'pending_verification' status.
    3. Admin inspects pending approvals list.
    4. Admin approves payment -> status becomes 'active', points awarded, card unlocked.
    """
    sample_screenshot = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

    # 1. Register with payment
    reg_res = await client.post(
        "/api/v1/members/register",
        json={
            "full_name": "Ramesh Gowda",
            "primary_phone": "9845123456",
            "consent_whatsapp": True,
            "consent_sms": True,
            "accept_privacy_notice": True,
            "payment_screenshot": sample_screenshot,
            "payment_utr": "UPI499123456789",
            "payment_amount": 499,
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    member = reg_data["member"]
    assert member["status"] == "pending_verification"
    assert member["payment_status"] == "pending"
    assert member["payment_amount"] == 499
    assert member["payment_utr"] == "UPI499123456789"
    assert member["payment_screenshot"] is not None

    member_id = member["id"]
    member_num = member["member_number"]

    # 2. Check pending approvals in Admin API
    pending_res = await client.get(
        "/api/v1/admin/members/pending-approvals",
        headers=auth_headers_owner,
    )
    assert pending_res.status_code == 200
    pdata = pending_res.json()
    assert pdata["count"] >= 1
    found = any(m["id"] == member_id for m in pdata["items"])
    assert found is True

    # 3. Admin approves payment
    approve_res = await client.post(
        f"/api/v1/admin/members/{member_id}/approve-payment",
        headers=auth_headers_owner,
    )
    assert approve_res.status_code == 200
    approved_data = approve_res.json()
    assert approved_data["member"]["status"] == "active"
    assert approved_data["member"]["payment_status"] == "approved"
    assert approved_data["member"]["loyalty_points"] == 50

    # 4. Card API reflects active status
    card_res = await client.get(f"/api/v1/members/{member_num}/card")
    assert card_res.status_code == 200
    card_data = card_res.json()
    assert card_data["status"] == "active"
    assert card_data["payment_status"] == "approved"


@pytest.mark.asyncio
async def test_payment_rejection_and_resubmission(
    client: AsyncClient, auth_headers_owner: dict
):
    """
    Test rejection workflow:
    1. Member registers without clear screenshot.
    2. Admin rejects with reason.
    3. Member resubmits corrected proof via public API.
    4. Member re-appears in pending approvals list.
    """
    reg_res = await client.post(
        "/api/v1/members/register",
        json={
            "full_name": "Suresh Kumar",
            "primary_phone": "9845987654",
            "consent_whatsapp": True,
            "accept_privacy_notice": True,
        },
    )
    assert reg_res.status_code == 201
    member = reg_res.json()["member"]
    member_id = member["id"]
    member_num = member["member_number"]

    # Reject
    reject_res = await client.post(
        f"/api/v1/admin/members/{member_id}/reject-payment",
        headers=auth_headers_owner,
        json={"reason": "Screenshot blurry. Please re-upload transaction proof."},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["member"]["payment_status"] == "rejected"

    # Customer re-submits payment proof
    resubmit_res = await client.post(
        f"/api/v1/members/{member_num}/submit-payment",
        json={
            "payment_screenshot": "data:image/jpeg;base64,sample_updated_bytes",
            "payment_utr": "NEWUPI999888",
        },
    )
    assert resubmit_res.status_code == 200
    resub_data = resubmit_res.json()
    assert resub_data["payment_status"] == "pending"
    assert resub_data["payment_utr"] == "NEWUPI999888"
