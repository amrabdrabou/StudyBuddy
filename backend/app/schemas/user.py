import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
