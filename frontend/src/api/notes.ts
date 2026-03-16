import { authFetch } from "./client";

export interface Note {
  id: string;
  user_id: string;
  study_subject_id: string | null;
  title: string;
  content: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function getNotes(): Promise<Note[]> {
  const res = await authFetch("/notes/");
  return res.json();
}

export async function createNote(data: {
  title: string;
  content?: string;
  study_subject_id?: string | null;
}): Promise<Note> {
  const res = await authFetch("/notes/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateNote(
  id: string,
  data: { title?: string; content?: string; study_subject_id?: string | null }
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
