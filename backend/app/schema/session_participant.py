import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionParticipantBase(BaseModel):
    role: str = "participant"
    invite_status: str = "pending"


class SessionParticipantCreate(BaseModel):
    user_id: uuid.UUID
    role: str = "participant"


class SessionParticipantUpdate(BaseModel):
    invite_status: Optional[str] = None
    role: Optional[str] = None
    joined_at: Optional[datetime] = None


class SessionParticipantResponse(SessionParticipantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    invited_at: datetime
    joined_at: Optional[datetime] = None
