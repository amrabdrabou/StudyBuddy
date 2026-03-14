"""Pydantic schemas for creating, reading, and updating learning goals."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

GoalType = Literal["finish_course", "exam_prep", "hours_target", "topic_mastery", "custom"]
GoalStatusType = Literal["active", "paused", "completed", "abandoned"]


class LearningGoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    goal_type: GoalType = "custom"
    status: GoalStatusType = "active"
    study_subject_id: Optional[uuid.UUID] = None
    target_date: Optional[date] = None
    target_hours: Optional[int] = None
    target_score_pct: Optional[int] = None


class LearningGoalCreate(LearningGoalBase):
    pass


class LearningGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal_type: Optional[GoalType] = None
    status: Optional[GoalStatusType] = None
    study_subject_id: Optional[uuid.UUID] = None
    target_date: Optional[date] = None
    target_hours: Optional[int] = None
    target_score_pct: Optional[int] = None
    progress_pct: Optional[int] = None
    total_hours_logged: Optional[Decimal] = None


class LearningGoalResponse(LearningGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    progress_pct: int
    total_hours_logged: Decimal
    created_at: datetime
    updated_at: datetime
