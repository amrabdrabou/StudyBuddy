"""
SQLAlchemy ORM model registry — new architecture.
Import order: leaf models first so SQLAlchemy can resolve forward references.
"""
# ── RBAC (no FK deps — must come before User) ─────────────────────────────────
from app.models.permission import Permission  # noqa: F401
from app.models.role import Role  # noqa: F401
from app.models.role_permission import RolePermission  # noqa: F401
from app.models.user_role import UserRole  # noqa: F401

# ── Auth & Users ───────────────────────────────────────────────────────────────
from app.models.user import User  # noqa: F401
from app.models.token import Token  # noqa: F401

# ── Layer 1: Core structure ───────────────────────────────────────────────────
from app.models.subject import Subject  # noqa: F401
from app.models.big_goal import BigGoal  # noqa: F401
from app.models.big_goal_subject import BigGoalSubject  # noqa: F401

# ── Layer 2: Workspace ───────────────────────────────────────────────────────
from app.models.workspace import Workspace  # noqa: F401

# ── Layer 3: Documents ───────────────────────────────────────────────────────
from app.models.document import Document  # noqa: F401
from app.models.document_content import DocumentContent  # noqa: F401
from app.models.document_chunk import DocumentChunk  # noqa: F401

# ── Layer 4: Sessions ────────────────────────────────────────────────────────
from app.models.micro_goal import MicroGoal  # noqa: F401
from app.models.session import Session  # noqa: F401
from app.models.session_micro_goal import SessionMicroGoal  # noqa: F401

# ── Layer 5: AI ──────────────────────────────────────────────────────────────
from app.models.ai_job import AIJob  # noqa: F401
from app.models.ai_chat_message import AIChatMessage  # noqa: F401
from app.models.prompt import Prompt  # noqa: F401
from app.models.llm_log import LLMLog  # noqa: F401
from app.models.pipeline_run import PipelineRun  # noqa: F401

# ── Layer 6: Flashcards & Quizzes ────────────────────────────────────────────
from app.models.flashcard_deck import FlashcardDeck  # noqa: F401
from app.models.flashcard import Flashcard  # noqa: F401
from app.models.flashcard_review import FlashcardReview  # noqa: F401
from app.models.quiz_set import QuizSet  # noqa: F401
from app.models.quiz_question import QuizQuestion  # noqa: F401
from app.models.quiz_option import QuizOption  # noqa: F401
from app.models.quiz_attempt import QuizAttempt  # noqa: F401
from app.models.quiz_attempt_answer import QuizAttemptAnswer  # noqa: F401

# ── Layer 7: Notes & Dashboard ───────────────────────────────────────────────
from app.models.note import Note  # noqa: F401

__all__ = [
    "Permission", "Role", "RolePermission", "UserRole",
    "User", "Token",
    "Subject", "BigGoal", "BigGoalSubject",
    "Workspace",
    "Document", "DocumentContent", "DocumentChunk",
    "MicroGoal", "Session", "SessionMicroGoal",
    "AIJob", "AIChatMessage", "Prompt", "LLMLog", "PipelineRun",
    "FlashcardDeck", "Flashcard", "FlashcardReview",
    "QuizSet", "QuizQuestion", "QuizOption", "QuizAttempt", "QuizAttemptAnswer",
    "Note",
]
