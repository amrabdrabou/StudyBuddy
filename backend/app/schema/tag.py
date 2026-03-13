import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TagBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
