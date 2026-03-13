import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class QuizQuestionBase(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"  # multiple_choice | true_false | short_answer
    options: Optional[Dict[str, Any]] = None
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[int] = None  # 1–5
    ai_generated: bool = True


class QuizQuestionCreate(QuizQuestionBase):
    session_id: uuid.UUID
    micro_goal_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None


class QuizQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[int] = None


class QuizQuestionResponse(QuizQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    micro_goal_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    created_at: datetime
