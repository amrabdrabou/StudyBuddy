"""Subject router — CRUD for user-owned study subjects."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_or_404, get_subject
from app.core.db_setup import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["subjects"])


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
    return result.scalars().all()


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
    return subject


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject_by_id(
    subject: Subject = Depends(get_subject),
):
    return subject


@router.patch("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    body: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    subject: Subject = Depends(get_subject),
):
    apply_updates(subject, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=204)
async def delete_subject(
    db: AsyncSession = Depends(get_db),
    subject: Subject = Depends(get_subject),
):
    await db.delete(subject)
    await db.commit()
