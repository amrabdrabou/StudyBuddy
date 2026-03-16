"""Pydantic schemas for creating, reading, and updating study sessions."""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SessionStatus = Literal["pending", "active", "completed", "abandoned"]
IntentionType = Literal["review", "learn_new", "practice", "exam_prep", "other"]
GoalStatus = Literal["suggested", "accepted", "rejected"]


class StudySessionBase(BaseModel):
    session_type: str = Field(max_length=50)
    study_subject_id: Optional[uuid.UUID] = None
    learning_goal_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(default=None, max_length=300)
    intention_text: Optional[str] = Field(default=None, max_length=1000)
    intention_type: Optional[IntentionType] = None
    scheduled_at: Optional[datetime] = None


class StudySessionCreate(StudySessionBase):
    started_at: Optional[datetime] = None
    actual_started_at: Optional[datetime] = None


class StudySessionUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    status: Optional[SessionStatus] = None
    intention_text: Optional[str] = Field(default=None, max_length=1000)
    intention_type: Optional[IntentionType] = None
    learning_goal_id: Optional[uuid.UUID] = None
    goal_title: Optional[str] = Field(default=None, max_length=300)
    goal_description: Optional[str] = Field(default=None, max_length=2000)
    goal_status: Optional[GoalStatus] = None
    scheduled_at: Optional[datetime] = None
    actual_started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0, le=1440)
    cards_reviewed: Optional[int] = Field(default=None, ge=0)
    cards_correct: Optional[int] = Field(default=None, ge=0)
    notes_created: Optional[int] = Field(default=None, ge=0)
    notes_edited: Optional[int] = Field(default=None, ge=0)
    focus_score: Optional[int] = Field(default=None, ge=0, le=100)
    mood_rating: Optional[int] = Field(default=None, ge=1, le=5)
    productivity_rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes_text: Optional[str] = Field(default=None, max_length=50_000)
    is_completed: Optional[bool] = None
    progress_pct: Optional[int] = Field(default=None, ge=0, le=100)
    micro_goals_total: Optional[int] = Field(default=None, ge=0)
    micro_goals_done: Optional[int] = Field(default=None, ge=0)


class StudySessionResponse(StudySessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    status: SessionStatus
    goal_title: Optional[str] = None
    goal_description: Optional[str] = None
    goal_status: Optional[GoalStatus] = None
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
    progress_pct: int = 0
    micro_goals_total: int = 0
    micro_goals_done: int = 0
    created_at: datetime
    updated_at: datetime
