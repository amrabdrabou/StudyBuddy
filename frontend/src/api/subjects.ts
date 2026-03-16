import { authFetch } from "./client";

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  color_hex: string | null;
  icon: string | null;
  is_archived: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  session_count: number;
  note_count: number;
  document_count: number;
}

export async function getSubjects(): Promise<Subject[]> {
  const res = await authFetch("/subjects/");
  return res.json();
}

export async function createSubject(name: string): Promise<Subject> {
  const res = await authFetch("/subjects/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function updateSubject(id: string, name: string): Promise<Subject> {
  const res = await authFetch(`/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteSubject(id: string): Promise<void> {
  await authFetch(`/subjects/${id}`, { method: "DELETE" });
}
