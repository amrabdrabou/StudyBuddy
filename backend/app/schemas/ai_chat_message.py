"""Pydantic v2 schemas for AIChatMessage."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

CHAT_ROLES = {"user", "assistant"}


class AIChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=20_000)


class AIChatMessageResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
