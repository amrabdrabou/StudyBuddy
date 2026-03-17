"""Flashcard decks and cards router — nested under workspaces."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import apply_updates, get_workspace
from app.core.db_setup import get_db
from app.models.flashcard import Flashcard
from app.models.flashcard_deck import FlashcardDeck
from app.models.workspace import Workspace
from app.schemas.flashcard import (
    FlashcardCreate, FlashcardDeckCreate, FlashcardDeckResponse,
    FlashcardDeckUpdate, FlashcardResponse, FlashcardUpdate,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/flashcard-decks", tags=["flashcards"])


async def _get_deck_or_404(
    deck_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession
) -> FlashcardDeck:
    result = await db.execute(
        select(FlashcardDeck).where(
            FlashcardDeck.id == deck_id, FlashcardDeck.workspace_id == workspace_id
        )
    )
    deck = result.scalar_one_or_none()
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


async def _get_card_or_404(
    card_id: uuid.UUID, deck_id: uuid.UUID, db: AsyncSession
) -> Flashcard:
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.deck_id == deck_id)
    )
    card = result.scalar_one_or_none()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    return card


# ── Decks ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[FlashcardDeckResponse])
async def list_decks(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(FlashcardDeck)
        .where(FlashcardDeck.workspace_id == workspace_id)
        .order_by(FlashcardDeck.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=FlashcardDeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(
    workspace_id: uuid.UUID,
    body: FlashcardDeckCreate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    deck = FlashcardDeck(workspace_id=workspace_id, **body.model_dump())
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.get("/{deck_id}", response_model=FlashcardDeckResponse)
async def get_deck(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    return await _get_deck_or_404(deck_id, workspace_id, db)


@router.patch("/{deck_id}", response_model=FlashcardDeckResponse)
async def update_deck(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    body: FlashcardDeckUpdate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    deck = await _get_deck_or_404(deck_id, workspace_id, db)
    apply_updates(deck, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    deck = await _get_deck_or_404(deck_id, workspace_id, db)
    await db.delete(deck)
    await db.commit()


# ── Cards ─────────────────────────────────────────────────────────────────────

@router.get("/{deck_id}/cards", response_model=list[FlashcardResponse])
async def list_cards(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_deck_or_404(deck_id, workspace_id, db)
    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id)
        .order_by(Flashcard.order_index, Flashcard.created_at)
    )
    return result.scalars().all()


@router.post("/{deck_id}/cards", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_card(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    body: FlashcardCreate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_deck_or_404(deck_id, workspace_id, db)
    card = Flashcard(deck_id=deck_id, **body.model_dump())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.patch("/{deck_id}/cards/{card_id}", response_model=FlashcardResponse)
async def update_card(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    card_id: uuid.UUID,
    body: FlashcardUpdate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_deck_or_404(deck_id, workspace_id, db)
    card = await _get_card_or_404(card_id, deck_id, db)
    apply_updates(card, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/{deck_id}/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    workspace_id: uuid.UUID,
    deck_id: uuid.UUID,
    card_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    await _get_deck_or_404(deck_id, workspace_id, db)
    card = await _get_card_or_404(card_id, deck_id, db)
    await db.delete(card)
    await db.commit()
