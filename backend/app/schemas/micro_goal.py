"""Pydantic v2 schemas for MicroGoal."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

MICRO_GOAL_STATUSES = {"suggested", "pending", "in_progress", "completed", "skipped"}


class MicroGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    deadline: Optional[date] = None
    order_index: int = 0


class MicroGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[date] = None
    order_index: Optional[int] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in MICRO_GOAL_STATUSES:
            raise ValueError(f"status must be one of {MICRO_GOAL_STATUSES}")
        return v


class MicroGoalResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[date]
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
