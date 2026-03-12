import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class StudySubjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None


class StudySubjectCreate(StudySubjectBase):
    pass


class StudySubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None
    is_archived: Optional[bool] = None


class StudySubjectResponse(StudySubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
