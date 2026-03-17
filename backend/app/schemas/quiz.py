"""Pydantic v2 schemas for QuizSet, QuizQuestion, QuizOption, QuizAttempt."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

QUIZ_ATTEMPT_STATUSES = {"in_progress", "completed", "abandoned", "timed_out"}


# ── QuizOption ────────────────────────────────────────────────────────────────

class QuizOptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    order_index: int = 0


class QuizOptionResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    option_text: str
    is_correct: bool
    order_index: int

    model_config = {"from_attributes": True}


# ── QuizQuestion ──────────────────────────────────────────────────────────────

class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: str = "multiple_choice"
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str = "medium"
    order_index: int = 0
    options: List[QuizOptionCreate] = Field(default_factory=list)


class QuizQuestionResponse(BaseModel):
    id: uuid.UUID
    quiz_set_id: uuid.UUID
    question_text: str
    question_type: str
    correct_answer: Optional[str]
    explanation: Optional[str]
    difficulty: str
    order_index: int
    ai_generated: bool
    options: List[QuizOptionResponse] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


# ── QuizSet ───────────────────────────────────────────────────────────────────

class QuizSetCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(None, ge=1, le=300)


class QuizSetUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(None, ge=1, le=300)


class QuizSetResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by_user_id: uuid.UUID
    title: str
    description: Optional[str]
    time_limit_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── QuizAttempt ───────────────────────────────────────────────────────────────

class QuizAttemptCreate(BaseModel):
    time_limit_minutes: Optional[int] = Field(None, ge=1, le=300)


class QuizAttemptUpdate(BaseModel):
    status: Optional[str] = None
    score_pct: Optional[float] = Field(None, ge=0, le=100)
    ended_at: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in QUIZ_ATTEMPT_STATUSES:
            raise ValueError(f"status must be one of {QUIZ_ATTEMPT_STATUSES}")
        return v


class QuizAttemptResponse(BaseModel):
    id: uuid.UUID
    quiz_set_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    time_limit_minutes: Optional[int]
    score_pct: Optional[float]
    started_at: datetime
    ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── QuizAttemptAnswer ─────────────────────────────────────────────────────────

class QuizAttemptAnswerCreate(BaseModel):
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID] = None
    free_text_answer: Optional[str] = None


class QuizAttemptAnswerResponse(BaseModel):
    id: uuid.UUID
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID]
    free_text_answer: Optional[str]
    is_correct: Optional[bool]
    answered_at: datetime

    model_config = {"from_attributes": True}
