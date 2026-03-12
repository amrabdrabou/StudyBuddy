import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class StudySessionBase(BaseModel):
    session_type: str
    study_subject_id: Optional[uuid.UUID] = None


class StudySessionCreate(StudySessionBase):
    started_at: Optional[datetime] = None


class StudySessionUpdate(BaseModel):
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
    started_at: datetime
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
