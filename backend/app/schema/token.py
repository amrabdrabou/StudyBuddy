import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TokenBase(BaseModel):
    token: str
    expires_at: datetime


class TokenCreate(TokenBase):
    user_id: uuid.UUID


class TokenUpdate(BaseModel):
    expires_at: datetime


class TokenResponse(TokenBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
