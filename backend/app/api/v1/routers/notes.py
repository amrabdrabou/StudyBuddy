"""Notes router — flat CRUD with subject/workspace/session context filters."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates
from app.core.db_setup import get_db
from app.models.note import Note
from app.models.session import Session
from app.models.subject import Subject
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


async def _get_note_or_404(note_id: uuid.UUID, user: User, db: AsyncSession) -> Note:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


async def _resolve_subject_id(
    body: NoteCreate, user: User, db: AsyncSession
) -> uuid.UUID:
    """
    subject_id can be provided directly or auto-derived from workspace/session.
    If workspace_id is given without subject_id, derive it.
    If session_id is given, workspace_id must also be provided.
    Always validates ownership.
    """
    # Validate subject belongs to user
    subj = await db.execute(
        select(Subject.id).where(Subject.id == body.subject_id, Subject.user_id == user.id)
    )
    if subj.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # If workspace provided, validate it belongs to this subject and user
    if body.workspace_id is not None:
        ws = await db.execute(
            select(Workspace).where(
                Workspace.id == body.workspace_id,
                Workspace.user_id == user.id,
                Workspace.subject_id == body.subject_id,
            )
        )
        if ws.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found or does not belong to this subject",
            )

    # If session provided, validate it belongs to workspace
    if body.session_id is not None:
        if body.workspace_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="workspace_id is required when session_id is provided",
            )
        sess = await db.execute(
            select(Session).where(
                Session.id == body.session_id,
                Session.workspace_id == body.workspace_id,
                Session.user_id == user.id,
            )
        )
        if sess.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    return body.subject_id


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    subject_id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Note).where(Note.user_id == current_user.id)
    if subject_id:
        query = query.where(Note.subject_id == subject_id)
    if workspace_id:
        query = query.where(Note.workspace_id == workspace_id)
    if session_id:
        query = query.where(Note.session_id == session_id)
    query = query.order_by(Note.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _resolve_subject_id(body, current_user, db)
    note = Note(
        user_id=current_user.id,
        subject_id=body.subject_id,
        workspace_id=body.workspace_id,
        session_id=body.session_id,
        title=body.title,
        content=body.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await _get_note_or_404(note_id, current_user, db)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = await _get_note_or_404(note_id, current_user, db)
    apply_updates(note, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = await _get_note_or_404(note_id, current_user, db)
    await db.delete(note)
    await db.commit()
