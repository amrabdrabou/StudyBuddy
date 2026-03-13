from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.user import User
from app.schema.quiz_attempt import QuizAttemptCreate, QuizAttemptResponse
from app.schema.quiz_question import (
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionUpdate,
)

router = APIRouter(prefix="/sessions/{session_id}/quiz", tags=["quiz"])


# ── Questions ──────────────────────────────────────────────────────────────

async def _get_question(session_id: UUID, question_id: UUID, db: AsyncSession) -> QuizQuestion:
    result = await db.execute(
        select(QuizQuestion).where(
            QuizQuestion.id == question_id,
            QuizQuestion.session_id == session_id,
        )
    )
    q = result.scalar_one_or_none()
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return q


@router.get("/questions", response_model=list[QuizQuestionResponse])
async def list_questions(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/questions", response_model=QuizQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    session_id: UUID,
    payload: QuizQuestionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    question = QuizQuestion(
        session_id=session_id,
        **payload.model_dump(exclude={"session_id"}),
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.patch("/questions/{question_id}", response_model=QuizQuestionResponse)
async def update_question(
    session_id: UUID,
    question_id: UUID,
    payload: QuizQuestionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    question = await _get_question(session_id, question_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    session_id: UUID,
    question_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    question = await _get_question(session_id, question_id, db)
    await db.delete(question)
    await db.commit()


# ── Attempts ───────────────────────────────────────────────────────────────

@router.get("/attempts", response_model=list[QuizAttemptResponse])
async def list_attempts(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/attempts", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
async def submit_attempt(
    session_id: UUID,
    payload: QuizAttemptCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    attempt = QuizAttempt(
        user_id=current_user.id,
        session_id=session_id,
        question_id=payload.question_id,
        user_answer=payload.user_answer,
        is_correct=payload.is_correct,
        time_taken_seconds=payload.time_taken_seconds,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt
