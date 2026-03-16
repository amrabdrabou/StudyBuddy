"""API router for study groups, membership management, and shared resources."""
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.shared_resource import SharedResource
from app.models.study_group import StudyGroup
from app.models.study_group_member import StudyGroupMember
from app.models.user import User
from app.schemas.study_group import (
    SharedResourceCreate,
    StudyGroupCreate,
    StudyGroupResponse,
    StudyGroupUpdate,
)

router = APIRouter(prefix="/study-groups", tags=["study-groups"])


async def _get_owned_group(group_id: UUID, user: User, db: AsyncSession) -> StudyGroup:
    result = await db.execute(
        select(StudyGroup).where(StudyGroup.id == group_id, StudyGroup.creator_id == user.id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found")
    return group


async def _get_accessible_group(group_id: UUID, user: User, db: AsyncSession) -> StudyGroup:
    """Return a group the user created or is a member of."""
    result = await db.execute(
        select(StudyGroup)
        .outerjoin(StudyGroupMember, StudyGroupMember.study_group_id == StudyGroup.id)
        .where(
            StudyGroup.id == group_id,
            or_(StudyGroup.creator_id == user.id, StudyGroupMember.user_id == user.id),
        )
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study group not found")
    return group


# ── Study Groups ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[StudyGroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return groups the user created or belongs to."""
    result = await db.execute(
        select(StudyGroup)
        .outerjoin(StudyGroupMember, StudyGroupMember.study_group_id == StudyGroup.id)
        .where(
            or_(StudyGroup.creator_id == current_user.id, StudyGroupMember.user_id == current_user.id)
        )
        .order_by(StudyGroup.created_at.desc())
        .distinct()
    )
    return result.scalars().all()


@router.post("/", response_model=StudyGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: StudyGroupCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    group = StudyGroup(
        creator_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(group)
    await db.flush()

    # Creator is automatically added as owner member
    db.add(StudyGroupMember(user_id=current_user.id, study_group_id=group.id, role="owner"))

    await db.commit()
    await db.refresh(group)
    return group


@router.get("/{group_id}", response_model=StudyGroupResponse)
async def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_accessible_group(group_id, current_user, db)


@router.patch("/{group_id}", response_model=StudyGroupResponse)
async def update_group(
    group_id: UUID,
    payload: StudyGroupUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_owned_group(group_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_owned_group(group_id, current_user, db)
    await db.delete(group)
    await db.commit()


@router.post("/{group_id}/generate-invite", response_model=StudyGroupResponse)
async def generate_invite_code(
    group_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new random invite code for the group."""
    group = await _get_owned_group(group_id, current_user, db)
    group.invite_code = secrets.token_urlsafe(8)
    await db.commit()
    await db.refresh(group)
    return group


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{group_id}/members", response_model=list[dict])
async def list_members(
    group_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_group(group_id, current_user, db)
    result = await db.execute(
        select(StudyGroupMember)
        .where(StudyGroupMember.study_group_id == group_id)
        .order_by(StudyGroupMember.joined_at)
    )
    members = result.scalars().all()
    return [
        {
            "user_id": str(m.user_id),
            "study_group_id": str(m.study_group_id),
            "role": m.role,
            "joined_at": m.joined_at.isoformat(),
        }
        for m in members
    ]


@router.post("/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def join_group(
    group_id: UUID,
    invite_code: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a group using an invite code."""
    result = await db.execute(
        select(StudyGroup).where(StudyGroup.id == group_id, StudyGroup.invite_code == invite_code)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    # Check capacity
    if group.max_members:
        count_result = await db.execute(
            select(StudyGroupMember).where(StudyGroupMember.study_group_id == group_id)
        )
        if len(count_result.scalars().all()) >= group.max_members:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group is full")

    # Idempotent — already a member is fine
    existing = await db.execute(
        select(StudyGroupMember).where(
            StudyGroupMember.user_id == current_user.id,
            StudyGroupMember.study_group_id == group_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    db.add(StudyGroupMember(user_id=current_user.id, study_group_id=group_id, role="member"))
    await db.commit()
    return {"detail": "Joined successfully"}


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Owner removes a member, or a member leaves themselves."""
    group = await _get_accessible_group(group_id, current_user, db)

    # Only the group owner or the member themselves can remove
    if current_user.id != group.creator_id and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(
        select(StudyGroupMember).where(
            StudyGroupMember.user_id == user_id,
            StudyGroupMember.study_group_id == group_id,
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await db.delete(member)
    await db.commit()


# ── Shared Resources ──────────────────────────────────────────────────────────

def _resource_to_dict(r: SharedResource) -> dict:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "study_group_id": str(r.study_group_id),
        "resource_id": str(r.resource_id),
        "title": r.title,
        "shared_at": r.shared_at.isoformat(),
    }


@router.get("/{group_id}/resources")
async def list_shared_resources(
    group_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_group(group_id, current_user, db)
    result = await db.execute(
        select(SharedResource)
        .where(SharedResource.study_group_id == group_id)
        .order_by(SharedResource.shared_at.desc())
    )
    return [_resource_to_dict(r) for r in result.scalars().all()]


@router.post("/{group_id}/resources", status_code=status.HTTP_201_CREATED)
async def share_resource(
    group_id: UUID,
    payload: SharedResourceCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_group(group_id, current_user, db)
    resource = SharedResource(
        user_id=current_user.id,
        study_group_id=group_id,
        resource_id=payload.resource_id,
        title=payload.title,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return _resource_to_dict(resource)


@router.delete("/{group_id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_shared_resource(
    group_id: UUID,
    resource_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedResource).where(
            SharedResource.id == resource_id,
            SharedResource.study_group_id == group_id,
            SharedResource.user_id == current_user.id,
        )
    )
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared resource not found")
    await db.delete(resource)
    await db.commit()
