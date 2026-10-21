from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Kaveri Member Club"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./kaveri.db"
    DATABASE_ECHO: bool = False
    
    # Security
    SECRET_KEY: str = "kaveri-insecure-dev-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    SESSION_COOKIE_NAME: str = "kaveri_session"
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"
    
    # Rate Limiting
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_REGISTRATION_PER_MINUTE: int = 15
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Business Profile
    BUSINESS_NAME: str = "Kaveri Electronic Halaguru"
    BUSINESS_TAGLINE: str = "Your Trusted Family Electronics Store Since 1998"
    BUSINESS_ADDRESS: str = "HMS Complex, Kanakapura Main Road, Halaguru Hobli, Karnataka - 571421, India"
    BUSINESS_PHONE: str = "+91 72041 62882"
    BUSINESS_EMAIL: str = "mathrushreemep@gmail.com"
    BUSINESS_WHATSAPP_GROUP_URL: str = "https://chat.whatsapp.com/KaveriClubOfficial"
    MEMBER_ID_PREFIX: str = "KAV-"
    DPDP_NOTICE_VERSION: str = "v1.0_2026_DPDP"
    REGISTRATION_BONUS_POINTS: int = 50
    DEFAULT_STORE_UPI_ID: str = "7353398831-2@naviaxis"
    MEMBERSHIP_FEE: int = 499
    
    # WhatsApp Cloud API
    WHATSAPP_ENABLED: bool = False
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = "kaveri_webhook_verify_token_sample"
    WHATSAPP_APP_SECRET: str = ""
    
    # Indian DLT SMS Gateway
    SMS_ENABLED: bool = False
    SMS_PROVIDER: str = "mock"  # "dlt_fast2sms", "dlt_gupshup", or "mock"
    SMS_API_KEY: str = ""
    SMS_SENDER_ID: str = "KAVERI"
    SMS_ENTITY_ID: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
