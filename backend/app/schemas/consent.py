from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ConsentItem(BaseModel):
    channel: str
    consent_state: str  # granted, withdrawn, never_given
    granted_at: Optional[datetime] = None
    withdrawn_at: Optional[datetime] = None
    source: str
    notice_version: str

    model_config = ConfigDict(from_attributes=True)


class CustomerPreferencesResponse(BaseModel):
    member_number: str
    full_name: str
    primary_phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int
    consents: List[ConsentItem]


class CustomerConsentUpdateRequest(BaseModel):
    member_number: str
    phone: str
    whatsapp_consent: Optional[bool] = Field(None, description="Set True to grant, False to opt out")
    sms_consent: Optional[bool] = Field(None, description="Set True to grant, False to opt out")
    reason: Optional[str] = Field("Customer portal preference change", description="Reason for audit log")


class CustomerCorrectionRequest(BaseModel):
    member_number: str
    phone: str
    requested_name: Optional[str] = None
    requested_email: Optional[str] = None
    requested_address: Optional[str] = None
    notes: Optional[str] = None


class CustomerDeletionRequest(BaseModel):
    member_number: str
    phone: str
    reason: Optional[str] = None
    confirm_closure: bool = Field(..., description="Must confirm account closure")
