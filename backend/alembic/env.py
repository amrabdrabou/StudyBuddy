"""Alembic migration environment — async SQLAlchemy / asyncpg edition.

The database URL is injected at runtime from app.core.config so it never
lives in alembic.ini (which is checked into source control).

Usage:
  # Apply all pending migrations
  cd backend && alembic upgrade head

  # Create a new auto-generated migration
  cd backend && alembic revision --autogenerate -m "description"

  # Stamp an existing database at the baseline without running migrations
  cd backend && alembic stamp 0001
"""
from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Alembic Config object — gives access to alembic.ini values
config = context.config

# Configure Python logging from alembic.ini if a config file is present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Register all ORM models so that autogenerate can detect schema differences
import app.models  # noqa: F401
from app.core.db_setup import Base
from app.core.config import get_settings

target_metadata = Base.metadata


def _get_url() -> str:
    return get_settings().database_url


# ── Offline mode (generates SQL without connecting) ───────────────────────────

def run_migrations_offline() -> None:
    """Generate SQL script without a live DB connection."""
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connects to the database and applies migrations) ─────────────

def _do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations() -> None:
    """Create an async engine and run migrations synchronously via run_sync."""
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = _get_url()

    connectable = async_engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations — runs the async driver synchronously."""
    asyncio.run(_run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
