"""Pydantic schemas for creating, reading, and updating study notes."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.tag import TagResponse


class NoteTagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    note_id: uuid.UUID
    tag_id: uuid.UUID
    created_at: datetime
    tag: TagResponse


class NoteBase(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    content: Optional[str] = Field(default=None, max_length=100_000)
    study_subject_id: Optional[uuid.UUID] = None


class NoteCreate(NoteBase):
    tag_ids: List[uuid.UUID] = Field(default_factory=list, max_length=50)


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    content: Optional[str] = Field(default=None, max_length=100_000)
    study_subject_id: Optional[uuid.UUID] = None
    is_archived: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = Field(default=None, max_length=50)


class NoteResponse(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    note_tags: List[NoteTagResponse] = []
