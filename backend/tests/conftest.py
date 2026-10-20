import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.security.hashing import hash_password
from app.models.admin import AdminUser
from app.security.rate_limiter import limiter

# Test database in-memory
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    # Clear rate limiter between tests
    limiter.clear()

    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def admin_owner(test_db: AsyncSession) -> AdminUser:
    owner = AdminUser(
        username="test_owner",
        email="owner@test.com",
        full_name="Kaveri Owner",
        password_hash=hash_password("OwnerSecure123!"),
        role="owner",
        is_active=True,
        must_change_password=False,
    )
    test_db.add(owner)
    await test_db.commit()
    await test_db.refresh(owner)
    return owner


@pytest_asyncio.fixture(scope="function")
async def admin_staff(test_db: AsyncSession) -> AdminUser:
    staff = AdminUser(
        username="test_staff",
        email="staff@test.com",
        full_name="Staff Member",
        password_hash=hash_password("StaffPass123!"),
        role="staff",
        is_active=True,
        must_change_password=False,
    )
    test_db.add(staff)
    await test_db.commit()
    await test_db.refresh(staff)
    return staff


@pytest_asyncio.fixture(scope="function")
async def auth_headers_owner(client: AsyncClient, admin_owner: AdminUser) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_owner", "password": "OwnerSecure123!"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_headers_staff(client: AsyncClient, admin_staff: AdminUser) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_staff", "password": "StaffPass123!"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
