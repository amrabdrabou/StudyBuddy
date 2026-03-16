"""Pydantic schemas for the session ↔ document link (SessionDocument join table)."""
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SessionDocumentCreate(BaseModel):
    document_id: uuid.UUID


class SessionDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    document_id: uuid.UUID
    uploaded_at: datetime
