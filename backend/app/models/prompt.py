"""Prompt model — versioned, database-driven LLM prompt templates.

Constraints:
  - Only ONE active version per (name, role) enforced via partial unique index
    "uq_prompt_active_name_role" (created in post-migrations).
  - Multiple inactive versions per (name, role) are allowed for history.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # Logical name for a feature, e.g. "summarize", "flashcards", "quiz"
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Version number — increment when updating a prompt
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # "system" or "user" — maps to OpenAI message roles
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    # Jinja2 template; variables wrapped in {{ }}
    template: Mapped[str] = mapped_column(Text, nullable=False)

    # Human-readable notes for the admin panel
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Only active prompts are loaded at runtime
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
