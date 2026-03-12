from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

import uuid

import app.models  # noqa: F401 — registers all models in metadata before create_all
from app.core.db_setup import Base, AsyncSessionLocal, engine
from app.models.user import User
from app.api.v1.routers.notes import router as notes_router

# Fixed UUID used as a placeholder owner until auth is wired up
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))
    print("Database connected")

    # Seed a dev user so notes have a valid owner FK
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.id == DEV_USER_ID))
        if result.scalar_one_or_none() is None:
            session.add(User(
                id=DEV_USER_ID,
                email="dev@studybuddy.local",
                username="dev",
                auth_provider="local",
            ))
            await session.commit()
            print("Dev user seeded")

    yield

    await engine.dispose()
    print("Database connection closed")


app = FastAPI(
    lifespan=lifespan,
    title="Study Buddy",
    description="AI-Powered Study Assistant",
    version="1.0.0",
)

app.include_router(notes_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API!"}
