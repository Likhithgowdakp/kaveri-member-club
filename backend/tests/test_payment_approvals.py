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


@pytest.mark.asyncio
async def test_duplicate_utr_rejected(client: AsyncClient, auth_headers_owner: dict):
    """
    Test that submitting an already used UTR reference is rejected across members.
    """
    sample_screenshot = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    shared_utr = "DUPLICATEUTR999"

    # Member 1 registers with UTR
    res1 = await client.post(
        "/api/v1/members/register",
        json={
            "full_name": "Applicant One",
            "primary_phone": "9876500001",
            "accept_privacy_notice": True,
            "payment_screenshot": sample_screenshot,
            "payment_utr": shared_utr,
            "payment_amount": 499,
        },
    )
    assert res1.status_code == 201

    # Member 2 tries to register with same UTR -> Rejected
    res2 = await client.post(
        "/api/v1/members/register",
        json={
            "full_name": "Applicant Two",
            "primary_phone": "9876500002",
            "accept_privacy_notice": True,
            "payment_screenshot": sample_screenshot,
            "payment_utr": shared_utr,
            "payment_amount": 499,
        },
    )
    assert res2.status_code == 400
    assert "Duplicate UTR flagged" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_customer_payment_submission_endpoint_and_bank_check(
    client: AsyncClient, auth_headers_owner: dict
):
    """
    Test customer payment submission endpoint:
    - Customer submits Full Name, Phone, Member Number, UTR, Screenshot.
    - Gets exact required response message.
    - Admin bank verification enforcement.
    """
    sample_screenshot = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

    # Register member without payment first
    reg = await client.post(
        "/api/v1/members/register",
        json={
            "full_name": "Manjunath Gowda",
            "primary_phone": "9876500003",
            "accept_privacy_notice": True,
        },
    )
    assert reg.status_code == 201
    member = reg.json()["member"]
    member_num = member["member_number"]
    member_id = member["id"]

    # Submit payment via /api/v1/members/submit-payment
    sub_res = await client.post(
        "/api/v1/members/submit-payment",
        json={
            "full_name": "Manjunath Gowda",
            "primary_phone": "9876500003",
            "member_number": member_num,
            "payment_utr": "MANJU499001",
            "payment_screenshot": sample_screenshot,
        },
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert (
        sub_data["message"]
        == "Your ₹499 membership payment has been submitted for verification. Your membership card will be available after the administrator verifies and approves your payment."
    )
    assert sub_data["status_label"] == "Payment Verification Pending"
    assert sub_data["member"]["payment_status"] == "pending"

    # Admin verifies without bank confirmation -> Rejected
    bad_approve = await client.post(
        f"/api/v1/admin/members/{member_id}/approve-payment",
        headers=auth_headers_owner,
        json={"verified_with_bank_statement": False},
    )
    assert bad_approve.status_code == 400
    assert "Bank statement reconciliation confirmation is required" in bad_approve.json()["detail"]

    # Admin verifies with bank confirmation -> Approved
    good_approve = await client.post(
        f"/api/v1/admin/members/{member_id}/approve-payment",
        headers=auth_headers_owner,
        json={"verified_with_bank_statement": True},
    )
    assert good_approve.status_code == 200
    assert good_approve.json()["member"]["payment_status"] == "approved"
    assert good_approve.json()["member"]["status"] == "active"

    # Idempotent approval
    dup_approve = await client.post(
        f"/api/v1/admin/members/{member_id}/approve-payment",
        headers=auth_headers_owner,
        json={"verified_with_bank_statement": True},
    )
    assert dup_approve.status_code == 200
    assert "already active and approved" in dup_approve.json()["message"]

