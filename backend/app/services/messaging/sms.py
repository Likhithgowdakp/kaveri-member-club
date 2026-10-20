import uuid
import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.services.messaging.base import BaseMessagingProvider, SendResult


class DLTSmsProvider(BaseMessagingProvider):
    """
    Indian Telecom Regulatory Authority (TRAI) DLT-Compliant SMS Gateway Provider.
    Enforces Principal Entity ID, Sender Header (e.g. KAVERI), and DLT Template registration.
    """

    def __init__(self):
        self.enabled = settings.SMS_ENABLED
        self.api_key = settings.SMS_API_KEY
        self.sender_id = settings.SMS_SENDER_ID  # e.g., "KAVERI"
        self.entity_id = settings.SMS_ENTITY_ID
        self.provider = settings.SMS_PROVIDER

    def is_configured(self) -> bool:
        return bool(self.enabled and self.api_key and self.entity_id)

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        # Strip country code for Indian local 10-digit number
        clean_phone = recipient_phone.replace("+91", "").replace("+", "").strip()

        # If DLT credentials are not configured, perform dry-run without fake claims
        if not self.is_configured():
            simulated_id = f"DRYRUN-SMS-{uuid.uuid4().hex[:12].upper()}"
            return SendResult(
                success=True,
                provider_message_id=simulated_id,
                status="dry_run",
                is_dry_run=True,
                details={
                    "note": "Indian DLT SMS Gateway credentials not configured in .env. Dry-run simulation executed safely.",
                    "recipient": clean_phone,
                    "sender_header": self.sender_id,
                    "dlt_entity_id": self.entity_id or "UNSET",
                },
            )

        # Production DLT HTTP request (e.g., standard REST SMS gateway endpoint)
        payload = {
            "route": "dlt",
            "sender_id": self.sender_id,
            "message": message_text,
            "entity_id": self.entity_id,
            "numbers": clean_phone,
            "flash": 0,
        }
        if template_params and "dlt_template_id" in template_params:
            payload["template_id"] = template_params["dlt_template_id"]

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
                    err_msg = data.get("message", [response.text])
                    return SendResult(
                        success=False,
                        status="failed",
                        error_message=f"DLT SMS Provider error: {err_msg}",
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
