"""SQLAlchemy ORM model for RBAC roles."""
from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.role_permission import RolePermission
    from app.models.user_role import UserRole
    from app.models.permission import Permission


class Role(Base):
    """
    A named role that can be assigned to one or more users.

    Roles are purely DB-defined — new roles can be inserted without code changes.
    The permissions a role grants are stored in the role_permissions junction.
    """

    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Eager-load permissions so a loaded Role carries its full permission set.
    role_permissions: Mapped[List["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    @property
    def permissions(self) -> List["Permission"]:
        """Convenience accessor — relies on role_permissions being loaded."""
        return [rp.permission for rp in self.role_permissions]

    def __repr__(self) -> str:
        return f"<Role {self.name}>"
