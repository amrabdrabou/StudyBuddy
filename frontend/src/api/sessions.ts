const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

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

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res;
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
