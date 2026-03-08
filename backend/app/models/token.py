from datetime import datetime, timezone
from sqlalchemy import ForeignKey

from backend.app.core.db_setup import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.user import User

class Token(Base):
    __tablename__ = "tokens"

    created: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    token: Mapped[str] = mapped_column(unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship(back_populates="tokens")