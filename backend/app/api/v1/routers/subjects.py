"""Subject router — CRUD for user-owned study subjects."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_subject
from app.core.db_setup import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse, SubjectUpdate
from app.services.progress_service import get_progress_snapshot_map

router = APIRouter(prefix="/subjects", tags=["subjects"])


def _serialize_subject(subject: Subject, progress_override: float | None = None) -> SubjectResponse:
    return SubjectResponse(
        id=subject.id,
        user_id=subject.user_id,
        name=subject.name,
        color_hex=subject.color_hex,
        icon=subject.icon,
        is_archived=subject.is_archived,
        progress_pct=round(progress_override) if progress_override is not None else 0,
        created_at=subject.created_at,
        updated_at=subject.updated_at,
    )


@router.get("/", response_model=list[SubjectResponse])
async def list_subjects(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Subject).where(Subject.user_id == current_user.id)
    if not include_archived:
        query = query.where(Subject.is_archived.is_(False))
    query = query.order_by(Subject.created_at.desc())
    result = await db.execute(query)
    subjects = result.scalars().all()
    snap_map = await get_progress_snapshot_map(
        db,
        current_user.id,
        "subject",
        [subject.id for subject in subjects],
    )
    return [_serialize_subject(subject, snap_map.get(subject.id)) for subject in subjects]


@router.post("/", response_model=SubjectResponse, status_code=201)
async def create_subject(
    body: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    subject = Subject(user_id=current_user.id, **body.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return _serialize_subject(subject)


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject_by_id(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    subject: Subject = Depends(get_subject),
):
    snap_map = await get_progress_snapshot_map(db, current_user.id, "subject", [subject.id])
    return _serialize_subject(subject, snap_map.get(subject.id))


@router.patch("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    body: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    subject: Subject = Depends(get_subject),
):
    apply_updates(subject, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(subject)
    return _serialize_subject(subject)


@router.delete("/{subject_id}", status_code=204)
async def delete_subject(
    db: AsyncSession = Depends(get_db),
    subject: Subject = Depends(get_subject),
):
    await db.delete(subject)
    await db.commit()
