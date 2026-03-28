"""Pydantic schemas for RBAC: roles, permissions, and assignment operations."""
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PermissionSchema(BaseModel):
    """Read schema for a single permission."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    resource: str
    action: str
    description: Optional[str] = None
    codename: str  # "resource:action" — computed by the ORM property


class RoleSchema(BaseModel):
    """Read schema for a role, including all permissions it grants."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    permissions: List[PermissionSchema] = []


class UserRoleAssign(BaseModel):
    """Request body for assigning a named role to a user."""

    role_name: str


class UserPermissionsResponse(BaseModel):
    """
    Response showing the caller's assigned roles and their effective permissions.

    Roles is the list of role names the user holds.
    Permissions is the union of all permission codenames across all held roles.
    """

    user_id: uuid.UUID
    roles: List[str]
    permissions: List[str]
