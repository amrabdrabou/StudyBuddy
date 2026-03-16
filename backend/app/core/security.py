"""Password hashing and token creation/verification utilities."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from app.core.config import get_settings

# Endpoint where clients send credentials to obtain a token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Unified hashing context — uses Argon2 or bcrypt (strongest available)
password_hash = PasswordHash.recommended()


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password for secure database storage."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its stored hash."""
    return password_hash.verify(plain_password, hashed_password)


# ── Token helpers ─────────────────────────────────────────────────────────────

def generate_token() -> str:
    """Generate a cryptographically secure random opaque token (returned to client)."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """
    Hash a raw token with SHA-256 before storing in the database.
    This means a DB breach does not expose usable tokens.
    The raw token travels over the wire; only the hash lives in the DB.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def access_token_expiry() -> datetime:
    """Return the UTC datetime when a newly issued access token should expire."""
    settings = get_settings()
    return datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)


def refresh_token_expiry() -> datetime:
    """Return the UTC datetime when a newly issued refresh token should expire."""
    settings = get_settings()
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)


# Keep old name as alias so existing callers don't break during transition
token_expiry = access_token_expiry
