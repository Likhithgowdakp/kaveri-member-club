import uuid
import httpx
from typing import Optional, Dict, Any
from app.config import settings
from app.services.messaging.base import BaseMessagingProvider, SendResult


class WhatsAppCloudProvider(BaseMessagingProvider):
    """
    Official Meta WhatsApp Business Cloud API Integration.
    Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
    """

    def __init__(self):
        self.enabled = settings.WHATSAPP_ENABLED
        self.api_token = settings.WHATSAPP_API_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.base_url = f"https://graph.facebook.com/v21.0/{self.phone_number_id}/messages"

    def is_configured(self) -> bool:
        return bool(
            self.enabled and self.api_token and self.phone_number_id
        )

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        # Normalize phone for WhatsApp (digits only, e.g. 919876543210)
        clean_phone = recipient_phone.replace("+", "").strip()

        # If credentials are not configured, perform dry-run without claiming fake delivery
        if not self.is_configured():
            simulated_id = f"DRYRUN-WA-{uuid.uuid4().hex[:12].upper()}"
            return SendResult(
                success=True,
                provider_message_id=simulated_id,
                status="dry_run",
                is_dry_run=True,
                details={
                    "note": "WhatsApp credentials not configured in .env. Dry-run simulation executed safely.",
                    "recipient": clean_phone,
                    "template": template_name,
                },
            )

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        # Build payload according to WhatsApp Business Platform standard
        if template_name:
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en"},
                    "components": template_params.get("components", []) if template_params else [],
                },
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {"preview_url": False, "body": message_text},
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                data = response.json()

                if response.status_code in {200, 201}:
                    msg_id = data.get("messages", [{}])[0].get("id")
                    return SendResult(
                        success=True,
                        provider_message_id=msg_id,
                        status="submitted",
                        is_dry_run=False,
                        details=data,
                    )
                else:
                    error_info = data.get("error", {}).get("message", response.text)
                    return SendResult(
                        success=False,
                        status="failed",
                        error_message=f"WhatsApp Cloud API Error ({response.status_code}): {error_info}",
                        is_dry_run=False,
                        details=data,
                    )
        except Exception as e:
            return SendResult(
                success=False,
                status="failed",
                error_message=f"WhatsApp network connection error: {str(e)}",
                is_dry_run=False,
            )
