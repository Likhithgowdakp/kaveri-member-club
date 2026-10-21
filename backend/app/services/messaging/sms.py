import uuid
import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.services.messaging.base import BaseMessagingProvider, SendResult


class DLTSmsProvider(BaseMessagingProvider):
    """
    Indian Telecom Regulatory Authority (TRAI) DLT & Fast2SMS Gateway Provider.
    Enforces Sender Header (e.g. KAVERI) and supports Quick SMS & DLT routes.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        sender_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        enabled: Optional[bool] = None,
    ):
        self.api_key = (api_key or settings.SMS_API_KEY or "").strip()
        self.enabled = (enabled if enabled is not None else settings.SMS_ENABLED) or bool(self.api_key)
        self.sender_id = (sender_id or settings.SMS_SENDER_ID or "KAVERI").strip()
        self.entity_id = (entity_id or settings.SMS_ENTITY_ID or "").strip()
        self.provider = settings.SMS_PROVIDER

    def is_configured(self) -> bool:
        return bool(self.enabled and self.api_key)

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        # Extract the last 10 digits cleanly (handles +91, spaces, dashes)
        clean_phone = "".join(filter(str.isdigit, recipient_phone))[-10:]

        # Ensure Sender Name is explicitly included in the SMS body for customer clarity
        formatted_message = message_text
        if "KAVERI CLUB HALAGURU" not in formatted_message:
            formatted_message = f"[KAVERI CLUB HALAGURU] {formatted_message}"

        # If external SMS gateway credentials are not configured, simulate app-level dispatch
        if not self.is_configured():
            simulated_id = f"KAVCLB-SMS-{uuid.uuid4().hex[:10].upper()}"
            print(f"[SMS DISPATCH FROM APP] Sender: KAVERI CLUB HALAGURU -> To: +91{clean_phone} -> Content: {formatted_message}")
            return SendResult(
                success=True,
                provider_message_id=simulated_id,
                status="submitted",
                is_dry_run=True,
                details={
                    "sender_name": "KAVERI CLUB HALAGURU",
                    "sender_header": self.sender_id,
                    "recipient": f"+91{clean_phone}",
                    "channel": "SMS (Kaveri App Service)",
                    "note": "SMS simulated in dry-run mode. Add a Fast2SMS or DLT API key in Admin Settings to transmit real cellular SMS to physical phones.",
                },
            )

        # Production SMS HTTP request via Fast2SMS (supports Quick SMS route='q' or DLT route='dlt')
        if self.entity_id:
            payload = {
                "route": "dlt",
                "sender_id": self.sender_id,
                "message": formatted_message,
                "entity_id": self.entity_id,
                "numbers": clean_phone,
                "flash": 0,
            }
            if template_params and "dlt_template_id" in template_params:
                payload["template_id"] = template_params["dlt_template_id"]
        else:
            # Fast2SMS Quick Route (no strict DLT template pre-registration required)
            payload = {
                "route": "q",
                "message": formatted_message,
                "numbers": clean_phone,
                "flash": 0,
            }

        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            # Standard generic endpoint based on provider
            url = "https://www.fast2sms.com/dev/bulkV2"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                data = response.json()

                if response.status_code == 200 and data.get("return") is True:
                    msg_id = data.get("request_id") or f"SMS-{uuid.uuid4().hex[:8]}"
                    return SendResult(
                        success=True,
                        provider_message_id=str(msg_id),
                        status="submitted",
                        is_dry_run=False,
                        details=data,
                    )
                else:
                    raw_msg = data.get("message", [response.text])
                    err_msg = raw_msg[0] if isinstance(raw_msg, list) and len(raw_msg) > 0 else str(raw_msg)
                    return SendResult(
                        success=False,
                        status="failed",
                        error_message=f"SMS Gateway error: {err_msg}",
                        is_dry_run=False,
                        details=data,
                    )
        except Exception as e:
            return SendResult(
                success=False,
                status="failed",
                error_message=f"SMS Gateway network error: {str(e)}",
                is_dry_run=False,
            )
