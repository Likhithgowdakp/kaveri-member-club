from typing import Optional
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.admin import AdminUser, AuditLog
from app.security.auth import get_current_admin, require_role


async def log_admin_action(
    db: AsyncSession,
    admin: AdminUser,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    audit = AuditLog(
        admin_id=admin.id,
        admin_username=admin.username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(audit)
    await db.commit()
