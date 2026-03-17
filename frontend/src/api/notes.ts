import { authFetch } from "./client";

export interface Note {
  id: string;
  user_id: string;
  subject_id: string;
  workspace_id: string | null;
  session_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getNotes(filters?: {
  subject_id?: string;
  workspace_id?: string;
  session_id?: string;
}): Promise<Note[]> {
  const q = new URLSearchParams();
  if (filters?.subject_id) q.set("subject_id", filters.subject_id);
  if (filters?.workspace_id) q.set("workspace_id", filters.workspace_id);
  if (filters?.session_id) q.set("session_id", filters.session_id);
  const res = await authFetch(`/notes/${q.size ? `?${q}` : ""}`);
  return res.json();
}

export async function createNote(data: {
  subject_id: string;
  workspace_id?: string;
  session_id?: string;
  title?: string;
  content: string;
}): Promise<Note> {
  const res = await authFetch("/notes/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateNote(
  id: string,
  data: { title?: string; content?: string }
): Promise<Note> {
  const res = await authFetch(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  await authFetch(`/notes/${id}`, { method: "DELETE" });
}
