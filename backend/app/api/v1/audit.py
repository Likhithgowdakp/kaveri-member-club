from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.admin import AdminUser, AuditLog
from app.schemas.admin import AuditLogResponse
from app.security.auth import get_current_admin, require_role

router = APIRouter(prefix="/admin/audit", tags=["Admin Audit"])


@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: AdminUser = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Protected audit trail of all sensitive operations (Owner-only access).
    """
    stmt = select(AuditLog).order_by(desc(AuditLog.id)).limit(limit)
    res = await db.execute(stmt)
    logs = list(res.scalars().all())
    return [AuditLogResponse.model_validate(l) for l in logs]
