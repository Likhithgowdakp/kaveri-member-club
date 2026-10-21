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


@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoints_rejected(client: AsyncClient):
    """Verify that unauthenticated visitors cannot access protected admin data or APIs."""
    endpoints = [
        "/api/v1/dashboard/stats",
        "/api/v1/admin/members/",
        "/api/v1/admin/audit/",
        "/api/v1/auth/me",
        "/api/v1/settings/admin",
    ]
    for endpoint in endpoints:
        res = await client.get(endpoint)
        assert res.status_code == 401, f"Expected 401 for {endpoint}, got {res.status_code}"
        assert "Not authenticated. Admin login required." in res.json().get("detail", "")


@pytest.mark.asyncio
async def test_forged_admin_token_rejected(client: AsyncClient):
    """Verify that forged or malformed tokens cannot gain administrative privileges."""
    forged_headers = {"Authorization": "Bearer fake.tampered.jwttoken"}
    res = await client.get("/api/v1/dashboard/stats", headers=forged_headers)
    assert res.status_code == 401

