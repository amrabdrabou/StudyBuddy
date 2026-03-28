"""Pydantic schemas for the Prompt management API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Response ───────────────────────────────────────────────────────────────────

class PromptResponse(BaseModel):
    id: uuid.UUID
    name: str
    version: int
    role: str
    template: str
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Create ─────────────────────────────────────────────────────────────────────

class PromptCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9_]+$")
    version: int = Field(default=1, ge=1)
    role: Literal["system", "user"]
    template: str = Field(..., min_length=1)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


# ── Update ─────────────────────────────────────────────────────────────────────

class PromptUpdate(BaseModel):
    template: str | None = Field(default=None, min_length=1)
    description: str | None = None
    is_active: bool | None = None


# ── LLMLog response ────────────────────────────────────────────────────────────

class LLMLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    prompt_name: str
    prompt_version: int
    input_variables: dict | None
    response: str
    model_used: str
    tokens_used: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
