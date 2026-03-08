import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr = Field(max_length=120)
    username: Optional[str] = None
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None
    image_file: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    auth_provider: str
    created_at: datetime
    updated_at: datetime
    image_url: Optional[str] = None
    image_file: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserResponse):
    hashed_password: Optional[str] = None
    email: EmailStr 

class SubjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    model_config = ConfigDict(from_attributes=True)