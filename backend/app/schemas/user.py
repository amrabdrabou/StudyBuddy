"""Pydantic schemas for user registration, profile reads, and updates."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = Field(default=None, min_length=2, max_length=40)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    profile_picture_url: Optional[str] = Field(default=None, max_length=500)
    timezone: Optional[str] = Field(default=None, max_length=60)
    study_goal_minutes_per_day: Optional[int] = Field(default=None, ge=0, le=1440)
    preferred_study_time: Optional[str] = Field(default=None, max_length=50)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    auth_provider: str = "local"

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not any(c.isupper() for c in v):
            errors.append("one uppercase letter")
        if not any(c.islower() for c in v):
            errors.append("one lowercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("one number")
        if errors:
            raise ValueError("Password must contain: " + ", ".join(errors))
        return v


class UserUpdate(BaseModel):
    """
    Fields a user may change on their own profile.
    Sensitive fields (is_active, is_superuser, hashed_password) are intentionally
    absent — the API layer enforces a whitelist as defence-in-depth.
    """
    username: Optional[str] = Field(default=None, min_length=2, max_length=40)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    profile_picture_url: Optional[str] = Field(default=None, max_length=500)
    timezone: Optional[str] = Field(default=None, max_length=60)
    study_goal_minutes_per_day: Optional[int] = Field(default=None, ge=0, le=1440)
    preferred_study_time: Optional[str] = Field(default=None, max_length=50)


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
