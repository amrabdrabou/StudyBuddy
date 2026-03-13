import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MicroGoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    order_index: int = 0
    status: str = "pending"
    ai_generated: bool = True


class MicroGoalCreate(MicroGoalBase):
    session_id: uuid.UUID
    parent_goal_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None


class MicroGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    order_index: Optional[int] = None
    status: Optional[str] = None  # pending | in_progress | completed | skipped
    user_modified: Optional[bool] = None
    completed_at: Optional[datetime] = None


class MicroGoalResponse(MicroGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    parent_goal_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    user_modified: bool
    original_ai_text: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
