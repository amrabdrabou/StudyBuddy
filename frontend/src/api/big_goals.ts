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
  cover_color: string;
  icon: string | null;
  pinned: boolean;
  archived: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectSummary {
  id: string;
  name: string;
  color_hex: string | null;
  icon: string | null;
  workspace_count: number;
}

export interface BigGoalDetail extends BigGoal {
  subjects_detail: SubjectSummary[];
  workspace_count: number;
  document_count: number;
  note_count: number;
}

export async function getBigGoals(params?: { archived?: boolean }): Promise<BigGoal[]> {
  const q = new URLSearchParams();
  if (params?.archived !== undefined) q.set("archived", String(params.archived));
  const res = await authFetch(`/big-goals/${q.size ? `?${q}` : ""}`);
  return res.json();
}

export async function getBigGoalDetail(id: string): Promise<BigGoalDetail> {
  const res = await authFetch(`/big-goals/${id}/detail`);
  return res.json();
}

export async function createBigGoal(data: {
  title: string;
  description?: string;
  deadline?: string;
  subject_ids: string[];
  cover_color?: string;
  icon?: string;
  pinned?: boolean;
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
    cover_color?: string;
    icon?: string | null;
    pinned?: boolean;
    archived?: boolean;
    display_order?: number;
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
