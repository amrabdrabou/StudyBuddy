import { authFetch } from "./client";

export type WorkspaceStatus = "active" | "paused" | "completed" | "canceled";

export interface Workspace {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  status: WorkspaceStatus;
  progress_pct: number;
  created_at: string;
  updated_at: string;
  document_count: number;
  flashcard_deck_count: number;
  quiz_set_count: number;
  session_count: number;
  note_count: number;
}

export async function getWorkspaces(params?: { subject_id?: string; status?: WorkspaceStatus }): Promise<Workspace[]> {
  const q = new URLSearchParams();
  if (params?.subject_id) q.set("subject_id", params.subject_id);
  if (params?.status) q.set("status", params.status);
  const res = await authFetch(`/workspaces/${q.size ? `?${q}` : ""}`);
  return res.json();
}

export async function createWorkspace(data: { subject_id: string; title: string }): Promise<Workspace> {
  const res = await authFetch("/workspaces/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateWorkspace(
  id: string,
  data: { title?: string; status?: WorkspaceStatus }
): Promise<Workspace> {
  const res = await authFetch(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
  await authFetch(`/workspaces/${id}`, { method: "DELETE" });
}
