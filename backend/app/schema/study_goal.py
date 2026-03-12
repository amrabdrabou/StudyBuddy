import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class StudyGoalBase(BaseModel):
    goal_type: str
    target_value: Optional[int] = None
    study_subject_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class StudyGoalCreate(StudyGoalBase):
    pass


class StudyGoalUpdate(BaseModel):
    goal_type: Optional[str] = None
    target_value: Optional[int] = None
    current_value: Optional[int] = None
    study_subject_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None
    completed_at: Optional[datetime] = None


class StudyGoalResponse(StudyGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    current_value: Optional[int] = None
    is_active: bool
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
