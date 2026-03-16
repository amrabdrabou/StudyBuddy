import { authFetch } from "./client";

export interface FlashcardDeck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  color_hex: string | null;
  icon: string | null;
  is_public: boolean;
  is_archived: boolean;
  study_subject_id: string | null;
  total_flashcards: number;
  mastered_flashcards: number;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  hint: string | null;
  explanation: string | null;
  difficulty: number | null;
  card_order: number | null;
  interval_days: number | null;
  repetitions: number | null;
  next_review_date: string | null;
  last_reviewed_at: string | null;
  total_reviews: number;
  successful_reviews: number;
  is_mastered: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// ── Decks ──────────────────────────────────────────────────────────────────────

export async function getDecks(params?: { study_subject_id?: string; is_archived?: boolean }): Promise<FlashcardDeck[]> {
  const q = new URLSearchParams();
  if (params?.study_subject_id) q.set("study_subject_id", params.study_subject_id);
  if (params?.is_archived !== undefined) q.set("is_archived", String(params.is_archived));
  const res = await authFetch(`/flashcard-decks/?${q}`);
  return res.json();
}

export async function createDeck(data: {
  title: string;
  description?: string;
  color_hex?: string;
  study_subject_id?: string | null;
}): Promise<FlashcardDeck> {
  const res = await authFetch("/flashcard-decks/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDeck(id: string, data: Partial<{
  title: string;
  description: string | null;
  color_hex: string | null;
  is_archived: boolean;
}>): Promise<FlashcardDeck> {
  const res = await authFetch(`/flashcard-decks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDeck(id: string): Promise<void> {
  await authFetch(`/flashcard-decks/${id}`, { method: "DELETE" });
}

// ── Cards ──────────────────────────────────────────────────────────────────────

export async function getCards(deck_id: string): Promise<Flashcard[]> {
  const res = await authFetch(`/flashcards/?deck_id=${deck_id}`);
  return res.json();
}

export async function createCard(data: {
  deck_id: string;
  front_content: string;
  back_content: string;
  hint?: string;
  explanation?: string;
  difficulty?: number;
}): Promise<Flashcard> {
  const res = await authFetch("/flashcards/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCard(id: string, data: Partial<{
  front_content: string;
  back_content: string;
  hint: string | null;
  is_mastered: boolean;
}>): Promise<Flashcard> {
  const res = await authFetch(`/flashcards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCard(id: string): Promise<void> {
  await authFetch(`/flashcards/${id}`, { method: "DELETE" });
}
