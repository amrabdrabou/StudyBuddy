"""Pydantic schemas for user registration, profile reads, and updates."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None
    preferred_study_time: Optional[str] = None


class UserCreate(UserBase):
    password: str
    auth_provider: str = "local"


class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    timezone: Optional[str] = None
    study_goal_minutes_per_day: Optional[int] = None
    preferred_study_time: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_provider: str
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
