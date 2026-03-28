"""Junction table: User ↔ Role (many-to-many)."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.role import Role


class UserRole(Base):
    """
    Assigns a Role to a User.

    A user can hold multiple roles simultaneously.
    Role assignment is additive — access is the union of all role permissions.
    """

    __tablename__ = "user_roles"
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="user_roles", lazy="noload"
    )
    # Eager-load the role (with its permissions via role.role_permissions selectin)
    role: Mapped["Role"] = relationship(
        "Role", back_populates="user_roles", lazy="selectin"
    )
