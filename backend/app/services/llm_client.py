"""Low-level LLM HTTP client.

Single responsibility: send a messages array to the OpenAI Chat Completions API
and return the response plus token/model metadata.

No imports from other app services — this keeps circular imports impossible.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"


async def chat(
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
    temperature: float = 0.7,
) -> tuple[str, int | None, str]:
    """Call OpenAI Chat Completions.

    The model is read from settings (LLM_MODEL env var, default gpt-4o-mini).

    Returns:
        (content, tokens_used, model_name)

    Raises:
        ValueError: OPENAI_API_KEY is not configured.
        RuntimeError: Non-200 response from OpenAI.
    """
    settings = get_settings()
    api_key = settings.openai_api_key
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is not configured. "
            "Set it in your .env.dev file or as an environment variable."
        )

    model = settings.llm_model

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            _OPENAI_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )

    if resp.status_code != 200:
        try:
            detail = resp.json().get("error", {}).get("message", "Unknown error")
        except Exception:
            detail = resp.text[:300]
        raise RuntimeError(f"OpenAI API error {resp.status_code}: {detail}")

    body: dict[str, Any] = resp.json()
    content: str = body["choices"][0]["message"]["content"]
    tokens_used: int | None = body.get("usage", {}).get("total_tokens")
    model_used: str = body.get("model", model)

    return content, tokens_used, model_used
