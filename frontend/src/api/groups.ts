import { authFetch } from "./client";

export interface GroupMember {
  user_id: string;
  study_group_id: string;
  role: string;
  joined_at: string;
}

export interface StudyGroup {
  id: string;
  creator_id: string;
  name: string;
  is_private: boolean;
  invite_code: string | null;
  max_members: number | null;
  created_at: string;
  updated_at: string;
  members: GroupMember[];
}

export async function getGroups(): Promise<StudyGroup[]> {
  const res = await authFetch("/study-groups/");
  return res.json();
}

export async function createGroup(data: {
  name: string;
  is_private?: boolean;
  max_members?: number | null;
}): Promise<StudyGroup> {
  const res = await authFetch("/study-groups/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateGroup(id: string, data: Partial<{
  name: string;
  is_private: boolean;
  max_members: number | null;
}>): Promise<StudyGroup> {
  const res = await authFetch(`/study-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteGroup(id: string): Promise<void> {
  await authFetch(`/study-groups/${id}`, { method: "DELETE" });
}

export async function generateInviteCode(id: string): Promise<StudyGroup> {
  const res = await authFetch(`/study-groups/${id}/generate-invite`, { method: "POST" });
  return res.json();
}

export async function joinGroup(id: string, invite_code: string): Promise<void> {
  await authFetch(`/study-groups/${id}/join?invite_code=${encodeURIComponent(invite_code)}`, {
    method: "POST",
  });
}

export async function leaveGroup(group_id: string, user_id: string): Promise<void> {
  await authFetch(`/study-groups/${group_id}/members/${user_id}`, { method: "DELETE" });
}

export async function getMembers(group_id: string): Promise<GroupMember[]> {
  const res = await authFetch(`/study-groups/${group_id}/members`);
  return res.json();
}
