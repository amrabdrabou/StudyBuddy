"""API router for CRUD operations on flashcard decks."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.flashcard_deck import FlashcardDeck
from app.models.user import User
from app.schemas.flashcard import FlashcardDeckCreate, FlashcardDeckResponse, FlashcardDeckUpdate

router = APIRouter(prefix="/flashcard-decks", tags=["flashcard-decks"])


async def _get_owned_deck(deck_id: UUID, user: User, db: AsyncSession) -> FlashcardDeck:
    result = await db.execute(
        select(FlashcardDeck).where(
            FlashcardDeck.id == deck_id, FlashcardDeck.user_id == user.id
        )
    )
    deck = result.scalar_one_or_none()
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard deck not found")
    return deck


@router.get("/", response_model=list[FlashcardDeckResponse])
async def list_decks(
    study_subject_id: UUID | None = None,
    session_id: UUID | None = None,
    is_archived: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(FlashcardDeck).where(
        FlashcardDeck.user_id == current_user.id,
        FlashcardDeck.is_archived == is_archived,
    )
    if study_subject_id:
        query = query.where(FlashcardDeck.study_subject_id == study_subject_id)
    if session_id:
        query = query.where(FlashcardDeck.session_id == session_id)
    result = await db.execute(query.order_by(FlashcardDeck.updated_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=FlashcardDeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(
    payload: FlashcardDeckCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    deck = FlashcardDeck(user_id=current_user.id, **payload.model_dump())
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.get("/{deck_id}", response_model=FlashcardDeckResponse)
async def get_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_deck(deck_id, current_user, db)


@router.patch("/{deck_id}", response_model=FlashcardDeckResponse)
async def update_deck(
    deck_id: UUID,
    payload: FlashcardDeckUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    deck = await _get_owned_deck(deck_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(deck, field, value)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    deck = await _get_owned_deck(deck_id, current_user, db)
    await db.delete(deck)
    await db.commit()
