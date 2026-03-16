"""Pydantic schemas for uploading and reading study documents."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.tag import TagResponse


class DocumentTagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: uuid.UUID
    tag_id: uuid.UUID
    created_at: datetime
    tag: TagResponse


class DocumentBase(BaseModel):
    title: str
    file_name: str
    file_path: str
    file_type: str
    file_size_bytes: int
    study_subject_id: Optional[uuid.UUID] = None  # optional grouping


class DocumentCreate(DocumentBase):
    tag_ids: List[uuid.UUID] = []


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    study_subject_id: Optional[uuid.UUID] = None
    processing_status: Optional[str] = None
    extracted_text: Optional[str] = None
    page_content: Optional[str] = None
    summary: Optional[str] = None
    topics: Optional[str] = None
    is_archived: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    stored_filename: Optional[str] = None
    upload_status: str = "pending"
    processing_status: str
    extraction_status: str = "not_started"
    error_message: Optional[str] = None
    summary: Optional[str] = None
    topics: Optional[str] = None
    is_archived: bool
    uploaded_at: datetime
    last_accessed_at: datetime
    document_tags: List[DocumentTagResponse] = []
