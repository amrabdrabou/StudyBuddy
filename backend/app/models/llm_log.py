"""LLMLog model — append-only log of every LLM API call.

Used for:
  - Debugging prompt quality
  - Cost tracking (tokens_used)
  - Audit trails per user
  - Future fine-tuning datasets
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base


class LLMLog(Base):
    __tablename__ = "llm_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # Nullable so logs survive user deletion
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Name of the prompt template used (e.g. "summarize", "flashcards")
    prompt_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Version of the prompt template at call time
    prompt_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Full rendered messages array, JSON-serialized — enables replay debugging
    full_prompt: Mapped[str] = mapped_column(Text, nullable=False)

    # Sanitized input variables (values truncated to 500 chars) for observability
    input_variables: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Raw LLM response text
    response: Mapped[str] = mapped_column(Text, nullable=False)

    # Model identifier as returned by the API (e.g. "gpt-4o-mini-2024-07-18")
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)

    # Total tokens consumed (prompt + completion); nullable if API doesn't return it
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        index=True,  # range queries for cost dashboards
    )
