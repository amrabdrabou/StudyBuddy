"""Session router — timed focus blocks inside a workspace."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_workspace
from app.core.db_setup import get_db
from app.models.flashcard_review import FlashcardReview
from app.models.micro_goal import MicroGoal
from app.models.quiz_attempt import QuizAttempt
from app.models.session import Session
from app.models.session_micro_goal import SessionMicroGoal
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.services import progress_service

router = APIRouter(prefix="/workspaces/{workspace_id}/sessions", tags=["sessions"])


async def _get_session_or_404(
    session_id: uuid.UUID, workspace_id: uuid.UUID, user: User, db: AsyncSession
) -> Session:
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.workspace_id == workspace_id,
            Session.user_id == user.id,
        )
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return s


async def _validate_micro_goal_ids(
    micro_goal_ids: list[uuid.UUID], workspace_id: uuid.UUID, db: AsyncSession
) -> None:
    if not micro_goal_ids:
        return
    result = await db.execute(
        select(MicroGoal.id).where(
            MicroGoal.id.in_(micro_goal_ids), MicroGoal.workspace_id == workspace_id
        )
    )
    found = {row[0] for row in result.all()}
    missing = set(micro_goal_ids) - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown micro goal IDs: {[str(m) for m in missing]}",
        )


async def _sync_micro_goals(
    session: Session, micro_goal_ids: list[uuid.UUID], db: AsyncSession
) -> None:
    existing = await db.execute(
        select(SessionMicroGoal).where(SessionMicroGoal.session_id == session.id)
    )
    for link in existing.scalars().all():
        await db.delete(link)
    for mgid in micro_goal_ids:
        db.add(SessionMicroGoal(session_id=session.id, micro_goal_id=mgid))


async def _get_flashcard_review_count(
    session_id: uuid.UUID,
    db: AsyncSession,
) -> int:
    result = await db.execute(
        select(sa_func.count(FlashcardReview.id))
        .where(FlashcardReview.session_id == session_id)
    )
    return result.scalar() or 0


async def _get_latest_quiz_score_pct(
    quiz_set_id: uuid.UUID | None,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> float | None:
    if quiz_set_id is None:
        return None

    result = await db.execute(
        select(QuizAttempt.score_pct)
        .where(
            QuizAttempt.quiz_set_id == quiz_set_id,
            QuizAttempt.user_id == user_id,
            QuizAttempt.status == "completed",
        )
        .order_by(QuizAttempt.started_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return float(row) if row is not None else None


async def _serialize_session_response(
    session: Session,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> SessionResponse:
    fc_count = await _get_flashcard_review_count(session.id, db)
    quiz_score_pct = await _get_latest_quiz_score_pct(session.quiz_set_id, user_id, db)
    return SessionResponse.from_orm_with_goals(
        session,
        flashcard_reviews_count=fc_count,
        quiz_score_pct=quiz_score_pct,
    )


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(Session)
        .where(Session.workspace_id == workspace_id, Session.user_id == current_user.id)
        .order_by(Session.started_at.desc())
    )
    sessions = result.scalars().all()

    # Flashcard review counts per session
    session_ids = [s.id for s in sessions]
    fc_count_map: dict = {}
    if session_ids:
        fc_result = await db.execute(
            select(FlashcardReview.session_id, sa_func.count(FlashcardReview.id))
            .where(FlashcardReview.session_id.in_(session_ids))
            .group_by(FlashcardReview.session_id)
        )
        fc_count_map = {row[0]: row[1] for row in fc_result.all()}

    # Latest completed quiz attempt score per quiz_set_id
    quiz_set_ids = [s.quiz_set_id for s in sessions if s.quiz_set_id]
    quiz_score_map: dict = {}
    if quiz_set_ids:
        attempts_result = await db.execute(
            select(QuizAttempt.quiz_set_id, QuizAttempt.score_pct)
            .where(
                QuizAttempt.quiz_set_id.in_(quiz_set_ids),
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.status == "completed",
            )
            .order_by(QuizAttempt.started_at.desc())
        )
        for row in attempts_result.all():
            if row[0] not in quiz_score_map:
                quiz_score_map[row[0]] = float(row[1]) if row[1] is not None else None

    return [
        SessionResponse.from_orm_with_goals(
            s,
            flashcard_reviews_count=fc_count_map.get(s.id, 0),
            quiz_score_pct=quiz_score_map.get(s.quiz_set_id) if s.quiz_set_id else None,
        )
        for s in sessions
    ]


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    workspace_id: uuid.UUID,
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    await _validate_micro_goal_ids(body.micro_goal_ids, workspace_id, db)

    session = Session(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=body.title,
        planned_duration_minutes=body.planned_duration_minutes,
        flashcard_deck_id=body.flashcard_deck_id,
        quiz_set_id=body.quiz_set_id,
    )
    db.add(session)
    await db.flush()

    for mgid in body.micro_goal_ids:
        db.add(SessionMicroGoal(session_id=session.id, micro_goal_id=mgid))

    await db.commit()
    await db.refresh(session)
    return SessionResponse.from_orm_with_goals(session)  # new sessions have 0 reviews and no score


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    session = await _get_session_or_404(session_id, workspace_id, current_user, db)
    return await _serialize_session_response(session, current_user.id, db)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    session = await _get_session_or_404(session_id, workspace_id, current_user, db)

    update_data = body.model_dump(exclude_unset=True)
    micro_goal_ids = update_data.pop("micro_goal_ids", None)
    apply_updates(session, update_data)

    if micro_goal_ids is not None:
        await _validate_micro_goal_ids(micro_goal_ids, workspace_id, db)
        await _sync_micro_goals(session, micro_goal_ids, db)

    # Complete linked micro-goals when session is completed
    if update_data.get("status") == "completed":
        linked_result = await db.execute(
            select(SessionMicroGoal).where(SessionMicroGoal.session_id == session.id)
        )
        for link in linked_result.scalars().all():
            goal = await db.get(MicroGoal, link.micro_goal_id)
            if goal and goal.workspace_id == workspace_id and goal.status != "completed":
                goal.status = "completed"

    await db.commit()
    await db.refresh(session)

    # Trigger progress cascade (best-effort — never aborts the response)
    try:
        await progress_service.update_session_progress(
            session.id, current_user.id, db, source_type="session", source_id=session.id
        )
        await db.commit()
    except Exception:
        pass
    return await _serialize_session_response(session, current_user.id, db)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    session = await _get_session_or_404(session_id, workspace_id, current_user, db)
    await db.delete(session)
    await db.commit()
