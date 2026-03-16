"""Pydantic schemas for user-level AI study recommendations."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AiRecommendationCreate(BaseModel):
    session_id: Optional[uuid.UUID] = None
    learning_goal_id: Optional[uuid.UUID] = None
    recommendation_type: str  # next_session | review_reminder | pace_warning | topic_suggestion
    title: str
    body: str
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class AiRecommendationUpdate(BaseModel):
    is_dismissed: Optional[bool] = None


class AiRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    learning_goal_id: Optional[uuid.UUID] = None
    recommendation_type: str
    title: str
    body: str
    action_url: Optional[str] = None
    is_dismissed: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
