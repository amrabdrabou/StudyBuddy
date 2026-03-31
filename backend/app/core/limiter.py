"""Shared rate limiter instance — imported by main.py and routers alike."""
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()


def get_rate_limit_key(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip:
            return client_ip
    return get_remote_address(request)

limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=[settings.api_rate_limit],
    storage_uri=settings.redis_url,
)
