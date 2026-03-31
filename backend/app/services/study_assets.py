"""Persistence helpers for generated study assets.

These helpers centralize the DB write path for AI-created flashcard decks and quiz sets
so manual endpoints and background pipeline tasks stay consistent.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flashcard import Flashcard
from app.models.flashcard_deck import FlashcardDeck
from app.models.quiz_option import QuizOption
from app.models.quiz_question import QuizQuestion
from app.models.quiz_set import QuizSet


async def create_flashcard_deck(
    *,
    workspace_id: uuid.UUID,
    title: str,
    cards_data: list[dict[str, Any]],
    db: AsyncSession,
) -> FlashcardDeck:
    """Create a flashcard deck and its cards, then flush for generated IDs."""
    deck = FlashcardDeck(workspace_id=workspace_id, title=title)
    db.add(deck)
    await db.flush()

    for i, card in enumerate(cards_data):
        db.add(
            Flashcard(
                deck_id=deck.id,
                front_content=card["front"],
                back_content=card["back"],
                hint=card.get("hint"),
                order_index=i,
            )
        )

    await db.flush()
    return deck


async def create_quiz_set(
    *,
    workspace_id: uuid.UUID,
    created_by_user_id: uuid.UUID | None,
    title: str,
    questions_data: list[dict[str, Any]],
    db: AsyncSession,
) -> QuizSet:
    """Create a quiz set, its questions, and options, then flush for generated IDs."""
    quiz_set = QuizSet(
        workspace_id=workspace_id,
        created_by_user_id=created_by_user_id,
        title=title,
    )
    db.add(quiz_set)
    await db.flush()

    for q in questions_data:
        question = QuizQuestion(
            quiz_set_id=quiz_set.id,
            question_text=q["question_text"],
            question_type=q["question_type"],
            correct_answer=q["correct_answer"],
            explanation=q["explanation"],
            difficulty=q["difficulty"],
            order_index=q["order_index"],
            ai_generated=bool(q.get("ai_generated", True)),
        )
        db.add(question)
        await db.flush()

        for opt in q["options"]:
            db.add(
                QuizOption(
                    question_id=question.id,
                    option_text=opt["text"],
                    is_correct=opt["is_correct"],
                    order_index=opt["order_index"],
                )
            )

    await db.flush()
    return quiz_set
