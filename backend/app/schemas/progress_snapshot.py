"""Pydantic schemas for reading periodic progress snapshots."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProgressSnapshotCreate(BaseModel):
    learning_goal_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    snapshot_type: str  # session_end | daily | weekly
    snapshot_date: date
    total_study_minutes: int = 0
    sessions_completed: int = 0
    micro_goals_completed: int = 0
    quiz_attempts_count: int = 0
    quiz_avg_score_pct: Optional[Decimal] = None
    flashcards_reviewed: int = 0
    flashcards_correct_pct: Optional[Decimal] = None
    documents_processed: int = 0
    goal_progress_pct: Optional[int] = None


class ProgressSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    learning_goal_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    snapshot_type: str
    snapshot_date: date
    total_study_minutes: int
    sessions_completed: int
    micro_goals_completed: int
    quiz_attempts_count: int
    quiz_avg_score_pct: Optional[Decimal] = None
    flashcards_reviewed: int
    flashcards_correct_pct: Optional[Decimal] = None
    documents_processed: int
    goal_progress_pct: Optional[int] = None
    created_at: datetime
