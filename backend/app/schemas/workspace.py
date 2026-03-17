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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
