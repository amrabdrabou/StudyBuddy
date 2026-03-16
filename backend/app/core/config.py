"""Application configuration settings loaded from environment variables."""
import os
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_KEY = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET"


class Settings(BaseSettings):
    """
    Centralized configuration management using Pydantic.
    Values are automatically populated from environment variables or .env files.
    """
    environment: str = "dev"
    database_url: str = ""
    debug: bool = False

    # Must be set via environment variable — never use default in non-dev
    secret_key: str = _INSECURE_KEY

    # Short-lived access tokens; refresh tokens carry the long session
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # CORS — restrict in production to your actual domain(s)
    allowed_origins: list[str] = ["http://localhost:5173"]

    # Document upload
    upload_max_file_size_mb: int = 20
    upload_dir: str = "uploads"  # override with absolute path in production

    # Rate limiting (requests per window)
    login_rate_limit: str = "5/minute"
    register_rate_limit: str = "3/minute"
    ai_event_rate_limit: str = "20/hour"

    # OAuth credentials
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    model_config = SettingsConfigDict(
        env_file=f".env.{os.getenv('ENVIRONMENT', 'dev')}",
        extra="ignore",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def _enforce_secret_key(self) -> "Settings":
        if self.environment != "dev" and self.secret_key == _INSECURE_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in non-dev environments. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long.")
        return self


@lru_cache
def get_settings() -> Settings:
    """
    Returns the cached singleton settings object.
    Use lru_cache so .env is only parsed once per process lifetime.
    """
    return Settings()