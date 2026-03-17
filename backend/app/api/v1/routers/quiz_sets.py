"""Quiz router — quiz sets, questions, and attempts nested under workspaces."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_workspace
from app.core.db_setup import get_db
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_attempt_answer import QuizAttemptAnswer
from app.models.quiz_option import QuizOption
from app.models.quiz_question import QuizQuestion
from app.models.quiz_set import QuizSet
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.quiz import (
    QuizAttemptAnswerCreate, QuizAttemptAnswerResponse,
    QuizAttemptCreate, QuizAttemptResponse, QuizAttemptUpdate,
    QuizQuestionCreate, QuizQuestionResponse,
    QuizSetCreate, QuizSetResponse, QuizSetUpdate,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/quiz-sets", tags=["quizzes"])


async def _get_quiz_set_or_404(
    quiz_set_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession
) -> QuizSet:
    result = await db.execute(
        select(QuizSet).where(QuizSet.id == quiz_set_id, QuizSet.workspace_id == workspace_id)
    )
    qs = result.scalar_one_or_none()
    if qs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz set not found")
    return qs


# ── Quiz Sets ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[QuizSetResponse])
async def list_quiz_sets(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(QuizSet)
        .where(QuizSet.workspace_id == workspace_id)
        .order_by(QuizSet.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=QuizSetResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz_set(
    workspace_id: uuid.UUID,
    body: QuizSetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    qs = QuizSet(
        workspace_id=workspace_id,
        created_by_user_id=current_user.id,
        **body.model_dump(),
    )
    db.add(qs)
    await db.commit()
    await db.refresh(qs)
    return qs


@router.get("/{quiz_set_id}", response_model=QuizSetResponse)
async def get_quiz_set(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    return await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)


@router.patch("/{quiz_set_id}", response_model=QuizSetResponse)
async def update_quiz_set(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    body: QuizSetUpdate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    qs = await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    apply_updates(qs, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(qs)
    return qs


@router.delete("/{quiz_set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_set(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    qs = await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    await db.delete(qs)
    await db.commit()


# ── Questions ─────────────────────────────────────────────────────────────────

@router.get("/{quiz_set_id}/questions", response_model=list[QuizQuestionResponse])
async def list_questions(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_set_id == quiz_set_id)
        .order_by(QuizQuestion.order_index)
    )
    return result.scalars().all()


@router.post("/{quiz_set_id}/questions", response_model=QuizQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    body: QuizQuestionCreate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)

    options_data = body.model_dump(exclude={"options"})
    question = QuizQuestion(quiz_set_id=quiz_set_id, **options_data)
    db.add(question)
    await db.flush()

    for opt in body.options:
        db.add(QuizOption(question_id=question.id, **opt.model_dump()))

    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{quiz_set_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    result = await db.execute(
        select(QuizQuestion).where(
            QuizQuestion.id == question_id, QuizQuestion.quiz_set_id == quiz_set_id
        )
    )
    q = result.scalar_one_or_none()
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    await db.delete(q)
    await db.commit()


# ── Attempts ──────────────────────────────────────────────────────────────────

@router.get("/{quiz_set_id}/attempts", response_model=list[QuizAttemptResponse])
async def list_attempts(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_set_id == quiz_set_id,
            QuizAttempt.user_id == current_user.id,
        ).order_by(QuizAttempt.started_at.desc())
    )
    return result.scalars().all()


@router.post("/{quiz_set_id}/attempts", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_attempt(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    body: QuizAttemptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    qs = await _get_quiz_set_or_404(quiz_set_id, workspace_id, db)
    attempt = QuizAttempt(
        quiz_set_id=quiz_set_id,
        user_id=current_user.id,
        time_limit_minutes=body.time_limit_minutes or qs.time_limit_minutes,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.patch("/{quiz_set_id}/attempts/{attempt_id}", response_model=QuizAttemptResponse)
async def update_attempt(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    attempt_id: uuid.UUID,
    body: QuizAttemptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == attempt_id,
            QuizAttempt.quiz_set_id == quiz_set_id,
            QuizAttempt.user_id == current_user.id,
        )
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    apply_updates(attempt, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.post("/{quiz_set_id}/attempts/{attempt_id}/answers", response_model=QuizAttemptAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    workspace_id: uuid.UUID,
    quiz_set_id: uuid.UUID,
    attempt_id: uuid.UUID,
    body: QuizAttemptAnswerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == attempt_id,
            QuizAttempt.quiz_set_id == quiz_set_id,
            QuizAttempt.user_id == current_user.id,
        )
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    # Auto-grade multiple choice
    is_correct = None
    if body.selected_option_id:
        opt = await db.get(QuizOption, body.selected_option_id)
        if opt:
            is_correct = opt.is_correct

    answer = QuizAttemptAnswer(
        attempt_id=attempt_id,
        question_id=body.question_id,
        selected_option_id=body.selected_option_id,
        free_text_answer=body.free_text_answer,
        is_correct=is_correct,
    )
    db.add(answer)
    await db.commit()
    await db.refresh(answer)
    return answer
