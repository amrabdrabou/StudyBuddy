import { authFetch } from "./client";
import { getToken } from "./auth";
import { BASE_URL } from "./client";

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export interface Document {
  id: string;
  workspace_id: string;
  uploaded_by_user_id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDocuments(workspaceId: string): Promise<Document[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/documents/`);
  return res.json();
}

export async function uploadDocument(workspaceId: string, file: File): Promise<Document> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/workspaces/${workspaceId}/documents/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteDocument(workspaceId: string, documentId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/documents/${documentId}`, { method: "DELETE" });
}
