"""System-logic micro-goal engine.

Generates micro-goals deterministically from workspace content.
AI is NOT involved — goals are derived from what already exists in the workspace.

Structured 4-step learning flow per document:
  1. Read summary      → "Read summary: {filename}"
  2. Study flashcards  → "Study flashcards: {deck_title}"
  3. Pass quiz         → "Pass quiz: {quiz_title}"
  4. Apply knowledge   → "Apply knowledge" (workspace-level, suggested, created once)

Idempotent: skips goals whose title already exists in the workspace.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.flashcard_deck import FlashcardDeck
from app.models.micro_goal import MicroGoal
from app.models.quiz_set import QuizSet

logger = logging.getLogger(__name__)

_APPLY_KNOWLEDGE_TITLE = "Apply knowledge"


async def generate_system_micro_goals(
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> list[MicroGoal]:
    """Create structured micro-goals for a workspace using system logic (not AI).

    Returns the list of newly created MicroGoal instances.
    Already-existing goals (by title) are skipped.
    """
    # ── Fetch existing goal titles to enforce idempotency ──────────────────────
    existing_result = await db.execute(
        select(MicroGoal.title).where(MicroGoal.workspace_id == workspace_id)
    )
    existing_titles: set[str] = {row[0] for row in existing_result.all()}

    # ── Determine the next order_index ─────────────────────────────────────────
    order_result = await db.execute(
        select(MicroGoal.order_index)
        .where(MicroGoal.workspace_id == workspace_id)
        .order_by(MicroGoal.order_index.desc())
        .limit(1)
    )
    row = order_result.scalar_one_or_none()
    order = (row + 1) if row is not None else 0

    goals_created: list[MicroGoal] = []

    def _add(title: str, description: str, status: str = "pending") -> None:
        nonlocal order
        if title in existing_titles:
            return
        mg = MicroGoal(
            workspace_id=workspace_id,
            title=title,
            description=description,
            status=status,
            order_index=order,
        )
        db.add(mg)
        goals_created.append(mg)
        existing_titles.add(title)
        order += 1

    # ── Step 1: Read summary — one per ready document ──────────────────────────
    docs_result = await db.execute(
        select(Document).where(
            Document.workspace_id == workspace_id,
            Document.status == "ready",
        ).order_by(Document.created_at)
    )
    for doc in docs_result.scalars().all():
        _add(
            f"Read summary: {doc.original_filename}",
            "Open the document and read through the AI-generated summary to get an overview.",
        )

    # ── Step 2: Study flashcards — one per deck ────────────────────────────────
    decks_result = await db.execute(
        select(FlashcardDeck)
        .where(FlashcardDeck.workspace_id == workspace_id)
        .order_by(FlashcardDeck.created_at)
    )
    for deck in decks_result.scalars().all():
        _add(
            f"Study flashcards: {deck.title}",
            "Go through all flashcards in this deck until you feel confident with the material.",
        )

    # ── Step 3: Pass quiz — one per quiz set ───────────────────────────────────
    quizzes_result = await db.execute(
        select(QuizSet)
        .where(QuizSet.workspace_id == workspace_id)
        .order_by(QuizSet.created_at)
    )
    for quiz in quizzes_result.scalars().all():
        _add(
            f"Pass quiz: {quiz.title}",
            "Attempt the quiz and aim for 80% or higher to confirm your understanding.",
        )

    # ── Step 4: Apply knowledge — once per workspace (optional) ───────────────
    _add(
        _APPLY_KNOWLEDGE_TITLE,
        "Put what you've learned into practice — solve a problem, write a summary, or teach it to someone.",
        status="suggested",
    )

    if goals_created:
        await db.commit()
        for mg in goals_created:
            await db.refresh(mg)
        logger.info(
            "micro_goal_engine: created %d goals for workspace %s",
            len(goals_created), workspace_id,
        )
    else:
        logger.debug("micro_goal_engine: no new goals for workspace %s", workspace_id)

    return goals_created
