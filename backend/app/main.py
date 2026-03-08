from fastapi import FastAPI, Depends
from sqlalchemy import text
from contextlib import asynccontextmanager
from app.core.db_setup import engine, Base
from app.api.v1.routers.auth.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))
    print("Database connected")
        
    yield
    await engine.dispose()
    print("Database connection closed")
    
app = FastAPI(
    lifespan=lifespan,
    title="Study Buddy",
    description="AI-Powered Study Assistant",
    version="1.0.0",
)

app.include_router(auth_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API!"}