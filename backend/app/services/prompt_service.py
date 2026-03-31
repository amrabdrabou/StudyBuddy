"""Database-driven prompt management service.

Public API:
    PromptService.get_active_prompts(name, db) -> list[Prompt]
    PromptService.render(template, variables)  -> str
    PromptService.build_messages(name, variables, db) -> (messages, version)
    PromptService.generate_response(prompt_name, variables, db, ...) -> str

All methods are static — PromptService is a namespace, not a stateful object.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from jinja2 import Environment, StrictUndefined, UndefinedError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_log import LLMLog
from app.models.prompt import Prompt
from app.services.llm_client import chat as _llm_chat

logger = logging.getLogger(__name__)

# Strict mode: raises UndefinedError immediately on missing template variables
_jinja = Environment(undefined=StrictUndefined, autoescape=False)


class PromptService:
    # ── Loading ────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_active_prompts(name: str, db: AsyncSession) -> list[Prompt]:
        """Return active prompt rows for *name*, ordered system first then user."""
        result = await db.execute(
            select(Prompt).where(
                Prompt.name == name,
                Prompt.is_active.is_(True),
            )
        )
        rows = result.scalars().all()
        # "system" sorts before "user" alphabetically → sort ascending on role
        return sorted(rows, key=lambda p: (0 if p.role == "system" else 1))

    # ── Rendering ──────────────────────────────────────────────────────────────

    @staticmethod
    def render(template: str, variables: dict[str, Any]) -> str:
        """Render a Jinja2 template string with the given variables.

        Raises:
            ValueError: A required template variable is missing.
        """
        try:
            return _jinja.from_string(template).render(**variables)
        except UndefinedError as exc:
            raise ValueError(f"Prompt template missing variable: {exc}") from exc

    # ── Message building ───────────────────────────────────────────────────────

    @staticmethod
    async def build_messages(
        name: str,
        variables: dict[str, Any],
        db: AsyncSession,
    ) -> tuple[list[dict[str, str]], int]:
        """Load + render prompts → structured OpenAI messages array.

        Returns:
            (messages, max_version_number)

        Raises:
            LookupError: No active prompt found for *name*.
        """
        prompts = await PromptService.get_active_prompts(name, db)
        if not prompts:
            raise LookupError(f"No active prompt found for name='{name}'")

        messages: list[dict[str, str]] = [
            {"role": p.role, "content": PromptService.render(p.template, variables)}
            for p in prompts
        ]
        max_version = max(p.version for p in prompts)
        return messages, max_version

    # ── Full pipeline ──────────────────────────────────────────────────────────

    @staticmethod
    async def generate_response(
        prompt_name: str,
        variables: dict[str, Any],
        db: AsyncSession,
        user_id: uuid.UUID | None = None,
        max_tokens: int = 2048,
    ) -> str:
        """End-to-end: load → render → call LLM → log → return response text.

        Raises:
            LookupError: Prompt not found in DB.
            ValueError:  Missing template variable or API key not set.
            RuntimeError: OpenAI returned a non-200 status.
        """
        messages, version = await PromptService.build_messages(prompt_name, variables, db)

        response_text, tokens_used, model_used = await _llm_chat(messages, max_tokens)

        await PromptService._write_log(
            db=db,
            user_id=user_id,
            prompt_name=prompt_name,
            prompt_version=version,
            messages=messages,
            variables=variables,
            response=response_text,
            model_used=model_used,
            tokens_used=tokens_used,
        )

        return response_text

    # ── Chat variant (dynamic history + system prompt from DB) ─────────────────

    @staticmethod
    async def generate_chat_response(
        workspace_title: str,
        context: str,
        history: list[dict[str, str]],
        db: AsyncSession,
        user_id: uuid.UUID | None = None,
        max_tokens: int = 1024,
    ) -> str:
        """Build a chat response: DB system prompt + conversation history.

        Falls back to an inline system prompt if "chat" prompt not in DB.
        """
        system_content: str | None = None
        version = 1

        prompts = await PromptService.get_active_prompts("chat", db)
        if prompts:
            # Chat has only a "system" role template
            sys_prompt = next((p for p in prompts if p.role == "system"), None)
            if sys_prompt:
                system_content = PromptService.render(
                    sys_prompt.template,
                    {"workspace_title": workspace_title, "context": context or "No summaries available yet."},
                )
                version = sys_prompt.version

        if system_content is None:
            # Inline fallback — keeps the service working even if DB is empty
            system_content = (
                f'You are an AI study assistant for workspace "{workspace_title}". '
                f"Help the student understand material and answer questions.\n\n"
                f"Context:\n{context or 'No summaries available yet.'}"
            )

        messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
        messages.extend(history[-20:])  # cap at 20 for context window

        response_text, tokens_used, model_used = await _llm_chat(messages, max_tokens)

        await PromptService._write_log(
            db=db,
            user_id=user_id,
            prompt_name="chat",
            prompt_version=version,
            messages=messages,  # stored as JSONB — full conversation for replay/debug
            variables={"workspace_title": workspace_title},
            response=response_text,
            model_used=model_used,
            tokens_used=tokens_used,
        )

        return response_text

    # ── Internal ───────────────────────────────────────────────────────────────

    @staticmethod
    async def _write_log(
        *,
        db: AsyncSession,
        user_id: uuid.UUID | None,
        prompt_name: str,
        prompt_version: int,
        messages: list[dict],
        variables: dict[str, Any],
        response: str,
        model_used: str,
        tokens_used: int | None,
    ) -> None:
        """Append an LLMLog row. Never raises — logging must not break requests."""
        try:
            log = LLMLog(
                user_id=user_id,
                prompt_name=prompt_name,
                prompt_version=prompt_version,
                full_prompt=messages,  # JSONB — SQLAlchemy serializes the list directly
                input_variables={k: str(v)[:500] for k, v in variables.items()},
                response=response,
                model_used=model_used,
                tokens_used=tokens_used,
            )
            db.add(log)
            await db.flush()
        except Exception as exc:
            logger.warning("LLMLog write failed for prompt=%s: %s", prompt_name, exc)
