import uuid
import re
import httpx
from typing import Optional, Dict, Any, Tuple
from app.config import settings
from app.services.messaging.base import BaseMessagingProvider, SendResult


def validate_and_format_indian_phone(phone_str: str) -> Tuple[bool, str, str]:
    """
    Validates and formats an Indian mobile phone number according to TRAI standards.
    - Strips non-digits, '+91', leading '0'.
    - Validates exactly 10 digits.
    - Enforces valid Indian cellular mobile prefix (starts with 6, 7, 8, or 9).
    
    Returns: (is_valid, 10_digit_clean_number, formatted_with_plus_91)
    """
    if not phone_str:
        return False, "", ""

    digits = "".join(filter(str.isdigit, phone_str))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) != 10:
        return False, digits, ""

    if digits[0] not in ("6", "7", "8", "9"):
        return False, digits, ""

    return True, digits, f"+91{digits}"


class DLTSmsProvider(BaseMessagingProvider):
    """
    Production-grade Indian Telecom Regulatory Authority (TRAI) & Fast2SMS / MSG91 Gateway Provider.
    Enforces 10-digit Indian mobile validation and connects to live cellular SMS gateways.
    NEVER reports simulated false positives when unconfigured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        sender_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        provider: Optional[str] = None,
        enabled: Optional[bool] = None,
    ):
        self.api_key = (api_key or settings.SMS_API_KEY or "").strip()
        self.enabled = (enabled if enabled is not None else settings.SMS_ENABLED) or bool(self.api_key)
        self.sender_id = (sender_id or settings.SMS_SENDER_ID or "KAVERI").strip()
        self.entity_id = (entity_id or settings.SMS_ENTITY_ID or "").strip()
        self.provider = (provider or settings.SMS_PROVIDER or "fast2sms").lower()

    def is_configured(self) -> bool:
        """Returns True ONLY when a non-empty API key is available."""
        return bool(self.enabled and self.api_key and len(self.api_key) > 5)

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        # 1. Enforce strict Indian 10-digit mobile number validation
        is_valid, clean_phone, formatted_phone = validate_and_format_indian_phone(recipient_phone)
        if not is_valid:
            return SendResult(
                success=False,
                status="invalid_phone",
                is_dry_run=False,
                error_message=(
                    f"Malformed Indian phone number '{recipient_phone}'. "
                    f"Must be a valid 10-digit Indian cellular number starting with 6, 7, 8, or 9."
                ),
                details={"provided_phone": recipient_phone, "cleaned_digits": clean_phone},
            )

        # 2. Ensure Sender Identity is clearly present in SMS body for consumer trust
        formatted_message = message_text.strip()
        if "KAVERI CLUB HALAGURU" not in formatted_message:
            formatted_message = f"[KAVERI CLUB HALAGURU] {formatted_message}"

        # 3. Handle unconfigured state: Return dry_run without fake cellular delivery
        if not self.is_configured():
            simulated_id = f"DRYRUN-SMS-{uuid.uuid4().hex[:10].upper()}"
            return SendResult(
                success=True,
                provider_message_id=simulated_id,
                status="dry_run",
                is_dry_run=True,
                error_message=(
                    "SMS Gateway is not configured in .env or Settings. Dry-run simulation executed safely."
                ),
                details={
                    "recipient": formatted_phone,
                    "sender_header": self.sender_id,
                    "provider": self.provider,
                    "reason": "Missing SMS_API_KEY",
                    "action_required": (
                        "Log in as Administrator -> Settings -> Enter Fast2SMS or MSG91 API Key "
                        "to transmit real cellular SMS to customer phones."
                    ),
                },
            )

        # 4. Dispatch to configured real SMS provider
        if "msg91" in self.provider:
            return await self._send_via_msg91(clean_phone, formatted_message, template_name, template_params)
        else:
            # Default to Fast2SMS (Bulk V2 API)
            return await self._send_via_fast2sms(clean_phone, formatted_message, template_params)

    async def _send_via_fast2sms(
        self,
        clean_phone: str,
        message: str,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        """Fast2SMS API Integration supporting Quick SMS (q) and DLT (dlt) routes."""
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json",
        }

        # If DLT Entity ID and Template ID are available, use TRAI DLT route
        template_id = template_params.get("dlt_template_id") if template_params else None
        if self.entity_id and template_id:
            payload = {
                "route": "dlt",
                "sender_id": self.sender_id,
                "message": message,
                "entity_id": self.entity_id,
                "template_id": template_id,
                "numbers": clean_phone,
                "flash": 0,
            }
        else:
            # Fast2SMS Quick Route (q) - Delivers transactional/service messages without DLT pre-scrubbing
            payload = {
                "route": "q",
                "message": message,
                "numbers": clean_phone,
                "flash": 0,
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                data = response.json()

                if response.status_code == 200 and data.get("return") is True:
                    request_id = data.get("request_id") or f"F2S-{uuid.uuid4().hex[:10].upper()}"
                    return SendResult(
                        success=True,
                        provider_message_id=str(request_id),
                        status="submitted",
                        is_dry_run=False,
                        details={
                            "provider": "fast2sms",
                            "route": payload.get("route"),
                            "recipient": f"+91{clean_phone}",
                            "provider_response": data,
                        },
                    )
                else:
                    raw_msg = data.get("message", [response.text])
                    err_msg = raw_msg[0] if isinstance(raw_msg, list) and len(raw_msg) > 0 else str(raw_msg)
                    return SendResult(
                        success=False,
                        status="failed",
                        error_message=f"Fast2SMS API rejected dispatch: {err_msg}",
                        is_dry_run=False,
                        details=data,
                    )
        except Exception as e:
            return SendResult(
                success=False,
                status="network_error",
                error_message=f"Network error connecting to Fast2SMS gateway: {str(e)}",
                is_dry_run=False,
            )

    async def _send_via_msg91(
        self,
        clean_phone: str,
        message: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        """MSG91 API Integration."""
        url = "https://control.msg91.com/api/v5/flow/"
        headers = {
            "authkey": self.api_key,
            "Content-Type": "application/json",
        }
        flow_id = template_name or (template_params.get("flow_id") if template_params else None) or "default"
        payload = {
            "template_id": flow_id,
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": f"91{clean_phone}",
                    "message": message,
                    **(template_params or {}),
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                data = response.json()
                if response.status_code == 200 and (data.get("type") == "success" or data.get("status") == "success"):
                    msg_id = data.get("message") or f"MSG91-{uuid.uuid4().hex[:10].upper()}"
                    return SendResult(
                        success=True,
                        provider_message_id=str(msg_id),
                        status="submitted",
                        is_dry_run=False,
                        details={"provider": "msg91", "provider_response": data},
                    )
                else:
                    return SendResult(
                        success=False,
                        status="failed",
                        error_message=f"MSG91 error: {data.get('message', response.text)}",
                        is_dry_run=False,
                        details=data,
                    )
        except Exception as e:
            return SendResult(
                success=False,
                status="network_error",
                error_message=f"Network error connecting to MSG91 gateway: {str(e)}",
                is_dry_run=False,
            )


# =====================================================================
# Standard Lifecycle Event Notification Dispatchers
# =====================================================================

async def dispatch_payment_submitted_sms(
    sms_provider: DLTSmsProvider,
    recipient_phone: str,
    full_name: str,
    member_number: str,
    utr: str,
) -> SendResult:
    """Event 1: Customer submits ₹499 payment proof (Pending Verification)."""
    text = (
        f"Namaskara {full_name}! Your Kaveri Member Club application ({member_number}) "
        f"and Rs 499 payment proof (UTR: {utr}) have been received. "
        f"Your membership card will be activated once our store manager verifies the bank transaction."
    )
    return await sms_provider.send_message(
        recipient_phone=recipient_phone,
        message_text=text,
        template_name="payment_verification_pending",
    )


async def dispatch_payment_approved_sms(
    sms_provider: DLTSmsProvider,
    recipient_phone: str,
    full_name: str,
    member_number: str,
    card_url: str,
) -> SendResult:
    """Event 2: Administrator verifies payment against bank statements and approves."""
    text = (
        f"Congratulations {full_name}! Your Rs 499 membership payment has been verified and approved. "
        f"Your Kaveri Member Club card ({member_number}) is now ACTIVE! "
        f"Access your card anytime at {card_url} - Kaveri Electronic Halaguru (Ph: 7204162882)."
    )
    return await sms_provider.send_message(
        recipient_phone=recipient_phone,
        message_text=text,
        template_name="payment_approved_card_active",
    )


async def dispatch_payment_rejected_sms(
    sms_provider: DLTSmsProvider,
    recipient_phone: str,
    full_name: str,
    member_number: str,
    rejection_reason: str,
    card_url: str,
) -> SendResult:
    """Event 3: Administrator rejects payment with clear reason."""
    text = (
        f"Important Update: Your payment verification for Kaveri Club application {member_number} "
        f"could not be confirmed. Reason: {rejection_reason}. "
        f"Please visit {card_url} to re-submit your payment proof or contact store support."
    )
    return await sms_provider.send_message(
        recipient_phone=recipient_phone,
        message_text=text,
        template_name="payment_verification_rejected",
    )


async def dispatch_card_link_sms(
    sms_provider: DLTSmsProvider,
    recipient_phone: str,
    full_name: str,
    member_number: str,
    card_url: str,
) -> SendResult:
    """Event 4: Direct digital card link and member login credentials reminder."""
    text = (
        f"Namaskara {full_name}! Access your Kaveri Member Club digital card anytime here: {card_url} "
        f"Member ID: {member_number}. Kaveri Electronic, HMS Complex, Halaguru. Support: 7204162882."
    )
    return await sms_provider.send_message(
        recipient_phone=recipient_phone,
        message_text=text,
        template_name="card_link_access",
    )
