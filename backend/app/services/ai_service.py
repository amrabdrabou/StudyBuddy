"""AI content generation service.

All public functions are async. Each function:
  1. Tries to load the prompt from the database (PromptService path).
  2. Falls back to the hardcoded prompts.py templates if DB prompts are absent.
  3. Logs every LLM call to llm_logs when a db session is provided.

The optional `db` / `user_id` parameters are the new production path.
Callers that cannot provide a db session still work via the fallback.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import prompts as _legacy_prompts
from app.services.llm_client import chat as _llm_chat
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)

_DIFFICULTY_CTX: dict[str, str] = {
    "easy":   "Use plain language, cover only the most fundamental concepts, avoid jargon.",
    "normal": "Cover the main concepts with moderate depth. Include key terminology.",
    "hard":   "Include advanced details, nuanced distinctions, and edge cases. Assume strong prior knowledge.",
}

_DIFFICULTY_DB_MAP: dict[str, str] = {
    "easy":   "easy",
    "normal": "medium",
    "hard":   "hard",
}


# ── Internal helpers ───────────────────────────────────────────────────────────

def _strip_code_fence(raw: str) -> str:
    """Remove optional ```json … ``` fences from model output."""
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        if len(parts) >= 2:
            inner = parts[1]
            if inner.startswith("json"):
                inner = inner[4:]
            text = inner.rsplit("```", 1)[0].strip()
    return text


async def _call(
    prompt_name: str,
    variables: dict[str, Any],
    fallback_messages: list[dict[str, str]],
    max_tokens: int,
    db: AsyncSession | None,
    user_id: uuid.UUID | None,
) -> str:
    """Unified dispatch: DB prompts when available, legacy fallback otherwise."""
    if db is not None:
        try:
            return await PromptService.generate_response(
                prompt_name=prompt_name,
                variables=variables,
                db=db,
                user_id=user_id,
                max_tokens=max_tokens,
            )
        except LookupError:
            logger.debug("Prompt '%s' not found in DB — using legacy fallback", prompt_name)

    # Legacy path: prompts.py (no logging)
    content, _, _ = await _llm_chat(fallback_messages, max_tokens)
    return content


# ── Public API ────────────────────────────────────────────────────────────────

async def summarize_document(
    text: str,
    filename: str,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> str:
    """Return a plain-text structured summary of the document."""
    variables = {
        "filename": filename,
        "document_text": text[:12000],
    }
    sys_msg, user_msg = _legacy_prompts.summarize_prompts(text, filename)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    return await _call("summarize", variables, fallback, 1024, db, user_id)


async def generate_flashcards(
    summary: str,
    difficulty: str,
    count: int = 15,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Return a list of flashcard dicts: {front, back, hint | None}."""
    ctx = _DIFFICULTY_CTX.get(difficulty, _DIFFICULTY_CTX["normal"])
    variables = {
        "count": count,
        "difficulty": difficulty.upper(),
        "difficulty_ctx": ctx,
        "summary": summary[:8000],
    }
    sys_msg, user_msg = _legacy_prompts.flashcards_prompts(summary, difficulty, count, ctx)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    raw = await _call("flashcards", variables, fallback, 2500, db, user_id)
    data: list[dict[str, Any]] = json.loads(_strip_code_fence(raw))
    return [
        {
            "front": str(c["front"]),
            "back":  str(c["back"]),
            "hint":  str(c["hint"]) if c.get("hint") else None,
        }
        for c in data
        if c.get("front") and c.get("back")
    ]


async def generate_quiz(
    summary: str,
    difficulty: str,
    count: int = 10,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Return question dicts ready for QuizQuestion + QuizOption models (3 options each)."""
    ctx = _DIFFICULTY_CTX.get(difficulty, _DIFFICULTY_CTX["normal"])
    db_difficulty = _DIFFICULTY_DB_MAP.get(difficulty, "medium")
    variables = {
        "count": count,
        "difficulty": difficulty.upper(),
        "difficulty_ctx": ctx,
        "summary": summary[:8000],
    }
    sys_msg, user_msg = _legacy_prompts.quiz_prompts(summary, difficulty, count, ctx)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    raw = await _call("quiz", variables, fallback, 3000, db, user_id)
    data: list[dict[str, Any]] = json.loads(_strip_code_fence(raw))

    result = []
    for i, q in enumerate(data):
        if not q.get("question_text") or not q.get("options"):
            continue
        options = [
            {
                "text":        str(o.get("text", "")),
                "is_correct":  bool(o.get("is_correct", False)),
                "order_index": j,
            }
            for j, o in enumerate(q["options"])
            if o.get("text")
        ]
        result.append({
            "question_text":  str(q["question_text"]),
            "question_type":  "multiple_choice",
            "correct_answer": str(q.get("correct_answer", "")),
            "explanation":    str(q.get("explanation", "")),
            "difficulty":     db_difficulty,
            "order_index":    i,
            "ai_generated":   True,
            "options":        options,
        })
    return result


async def generate_study_session_plan(
    summary: str,
    workspace_title: str,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Return AI-recommended study session config: {session_title, duration_minutes,
    flashcard_count, flashcard_difficulty, quiz_count, quiz_difficulty, focus_summary, tips}."""
    variables = {
        "workspace_title": workspace_title,
        "summary": summary[:8000],
    }
    sys_msg, user_msg = _legacy_prompts.study_session_plan_prompts(summary, workspace_title)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    raw = await _call("study_session_plan", variables, fallback, 600, db, user_id)
    data: dict[str, Any] = json.loads(_strip_code_fence(raw))
    # Clamp and validate returned values
    fc = max(5, min(20, int(data.get("flashcard_count", 10))))
    qc = max(3, min(15, int(data.get("quiz_count", 5))))
    dm = max(20, min(120, int(data.get("duration_minutes", 60))))
    fd = data.get("flashcard_difficulty", "normal")
    if fd not in ("easy", "normal", "hard"):
        fd = "normal"
    qd = data.get("quiz_difficulty", "normal")
    if qd not in ("easy", "normal", "hard"):
        qd = "normal"
    return {
        "session_title":         str(data.get("session_title", f"{workspace_title} — Study Session")),
        "duration_minutes":      dm,
        "flashcard_count":       fc,
        "flashcard_difficulty":  fd,
        "quiz_count":            qc,
        "quiz_difficulty":       qd,
        "focus_summary":         str(data.get("focus_summary", "")),
        "tips":                  [str(t) for t in data.get("tips", [])],
    }


async def generate_roadmap(
    summary: str,
    workspace_title: str,
    count: int = 8,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Return a list of micro-goal dicts: {title, description, order_index}."""
    variables = {
        "count": count,
        "workspace_title": workspace_title,
        "summary": summary[:10000],
    }
    sys_msg, user_msg = _legacy_prompts.roadmap_prompts(summary, workspace_title, count)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    raw = await _call("roadmap", variables, fallback, 2000, db, user_id)
    data: list[dict[str, Any]] = json.loads(_strip_code_fence(raw))
    return [
        {
            "title":       str(g["title"])[:300],
            "description": str(g["description"]) if g.get("description") else None,
            "order_index": int(g.get("order_index", i)),
        }
        for i, g in enumerate(data)
        if g.get("title")
    ]


async def ai_chat_reply(
    history: list[dict[str, str]],
    workspace_title: str,
    context: str,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> str:
    """Generate a reply for the workspace chat thread.

    history: list of {role: "user"|"assistant", content: str}, chronological.
    Uses DB system prompt with full conversation history — not PromptService.generate_response()
    because user messages come from history, not a template.
    """
    if db is not None:
        return await PromptService.generate_chat_response(
            workspace_title=workspace_title,
            context=context,
            history=history,
            db=db,
            user_id=user_id,
        )

    # Legacy fallback
    system = _legacy_prompts.chat_system_prompt(workspace_title, context)
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(history[-20:])
    content, _, _ = await _llm_chat(messages, 1024)
    return content


async def suggest_session(
    goals_text: str,
    workspace_title: str,
    available_minutes: int = 60,
    db: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Return a session suggestion dict: {title, focus_summary, suggested_goal_ids, tips}."""
    variables = {
        "workspace_title": workspace_title,
        "available_minutes": available_minutes,
        "goals_text": goals_text,
    }
    sys_msg, user_msg = _legacy_prompts.session_suggest_prompts(goals_text, workspace_title, available_minutes)
    fallback = [
        {"role": "system", "content": sys_msg},
        {"role": "user",   "content": user_msg},
    ]
    raw = await _call("session_suggest", variables, fallback, 800, db, user_id)
    data: dict[str, Any] = json.loads(_strip_code_fence(raw))
    return {
        "title":              str(data.get("title", "Study Session")),
        "focus_summary":      str(data.get("focus_summary", "")),
        "suggested_goal_ids": [str(g) for g in data.get("suggested_goal_ids", [])],
        "tips":               [str(t) for t in data.get("tips", [])],
    }
