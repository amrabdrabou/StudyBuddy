"""Pydantic schemas for authentication requests and responses."""
from pydantic import BaseModel


class TokenOut(BaseModel):
    """Returned after a successful login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class RefreshOut(BaseModel):
    """Returned after a successful token refresh."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
