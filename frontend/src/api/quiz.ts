import { authFetch } from "./client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QuizSet {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;   // backend: QuizOptionResponse.option_text
  is_correct: boolean;
  order_index: number;
}

export interface QuizQuestion {
  id: string;
  quiz_set_id: string;
  question_text: string;
  question_type: string;
  correct_answer: string | null;
  explanation: string | null;
  difficulty: string;
  order_index: number;
  ai_generated: boolean;
  options: QuizOption[];
  created_at: string;
}

export type AttemptStatus = "in_progress" | "completed" | "abandoned" | "timed_out";

export interface QuizAttempt {
  id: string;
  quiz_set_id: string;
  user_id: string;
  status: AttemptStatus;
  score_pct: number | null;
  time_limit_minutes: number | null;
  started_at: string;
  ended_at: string | null;   // backend: QuizAttemptResponse.ended_at
  created_at: string;
  updated_at: string;
}

export interface QuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  free_text_answer: string | null;
  is_correct: boolean | null;
  answered_at: string;
}

// ── Quiz Sets ──────────────────────────────────────────────────────────────────

export async function getQuizSets(workspaceId: string): Promise<QuizSet[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/`);
  return res.json();
}

export async function createQuizSet(
  workspaceId: string,
  data: { title: string; description?: string; time_limit_minutes?: number }
): Promise<QuizSet> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateQuizSet(
  workspaceId: string,
  quizSetId: string,
  data: { title?: string; description?: string; time_limit_minutes?: number | null }
): Promise<QuizSet> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/${quizSetId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteQuizSet(workspaceId: string, quizSetId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/quiz-sets/${quizSetId}`, { method: "DELETE" });
}

// ── Questions ──────────────────────────────────────────────────────────────────

export async function getQuestions(workspaceId: string, quizSetId: string): Promise<QuizQuestion[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/${quizSetId}/questions`);
  return res.json();
}

// ── Attempts ───────────────────────────────────────────────────────────────────

export async function getAttempts(workspaceId: string, quizSetId: string): Promise<QuizAttempt[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/${quizSetId}/attempts`);
  return res.json();
}

export async function startAttempt(
  workspaceId: string,
  quizSetId: string,
  data: { time_limit_minutes?: number }
): Promise<QuizAttempt> {
  const res = await authFetch(`/workspaces/${workspaceId}/quiz-sets/${quizSetId}/attempts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateAttempt(
  workspaceId: string,
  quizSetId: string,
  attemptId: string,
  data: { status?: AttemptStatus; score_pct?: number; ended_at?: string }  // ended_at, not completed_at
): Promise<QuizAttempt> {
  const res = await authFetch(
    `/workspaces/${workspaceId}/quiz-sets/${quizSetId}/attempts/${attemptId}`,
    { method: "PATCH", body: JSON.stringify(data) }
  );
  return res.json();
}

// ── Attempt Answers ────────────────────────────────────────────────────────────

export async function submitAnswer(
  workspaceId: string,
  quizSetId: string,
  attemptId: string,
  data: { question_id: string; selected_option_id?: string; free_text_answer?: string }
): Promise<QuizAttemptAnswer> {
  const res = await authFetch(
    `/workspaces/${workspaceId}/quiz-sets/${quizSetId}/attempts/${attemptId}/answers`,
    { method: "POST", body: JSON.stringify(data) }
  );
  return res.json();
}
