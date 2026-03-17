"""Pydantic v2 schemas for Note."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    subject_id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, min_length=1)


class NoteResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject_id: uuid.UUID
    workspace_id: Optional[uuid.UUID]
    session_id: Optional[uuid.UUID]
    title: Optional[str]
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
