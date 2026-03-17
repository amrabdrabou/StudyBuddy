import { authFetch } from "./client";

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color_hex: string | null;
  icon: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export async function getSubjects(include_archived = false): Promise<Subject[]> {
  const res = await authFetch(`/subjects/?include_archived=${include_archived}`);
  return res.json();
}

export async function createSubject(data: { name: string; color_hex?: string; icon?: string }): Promise<Subject> {
  const res = await authFetch("/subjects/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSubject(
  id: string,
  data: { name?: string; color_hex?: string; icon?: string; is_archived?: boolean }
): Promise<Subject> {
  const res = await authFetch(`/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSubject(id: string): Promise<void> {
  await authFetch(`/subjects/${id}`, { method: "DELETE" });
}
