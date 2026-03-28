"""
Admin router — all developer-only management endpoints under /api/v1/admin.

Permission model (every check is resolved from the DB at request time):
  users:read_any     – read any user's profile
  users:write_any    – update any user's profile or status
  users:delete_any   – delete any user account
  users:assign_roles – promote / demote / assign / revoke roles
  system:view_stats  – view platform-wide statistics
  system:admin       – view role catalogue and system config

── System ───────────────────────────────────────────────────────────────────
GET    /admin/me/permissions           (any authenticated user)
GET    /admin/stats                    system:view_stats
GET    /admin/roles                    system:admin

── Users ────────────────────────────────────────────────────────────────────
GET    /admin/users                    users:read_any
GET    /admin/users/{id}               users:read_any
PATCH  /admin/users/{id}               users:write_any   (profile fields)
PATCH  /admin/users/{id}/status        users:write_any   (active flag)
DELETE /admin/users/{id}               users:delete_any
POST   /admin/users/{id}/roles         users:assign_roles
DELETE /admin/users/{id}/roles/{role}  users:assign_roles

── Developers ───────────────────────────────────────────────────────────────
GET    /admin/developers               users:read_any
POST   /admin/developers               users:assign_roles  (promote by user_id)
DELETE /admin/developers/{id}          users:assign_roles  (demote; self-demotion blocked)
PATCH  /admin/developers/{id}          users:write_any     (profile fields)
"""
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.core.rbac import get_user_permissions, require_permission
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.rbac import RoleSchema, UserPermissionsResponse, UserRoleAssign
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


# ── Shared request bodies ─────────────────────────────────────────────────────

class StatusBody(BaseModel):
    """Toggle a user's active state."""
    is_active: bool


class PromoteBody(BaseModel):
    """Promote a user to developer by their user_id."""
    user_id: uuid.UUID


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_user_or_404(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _get_role_or_404(db: AsyncSession, role_name: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )
    return role


async def _get_user_role_or_404(
    db: AsyncSession, user_id: uuid.UUID, role_name: str
) -> UserRole:
    result = await db.execute(
        select(UserRole)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id == user_id)
        .where(Role.name == role_name)
    )
    ur = result.scalar_one_or_none()
    if ur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User does not hold role '{role_name}'",
        )
    return ur


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/me/permissions",
    response_model=UserPermissionsResponse,
    summary="My roles and permissions",
)
async def my_permissions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the caller's assigned roles and the full set of permission codenames
    they hold. Open to every authenticated user — useful for UI feature-flagging.
    """
    role_result = await db.execute(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == current_user.id)
    )
    roles = role_result.scalars().all()
    permissions = await get_user_permissions(db, current_user.id)
    return UserPermissionsResponse(
        user_id=current_user.id,
        roles=[r.name for r in roles],
        permissions=sorted(permissions),
    )


@router.get(
    "/stats",
    summary="System-wide statistics  [system:view_stats]",
)
async def system_stats(
    _: User = Depends(require_permission("system", "view_stats")),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide counters. Requires **system:view_stats**."""
    total  = await db.scalar(select(func.count()).select_from(User)) or 0
    active = await db.scalar(
        select(func.count()).select_from(User).where(User.is_active == True)  # noqa: E712
    ) or 0
    devs = await db.scalar(
        select(func.count())
        .select_from(UserRole)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == "developer")
    ) or 0
    return {
        "total_users":     total,
        "active_users":    active,
        "inactive_users":  total - active,
        "developers":      devs,
        "regular_users":   total - devs,
    }


@router.get(
    "/roles",
    response_model=List[RoleSchema],
    summary="List all roles and permissions  [system:admin]",
)
async def list_roles(
    _: User = Depends(require_permission("system", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Return every role defined in the DB with its permission set. Requires **system:admin**."""
    result = await db.execute(select(Role))
    return result.scalars().all()


# ═══════════════════════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List all users  [users:read_any]",
)
async def list_all_users(
    skip: int = 0,
    limit: int = 50,
    _: User = Depends(require_permission("users", "read_any")),
    db: AsyncSession = Depends(get_db),
):
    """Paginated list of every account. Requires **users:read_any**."""
    result = await db.execute(select(User).order_by(User.created_at).offset(skip).limit(limit))
    return result.scalars().all()


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Get any user  [users:read_any]",
)
async def get_any_user(
    user_id: uuid.UUID,
    _: User = Depends(require_permission("users", "read_any")),
    db: AsyncSession = Depends(get_db),
):
    """Read any user's profile by ID. Requires **users:read_any**."""
    return await _get_user_or_404(db, user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update any user's profile  [users:write_any]",
)
async def update_any_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    caller: User = Depends(require_permission("users", "write_any")),
    db: AsyncSession = Depends(get_db),
):
    """
    Update safe profile fields for any user account.
    Sensitive fields (password, roles, is_superuser) are not exposed here.
    Requires **users:write_any**.
    """
    target = await _get_user_or_404(db, user_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(target, field, value)
    await db.commit()
    await db.refresh(target)
    logger.info("ADMIN update user_id=%s fields=%s by caller_id=%s", user_id, list(updates), caller.id)
    return target


@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse,
    summary="Activate or deactivate a user  [users:write_any]",
)
async def set_user_status(
    user_id: uuid.UUID,
    body: StatusBody,
    caller: User = Depends(require_permission("users", "write_any")),
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle is_active on any account. Inactive users are rejected at login.
    Requires **users:write_any**.
    """
    target = await _get_user_or_404(db, user_id)
    target.is_active = body.is_active
    await db.commit()
    await db.refresh(target)
    logger.info("ADMIN status user_id=%s is_active=%s by caller_id=%s", user_id, body.is_active, caller.id)
    return target


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete any user account  [users:delete_any]",
)
async def delete_any_user(
    user_id: uuid.UUID,
    caller: User = Depends(require_permission("users", "delete_any")),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete a user and all their data (cascades via FK).
    Raises 400 if the caller attempts to delete their own account.
    Requires **users:delete_any**.
    """
    if user_id == caller.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    target = await _get_user_or_404(db, user_id)
    await db.delete(target)
    await db.commit()
    logger.info("ADMIN delete user_id=%s by caller_id=%s", user_id, caller.id)


@router.post(
    "/users/{user_id}/roles",
    status_code=status.HTTP_201_CREATED,
    summary="Assign a role to a user  [users:assign_roles]",
)
async def assign_role(
    user_id: uuid.UUID,
    body: UserRoleAssign,
    caller: User = Depends(require_permission("users", "assign_roles")),
    db: AsyncSession = Depends(get_db),
):
    """
    Grant a named role to a user. Idempotent.
    Requires **users:assign_roles**.
    """
    await _get_user_or_404(db, user_id)
    role = await _get_role_or_404(db, body.role_name)

    existing = await db.execute(
        select(UserRole)
        .where(UserRole.user_id == user_id)
        .where(UserRole.role_id == role.id)
    )
    if existing.scalar_one_or_none() is not None:
        return {"message": f"User already holds role '{body.role_name}'"}

    db.add(UserRole(user_id=user_id, role_id=role.id))
    await db.commit()
    logger.info("ADMIN assign role=%s user_id=%s by caller_id=%s", body.role_name, user_id, caller.id)
    return {"message": f"Role '{body.role_name}' assigned to user {user_id}"}


@router.delete(
    "/users/{user_id}/roles/{role_name}",
    summary="Revoke a role from a user  [users:assign_roles]",
)
async def revoke_role(
    user_id: uuid.UUID,
    role_name: str,
    caller: User = Depends(require_permission("users", "assign_roles")),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a named role from a user.
    Requires **users:assign_roles**.
    """
    user_role = await _get_user_role_or_404(db, user_id, role_name)
    await db.delete(user_role)
    await db.commit()
    logger.info("ADMIN revoke role=%s user_id=%s by caller_id=%s", role_name, user_id, caller.id)
    return {"message": f"Role '{role_name}' revoked from user {user_id}"}


# ═══════════════════════════════════════════════════════════════════════════════
# DEVELOPERS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/developers",
    response_model=List[UserResponse],
    summary="List all developers  [users:read_any]",
)
async def list_developers(
    _: User = Depends(require_permission("users", "read_any")),
    db: AsyncSession = Depends(get_db),
):
    """Return every user who currently holds the developer role. Requires **users:read_any**."""
    result = await db.execute(
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role,     Role.id          == UserRole.role_id)
        .where(Role.name == "developer")
        .order_by(User.created_at)
    )
    return result.scalars().all()


@router.post(
    "/developers",
    status_code=status.HTTP_201_CREATED,
    summary="Promote a user to developer  [users:assign_roles]",
)
async def promote_to_developer(
    body: PromoteBody,
    caller: User = Depends(require_permission("users", "assign_roles")),
    db: AsyncSession = Depends(get_db),
):
    """
    Grant the developer role to an existing user by their user_id.
    Idempotent — promoting an already-developer user returns 201 without error.
    Requires **users:assign_roles**.
    """
    await _get_user_or_404(db, body.user_id)
    dev_role = await _get_role_or_404(db, "developer")

    existing = await db.execute(
        select(UserRole)
        .where(UserRole.user_id == body.user_id)
        .where(UserRole.role_id == dev_role.id)
    )
    if existing.scalar_one_or_none() is not None:
        return {"message": f"User {body.user_id} is already a developer"}

    db.add(UserRole(user_id=body.user_id, role_id=dev_role.id))
    await db.commit()
    logger.info("ADMIN promote developer user_id=%s by caller_id=%s", body.user_id, caller.id)
    return {"message": f"User {body.user_id} promoted to developer"}


@router.delete(
    "/developers/{user_id}",
    summary="Demote a developer back to user  [users:assign_roles]",
)
async def demote_developer(
    user_id: uuid.UUID,
    caller: User = Depends(require_permission("users", "assign_roles")),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove the developer role from a user.
    Self-demotion is blocked (returns 400) to prevent accidental lockout.
    Requires **users:assign_roles**.
    """
    if user_id == caller.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote yourself — ask another developer to do this",
        )
    user_role = await _get_user_role_or_404(db, user_id, "developer")
    await db.delete(user_role)
    await db.commit()
    logger.info("ADMIN demote developer user_id=%s by caller_id=%s", user_id, caller.id)
    return {"message": f"Developer role removed from user {user_id}"}


@router.patch(
    "/developers/{user_id}",
    response_model=UserResponse,
    summary="Edit a developer's profile  [users:write_any]",
)
async def update_developer(
    user_id: uuid.UUID,
    body: UserUpdate,
    caller: User = Depends(require_permission("users", "write_any")),
    db: AsyncSession = Depends(get_db),
):
    """
    Update profile fields for a developer account.
    Returns 404 if the user_id does not belong to a developer.
    Requires **users:write_any**.
    """
    # Confirm target holds the developer role
    await _get_user_role_or_404(db, user_id, "developer")

    target = await _get_user_or_404(db, user_id)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(target, field, value)
    await db.commit()
    await db.refresh(target)
    logger.info("ADMIN update developer user_id=%s fields=%s by caller_id=%s", user_id, list(updates), caller.id)
    return target
