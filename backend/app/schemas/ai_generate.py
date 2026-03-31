"""Pydantic schemas for AI-generation endpoints."""
from __future__ import annotations

import uuid
from typing import Literal, List

from pydantic import BaseModel, Field

Difficulty = Literal["easy", "normal", "hard"]


# ── Summarize ─────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    document_id: uuid.UUID


class SummarizeResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    summary: str


# ── Flashcards ────────────────────────────────────────────────────────────────

class GenerateFlashcardsRequest(BaseModel):
    summary: str = Field(default="", description="Summary text to generate cards from. When empty, document_ids are used.")
    document_ids: List[uuid.UUID] = Field(
        default_factory=list,
        description="Document IDs to load summaries from. Ignored when summary is provided.",
    )
    difficulty: Difficulty = "normal"
    deck_title: str = Field(default="AI Flashcards", max_length=200)
    count: int = Field(default=15, ge=5, le=30, description="Number of cards to generate (5–30)")


class GenerateFlashcardsResponse(BaseModel):
    deck_id: uuid.UUID
    deck_title: str
    difficulty: str
    cards_created: int


# ── Quiz ──────────────────────────────────────────────────────────────────────

class GenerateQuizRequest(BaseModel):
    summary: str = Field(default="", description="Summary text to generate questions from. When empty, document_ids are used.")
    document_ids: List[uuid.UUID] = Field(
        default_factory=list,
        description="Document IDs to load summaries from. Ignored when summary is provided.",
    )
    difficulty: Difficulty = "normal"
    quiz_title: str = Field(default="AI Quiz", max_length=200)
    count: int = Field(default=10, ge=3, le=20, description="Number of questions to generate (3–20)")


class GenerateQuizResponse(BaseModel):
    quiz_set_id: uuid.UUID
    quiz_title: str
    difficulty: str
    questions_created: int


# ── Roadmap ───────────────────────────────────────────────────────────────────

class GenerateRoadmapRequest(BaseModel):
    document_ids: List[uuid.UUID] = Field(
        default_factory=list,
        description="Document IDs to include. Empty list = use all ready documents. Ignored when summary_text is set.",
    )
    summary_text: str | None = Field(
        default=None,
        description="Raw summary text to generate from. When set, document_ids is ignored.",
    )
    count: int = Field(default=8, ge=3, le=20, description="Number of micro-goals to generate (3–20)")
    difficulty: Difficulty = Field(
        default="normal",
        description="Goal granularity: easy = high-level, normal = balanced, hard = deep/detailed.",
    )


class GenerateRoadmapResponse(BaseModel):
    goals_created: int


# ── Session Suggestion ────────────────────────────────────────────────────────

class SuggestSessionRequest(BaseModel):
    available_minutes: int = Field(default=60, ge=15, le=480)


class SuggestSessionResponse(BaseModel):
    title: str
    focus_summary: str
    suggested_goal_ids: List[str]
    tips: List[str]


# ── Study Session ──────────────────────────────────────────────────────────────

class GenerateStudySessionRequest(BaseModel):
    summary: str = Field(
        default="",
        description="Summary text to base the session on. If empty, workspace doc summaries are loaded automatically.",
    )
    goal_context: str = Field(
        default="",
        max_length=600,
        description="Micro-goal title + description to focus the session. Used when no summary is provided.",
    )
    goal_id: uuid.UUID | None = Field(
        default=None,
        description="Deprecated — use goal_ids. Single micro-goal ID kept for backward compatibility.",
    )
    goal_ids: List[uuid.UUID] = Field(
        default_factory=list,
        description="One or more micro-goal IDs to link to this session. When non-empty, session is linked to all provided goals instead of creating new system micro-goals.",
    )
    mode: Literal["auto", "manual"] = Field(default="auto", description="auto = AI decides all params; manual = use provided params")
    # Used only when mode="manual"
    flashcard_difficulty: Difficulty = Field(default="normal")
    flashcard_count: int = Field(default=10, ge=5, le=20)
    quiz_difficulty: Difficulty = Field(default="normal")
    quiz_count: int = Field(default=5, ge=3, le=15)
    session_duration_minutes: int = Field(default=60, ge=20, le=120)


class GenerateStudySessionResponse(BaseModel):
    session_id: uuid.UUID
    session_title: str
    duration_minutes: int
    focus_summary: str
    tips: List[str]
    flashcard_deck_id: uuid.UUID
    flashcard_deck_title: str
    cards_created: int
    flashcard_difficulty: str
    quiz_set_id: uuid.UUID
    quiz_title: str
    questions_created: int
    quiz_difficulty: str
    goals_created: int
