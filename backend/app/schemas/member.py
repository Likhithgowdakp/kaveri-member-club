import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


def normalize_indian_phone(phone: str) -> str:
    """
    Normalizes Indian mobile numbers:
    - Strips spaces, brackets, hyphens.
    - Handles leading +91, 91, or 0.
    - Validates 10-digit number starting with 6, 7, 8, or 9.
    - Returns format: +91XXXXXXXXXX
    """
    if not phone:
        raise ValueError("Phone number is required.")
        
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", phone)
    
    # Strip leading +
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
        
    # Check if starts with country code 91
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
        
    if len(cleaned) != 10 or not cleaned.isdigit():
        raise ValueError("Mobile number must be exactly 10 digits.")
        
    if cleaned[0] not in {"6", "7", "8", "9"}:
        raise ValueError("Indian mobile number must start with 6, 7, 8, or 9.")
        
    return f"+91{cleaned}"


class MemberRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Customer's full name")
    primary_phone: str = Field(..., description="10-digit Indian mobile number")
    alt_phone: Optional[str] = Field(None, description="Optional secondary phone number")
    email: Optional[EmailStr] = Field(None, description="Optional email address")
    address: Optional[str] = Field(None, max_length=500, description="Optional address or area")
    password: Optional[str] = Field(None, min_length=4, max_length=100, description="Customer password for portal login")
    
    # Voluntary separate marketing consent (unchecked by default)
    consent_whatsapp: bool = Field(False, description="Voluntary consent for WhatsApp promotional offers")
    consent_sms: bool = Field(False, description="Voluntary consent for SMS promotional offers")
    
    # Mandatory acceptance of membership terms & privacy notice
    accept_privacy_notice: bool = Field(..., description="Customer must accept the Privacy Notice to register")

    @field_validator("primary_phone")
    @classmethod
    def validate_primary_phone(cls, v: str) -> str:
        return normalize_indian_phone(v)

    @field_validator("alt_phone")
    @classmethod
    def validate_alt_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            return normalize_indian_phone(v)
        return None

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return clean

    @field_validator("accept_privacy_notice")
    @classmethod
    def validate_notice_acceptance(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must read and accept the Membership Privacy Notice to join.")
        return v


class MemberResponse(BaseModel):
    id: int
    member_number: str
    full_name: str
    primary_phone: str
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: str
    loyalty_points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberRegistrationResult(BaseModel):
    member: MemberResponse
    whatsapp_consent_granted: bool
    sms_consent_granted: bool
    whatsapp_group_url: Optional[str] = None
    welcome_message: str


class MemberVerifyRequest(BaseModel):
    member_number: str = Field(..., description="Membership ID e.g. KAV-000001")
    phone: str = Field(..., description="Registered 10-digit mobile number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_indian_phone(v)


class MemberLoginRequest(BaseModel):
    member_identifier: str = Field(..., min_length=2, description="Member ID (e.g. KAV-000001) or registered mobile number")
    password: str = Field(..., min_length=1, description="Account password")


class MemberUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    alt_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[str] = None  # active, suspended, closed
    notes: Optional[str] = None

    @field_validator("alt_phone")
    @classmethod
    def validate_alt_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            return normalize_indian_phone(v)
        return None
