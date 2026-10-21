from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.config import settings
from app.models.setting import StoreSetting
from app.models.admin import AdminUser
from app.security.auth import get_current_admin, require_role

router = APIRouter(prefix="/settings", tags=["Store Settings & WhatsApp Group"])


class StoreSettingsUpdate(BaseModel):
    whatsapp_group_url: Optional[str] = None
    business_phone: Optional[str] = None
    welcome_message_template: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Public endpoint to fetch store identity and WhatsApp group link."""
    # Check if custom whatsapp_group_url is saved in DB
    stmt = select(StoreSetting).where(StoreSetting.key == "whatsapp_group_url")
    res = await db.execute(stmt)
    wa_setting = res.scalar_one_or_none()
    group_url = wa_setting.value if wa_setting else settings.BUSINESS_WHATSAPP_GROUP_URL

    return {
        "business_name": settings.BUSINESS_NAME,
        "business_address": settings.BUSINESS_ADDRESS,
        "business_phone": settings.BUSINESS_PHONE,
        "whatsapp_group_url": group_url,
    }


@router.get("/admin")
async def get_admin_settings(
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint to view current store preferences and SMS gateway config."""
    stmt = select(StoreSetting)
    res = await db.execute(stmt)
    saved_settings = {s.key: s.value for s in res.scalars().all()}

    saved_sms_key = saved_settings.get("sms_api_key", settings.SMS_API_KEY)
    masked_sms_key = ""
    if saved_sms_key and saved_sms_key.strip():
        k = saved_sms_key.strip()
        masked_sms_key = f"{k[:4]}...{k[-4:]}" if len(k) > 8 else "***Configured***"

    return {
        "whatsapp_group_url": saved_settings.get(
            "whatsapp_group_url", settings.BUSINESS_WHATSAPP_GROUP_URL
        ),
        "business_phone": saved_settings.get("business_phone", settings.BUSINESS_PHONE),
        "welcome_message_template": saved_settings.get(
            "welcome_message_template",
            "Namaskara {{name}}! Welcome to Kaveri Member Club. Your Member ID is {{member_id}} with 50 loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru!",
        ),
        "sms_api_key_configured": bool(saved_sms_key and saved_sms_key.strip()),
        "sms_api_key_masked": masked_sms_key,
        "sms_sender_id": saved_settings.get("sms_sender_id", settings.SMS_SENDER_ID or "KAVERI"),
    }


@router.post("/admin")
async def update_admin_settings(
    update_data: StoreSettingsUpdate,
    current_user: AdminUser = Depends(require_role(["owner", "manager"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint to update WhatsApp group link, SMS gateway credentials, and store preferences."""
    now = datetime.now(timezone.utc)

    if update_data.whatsapp_group_url is not None:
        url = update_data.whatsapp_group_url.strip()
        stmt = select(StoreSetting).where(StoreSetting.key == "whatsapp_group_url")
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = url
            setting.updated_at = now
        else:
            db.add(
                StoreSetting(
                    key="whatsapp_group_url",
                    value=url,
                    description="Official Kaveri Member Club WhatsApp Group Invite Link",
                    updated_at=now,
                )
            )

    if update_data.business_phone is not None:
        stmt = select(StoreSetting).where(StoreSetting.key == "business_phone")
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = update_data.business_phone.strip()
            setting.updated_at = now
        else:
            db.add(
                StoreSetting(
                    key="business_phone",
                    value=update_data.business_phone.strip(),
                    description="Store official phone number",
                    updated_at=now,
                )
            )

    if update_data.welcome_message_template is not None:
        stmt = select(StoreSetting).where(StoreSetting.key == "welcome_message_template")
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = update_data.welcome_message_template.strip()
            setting.updated_at = now
        else:
            db.add(
                StoreSetting(
                    key="welcome_message_template",
                    value=update_data.welcome_message_template.strip(),
                    description="Template for official welcome messaging",
                    updated_at=now,
                )
            )

    if update_data.sms_api_key is not None:
        key_val = update_data.sms_api_key.strip()
        if key_val and not key_val.startswith("***"):
            stmt = select(StoreSetting).where(StoreSetting.key == "sms_api_key")
            res = await db.execute(stmt)
            setting = res.scalar_one_or_none()
            if setting:
                setting.value = key_val
                setting.updated_at = now
            else:
                db.add(
                    StoreSetting(
                        key="sms_api_key",
                        value=key_val,
                        description="SMS Gateway API Key (Fast2SMS / DLT)",
                        updated_at=now,
                    )
                )

    if update_data.sms_sender_id is not None:
        sender_val = update_data.sms_sender_id.strip()
        if sender_val:
            stmt = select(StoreSetting).where(StoreSetting.key == "sms_sender_id")
            res = await db.execute(stmt)
            setting = res.scalar_one_or_none()
            if setting:
                setting.value = sender_val
                setting.updated_at = now
            else:
                db.add(
                    StoreSetting(
                        key="sms_sender_id",
                        value=sender_val,
                        description="SMS Sender Header / ID",
                        updated_at=now,
                    )
                )

    await db.commit()
    return {"message": "Store, WhatsApp, and SMS settings saved successfully."}
