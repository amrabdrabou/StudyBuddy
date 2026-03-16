"""Pydantic schemas for creating and reading quiz questions and their options."""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class QuizOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    option_text: str
    is_correct: bool
    order_index: int


class QuizQuestionBase(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"  # multiple_choice | true_false | short_answer
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str = "medium"  # easy | medium | hard
    order_index: int = 0
    ai_generated: bool = True


class QuizQuestionCreate(QuizQuestionBase):
    quiz_set_id: uuid.UUID
    source_chunk_id: Optional[uuid.UUID] = None


class QuizQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    order_index: Optional[int] = None


class QuizQuestionResponse(QuizQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quiz_set_id: uuid.UUID
    source_chunk_id: Optional[uuid.UUID] = None
    options: List[QuizOptionResponse] = []
    created_at: datetime
