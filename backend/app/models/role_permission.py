"""Junction table: Role ↔ Permission (many-to-many)."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.permission import Permission


class RolePermission(Base):
    """
    Grants a Permission to a Role.

    One role can have many permissions; one permission can belong to many roles.
    Adding a grant = inserting a row; revoking = deleting a row.
    No code changes required to change the permission matrix.
    """

    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Navigate from role_permission → role (used rarely — prefer JOINs)
    role: Mapped["Role"] = relationship(
        "Role", back_populates="role_permissions", lazy="noload"
    )
    # Eager-load the permission so Role.permissions works without extra queries
    permission: Mapped["Permission"] = relationship(
        "Permission", back_populates="role_permissions", lazy="selectin"
    )
