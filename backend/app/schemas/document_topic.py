"""Pydantic schemas for reading and managing AI-extracted document topics."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentTopicBase(BaseModel):
    topic_name: str
    confidence_score: Optional[float] = None
    source_page_range: Optional[str] = None


class DocumentTopicCreate(DocumentTopicBase):
    document_id: uuid.UUID


class DocumentTopicUpdate(BaseModel):
    is_confirmed_by_user: Optional[bool] = None
    confirmed_at: Optional[datetime] = None
    user_action: Optional[str] = None  # accepted | removed | added


class DocumentTopicResponse(DocumentTopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    detected_at: datetime
    is_confirmed_by_user: bool
    confirmed_at: Optional[datetime] = None
    user_action: Optional[str] = None
