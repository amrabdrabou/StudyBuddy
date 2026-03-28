"""
Idempotent RBAC seed — runs at every startup via the FastAPI lifespan.

What it does
------------
1. Creates default permissions (if they don't exist).
2. Creates default roles (if they don't exist).
3. Grants the defined permissions to the appropriate roles (if not already granted).

Extending the system
--------------------
To add a new role:
    INSERT INTO roles (id, name, description) VALUES (gen_random_uuid(), 'moderator', '...');

To add a new permission:
    INSERT INTO permissions (id, resource, action, description)
    VALUES (gen_random_uuid(), 'content', 'moderate', 'Moderate user-generated content');

To grant it to a role:
    INSERT INTO role_permissions (id, role_id, permission_id)
    SELECT gen_random_uuid(), r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'moderator' AND p.resource = 'content' AND p.action = 'moderate';

No code changes are required for any of the above.

Default permission matrix
-------------------------
Permission              developer   user
----------------------  ---------   ----
users:read_any          ✓
users:write_any         ✓
users:delete_any        ✓
users:assign_roles      ✓
content:read_any        ✓
content:delete_any      ✓
system:admin            ✓
system:view_stats       ✓

The "user" role has no elevated permissions.  All existing ownership checks
(user_id == current_user.id) in the routers continue to provide data isolation
for regular users without any additional permission grants.
"""
import logging
from typing import Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.user_role import UserRole

logger = logging.getLogger(__name__)

# ── Seed definitions ──────────────────────────────────────────────────────────

_ROLES: List[Tuple[str, str]] = [
    ("developer", "Full system access to all features and resources"),
    ("user",      "Read and write access to own data only"),
]

# (resource, action, human-readable description)
_PERMISSIONS: List[Tuple[str, str, str]] = [
    ("users",   "read_any",     "Read any user's profile and study data"),
    ("users",   "write_any",    "Update any user's profile, preferences, or active status"),
    ("users",   "delete_any",   "Permanently delete any user account and all associated data"),
    ("users",   "assign_roles", "Grant or revoke roles from any user account"),
    ("content", "read_any",     "Read study content (workspaces, docs, notes, …) owned by any user"),
    ("content", "delete_any",   "Delete study content owned by any user"),
    ("system",  "admin",        "Access system administration operations and configuration"),
    ("system",  "view_stats",   "View aggregated system-wide statistics"),
]

# Maps role name → list of permission codenames it should hold
_GRANTS: Dict[str, List[str]] = {
    "developer": [
        "users:read_any",
        "users:write_any",
        "users:delete_any",
        "users:assign_roles",
        "content:read_any",
        "content:delete_any",
        "system:admin",
        "system:view_stats",
    ],
    "user": [],  # Isolated via ownership checks — no elevated permissions needed
}


# ── Seeding logic ─────────────────────────────────────────────────────────────

async def seed_rbac(db: AsyncSession) -> None:
    """
    Idempotently insert default roles and permissions.
    Safe to call on every startup — existing rows are never duplicated or modified.
    """
    perm_map: Dict[str, Permission] = {}

    # 1. Ensure all permissions exist
    for resource, action, description in _PERMISSIONS:
        codename = f"{resource}:{action}"
        result = await db.execute(
            select(Permission)
            .where(Permission.resource == resource)
            .where(Permission.action == action)
        )
        perm = result.scalar_one_or_none()
        if perm is None:
            perm = Permission(resource=resource, action=action, description=description)
            db.add(perm)
            await db.flush()  # Populate perm.id before using it below
            logger.info("RBAC_SEED  created permission  %s", codename)
        perm_map[codename] = perm

    # 2. Ensure all roles exist
    role_map: Dict[str, Role] = {}
    for role_name, role_desc in _ROLES:
        result = await db.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(name=role_name, description=role_desc)
            db.add(role)
            await db.flush()
            logger.info("RBAC_SEED  created role        %s", role_name)
        role_map[role_name] = role

    # 3. Ensure role → permission grants exist
    for role_name, codenames in _GRANTS.items():
        role = role_map[role_name]
        for codename in codenames:
            perm = perm_map[codename]
            result = await db.execute(
                select(RolePermission)
                .where(RolePermission.role_id == role.id)
                .where(RolePermission.permission_id == perm.id)
            )
            if result.scalar_one_or_none() is None:
                db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                logger.info("RBAC_SEED  granted  %-12s → %s", role_name, codename)

    await db.commit()

    # 4. Bootstrap developer role for pre-existing accounts listed in DEVELOPER_EMAILS.
    #    This handles users who registered before the RBAC system was introduced.
    settings = get_settings()
    developer_emails = {e.strip().lower() for e in settings.developer_emails.split(",") if e.strip()}
    if developer_emails:
        dev_role = role_map["developer"]
        for email in developer_emails:
            user_result = await db.execute(select(User).where(User.email == email))
            user = user_result.scalar_one_or_none()
            if user is None:
                continue
            existing = await db.execute(
                select(UserRole)
                .where(UserRole.user_id == user.id)
                .where(UserRole.role_id == dev_role.id)
            )
            if existing.scalar_one_or_none() is None:
                db.add(UserRole(user_id=user.id, role_id=dev_role.id))
                logger.info("RBAC_SEED  bootstrapped developer role → %s", email)
        await db.commit()

    logger.info("RBAC_SEED  complete")
