"""SQLAlchemy ORM model for RBAC permissions."""
from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.role_permission import RolePermission


class Permission(Base):
    """
    A single permission expressed as resource + action (e.g. "users", "read_any").

    The codename property returns "resource:action" for compact comparison.
    New permissions can be added via DB inserts without any code changes.
    """

    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("resource", "action", name="uq_permission_resource_action"),
    )

    resource: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    role_permissions: Mapped[List["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    @property
    def codename(self) -> str:
        """Short identifier used in code: "resource:action"."""
        return f"{self.resource}:{self.action}"

    def __repr__(self) -> str:
        return f"<Permission {self.codename}>"
