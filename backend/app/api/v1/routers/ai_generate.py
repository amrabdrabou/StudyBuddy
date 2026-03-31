"""AI generation router.

Endpoints:
  POST /workspaces/{workspace_id}/ai/summarize           — document summarization
  POST /workspaces/{workspace_id}/ai/generate-flashcards — flashcard deck creation
  POST /workspaces/{workspace_id}/ai/generate-quiz       — quiz set creation
  POST /workspaces/{workspace_id}/ai/generate-roadmap    — study roadmap (micro-goals)
  POST /workspaces/{workspace_id}/ai/suggest-session     — session planning suggestion
"""
from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import get_workspace
from app.core.config import get_settings
from app.core.db_setup import get_db
from app.core.limiter import limiter
from app.models.document import Document
from app.models.document_content import DocumentContent
from app.models.flashcard import Flashcard
from app.models.flashcard_deck import FlashcardDeck
from app.models.micro_goal import MicroGoal
from app.models.quiz_option import QuizOption
from app.models.quiz_question import QuizQuestion
from app.models.quiz_set import QuizSet
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.ai_generate import (
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    GenerateRoadmapRequest,
    GenerateRoadmapResponse,
    GenerateStudySessionRequest,
    GenerateStudySessionResponse,
    SuggestSessionRequest,
    SuggestSessionResponse,
    SummarizeRequest,
    SummarizeResponse,
)
from app.services.ai_service import (
    generate_flashcards,
    generate_quiz,
    generate_roadmap,
    generate_study_session_plan,
    suggest_session,
    summarize_document,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/ai", tags=["ai-generate"])
logger = logging.getLogger(__name__)


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_ready_document(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[Document, DocumentContent]:
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == workspace_id,
        )
    )
    doc = doc_result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document is not ready yet (status: {doc.status}).",
        )
    content_result = await db.execute(
        select(DocumentContent).where(DocumentContent.document_id == document_id)
    )
    content = content_result.scalar_one_or_none()
    if content is None or not content.raw_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document has no extracted text content available.",
        )
    return doc, content


async def _load_workspace_summaries(
    workspace_id: uuid.UUID,
    db: AsyncSession,
    document_ids: list[uuid.UUID] | None = None,
) -> str:
    """Load available document summaries for a workspace as a single text block.

    If ``document_ids`` is provided and non-empty, only those documents are included.
    Otherwise all ready documents in the workspace are used.
    Uses selectinload to avoid N+1 queries.
    """
    stmt = (
        select(Document)
        .options(selectinload(Document.content))
        .where(Document.workspace_id == workspace_id, Document.status == "ready")
    )
    if document_ids:
        stmt = stmt.where(Document.id.in_(document_ids))

    docs_result = await db.execute(stmt)
    docs = docs_result.scalars().all()

    parts: list[str] = []
    for doc in docs:
        content = doc.content
        if content and content.summary:
            parts.append(f"--- {doc.original_filename} ---\n{content.summary}")
        elif content and content.raw_text:
            parts.append(f"--- {doc.original_filename} ---\n{content.raw_text[:2000]}")
    return "\n\n".join(parts)


def _ai_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    if isinstance(exc, (json.JSONDecodeError, KeyError, TypeError)):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned malformed data. Please try again.",
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unexpected error during AI generation.",
    )


# ── Summarize ─────────────────────────────────────────────────────────────────

@router.post("/summarize", response_model=SummarizeResponse)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_summarize(
    request: Request,
    workspace_id: uuid.UUID,
    body: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    doc, content = await _get_ready_document(workspace_id, body.document_id, db)
    try:
        summary = await summarize_document(content.raw_text, doc.original_filename, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("AI summarize failed doc=%s user=%s: %s", doc.id, current_user.id, exc)
        raise _ai_http_error(exc)

    content.summary = summary
    await db.commit()
    logger.info("AI_SUMMARIZE doc_id=%s user_id=%s chars=%d", doc.id, current_user.id, len(summary))
    return SummarizeResponse(document_id=doc.id, filename=doc.original_filename, summary=summary)


# ── Generate Flashcards ───────────────────────────────────────────────────────

@router.post("/generate-flashcards", response_model=GenerateFlashcardsResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_generate_flashcards(
    request: Request,
    workspace_id: uuid.UUID,
    body: GenerateFlashcardsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    # Resolve content: use provided summary or load from documents
    if body.summary.strip():
        content_text = body.summary.strip()
    else:
        content_text = await _load_workspace_summaries(
            workspace_id, db, document_ids=body.document_ids or None
        )
        if not content_text:
            detail = (
                "None of the selected documents have content. Summarize them first."
                if body.document_ids
                else "No ready documents with content found. Upload and summarize documents first."
            )
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    if len(content_text) < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content is too short. Please provide at least 50 characters.",
        )

    try:
        cards_data = await generate_flashcards(content_text, body.difficulty, body.count, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("AI flashcards failed workspace=%s user=%s: %s", workspace_id, current_user.id, exc)
        raise _ai_http_error(exc)

    if not cards_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI returned no usable flashcards. Try a longer summary.",
        )

    deck_title = f"{body.deck_title} ({body.difficulty.capitalize()})"
    deck = FlashcardDeck(workspace_id=workspace_id, title=deck_title)
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
    await db.refresh(deck)
    logger.info("AI_FLASHCARDS deck_id=%s cards=%d difficulty=%s user_id=%s", deck.id, len(cards_data), body.difficulty, current_user.id)
    return GenerateFlashcardsResponse(deck_id=deck.id, deck_title=deck.title, difficulty=body.difficulty, cards_created=len(cards_data))


# ── Generate Quiz ─────────────────────────────────────────────────────────────

@router.post("/generate-quiz", response_model=GenerateQuizResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_generate_quiz(
    request: Request,
    workspace_id: uuid.UUID,
    body: GenerateQuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    # Resolve content: use provided summary or load from documents
    if body.summary.strip():
        content_text = body.summary.strip()
    else:
        content_text = await _load_workspace_summaries(
            workspace_id, db, document_ids=body.document_ids or None
        )
        if not content_text:
            detail = (
                "None of the selected documents have content. Summarize them first."
                if body.document_ids
                else "No ready documents with content found. Upload and summarize documents first."
            )
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    if len(content_text) < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content is too short. Please provide at least 50 characters.",
        )

    try:
        questions_data = await generate_quiz(content_text, body.difficulty, body.count, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("AI quiz failed workspace=%s user=%s: %s", workspace_id, current_user.id, exc)
        raise _ai_http_error(exc)

    if not questions_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI returned no usable questions. Try a longer summary.",
        )

    quiz_title = f"{body.quiz_title} ({body.difficulty.capitalize()})"
    quiz_set = QuizSet(
        workspace_id=workspace_id,
        created_by_user_id=current_user.id,
        title=quiz_title,
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
    await db.refresh(quiz_set)
    logger.info("AI_QUIZ quiz_set_id=%s questions=%d difficulty=%s user_id=%s", quiz_set.id, len(questions_data), body.difficulty, current_user.id)
    return GenerateQuizResponse(quiz_set_id=quiz_set.id, quiz_title=quiz_set.title, difficulty=body.difficulty, questions_created=len(questions_data))


# ── Generate Roadmap ──────────────────────────────────────────────────────────

@router.post("/generate-roadmap", response_model=GenerateRoadmapResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_generate_roadmap(
    request: Request,
    workspace_id: uuid.UUID,
    body: GenerateRoadmapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    ws: Workspace = Depends(get_workspace),
):
    """Generate AI micro-goals from uploaded document summaries.

    Replaces all existing micro-goals for the workspace.
    If body.document_ids is non-empty, only those documents are used;
    otherwise all ready documents in the workspace are included.
    """
    # Use raw summary_text when provided; otherwise load from documents.
    if body.summary_text and body.summary_text.strip():
        combined_text = body.summary_text.strip()
    else:
        combined_text = await _load_workspace_summaries(
            workspace_id, db, document_ids=body.document_ids or None
        )
        if not combined_text:
            detail = (
                "None of the selected documents have content. Summarize them first."
                if body.document_ids
                else "No ready documents with content found. Upload and summarize documents first."
            )
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    try:
        goals_data = await generate_roadmap(
            combined_text, ws.title, count=body.count, difficulty=body.difficulty,
            db=db, user_id=current_user.id
        )
    except Exception as exc:
        logger.error("AI roadmap failed workspace=%s user=%s: %s", workspace_id, current_user.id, exc)
        raise _ai_http_error(exc)

    if not goals_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI returned no goals. Try summarizing your documents first.",
        )

    # ── Smart upsert: preserves user/system goals and deduplicates by title ──
    # Cap active (non-completed, non-skipped) AI goals to prevent overwhelm.
    MAX_ACTIVE_AI_GOALS = 10

    def _norm(t: str) -> str:
        """Normalize a title for dedup comparison: lowercase + collapse whitespace."""
        return " ".join(t.lower().split())

    # Fetch only the AI-sourced goals that already exist for this workspace
    existing_ai_result = await db.execute(
        select(MicroGoal).where(
            MicroGoal.workspace_id == workspace_id,
            MicroGoal.source == "ai",
        )
    )
    # Index by normalized title so minor AI variation doesn't cause duplicates
    existing_ai: dict[str, MicroGoal] = {
        _norm(mg.title): mg for mg in existing_ai_result.scalars().all()
    }

    new_norm_titles = {_norm(g["title"]) for g in goals_data}

    # Delete stale AI goals — titles the AI no longer returned — but only if the
    # user hasn't acted on them yet (completed/in_progress goals are preserved).
    for norm_title, mg in existing_ai.items():
        if norm_title not in new_norm_titles and mg.status not in ("completed", "in_progress"):
            await db.delete(mg)

    # Count how many active AI goals already exist (these occupy cap slots).
    active_statuses = {"suggested", "pending", "in_progress"}
    active_existing = sum(
        1 for norm_title, mg in existing_ai.items()
        if norm_title in new_norm_titles and mg.status in active_statuses
    )
    slots_remaining = max(0, MAX_ACTIVE_AI_GOALS - active_existing)

    # Upsert: update existing AI goals (keeps their status); create new ones within cap.
    new_count = 0
    for i, g in enumerate(goals_data):
        norm = _norm(g["title"])
        if norm in existing_ai:
            # Refresh metadata only — status and progress are preserved
            existing_ai[norm].description = g.get("description")
            existing_ai[norm].order_index = i
        elif new_count < slots_remaining:
            db.add(MicroGoal(
                workspace_id=workspace_id,
                title=g["title"],          # store the canonical AI title as-is
                description=g.get("description"),
                status="suggested",
                source="ai",
                order_index=i,
            ))
            new_count += 1

    await db.commit()
    total = len([n for n in new_norm_titles if n in existing_ai]) + new_count
    logger.info("AI_ROADMAP workspace=%s goals_upserted=%d user=%s", workspace_id, total, current_user.id)
    return GenerateRoadmapResponse(goals_created=total)


# ── Suggest Session ───────────────────────────────────────────────────────────

@router.post("/suggest-session", response_model=SuggestSessionResponse)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_suggest_session(
    request: Request,
    workspace_id: uuid.UUID,
    body: SuggestSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    ws: Workspace = Depends(get_workspace),
):
    """Return an AI-generated session suggestion based on current micro-goals. Does not create any DB records."""
    goals_result = await db.execute(
        select(MicroGoal)
        .where(MicroGoal.workspace_id == workspace_id)
        .order_by(MicroGoal.order_index)
    )
    goals = goals_result.scalars().all()

    if not goals:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No micro-goals found. Generate a roadmap first.",
        )

    goals_text = "\n".join(
        f"{g.id} | {g.title} | {g.status}"
        for g in goals
        if g.status not in ("completed", "skipped")
    )
    if not goals_text:
        goals_text = "\n".join(f"{g.id} | {g.title} | {g.status}" for g in goals[:5])

    try:
        suggestion = await suggest_session(goals_text, ws.title, body.available_minutes, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("AI suggest-session failed workspace=%s user=%s: %s", workspace_id, current_user.id, exc)
        raise _ai_http_error(exc)

    return SuggestSessionResponse(**suggestion)


# ── Generate Study Session ────────────────────────────────────────────────────

@router.post("/generate-study-session", response_model=GenerateStudySessionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().ai_event_rate_limit)
async def ai_generate_study_session(
    request: Request,
    workspace_id: uuid.UUID,
    body: GenerateStudySessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    ws: Workspace = Depends(get_workspace),
):
    """Generate a complete study session: flashcard deck + quiz set + micro-goals + session plan.

    mode="auto"  → AI decides flashcard/quiz difficulty, count, and session duration.
    mode="manual" → Uses the caller-provided difficulty, count, and duration values.

    If body.summary is empty, workspace document summaries are loaded automatically.
    body.goal_context (micro-goal title + description) is prepended when present.
    """
    # ── Resolve content: use provided summary or auto-load from workspace docs ─
    content = body.summary.strip()
    if not content:
        content = await _load_workspace_summaries(workspace_id, db)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No content available. Upload and summarise documents, or paste a summary.",
        )

    if body.goal_context.strip():
        content = f"Goal: {body.goal_context.strip()}\n\n{content}"

    # ── Step 1: Resolve config (auto → AI; manual → body) ─────────────────────
    if body.mode == "auto":
        try:
            cfg = await generate_study_session_plan(content, ws.title, db=db, user_id=current_user.id)
        except Exception as exc:
            logger.error("Study session plan failed workspace=%s: %s", workspace_id, exc)
            raise _ai_http_error(exc)
        fc_difficulty  = cfg["flashcard_difficulty"]
        fc_count       = cfg["flashcard_count"]
        qz_difficulty  = cfg["quiz_difficulty"]
        qz_count       = cfg["quiz_count"]
        duration       = cfg["duration_minutes"]
        session_title  = cfg["session_title"]
        focus_summary  = cfg["focus_summary"]
        tips           = cfg["tips"]
    else:
        fc_difficulty  = body.flashcard_difficulty
        fc_count       = body.flashcard_count
        qz_difficulty  = body.quiz_difficulty
        qz_count       = body.quiz_count
        duration       = body.session_duration_minutes
        session_title  = f"{ws.title} — Study Session"
        focus_summary  = ""
        tips           = []

    # ── Step 2: Generate flashcard deck ───────────────────────────────────────
    try:
        cards_data = await generate_flashcards(content, fc_difficulty, fc_count, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("Flashcards failed workspace=%s: %s", workspace_id, exc)
        raise _ai_http_error(exc)

    if not cards_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="AI returned no flashcards.")

    deck_title = f"{session_title} — Flashcards"
    deck = FlashcardDeck(workspace_id=workspace_id, title=deck_title)
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

    # ── Step 3: Generate quiz set ──────────────────────────────────────────────
    try:
        questions_data = await generate_quiz(content, qz_difficulty, qz_count, db=db, user_id=current_user.id)
    except Exception as exc:
        logger.error("Quiz failed workspace=%s: %s", workspace_id, exc)
        raise _ai_http_error(exc)

    if not questions_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="AI returned no quiz questions.")

    quiz_title_str = f"{session_title} — Quiz"
    quiz_set = QuizSet(workspace_id=workspace_id, created_by_user_id=current_user.id, title=quiz_title_str)
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
            db.add(QuizOption(question_id=question.id, option_text=opt["text"], is_correct=opt["is_correct"], order_index=opt["order_index"]))

    await db.commit()
    await db.refresh(deck)
    await db.refresh(quiz_set)

    # ── Step 4: Link or create micro-goals ───────────────────────────────────
    from app.services.system.micro_goal_engine import generate_system_micro_goals
    from app.models.session import Session as SessionModel
    from app.models.session_micro_goal import SessionMicroGoal

    # ── Step 5: Create a linked Session record ────────────────────────────────
    session_record = SessionModel(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=session_title,
        planned_duration_minutes=duration,
        flashcard_deck_id=deck.id,
        quiz_set_id=quiz_set.id,
    )
    db.add(session_record)
    await db.flush()

    # Resolve the effective set of goal IDs (goal_ids takes precedence over deprecated goal_id)
    effective_goal_ids: list[uuid.UUID] = list(body.goal_ids) if body.goal_ids else (
        [body.goal_id] if body.goal_id is not None else []
    )

    if effective_goal_ids:
        # Session built from specific goals — link all of them directly
        linked_count = 0
        for gid in effective_goal_ids:
            goal = await db.get(MicroGoal, gid)
            if goal and goal.workspace_id == workspace_id:
                db.add(SessionMicroGoal(session_id=session_record.id, micro_goal_id=goal.id))
                if goal.status in ("suggested", "pending"):
                    goal.status = "in_progress"
                linked_count += 1
        goals_created = linked_count
    else:
        # Session built from summary — let the system engine create structural goals
        created_goals = await generate_system_micro_goals(workspace_id, db)
        goals_created = len(created_goals)

    await db.commit()
    await db.refresh(session_record)

    logger.info(
        "STUDY_SESSION workspace=%s session=%s deck=%s quiz=%s goals=%d user=%s",
        workspace_id, session_record.id, deck.id, quiz_set.id, goals_created, current_user.id,
    )
    return GenerateStudySessionResponse(
        session_id=session_record.id,
        session_title=session_title,
        duration_minutes=duration,
        focus_summary=focus_summary,
        tips=tips,
        flashcard_deck_id=deck.id,
        flashcard_deck_title=deck.title,
        cards_created=len(cards_data),
        flashcard_difficulty=fc_difficulty,
        quiz_set_id=quiz_set.id,
        quiz_title=quiz_set.title,
        questions_created=len(questions_data),
        quiz_difficulty=qz_difficulty,
        goals_created=goals_created,
    )
