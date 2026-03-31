"""Workspace router — CRUD for user-owned workspaces."""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)
from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_or_404
from app.core.db_setup import get_db
from app.models.document import Document
from app.models.flashcard_deck import FlashcardDeck
from app.models.note import Note
from app.models.quiz_set import QuizSet
from app.models.session import Session as StudySession
from app.models.subject import Subject
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.services.progress_service import get_progress_snapshot_map

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _serialize_workspace(
    workspace: Workspace,
    *,
    progress_override: float | None = None,
    document_count: int = 0,
    flashcard_deck_count: int = 0,
    quiz_set_count: int = 0,
    session_count: int = 0,
    note_count: int = 0,
) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        subject_id=workspace.subject_id,
        title=workspace.title,
        status=workspace.status,
        progress_pct=round(progress_override) if progress_override is not None else 0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        document_count=document_count,
        flashcard_deck_count=flashcard_deck_count,
        quiz_set_count=quiz_set_count,
        session_count=session_count,
        note_count=note_count,
    )


async def _validate_subject(subject_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    result = await db.execute(
        select(Subject.id).where(Subject.id == subject_id, Subject.user_id == user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(
    subject_id: uuid.UUID | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Fetch workspaces
    query = select(Workspace).where(Workspace.user_id == current_user.id)
    if subject_id is not None:
        query = query.where(Workspace.subject_id == subject_id)
    if status is not None:
        query = query.where(Workspace.status == status)
    query = query.order_by(Workspace.updated_at.desc())
    result = await db.execute(query)
    workspaces = result.scalars().all()

    if not workspaces:
        return []

    ws_ids = [w.id for w in workspaces]
    snap_map = await get_progress_snapshot_map(db, current_user.id, "workspace", ws_ids)

    # Fetch all counts with aggregate queries (one per table, no N+1)
    def count_query(fk_col):
        return select(fk_col, sa_func.count()).where(fk_col.in_(ws_ids)).group_by(fk_col)

    doc_rows     = (await db.execute(count_query(Document.workspace_id))).all()
    deck_rows    = (await db.execute(count_query(FlashcardDeck.workspace_id))).all()
    quiz_rows    = (await db.execute(count_query(QuizSet.workspace_id))).all()
    session_rows = (await db.execute(count_query(StudySession.workspace_id))).all()
    note_rows    = (await db.execute(
        select(Note.workspace_id, sa_func.count())
        .where(Note.workspace_id.in_(ws_ids))
        .group_by(Note.workspace_id)
    )).all()

    doc_map     = {r[0]: r[1] for r in doc_rows}
    deck_map    = {r[0]: r[1] for r in deck_rows}
    quiz_map    = {r[0]: r[1] for r in quiz_rows}
    session_map = {r[0]: r[1] for r in session_rows}
    note_map    = {r[0]: r[1] for r in note_rows}

    return [
        _serialize_workspace(
            w,
            progress_override=snap_map.get(w.id),
            document_count=doc_map.get(w.id, 0),
            flashcard_deck_count=deck_map.get(w.id, 0),
            quiz_set_count=quiz_map.get(w.id, 0),
            session_count=session_map.get(w.id, 0),
            note_count=note_map.get(w.id, 0),
        )
        for w in workspaces
    ]


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _validate_subject(body.subject_id, current_user, db)
    workspace = Workspace(user_id=current_user.id, **body.model_dump())
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    # Emit pipeline event so micro-goals and progress are seeded
    try:
        from app.services.pipeline.events import emit_workspace_created
        emit_workspace_created(workspace.id)
    except Exception:
        logger.warning("Failed to emit workspace.created event for workspace %s", workspace.id)

    return _serialize_workspace(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace_by_id(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    workspace = await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )
    snap_map = await get_progress_snapshot_map(db, current_user.id, "workspace", [workspace.id])
    return _serialize_workspace(workspace, progress_override=snap_map.get(workspace.id))


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    workspace = await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )
    apply_updates(workspace, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(workspace)
    snap_map = await get_progress_snapshot_map(db, current_user.id, "workspace", [workspace.id])
    return _serialize_workspace(workspace, progress_override=snap_map.get(workspace.id))


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    workspace = await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )
    await db.delete(workspace)
    await db.commit()
