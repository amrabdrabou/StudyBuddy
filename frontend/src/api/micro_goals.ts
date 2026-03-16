import { authFetch } from "./client";

export type MicroGoalStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface MicroGoal {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  order_index: number;
  status: MicroGoalStatus;
  source: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getMicroGoals(sessionId: string): Promise<MicroGoal[]> {
  const res = await authFetch(`/sessions/${sessionId}/micro-goals/`);
  return res.json();
}

export async function createMicroGoal(sessionId: string, data: {
  title: string;
  description?: string;
  estimated_minutes?: number;
  order_index?: number;
}): Promise<MicroGoal> {
  const res = await authFetch(`/sessions/${sessionId}/micro-goals/`, {
    method: "POST",
    body: JSON.stringify({ ...data, session_id: sessionId }),
  });
  return res.json();
}

export async function updateMicroGoal(sessionId: string, goalId: string, data: {
  status?: MicroGoalStatus;
  title?: string;
  description?: string;
  estimated_minutes?: number;
}): Promise<MicroGoal> {
  const res = await authFetch(`/sessions/${sessionId}/micro-goals/${goalId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMicroGoal(sessionId: string, goalId: string): Promise<void> {
  await authFetch(`/sessions/${sessionId}/micro-goals/${goalId}`, { method: "DELETE" });
}
