"""API router for CRUD operations on study subjects."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from sqlalchemy import func
from app.models.study_subject import StudySubject
from app.models.study_session import StudySession
from app.models.note import Note
from app.models.document import Document
from app.models.user import User
from app.schemas.study_subject import StudySubjectCreate, StudySubjectResponse, StudySubjectUpdate
from app.schemas.study_session import StudySessionResponse

router = APIRouter(prefix="/subjects", tags=["subjects"])


async def _get_owned_subject(
    subject_id: UUID,
    current_user: User,
    db: AsyncSession,
) -> StudySubject:
    result = await db.execute(select(StudySubject).where(StudySubject.id == subject_id))
    subject = result.scalar_one_or_none()
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if subject.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return subject


@router.get("/", response_model=list[StudySubjectResponse])
async def get_subjects(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StudySubject)
        .where(StudySubject.user_id == current_user.id)
        .order_by(StudySubject.created_at.desc())
    )
    subjects = result.scalars().all()
    if not subjects:
        return []

    ids = [s.id for s in subjects]

    sess_rows = (await db.execute(
        select(StudySession.study_subject_id, func.count(StudySession.id))
        .where(StudySession.study_subject_id.in_(ids))
        .group_by(StudySession.study_subject_id)
    )).all()
    sess_counts = {r[0]: r[1] for r in sess_rows}

    note_rows = (await db.execute(
        select(Note.study_subject_id, func.count(Note.id))
        .where(Note.study_subject_id.in_(ids))
        .group_by(Note.study_subject_id)
    )).all()
    note_counts = {r[0]: r[1] for r in note_rows}

    doc_rows = (await db.execute(
        select(Document.study_subject_id, func.count(Document.id))
        .where(Document.study_subject_id.in_(ids))
        .group_by(Document.study_subject_id)
    )).all()
    doc_counts = {r[0]: r[1] for r in doc_rows}

    responses = []
    for s in subjects:
        resp = StudySubjectResponse.model_validate(s)
        resp.session_count = sess_counts.get(s.id, 0)
        resp.note_count = note_counts.get(s.id, 0)
        resp.document_count = doc_counts.get(s.id, 0)
        responses.append(resp)
    return responses


@router.post("/", response_model=StudySubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: StudySubjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subject = StudySubject(user_id=current_user.id, **data.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.patch("/{subject_id}", response_model=StudySubjectResponse)
async def update_subject(
    subject_id: UUID,
    data: StudySubjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subject = await _get_owned_subject(subject_id, current_user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.get("/{subject_id}/sessions/", response_model=list[StudySessionResponse])
async def list_subject_sessions(
    subject_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subject = await _get_owned_subject(subject_id, current_user, db)
    result = await db.execute(
        select(StudySession)
        .where(StudySession.study_subject_id == subject.id)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subject = await _get_owned_subject(subject_id, current_user, db)
    await db.delete(subject)
    await db.commit()
