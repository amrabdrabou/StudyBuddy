import { authFetch } from "./client";

export type MicroGoalStatus = "suggested" | "pending" | "in_progress" | "completed" | "skipped";

export interface MicroGoal {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: MicroGoalStatus;
  deadline: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function getMicroGoals(workspaceId: string, status_filter?: string): Promise<MicroGoal[]> {
  const q = status_filter ? `?status_filter=${status_filter}` : "";
  const res = await authFetch(`/workspaces/${workspaceId}/micro-goals/${q}`);
  return res.json();
}

export async function createMicroGoal(
  workspaceId: string,
  data: { title: string; description?: string; deadline?: string; order_index?: number }
): Promise<MicroGoal> {
  const res = await authFetch(`/workspaces/${workspaceId}/micro-goals/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMicroGoal(
  workspaceId: string,
  microGoalId: string,
  data: { title?: string; description?: string; status?: MicroGoalStatus; deadline?: string | null; order_index?: number }
): Promise<MicroGoal> {
  const res = await authFetch(`/workspaces/${workspaceId}/micro-goals/${microGoalId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMicroGoal(workspaceId: string, microGoalId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/micro-goals/${microGoalId}`, { method: "DELETE" });
}
