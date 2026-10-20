from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.config import settings
from app.database import get_db
from app.services.messaging import whatsapp_provider, sms_provider

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Public health check endpoint.
    Verifies database connectivity without leaking internal configuration secrets.
    """
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {type(e).__name__}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app": settings.APP_NAME,
        "database": db_status,
        "business": settings.BUSINESS_NAME,
    }


@router.get("/providers/status")
async def providers_status():
    """
    Returns high-level status of messaging integrations (without exposing keys or tokens).
    """
    return {
        "whatsapp": {
            "name": "Meta WhatsApp Business Cloud API",
            "configured": whatsapp_provider.is_configured(),
            "mode": "live" if whatsapp_provider.is_configured() else "dry_run",
            "phone_number_id_set": bool(settings.WHATSAPP_PHONE_NUMBER_ID),
        },
        "sms": {
            "name": "Indian TRAI DLT SMS Gateway",
            "configured": sms_provider.is_configured(),
            "mode": "live" if sms_provider.is_configured() else "dry_run",
            "sender_header": settings.SMS_SENDER_ID,
            "entity_id_set": bool(settings.SMS_ENTITY_ID),
        },
    }
