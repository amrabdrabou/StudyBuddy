import { authFetch } from "./client";

export type BigGoalStatus =
  | "active"
  | "paused"
  | "overdue"
  | "ready_to_complete"
  | "completed"
  | "canceled";

export interface BigGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: BigGoalStatus;
  deadline: string | null;
  progress_pct: number;
  subject_ids: string[];
  created_at: string;
  updated_at: string;
}

export async function getBigGoals(): Promise<BigGoal[]> {
  const res = await authFetch("/big-goals/");
  return res.json();
}

export async function createBigGoal(data: {
  title: string;
  description?: string;
  deadline?: string;
  subject_ids: string[];
}): Promise<BigGoal> {
  const res = await authFetch("/big-goals/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBigGoal(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: BigGoalStatus;
    deadline?: string | null;
    subject_ids?: string[];
  }
): Promise<BigGoal> {
  const res = await authFetch(`/big-goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteBigGoal(id: string): Promise<void> {
  await authFetch(`/big-goals/${id}`, { method: "DELETE" });
}
