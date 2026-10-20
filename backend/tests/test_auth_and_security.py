import pytest
from httpx import AsyncClient
from app.models.admin import AdminUser


@pytest.mark.asyncio
async def test_admin_login_and_cookie(client: AsyncClient, admin_owner: AdminUser):
    """Successful login sets secure HttpOnly cookie and returns JWT."""
    res = await client.post("/api/v1/auth/login", json={
        "username": "test_owner",
        "password": "OwnerSecure123!",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "test_owner"
    assert "kaveri_session" in res.cookies


@pytest.mark.asyncio
async def test_invalid_login_rejection(client: AsyncClient, admin_owner: AdminUser):
    """Invalid credentials return 401."""
    res = await client.post("/api/v1/auth/login", json={
        "username": "test_owner",
        "password": "WrongPassword!",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_role_based_access_control(
    client: AsyncClient, auth_headers_staff: dict, auth_headers_owner: dict
):
    """Staff role cannot approve campaigns; Owner can."""
    # Create a campaign using owner
    create_res = await client.post(
        "/api/v1/admin/campaigns/",
        headers=auth_headers_owner,
        json={
            "name": "RBAC Test Campaign",
            "purpose": "RBAC verification",
            "campaign_type": "member_only",
            "channel": "sms",
            "message_template": "Member only deal {{name}}",
        },
    )
    camp_id = create_res.json()["id"]

    # Staff attempts to approve -> 403 Forbidden
    staff_approve_res = await client.post(
        f"/api/v1/admin/campaigns/{camp_id}/approve",
        headers=auth_headers_staff,
    )
    assert staff_approve_res.status_code == 403

    # Owner approves -> 200 OK
    owner_approve_res = await client.post(
        f"/api/v1/admin/campaigns/{camp_id}/approve",
        headers=auth_headers_owner,
    )
    assert owner_approve_res.status_code == 200


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    """All responses must contain essential HTTP security headers."""
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert "strict-origin-when-cross-origin" in res.headers["Referrer-Policy"]


@pytest.mark.asyncio
async def test_login_rate_limiting(client: AsyncClient, admin_owner: AdminUser):
    """Rapid repeated login attempts trigger 429 Too Many Requests."""
    for _ in range(5):
        await client.post("/api/v1/auth/login", json={
            "username": "test_owner",
            "password": "WrongPassword!",
        })

    # The 6th request within window must be rejected with 429
    blocked_res = await client.post("/api/v1/auth/login", json={
        "username": "test_owner",
        "password": "WrongPassword!",
    })
    assert blocked_res.status_code == 429
