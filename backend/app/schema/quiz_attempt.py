import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class QuizAttemptCreate(BaseModel):
    question_id: uuid.UUID
    session_id: uuid.UUID
    user_answer: str
    is_correct: bool
    time_taken_seconds: Optional[int] = None


class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    user_answer: str
    is_correct: bool
    time_taken_seconds: Optional[int] = None
    attempted_at: datetime
