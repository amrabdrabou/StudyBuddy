import { authFetch } from "./client";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentTag {
  tag_id: string;
  tag: { id: string; name: string; color_hex: string | null };
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  processing_status: ProcessingStatus;
  summary: string | null;
  topics: string | null;
  is_archived: boolean;
  study_subject_id: string | null;
  uploaded_at: string;
  last_accessed_at: string;
  document_tags: DocumentTag[];
}

export async function getDocuments(params?: { study_subject_id?: string; is_archived?: boolean }): Promise<Document[]> {
  const q = new URLSearchParams();
  if (params?.study_subject_id) q.set("study_subject_id", params.study_subject_id);
  if (params?.is_archived !== undefined) q.set("is_archived", String(params.is_archived));
  const res = await authFetch(`/documents/?${q}`);
  return res.json();
}

export async function createDocument(data: {
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  study_subject_id?: string | null;
  tag_ids?: string[];
}): Promise<Document> {
  const res = await authFetch("/documents/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDocument(id: string, data: Partial<{
  title: string;
  is_archived: boolean;
  study_subject_id: string | null;
  tag_ids: string[];
}>): Promise<Document> {
  const res = await authFetch(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  await authFetch(`/documents/${id}`, { method: "DELETE" });
}
