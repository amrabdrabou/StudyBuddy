"""Pydantic schemas for creating and reading quiz sets."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class QuizSetBase(BaseModel):
    title: str
    source: str = "ai"  # ai | user
    status: str = "ready"  # draft | ready | archived
    document_id: Optional[uuid.UUID] = None
    ai_prompt_used: Optional[str] = None


class QuizSetCreate(QuizSetBase):
    session_id: uuid.UUID


class QuizSetUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    ai_prompt_used: Optional[str] = None


class QuizSetResponse(QuizSetBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    question_count: int
    created_at: datetime
