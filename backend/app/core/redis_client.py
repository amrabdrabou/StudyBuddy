"""Redis connection singleton — gracefully unavailable in dev without Redis."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_redis = None


def get_redis():
    """Return a Redis client, or None if Redis is unavailable."""
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis
        from app.core.config import get_settings
        _redis = redis.Redis.from_url(
            get_settings().redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        _redis.ping()
        return _redis
    except Exception as exc:
        logger.warning("Redis unavailable — pipeline events will be skipped: %s", exc)
        return None
