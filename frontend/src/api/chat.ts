import { authFetch } from "./client";

export interface AIChatMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getChatHistory(workspaceId: string, limit = 50): Promise<AIChatMessage[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai-chat/?limit=${limit}`);
  return res.json();
}

export async function sendChatMessage(workspaceId: string, content: string): Promise<AIChatMessage[]> {
  const res = await authFetch(`/workspaces/${workspaceId}/ai-chat/`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function clearChatHistory(workspaceId: string): Promise<void> {
  await authFetch(`/workspaces/${workspaceId}/ai-chat/`, { method: "DELETE" });
}
