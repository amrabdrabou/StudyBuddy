"""
Wipe the entire database schema and recreate all tables from the current ORM models.

Usage (from the backend/ directory):
    python reset_db.py

WARNING: This destroys all data. Dev only.
"""
import asyncio
import sys

from sqlalchemy import text

import app.models  # noqa: F401 — registers all ORM models
from app.core.config import get_settings
from app.core.db_setup import Base, engine


async def reset() -> None:
    settings = get_settings()

    if settings.environment != "dev":
        print("ERROR: reset_db.py refuses to run outside dev environment.")
        sys.exit(1)

    async with engine.begin() as conn:
        print("Dropping schema...")
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        print("Recreating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))

    await engine.dispose()
    print("Done. Database reset to new schema.")


if __name__ == "__main__":
    asyncio.run(reset())
