from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters with letters and numbers")


class AdminUserCreateRequest(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str = "staff"  # owner, manager, staff


class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    must_change_password: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_members: int
    active_members: int
    whatsapp_opt_in_count: int
    sms_opt_in_count: int
    new_registrations_last_7_days: int
    new_registrations_last_30_days: int
    total_campaigns: int
    total_messages_queued: int
    total_messages_delivered: int
    total_messages_failed: int
    messaging_providers_status: Dict[str, Any]


class AuditLogResponse(BaseModel):
    id: int
    admin_username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
