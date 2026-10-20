from app.services.messaging.base import BaseMessagingProvider, SendResult
from app.services.messaging.whatsapp import WhatsAppCloudProvider
from app.services.messaging.sms import DLTSmsProvider

whatsapp_provider = WhatsAppCloudProvider()
sms_provider = DLTSmsProvider()


def get_messaging_provider(channel: str) -> BaseMessagingProvider:
    if channel.lower() == "whatsapp":
        return whatsapp_provider
    elif channel.lower() == "sms":
        return sms_provider
    raise ValueError(f"Unknown messaging channel: {channel}")


__all__ = [
    "BaseMessagingProvider",
    "SendResult",
    "WhatsAppCloudProvider",
    "DLTSmsProvider",
    "whatsapp_provider",
    "sms_provider",
    "get_messaging_provider",
]
