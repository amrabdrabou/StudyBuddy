"""Pydantic schemas for recording and reading quiz attempt results."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class QuizAttemptCreate(BaseModel):
    quiz_set_id: uuid.UUID


class QuizAttemptUpdate(BaseModel):
    status: Optional[str] = None  # in_progress | completed | abandoned
    score_pct: Optional[Decimal] = None
    time_taken_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None


class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quiz_set_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    status: str
    score_pct: Optional[Decimal] = None
    time_taken_seconds: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
