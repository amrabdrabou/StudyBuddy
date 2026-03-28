"""
RBAC service — permission loading and enforcement.

Design principles:
- All permission data lives exclusively in the database (roles, permissions,
  role_permissions, user_roles tables).
- No permissions are hardcoded in business logic anywhere.
- `require_permission(resource, action)` returns a reusable FastAPI dependency
  that enforces a DB-backed permission check before the route handler runs.
- New roles and permissions can be introduced via DB inserts with zero code changes.
- Permission checks are per-request; no in-process caching avoids stale data.

Usage in a route:
    @router.get("/admin/users")
    async def list_users(
        # Only users with the "users:read_any" permission may call this.
        caller: User = Depends(require_permission("users", "read_any")),
        db: AsyncSession = Depends(get_db),
    ):
        ...
"""
import logging
import uuid
from typing import Set

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_setup import get_db
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.user_role import UserRole

logger = logging.getLogger(__name__)


# ── Core query helpers ────────────────────────────────────────────────────────

async def get_user_permissions(db: AsyncSession, user_id: uuid.UUID) -> Set[str]:
    """
    Return the set of permission codenames ("resource:action") held by a user.

    Permissions are resolved through the full join chain:
        user_roles → role_permissions → permissions

    An empty set means the user has no elevated permissions (standard User role).
    """
    result = await db.execute(
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
    )
    return {p.codename for p in result.scalars().all()}


async def check_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource: str,
    action: str,
) -> bool:
    """
    Return True if the user holds the specified permission, False otherwise.

    More efficient than `get_user_permissions` when checking a single permission
    because the DB can short-circuit after finding the first matching row.
    """
    result = await db.execute(
        select(Permission.id)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
        .where(Permission.resource == resource)
        .where(Permission.action == action)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


# ── FastAPI dependency factory ────────────────────────────────────────────────

def require_permission(resource: str, action: str):
    """
    Return a FastAPI dependency that:
      1. Authenticates the caller via the standard Bearer token flow.
      2. Queries the DB for the caller's permissions.
      3. Returns the User on success.
      4. Raises HTTP 403 Forbidden if the permission is not held.

    Example — route only accessible to the developer role:

        @router.delete("/admin/users/{user_id}")
        async def delete_user(
            user_id: uuid.UUID,
            caller: User = Depends(require_permission("users", "delete_any")),
            db: AsyncSession = Depends(get_db),
        ):
            ...

    Adding a new protected route requires no schema or role changes — just
    insert the permission into the DB and reference it here.
    """
    # Import here to avoid a circular import at module load time
    # (rbac → dependencies → models → db_setup — all fine; the circular risk
    #  only exists if dependencies imports rbac, which it does not).
    from app.api.v1.dependencies import get_current_active_user

    async def _enforce(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has_perm = await check_permission(db, current_user.id, resource, action)
        if not has_perm:
            logger.warning(
                "PERMISSION_DENIED user_id=%s resource=%s action=%s",
                current_user.id,
                resource,
                action,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{resource}:{action}'",
            )
        return current_user

    # Name the inner function after the permission so FastAPI's dependency graph
    # treats each permission check as a distinct node (prevents de-duplication bugs).
    _enforce.__name__ = f"require_{resource}_{action}"
    return _enforce
