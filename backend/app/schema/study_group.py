import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schema.user import UserResponse


class StudyGroupMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    study_group_id: uuid.UUID
    role: str
    joined_at: datetime

    user: UserResponse


class StudyGroupBase(BaseModel):
    name: str
    is_private: bool = True
    max_members: Optional[int] = None


class StudyGroupCreate(StudyGroupBase):
    pass


class StudyGroupUpdate(BaseModel):
    name: Optional[str] = None
    is_private: Optional[bool] = None
    invite_code: Optional[str] = None
    max_members: Optional[int] = None


class StudyGroupResponse(StudyGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creator_id: uuid.UUID
    invite_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    members: List[StudyGroupMemberResponse] = []


# ── SharedResource ────────────────────────────────────────────────────────────

class SharedResourceBase(BaseModel):
    resource_type: str  # "document" | "note" | "deck"
    resource_id: uuid.UUID
    title: Optional[str] = None


class SharedResourceCreate(SharedResourceBase):
    study_group_id: uuid.UUID


class SharedResourceUpdate(BaseModel):
    title: Optional[str] = None


class SharedResourceResponse(SharedResourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    study_group_id: uuid.UUID
    shared_at: datetime
