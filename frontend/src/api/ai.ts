import { authFetch } from "./client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "normal" | "hard";

export interface SummarizeResponse {
  document_id: string;
  filename: string;
  summary: string;
}

export interface GenerateFlashcardsResponse {
  deck_id: string;
  deck_title: string;
  difficulty: string;
  cards_created: number;
}

export interface GenerateQuizResponse {
  quiz_set_id: string;
  quiz_title: string;
  difficulty: string;
  questions_created: number;
}

export interface GenerateRoadmapResponse {
  goals_created: number;
}

export interface SuggestSessionResponse {
  title: string;
  focus_summary: string;
  suggested_goal_ids: string[];
  tips: string[];
}

// ── API calls ──────────────────────────────────────────────────────────────────

export async function aiSummarize(
  workspaceId: string,
  documentId: string
): Promise<SummarizeResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/summarize`, {
    method: "POST",
    body: JSON.stringify({ document_id: documentId }),
  });
  return res.json();
}

export async function aiGenerateFlashcards(
  workspaceId: string,
  opts: { summary: string; difficulty: Difficulty; deck_title?: string; count?: number }
): Promise<GenerateFlashcardsResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/generate-flashcards`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return res.json();
}

export async function aiGenerateQuiz(
  workspaceId: string,
  opts: { summary: string; difficulty: Difficulty; quiz_title?: string; count?: number }
): Promise<GenerateQuizResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/generate-quiz`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return res.json();
}

export async function aiGenerateRoadmap(
  workspaceId: string,
  opts?: { document_ids?: string[]; count?: number }
): Promise<GenerateRoadmapResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/generate-roadmap`, {
    method: "POST",
    body: JSON.stringify({
      document_ids: opts?.document_ids ?? [],
      count: opts?.count ?? 8,
    }),
  });
  return res.json();
}

export async function aiSuggestSession(
  workspaceId: string,
  opts: { available_minutes?: number }
): Promise<SuggestSessionResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/suggest-session`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return res.json();
}

export interface GenerateStudySessionRequest {
  summary?: string;
  goal_context?: string;
  mode: "auto" | "manual";
  flashcard_difficulty?: Difficulty;
  flashcard_count?: number;
  quiz_difficulty?: Difficulty;
  quiz_count?: number;
  session_duration_minutes?: number;
}

export interface GenerateStudySessionResponse {
  session_id: string;
  session_title: string;
  duration_minutes: number;
  focus_summary: string;
  tips: string[];
  flashcard_deck_id: string;
  flashcard_deck_title: string;
  cards_created: number;
  flashcard_difficulty: string;
  quiz_set_id: string;
  quiz_title: string;
  questions_created: number;
  quiz_difficulty: string;
  goals_created: number;
}

export async function aiGenerateStudySession(
  workspaceId: string,
  opts: GenerateStudySessionRequest
): Promise<GenerateStudySessionResponse> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai/generate-study-session`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return res.json();
}
