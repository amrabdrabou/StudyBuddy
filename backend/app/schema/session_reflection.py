import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionReflectionBase(BaseModel):
    question_text: str


class SessionReflectionCreate(SessionReflectionBase):
    session_id: uuid.UUID
    ai_event_id: Optional[uuid.UUID] = None


class SessionReflectionUpdate(BaseModel):
    user_response: Optional[str] = None
    responded_at: Optional[datetime] = None


class SessionReflectionResponse(SessionReflectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    ai_event_id: Optional[uuid.UUID] = None
    user_response: Optional[str] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
