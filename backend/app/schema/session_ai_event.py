import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class SessionAiEventBase(BaseModel):
    event_type: str  # overview | checkpoint | quiz_generation | summary | reflection | next_plan
    content: str
    event_metadata: Optional[Dict[str, Any]] = None


class SessionAiEventCreate(SessionAiEventBase):
    session_id: uuid.UUID


class SessionAiEventUpdate(BaseModel):
    user_acknowledged: Optional[bool] = None
    acknowledged_at: Optional[datetime] = None


class SessionAiEventResponse(SessionAiEventBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    session_id: uuid.UUID
    triggered_at: datetime
    user_acknowledged: bool
    acknowledged_at: Optional[datetime] = None
