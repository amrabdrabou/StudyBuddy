"""Password hashing and JWT token creation/verification utilities."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from app.core.config import get_settings

# Defines the endpoint where the frontend sends credentials to obtain a token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Unified context for cryptographic hashing (defaults to strong modern algorithms like Argon2 or Bcrypt)
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hashes a plaintext password for secure database storage."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks a plaintext password against its stored hash format."""
    return password_hash.verify(plain_password, hashed_password)


def generate_token() -> str:
    """Generate a cryptographically secure random token string, suitable for refresh tokens."""
    return secrets.token_urlsafe(32)


def token_expiry() -> datetime:
    """
    Return an aware UTC datetime for when a new access token should expire.
    This duration is globally configured in the environment settings.
    """
    settings = get_settings()
    return datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
