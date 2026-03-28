"""Session router — timed focus blocks inside a workspace."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_workspace
from app.core.db_setup import get_db
from app.models.micro_goal import MicroGoal
from app.models.session import Session
from app.models.session_micro_goal import SessionMicroGoal
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate

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
    return [SessionResponse.from_orm_with_goals(s) for s in sessions]


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
    return SessionResponse.from_orm_with_goals(session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    session = await _get_session_or_404(session_id, workspace_id, current_user, db)
    return SessionResponse.from_orm_with_goals(session)


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

    await db.commit()
    await db.refresh(session)
    return SessionResponse.from_orm_with_goals(session)


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
