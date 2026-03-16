"""Pydantic schemas for reading timeline events on a user's study history."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TimelineEventCreate(BaseModel):
    session_id: Optional[uuid.UUID] = None
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    event_type: str
    description: Optional[str] = None
    metadata_json: Optional[str] = None
    is_ai_generated: bool = False
    is_public: bool = True


class TimelineEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    event_type: str
    description: Optional[str] = None
    metadata_json: Optional[str] = None
    is_ai_generated: bool
    is_public: bool
    created_at: datetime
