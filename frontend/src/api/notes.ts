const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

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

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res;
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
