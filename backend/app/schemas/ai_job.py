"""Pydantic v2 schemas for AIJob."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

AI_JOB_TYPES = {"summary", "micro_goals", "flashcards", "quiz", "timeline", "recommendations"}


class AIJobCreate(BaseModel):
    job_type: str
    document_id: Optional[uuid.UUID] = None

    @field_validator("job_type")
    @classmethod
    def validate_job_type(cls, v: str) -> str:
        if v not in AI_JOB_TYPES:
            raise ValueError(f"job_type must be one of {AI_JOB_TYPES}")
        return v


class AIJobResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    requested_by_user_id: uuid.UUID
    document_id: Optional[uuid.UUID]
    job_type: str
    status: str
    result_json: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
