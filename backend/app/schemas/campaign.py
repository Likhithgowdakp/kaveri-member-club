from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    purpose: str = Field(..., min_length=5, max_length=255)
    campaign_type: str = Field(
        ...,
        description="Type: festival, discount, new_arrival, member_only, service_reminder, welcome, loyalty",
    )
    channel: str = Field(..., description="whatsapp, sms, or both")
    message_template: str = Field(..., min_length=10, description="Campaign message text or DLT template text")
    offer_details: Optional[str] = None
    discount_pct: Optional[float] = Field(None, ge=0, le=100)
    terms: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    target_filter: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional audience filtering e.g. min_loyalty_points, registered_after",
    )


class CampaignPreviewResponse(BaseModel):
    name: str
    channel: str
    campaign_type: str
    rendered_message_sample: str
    eligible_members_count: int
    whatsapp_recipients_count: int
    sms_recipients_count: int
    whatsapp_provider_ready: bool
    sms_provider_ready: bool
    warnings: List[str]


class CampaignResponse(BaseModel):
    id: int
    name: str
    purpose: str
    campaign_type: str
    channel: str
    message_template: str
    offer_details: Optional[str] = None
    discount_pct: Optional[float] = None
    terms: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    send_jobs_count: int = 0
    delivered_count: int = 0
    failed_count: int = 0
    skipped_opt_out_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CampaignCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=255)
