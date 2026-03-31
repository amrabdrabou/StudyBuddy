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
    cover_color: str = Field("#6366f1", max_length=20)
    icon: Optional[str] = Field(None, max_length=100)
    pinned: bool = False


class BigGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[str] = None
    subject_ids: Optional[List[uuid.UUID]] = None
    cover_color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=100)
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in USER_SETTABLE_STATUSES:
            raise ValueError(f"status must be one of {USER_SETTABLE_STATUSES}")
        return v


class BigGoalSubjectInfo(BaseModel):
    subject_id: uuid.UUID

    model_config = {"from_attributes": True}


class SubjectSummary(BaseModel):
    id: uuid.UUID
    name: str
    color_hex: Optional[str]
    icon: Optional[str]
    workspace_count: int


class BigGoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[date]
    progress_pct: int
    subject_ids: List[uuid.UUID] = Field(default_factory=list)
    cover_color: str
    icon: Optional[str]
    pinned: bool
    archived: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_subjects(
        cls, goal: object, progress_override: Optional[float] = None
    ) -> "BigGoalResponse":
        from app.models.big_goal import BigGoal
        g: BigGoal = goal  # type: ignore[assignment]
        data = {
            "id": g.id,
            "user_id": g.user_id,
            "title": g.title,
            "description": g.description,
            "status": g.status,
            "deadline": g.deadline,
            "progress_pct": round(progress_override) if progress_override is not None else 0,
            "subject_ids": [bgs.subject_id for bgs in (g.big_goal_subjects or [])],
            "cover_color": g.cover_color,
            "icon": g.icon,
            "pinned": g.pinned,
            "archived": g.archived,
            "display_order": g.display_order,
            "created_at": g.created_at,
            "updated_at": g.updated_at,
        }
        return cls(**data)


class BigGoalDetailResponse(BigGoalResponse):
    """Aggregated card detail — includes subject summaries and resource counts."""
    subjects_detail: List[SubjectSummary] = Field(default_factory=list)
    workspace_count: int = 0
    document_count: int = 0
    note_count: int = 0
