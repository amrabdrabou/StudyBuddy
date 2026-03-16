"""API router for managing quiz sets and their questions within a session."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_attempt_answer import QuizAttemptAnswer
from app.models.quiz_option import QuizOption
from app.models.quiz_question import QuizQuestion
from app.models.quiz_set import QuizSet
from app.models.user import User
from app.schemas.quiz_attempt import QuizAttemptCreate, QuizAttemptResponse, QuizAttemptUpdate
from app.schemas.quiz_attempt_answer import QuizAttemptAnswerCreate, QuizAttemptAnswerResponse
from app.schemas.quiz_option import QuizOptionCreate, QuizOptionResponse, QuizOptionUpdate
from app.schemas.quiz_question import QuizQuestionCreate, QuizQuestionResponse, QuizQuestionUpdate
from app.schemas.quiz_set import QuizSetCreate, QuizSetResponse, QuizSetUpdate

router = APIRouter(prefix="/quiz-sets", tags=["quiz-sets"])


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_owned_quiz_set(quiz_set_id: UUID, user: User, db: AsyncSession) -> QuizSet:
    result = await db.execute(
        select(QuizSet).where(QuizSet.id == quiz_set_id, QuizSet.user_id == user.id)
    )
    qs = result.scalar_one_or_none()
    if qs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz set not found")
    return qs


async def _get_question(quiz_set_id: UUID, question_id: UUID, db: AsyncSession) -> QuizQuestion:
    result = await db.execute(
        select(QuizQuestion).where(
            QuizQuestion.id == question_id,
            QuizQuestion.quiz_set_id == quiz_set_id,
        )
    )
    q = result.scalar_one_or_none()
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return q


# ── Quiz Sets ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[QuizSetResponse])
async def list_quiz_sets(
    session_id: UUID | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(QuizSet).where(QuizSet.user_id == current_user.id)
    if session_id:
        query = query.where(QuizSet.session_id == session_id)
    result = await db.execute(query.order_by(QuizSet.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=QuizSetResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz_set(
    payload: QuizSetCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(payload.session_id, current_user, db)
    qs = QuizSet(user_id=current_user.id, **payload.model_dump())
    db.add(qs)
    await db.commit()
    await db.refresh(qs)
    return qs


@router.get("/{quiz_set_id}", response_model=QuizSetResponse)
async def get_quiz_set(
    quiz_set_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_quiz_set(quiz_set_id, current_user, db)


@router.patch("/{quiz_set_id}", response_model=QuizSetResponse)
async def update_quiz_set(
    quiz_set_id: UUID,
    payload: QuizSetUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    qs = await _get_owned_quiz_set(quiz_set_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(qs, field, value)
    await db.commit()
    await db.refresh(qs)
    return qs


@router.delete("/{quiz_set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_set(
    quiz_set_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    qs = await _get_owned_quiz_set(quiz_set_id, current_user, db)
    await db.delete(qs)
    await db.commit()


# ── Questions ─────────────────────────────────────────────────────────────────

@router.get("/{quiz_set_id}/questions", response_model=list[QuizQuestionResponse])
async def list_questions(
    quiz_set_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_set_id == quiz_set_id)
        .order_by(QuizQuestion.order_index)
    )
    return result.scalars().all()


@router.post("/{quiz_set_id}/questions", response_model=QuizQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    quiz_set_id: UUID,
    payload: QuizQuestionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    qs = await _get_owned_quiz_set(quiz_set_id, current_user, db)
    question = QuizQuestion(quiz_set_id=quiz_set_id, **payload.model_dump(exclude={"quiz_set_id"}))
    db.add(question)
    # Update cached count
    qs.question_count += 1
    await db.commit()
    await db.refresh(question)
    return question


@router.patch("/{quiz_set_id}/questions/{question_id}", response_model=QuizQuestionResponse)
async def update_question(
    quiz_set_id: UUID,
    question_id: UUID,
    payload: QuizQuestionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    question = await _get_question(quiz_set_id, question_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{quiz_set_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    quiz_set_id: UUID,
    question_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    qs = await _get_owned_quiz_set(quiz_set_id, current_user, db)
    question = await _get_question(quiz_set_id, question_id, db)
    await db.delete(question)
    qs.question_count = max(0, qs.question_count - 1)
    await db.commit()


# ── Options ───────────────────────────────────────────────────────────────────

@router.post("/{quiz_set_id}/questions/{question_id}/options", response_model=QuizOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_option(
    quiz_set_id: UUID,
    question_id: UUID,
    payload: QuizOptionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    await _get_question(quiz_set_id, question_id, db)
    option = QuizOption(question_id=question_id, **payload.model_dump())
    db.add(option)
    await db.commit()
    await db.refresh(option)
    return option


@router.patch("/{quiz_set_id}/questions/{question_id}/options/{option_id}", response_model=QuizOptionResponse)
async def update_option(
    quiz_set_id: UUID,
    question_id: UUID,
    option_id: UUID,
    payload: QuizOptionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizOption).where(QuizOption.id == option_id, QuizOption.question_id == question_id)
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(option, field, value)
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/{quiz_set_id}/questions/{question_id}/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_option(
    quiz_set_id: UUID,
    question_id: UUID,
    option_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizOption).where(QuizOption.id == option_id, QuizOption.question_id == question_id)
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    await db.delete(option)
    await db.commit()


# ── Attempts ──────────────────────────────────────────────────────────────────

@router.get("/{quiz_set_id}/attempts", response_model=list[QuizAttemptResponse])
async def list_attempts(
    quiz_set_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_set_id == quiz_set_id, QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.started_at.desc())
    )
    return result.scalars().all()


@router.post("/{quiz_set_id}/attempts", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_attempt(
    quiz_set_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    qs = await _get_owned_quiz_set(quiz_set_id, current_user, db)
    attempt = QuizAttempt(
        quiz_set_id=quiz_set_id,
        session_id=qs.session_id,
        user_id=current_user.id,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.patch("/{quiz_set_id}/attempts/{attempt_id}", response_model=QuizAttemptResponse)
async def update_attempt(
    quiz_set_id: UUID,
    attempt_id: UUID,
    payload: QuizAttemptUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attempt, field, value)
    await db.commit()
    await db.refresh(attempt)
    return attempt


# ── Attempt Answers ───────────────────────────────────────────────────────────

@router.post("/{quiz_set_id}/attempts/{attempt_id}/answers", response_model=QuizAttemptAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    quiz_set_id: UUID,
    attempt_id: UUID,
    payload: QuizAttemptAnswerCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == attempt_id,
            QuizAttempt.user_id == current_user.id,
        )
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    answer = QuizAttemptAnswer(attempt_id=attempt_id, **payload.model_dump())
    db.add(answer)
    await db.commit()
    await db.refresh(answer)
    return answer


@router.get("/{quiz_set_id}/attempts/{attempt_id}/answers", response_model=list[QuizAttemptAnswerResponse])
async def list_answers(
    quiz_set_id: UUID,
    attempt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_quiz_set(quiz_set_id, current_user, db)
    result = await db.execute(
        select(QuizAttemptAnswer).where(QuizAttemptAnswer.attempt_id == attempt_id)
    )
    return result.scalars().all()
