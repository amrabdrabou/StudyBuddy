"""
Legacy quiz router — kept for backwards compatibility.
New quiz-set-centric endpoints live in quiz_sets.py.
This router exposes a flat view of questions across all quiz sets in a session.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.quiz_question import QuizQuestion
from app.models.quiz_set import QuizSet
from app.models.user import User
from app.schema.quiz_question import QuizQuestionResponse

router = APIRouter(prefix="/sessions/{session_id}/quiz", tags=["quiz"])


@router.get("/questions", response_model=list[QuizQuestionResponse])
async def list_session_questions(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all questions across every quiz set belonging to this session."""
    await get_owned_session(session_id, current_user, db)
    # Find quiz set IDs for this session
    qs_result = await db.execute(
        select(QuizSet.id).where(
            QuizSet.session_id == session_id, QuizSet.user_id == current_user.id
        )
    )
    set_ids = [row[0] for row in qs_result.all()]
    if not set_ids:
        return []
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.quiz_set_id.in_(set_ids))
        .order_by(QuizQuestion.order_index)
    )
    return result.scalars().all()
