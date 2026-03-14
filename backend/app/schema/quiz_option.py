"""Pydantic schemas for creating and reading answer options for quiz questions."""
import uuid
from pydantic import BaseModel, ConfigDict


class QuizOptionCreate(BaseModel):
    option_text: str
    is_correct: bool = False
    order_index: int = 0


class QuizOptionUpdate(BaseModel):
    option_text: str | None = None
    is_correct: bool | None = None
    order_index: int | None = None


class QuizOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    option_text: str
    is_correct: bool
    order_index: int
