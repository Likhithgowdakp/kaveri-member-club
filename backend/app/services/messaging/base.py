from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel


class SendResult(BaseModel):
    success: bool
    provider_message_id: Optional[str] = None
    status: str  # "submitted", "dry_run", "failed", "delivered"
    error_message: Optional[str] = None
    is_dry_run: bool = False
    details: Optional[Dict[str, Any]] = None


class BaseMessagingProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if real API credentials are valid and configured."""
        pass

    @abstractmethod
    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        """Dispatches an outbound promotional or service message."""
        pass
