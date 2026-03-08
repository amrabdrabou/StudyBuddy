import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "dev"
    database_url: str = ""
    debug: bool = False
    secret_key: str = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    model_config = SettingsConfigDict(
        env_file=f".env.{os.getenv('ENVIRONMENT', 'dev')}",
        extra="ignore",     #Ignore extra fields in the .env file that are not defined in the Settings class
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings() #Loads settings from .env file and caches the result for future calls