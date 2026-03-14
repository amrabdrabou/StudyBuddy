"""Pydantic schemas for the individual answers submitted within a quiz attempt."""
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict


class QuizAttemptAnswerCreate(BaseModel):
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID] = None
    free_text_answer: Optional[str] = None
    is_correct: Optional[bool] = False


class QuizAttemptAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID] = None
    free_text_answer: Optional[str] = None
    is_correct: Optional[bool] = None
