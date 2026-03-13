from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.study_subject import StudySubject
from app.models.user import User
from app.schema.study_subject import StudySubjectCreate, StudySubjectResponse, StudySubjectUpdate

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
    return result.scalars().all()


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


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    subject = await _get_owned_subject(subject_id, current_user, db)
    await db.delete(subject)
    await db.commit()
