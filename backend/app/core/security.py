import secrets
from datetime import datetime, timedelta, timezone

from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from app.core.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def generate_token() -> str:
    """Generate a cryptographically secure random token string."""
    return secrets.token_urlsafe(32)


def token_expiry() -> datetime:
    """Return an aware UTC datetime for when a new token should expire."""
    settings = get_settings()
    return datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
