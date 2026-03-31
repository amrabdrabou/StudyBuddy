import { authFetch } from "./client";

export interface FlashcardDeck {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  color_hex: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  hint: string | null;
  order_index: number;
  interval_days: number | null;
  repetitions: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  is_mastered: boolean;
  created_at: string;
  updated_at: string;
}

// ── Decks ─────────────────────────────────────────────────────────────────────

export async function getDecks(workspaceId: string): Promise<FlashcardDeck[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/`);
  return res.json();
}

export async function createDeck(
  workspaceId: string,
  data: { title: string; description?: string; color_hex?: string; icon?: string }
): Promise<FlashcardDeck> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDeck(
  workspaceId: string,
  deckId: string,
  data: { title?: string; description?: string; color_hex?: string; icon?: string }
): Promise<FlashcardDeck> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDeck(workspaceId: string, deckId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}`, { method: "DELETE" });
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export async function getCards(workspaceId: string, deckId: string): Promise<Flashcard[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}/cards`);
  return res.json();
}

export async function createCard(
  workspaceId: string,
  deckId: string,
  data: { front_content: string; back_content: string; hint?: string; order_index?: number }
): Promise<Flashcard> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}/cards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCard(
  workspaceId: string,
  deckId: string,
  cardId: string,
  data: { front_content?: string; back_content?: string; hint?: string; order_index?: number; is_mastered?: boolean }
): Promise<Flashcard> {
  const res = await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}/cards/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCard(workspaceId: string, deckId: string, cardId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/flashcard-decks/${deckId}/cards/${cardId}`, { method: "DELETE" });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function submitReview(data: {
  flashcard_id: string;
  session_id?: string;
  quality_rating: number;
  next_review_at: string;
}): Promise<void> {
  await authFetch("/flashcard-reviews/", { method: "POST", body: JSON.stringify(data) });
}
