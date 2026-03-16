"""Pydantic schemas for AI-generated recommendations produced after a session."""
import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class SessionRecommendationBase(BaseModel):
    suggested_topics: Optional[List[Any]] = None
    suggested_duration_minutes: Optional[int] = None
    reasoning: Optional[str] = None


class SessionRecommendationCreate(SessionRecommendationBase):
    source_session_id: uuid.UUID
    recommended_subject_id: Optional[uuid.UUID] = None
    ai_event_id: Optional[uuid.UUID] = None


class SessionRecommendationUpdate(BaseModel):
    user_action: Optional[str] = None  # dismissed | accepted | scheduled


class SessionRecommendationResponse(SessionRecommendationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_session_id: uuid.UUID
    recommended_subject_id: Optional[uuid.UUID] = None
    ai_event_id: Optional[uuid.UUID] = None
    user_action: Optional[str] = None
    created_at: datetime
