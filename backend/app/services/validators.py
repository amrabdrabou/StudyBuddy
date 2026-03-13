"""
Cross-table consistency guards.

These functions are called before any INSERT or UPDATE that involves both
a user_id and a study_subject_id. They guarantee that:

    record.user_id == record.study_subject.user_id

If the check fails we raise a 400 — it means the client sent a subject
that doesn't belong to the authenticated user, which is a logic error,
not a permission error (403) or a missing resource (404).
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_subject import StudySubject


async def verify_subject_owner(
    db: AsyncSession,
    subject_id: uuid.UUID,
    user_id: uuid.UUID,
) -> StudySubject:
    """
    Fetch the subject and confirm it belongs to user_id.

    Returns the subject so the caller can reuse it without a second query.
    Raises 404 if the subject doesn't exist.
    Raises 400 if it exists but belongs to a different user.
    """
    result = await db.execute(
        select(StudySubject).where(StudySubject.id == subject_id)
    )
    subject = result.scalar_one_or_none()

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study subject {subject_id} not found",
        )

    if subject.user_id != user_id:
        # The subject exists but belongs to someone else — don't leak that fact
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="study_subject_id does not belong to the current user",
        )

    return subject
