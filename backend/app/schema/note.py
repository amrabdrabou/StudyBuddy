import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schema.tag import TagResponse


class NoteTagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    note_id: uuid.UUID
    tag_id: uuid.UUID
    created_at: datetime

    tag: TagResponse


class NoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    study_subject_id: Optional[uuid.UUID] = None


class NoteCreate(NoteBase):
    tag_ids: List[uuid.UUID] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    study_subject_id: Optional[uuid.UUID] = None
    is_archived: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class NoteResponse(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    note_tags: List[NoteTagResponse] = []
