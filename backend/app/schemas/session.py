"""Pydantic v2 schemas for Session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

SESSION_STATUSES = {"active", "paused", "completed", "abandoned"}


class SessionCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    planned_duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    micro_goal_ids: List[uuid.UUID] = Field(default_factory=list)
    flashcard_deck_id: Optional[uuid.UUID] = None
    quiz_set_id: Optional[uuid.UUID] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    status: Optional[str] = None
    planned_duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    ended_at: Optional[datetime] = None
    mood_rating: Optional[int] = Field(None, ge=1, le=5)
    productivity_rating: Optional[int] = Field(None, ge=1, le=5)
    notes_text: Optional[str] = None
    micro_goal_ids: Optional[List[uuid.UUID]] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in SESSION_STATUSES:
            raise ValueError(f"status must be one of {SESSION_STATUSES}")
        return v


class SessionResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str]
    status: str
    planned_duration_minutes: Optional[int]
    started_at: datetime
    ended_at: Optional[datetime]
    mood_rating: Optional[int]
    productivity_rating: Optional[int]
    notes_text: Optional[str]
    micro_goal_ids: List[uuid.UUID] = Field(default_factory=list)
    flashcard_deck_id: Optional[uuid.UUID] = None
    quiz_set_id: Optional[uuid.UUID] = None
    flashcard_reviews_count: int = 0
    quiz_score_pct: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_goals(
        cls,
        session: object,
        flashcard_reviews_count: int = 0,
        quiz_score_pct: Optional[float] = None,
    ) -> "SessionResponse":
        from app.models.session import Session as SessionModel
        s: SessionModel = session  # type: ignore[assignment]
        return cls(
            id=s.id,
            workspace_id=s.workspace_id,
            user_id=s.user_id,
            title=s.title,
            status=s.status,
            planned_duration_minutes=s.planned_duration_minutes,
            started_at=s.started_at,
            ended_at=s.ended_at,
            mood_rating=s.mood_rating,
            productivity_rating=s.productivity_rating,
            notes_text=s.notes_text,
            micro_goal_ids=[smg.micro_goal_id for smg in (s.session_micro_goals or [])],
            flashcard_deck_id=s.flashcard_deck_id,
            quiz_set_id=s.quiz_set_id,
            flashcard_reviews_count=flashcard_reviews_count,
            quiz_score_pct=quiz_score_pct,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
