"""Pydantic v2 schemas for BigGoal."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

USER_SETTABLE_STATUSES = {"active", "paused", "completed", "canceled"}


class BigGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    deadline: Optional[date] = None
    subject_ids: List[uuid.UUID] = Field(default_factory=list)


class BigGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[str] = None
    subject_ids: Optional[List[uuid.UUID]] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in USER_SETTABLE_STATUSES:
            raise ValueError(f"status must be one of {USER_SETTABLE_STATUSES}")
        return v


class BigGoalSubjectInfo(BaseModel):
    subject_id: uuid.UUID

    model_config = {"from_attributes": True}


class BigGoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[date]
    progress_pct: int
    subject_ids: List[uuid.UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_subjects(cls, goal: object) -> "BigGoalResponse":
        from app.models.big_goal import BigGoal
        g: BigGoal = goal  # type: ignore[assignment]
        data = {
            "id": g.id,
            "user_id": g.user_id,
            "title": g.title,
            "description": g.description,
            "status": g.status,
            "deadline": g.deadline,
            "progress_pct": g.progress_pct,
            "subject_ids": [bgs.subject_id for bgs in (g.big_goal_subjects or [])],
            "created_at": g.created_at,
            "updated_at": g.updated_at,
        }
        return cls(**data)
