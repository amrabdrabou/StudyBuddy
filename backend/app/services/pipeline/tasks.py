"""RQ task implementations for the AI generation pipeline.

Each public function is a synchronous RQ entry point that wraps
an async implementation using asyncio.run().

Pipeline order (per document):
  1. summarize       — AI: summarize document text
  2. flashcards      — AI: generate flashcard deck from summary
  3. quiz            — AI: generate quiz set from summary
  4. micro_goals     — System: derive goals from workspace content
  5. progress        — System: update BigGoal.progress_pct

Workspace-only pipeline (no document):
  1. micro_goals
  2. progress
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

logger = logging.getLogger(__name__)

TRIGGERED_BY_DOCUMENT = "document.ready"
TRIGGERED_BY_WORKSPACE = "workspace.created"


# ── Public RQ entry points (sync) ─────────────────────────────────────────────

def run_document_pipeline(workspace_id_str: str, document_id_str: str) -> None:
    """RQ entry point: run full document pipeline for a ready document."""
    workspace_id = uuid.UUID(workspace_id_str)
    document_id = uuid.UUID(document_id_str)
    asyncio.run(_async_document_pipeline(workspace_id, document_id))


def run_workspace_pipeline(workspace_id_str: str) -> None:
    """RQ entry point: run workspace-level pipeline (micro-goals + progress)."""
    workspace_id = uuid.UUID(workspace_id_str)
    asyncio.run(_async_workspace_pipeline(workspace_id))


# ── Async pipeline implementations ────────────────────────────────────────────

async def _async_document_pipeline(workspace_id: uuid.UUID, document_id: uuid.UUID) -> None:
    from app.core.db_setup import AsyncSessionLocal

    logger.info("pipeline: starting document pipeline workspace=%s doc=%s", workspace_id, document_id)

    # 1. Summarize
    async with AsyncSessionLocal() as db:
        await _task_summarize(workspace_id, document_id, db)

    # 2. Flashcards (needs summary from step 1)
    async with AsyncSessionLocal() as db:
        await _task_flashcards(workspace_id, document_id, db)

    # 3. Quiz
    async with AsyncSessionLocal() as db:
        await _task_quiz(workspace_id, document_id, db)

    # 4. Micro-goals (system logic, workspace-level)
    async with AsyncSessionLocal() as db:
        await _task_micro_goals(workspace_id, db)

    # 5. Progress
    async with AsyncSessionLocal() as db:
        await _task_progress(workspace_id, db)

    logger.info("pipeline: document pipeline complete workspace=%s doc=%s", workspace_id, document_id)


async def _async_workspace_pipeline(workspace_id: uuid.UUID) -> None:
    from app.core.db_setup import AsyncSessionLocal

    logger.info("pipeline: starting workspace pipeline workspace=%s", workspace_id)

    async with AsyncSessionLocal() as db:
        await _task_micro_goals(workspace_id, db)

    async with AsyncSessionLocal() as db:
        await _task_progress(workspace_id, db)

    logger.info("pipeline: workspace pipeline complete workspace=%s", workspace_id)


# ── Individual task implementations ───────────────────────────────────────────

async def _task_summarize(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db,
) -> None:
    from app.models.document import Document
    from app.models.document_content import DocumentContent
    from app.services.ai_service import summarize_document

    run = await _claim_run(workspace_id, document_id, "summarize", TRIGGERED_BY_DOCUMENT, db)
    if run is None:
        return  # Already completed

    try:
        # Load document and content
        doc_result = await db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.workspace_id == workspace_id,
                Document.status == "ready",
            )
        )
        doc = doc_result.scalar_one_or_none()
        if doc is None:
            await _complete_run(run, db, skipped=True, error="Document not ready")
            return

        content_result = await db.execute(
            select(DocumentContent).where(DocumentContent.document_id == document_id)
        )
        content = content_result.scalar_one_or_none()
        if content is None or not content.raw_text:
            await _complete_run(run, db, skipped=True, error="No extracted text")
            return

        if content.summary:
            await _complete_run(run, db, skipped=True, error="Summary already exists")
            return

        summary = await summarize_document(content.raw_text, doc.original_filename, db=db)
        content.summary = summary
        await db.commit()
        await _complete_run(run, db)
        logger.info("pipeline: summarized doc=%s (%d chars)", document_id, len(summary))

    except Exception as exc:
        logger.exception("pipeline: summarize failed doc=%s", document_id)
        await _complete_run(run, db, error=str(exc))


async def _task_flashcards(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db,
) -> None:
    from app.models.document import Document
    from app.models.document_content import DocumentContent
    from app.models.flashcard import Flashcard
    from app.models.flashcard_deck import FlashcardDeck
    from app.services.ai_service import generate_flashcards

    run = await _claim_run(workspace_id, document_id, "flashcards", TRIGGERED_BY_DOCUMENT, db)
    if run is None:
        return

    try:
        doc_result = await db.execute(
            select(Document).where(Document.id == document_id, Document.workspace_id == workspace_id)
        )
        doc = doc_result.scalar_one_or_none()
        if doc is None:
            await _complete_run(run, db, skipped=True, error="Document not found")
            return

        content_result = await db.execute(
            select(DocumentContent).where(DocumentContent.document_id == document_id)
        )
        content = content_result.scalar_one_or_none()
        source_text = (content.summary or content.raw_text) if content else None
        if not source_text:
            await _complete_run(run, db, skipped=True, error="No text for flashcards")
            return

        cards_data = await generate_flashcards(source_text, "medium", 10, db=db)
        if not cards_data:
            await _complete_run(run, db, skipped=True, error="AI returned no cards")
            return

        deck = FlashcardDeck(
            workspace_id=workspace_id,
            title=f"{doc.original_filename} — Flashcards",
        )
        db.add(deck)
        await db.flush()

        for i, card in enumerate(cards_data):
            db.add(Flashcard(
                deck_id=deck.id,
                front_content=card["front"],
                back_content=card["back"],
                hint=card.get("hint"),
                order_index=i,
            ))

        await db.commit()
        await _complete_run(run, db)
        logger.info("pipeline: flashcards created deck=%s cards=%d", deck.id, len(cards_data))

    except Exception as exc:
        logger.exception("pipeline: flashcards failed doc=%s", document_id)
        await _complete_run(run, db, error=str(exc))


async def _task_quiz(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db,
) -> None:
    from app.models.document import Document
    from app.models.document_content import DocumentContent
    from app.models.quiz_option import QuizOption
    from app.models.quiz_question import QuizQuestion
    from app.models.quiz_set import QuizSet
    from app.models.user import User
    from app.services.ai_service import generate_quiz
    from sqlalchemy import select as sa_select

    run = await _claim_run(workspace_id, document_id, "quiz", TRIGGERED_BY_DOCUMENT, db)
    if run is None:
        return

    try:
        doc_result = await db.execute(
            select(Document).where(Document.id == document_id, Document.workspace_id == workspace_id)
        )
        doc = doc_result.scalar_one_or_none()
        if doc is None:
            await _complete_run(run, db, skipped=True, error="Document not found")
            return

        content_result = await db.execute(
            select(DocumentContent).where(DocumentContent.document_id == document_id)
        )
        content = content_result.scalar_one_or_none()
        source_text = (content.summary or content.raw_text) if content else None
        if not source_text:
            await _complete_run(run, db, skipped=True, error="No text for quiz")
            return

        questions_data = await generate_quiz(source_text, "medium", 5, db=db)
        if not questions_data:
            await _complete_run(run, db, skipped=True, error="AI returned no questions")
            return

        # Find workspace owner for quiz attribution
        from app.models.workspace import Workspace
        ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        ws = ws_result.scalar_one_or_none()
        owner_id = ws.user_id if ws else None

        quiz_set = QuizSet(
            workspace_id=workspace_id,
            created_by_user_id=owner_id,
            title=f"{doc.original_filename} — Quiz",
        )
        db.add(quiz_set)
        await db.flush()

        for q in questions_data:
            question = QuizQuestion(
                quiz_set_id=quiz_set.id,
                question_text=q["question_text"],
                question_type=q["question_type"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                difficulty=q["difficulty"],
                order_index=q["order_index"],
                ai_generated=True,
            )
            db.add(question)
            await db.flush()
            for opt in q["options"]:
                db.add(QuizOption(
                    question_id=question.id,
                    option_text=opt["text"],
                    is_correct=opt["is_correct"],
                    order_index=opt["order_index"],
                ))

        await db.commit()
        await _complete_run(run, db)
        logger.info("pipeline: quiz created quiz_set=%s questions=%d", quiz_set.id, len(questions_data))

    except Exception as exc:
        logger.exception("pipeline: quiz failed doc=%s", document_id)
        await _complete_run(run, db, error=str(exc))


async def _task_micro_goals(workspace_id: uuid.UUID, db) -> None:
    from app.services.system.micro_goal_engine import generate_system_micro_goals

    try:
        created = await generate_system_micro_goals(workspace_id, db)
        logger.info("pipeline: micro_goals created=%d workspace=%s", len(created), workspace_id)
    except Exception as exc:
        logger.exception("pipeline: micro_goals failed workspace=%s", workspace_id)


async def _task_progress(workspace_id: uuid.UUID, db) -> None:
    from app.services.system.progress_calculator import recalculate_mission_progress

    try:
        await recalculate_mission_progress(workspace_id, db)
        logger.info("pipeline: progress updated workspace=%s", workspace_id)
    except Exception as exc:
        logger.exception("pipeline: progress failed workspace=%s", workspace_id)


# ── PipelineRun helpers ────────────────────────────────────────────────────────

async def _claim_run(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID | None,
    task_name: str,
    triggered_by: str,
    db,
):
    """Find or create a PipelineRun. Returns None if the task is already completed."""
    from app.models.pipeline_run import PipelineRun

    stmt = (
        select(PipelineRun)
        .where(
            PipelineRun.workspace_id == workspace_id,
            PipelineRun.task_name == task_name,
        )
    )
    if document_id is not None:
        stmt = stmt.where(PipelineRun.document_id == document_id)
    else:
        stmt = stmt.where(PipelineRun.document_id.is_(None))

    result = await db.execute(stmt)
    run = result.scalar_one_or_none()

    if run is not None and run.status == "completed":
        logger.debug("pipeline: skipping %s (already completed)", task_name)
        return None

    if run is None:
        run = PipelineRun(
            workspace_id=workspace_id,
            document_id=document_id,
            task_name=task_name,
            triggered_by=triggered_by,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        db.add(run)
    else:
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        run.error_message = None

    await db.commit()
    await db.refresh(run)
    return run


async def _complete_run(run, db, *, skipped: bool = False, error: str | None = None) -> None:
    """Mark a PipelineRun as completed, skipped, or failed."""
    from app.models.pipeline_run import PipelineRun

    result = await db.execute(select(PipelineRun).where(PipelineRun.id == run.id))
    r = result.scalar_one_or_none()
    if r is None:
        return

    r.completed_at = datetime.now(timezone.utc)
    if error and not skipped:
        r.status = "failed"
        r.error_message = error
    elif skipped:
        r.status = "skipped"
        r.error_message = error
    else:
        r.status = "completed"

    await db.commit()
