from sqlalchemy import Column, ForeignKey, Table

from app.core.db_setup import Base

# Many-to-many join table: User <-> Tag
user_tags = Table(
    "user_tags",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
