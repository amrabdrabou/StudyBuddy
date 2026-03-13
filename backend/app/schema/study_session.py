import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

SessionStatus = Literal["pending", "active", "completed", "abandoned"]
IntentionType = Literal["review", "learn_new", "practice", "exam_prep", "other"]


class StudySessionBase(BaseModel):
    session_type: str
    study_subject_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    intention_text: Optional[str] = None
    intention_type: Optional[IntentionType] = None


class StudySessionCreate(StudySessionBase):
    started_at: Optional[datetime] = None
    actual_started_at: Optional[datetime] = None


class StudySessionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[SessionStatus] = None
    intention_text: Optional[str] = None
    intention_type: Optional[IntentionType] = None
    actual_started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    cards_reviewed: Optional[int] = None
    cards_correct: Optional[int] = None
    notes_created: Optional[int] = None
    notes_edited: Optional[int] = None
    focus_score: Optional[int] = None
    mood_rating: Optional[int] = None
    productivity_rating: Optional[int] = None
    notes_text: Optional[str] = None
    is_completed: Optional[bool] = None


class StudySessionResponse(StudySessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str] = None
    status: SessionStatus
    intention_text: Optional[str] = None
    intention_type: Optional[IntentionType] = None
    started_at: datetime
    actual_started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    cards_reviewed: Optional[int] = None
    cards_correct: Optional[int] = None
    notes_created: Optional[int] = None
    notes_edited: Optional[int] = None
    focus_score: Optional[int] = None
    mood_rating: Optional[int] = None
    productivity_rating: Optional[int] = None
    notes_text: Optional[str] = None
    is_completed: bool
    created_at: datetime
    updated_at: datetime
