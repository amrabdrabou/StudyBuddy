const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

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
