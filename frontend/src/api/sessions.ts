import { authFetch } from "./client";

export type SessionStatus = "pending" | "active" | "completed" | "abandoned";
export type IntentionType = "review" | "learn_new" | "practice" | "exam_prep" | "other";

export interface StudySession {
  id: string;
  user_id: string;
  study_subject_id: string | null;
  title: string | null;
  session_type: string;
  status: SessionStatus;
  intention_text: string | null;
  intention_type: IntentionType | null;
  started_at: string;
  actual_started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export async function getSessions(): Promise<StudySession[]> {
  const res = await authFetch("/sessions/");
  return res.json();
}

export async function createSession(data: {
  session_type: string;
  title?: string;
  study_subject_id?: string | null;
  intention_text?: string;
  intention_type?: IntentionType;
}): Promise<StudySession> {
  const res = await authFetch("/sessions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSession(
  id: string,
  data: {
    status?: SessionStatus;
    title?: string;
    actual_started_at?: string;
    ended_at?: string;
    duration_minutes?: number;
    is_completed?: boolean;
  }
): Promise<StudySession> {
  const res = await authFetch(`/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await authFetch(`/sessions/${id}`, { method: "DELETE" });
}

export async function getSessionsBySubject(subjectId: string): Promise<StudySession[]> {
  const res = await authFetch(`/subjects/${subjectId}/sessions/`);
  return res.json();
}
