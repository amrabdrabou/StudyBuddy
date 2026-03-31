"""Pydantic v2 schemas for Workspace."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

WORKSPACE_STATUSES = {"active", "paused", "completed", "canceled"}


class WorkspaceCreate(BaseModel):
    subject_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=300)


class WorkspaceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in WORKSPACE_STATUSES:
            raise ValueError(f"status must be one of {WORKSPACE_STATUSES}")
        return v


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject_id: uuid.UUID
    title: str
    status: str
    progress_pct: int = 0
    created_at: datetime
    updated_at: datetime
    # Content counts — populated by the list endpoint; default 0 for single-fetch endpoints
    document_count: int = 0
    flashcard_deck_count: int = 0
    quiz_set_count: int = 0
    session_count: int = 0
    note_count: int = 0

    model_config = {"from_attributes": True}
