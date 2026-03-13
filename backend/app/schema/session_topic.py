import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionTopicBase(BaseModel):
    topic_name: str
    source: str = "ai"
    is_active: bool = True


class SessionTopicCreate(SessionTopicBase):
    pass


class SessionTopicUpdate(BaseModel):
    topic_name: Optional[str] = None
    is_active: Optional[bool] = None


class SessionTopicResponse(SessionTopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime
