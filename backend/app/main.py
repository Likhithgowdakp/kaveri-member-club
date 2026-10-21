from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.database import engine, Base

# Import all models to ensure they register on Base.metadata
import app.models

from app.api.v1.members import router as members_router
from app.api.v1.preferences import router as preferences_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.admin_members import router as admin_members_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.health import router as health_router
from app.api.v1.audit import router as audit_router
from app.api.v1.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure columns exist on existing members table
        from sqlalchemy import text
        for col_stmt in [
            "ALTER TABLE members ADD COLUMN password_hash VARCHAR(255)",
            "ALTER TABLE members ADD COLUMN payment_status VARCHAR(30) DEFAULT 'approved'",
            "ALTER TABLE members ADD COLUMN payment_amount INTEGER DEFAULT 499",
            "ALTER TABLE members ADD COLUMN payment_screenshot TEXT",
            "ALTER TABLE members ADD COLUMN payment_utr VARCHAR(100)",
            "ALTER TABLE members ADD COLUMN payment_submitted_at TIMESTAMP",
            "ALTER TABLE members ADD COLUMN payment_approved_at TIMESTAMP",
            "ALTER TABLE members ADD COLUMN payment_approved_by VARCHAR(100)",
            "ALTER TABLE members ADD COLUMN rejection_reason TEXT",
        ]:
            try:
                await conn.execute(text(col_stmt))
            except Exception:
                pass
    yield
    await engine.dispose()


app = FastAPI(
    title="Kaveri Member Club API",
    description="Customer Loyalty, DPDP Consent & Campaign Management System for Kaveri Electronic Halaguru",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration (supports local and public tunnel/cloud deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(members_router, prefix=settings.API_V1_PREFIX)
app.include_router(preferences_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_members_router, prefix=settings.API_V1_PREFIX)
app.include_router(campaigns_router, prefix=settings.API_V1_PREFIX)
app.include_router(webhooks_router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router, prefix=settings.API_V1_PREFIX)

# Mount built frontend dist if present (Unified Single-Port Production Serving with SPA Fallback)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.isdir(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="static_assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Never swallow API routes
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}

        # Direct download for KaveriClub Android APK
        if full_path in ["KaveriClub.apk", "downloads/KaveriClub.apk"]:
            apk_path = os.path.join(dist_path, "KaveriClub.apk")
            if not os.path.isfile(apk_path):
                apk_path = os.path.join(os.path.dirname(dist_path), "public", "KaveriClub.apk")
            if os.path.isfile(apk_path):
                return FileResponse(
                    apk_path,
                    media_type="application/vnd.android.package-archive",
                    filename="KaveriClub.apk"
                )

        # Serve existing static file (e.g. logo.png, favicon.png, sw.js, manifest.json)
        candidate = os.path.join(dist_path, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)

        # SPA Fallback: Serve index.html for all client routes (/admin/login, /admin, /card, etc.)
        index_file = os.path.join(dist_path, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"detail": "Frontend index.html not found"}


