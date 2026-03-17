import { authFetch } from "./client";

export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface Session {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string | null;
  status: SessionStatus;
  planned_duration_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  mood_rating: number | null;
  productivity_rating: number | null;
  notes_text: string | null;
  micro_goal_ids: string[];
  created_at: string;
  updated_at: string;
}

export async function getSessions(workspaceId: string): Promise<Session[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/sessions/`);
  return res.json();
}

export async function createSession(
  workspaceId: string,
  data: { title?: string; planned_duration_minutes?: number; micro_goal_ids?: string[] }
): Promise<Session> {
  const res = await authFetch(`/workspaces/${workspaceId}/sessions/`, {
    method: "POST",
    body: JSON.stringify({ micro_goal_ids: [], ...data }),
  });
  return res.json();
}

export async function updateSession(
  workspaceId: string,
  sessionId: string,
  data: {
    title?: string;
    status?: SessionStatus;
    planned_duration_minutes?: number;
    ended_at?: string | null;
    mood_rating?: number | null;
    productivity_rating?: number | null;
    notes_text?: string | null;
    micro_goal_ids?: string[];
  }
): Promise<Session> {
  const res = await authFetch(`/workspaces/${workspaceId}/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSession(workspaceId: string, sessionId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/sessions/${sessionId}`, { method: "DELETE" });
}
