import { authFetch } from "./client";

export interface RecentSession {
  id: string;
  workspace_id: string;
  title: string | null;
  status: string;
  started_at: string;
}

export interface DashboardStats {
  subjects_count: number;
  active_workspaces_count: number;
  active_big_goals_count: number;
  pending_micro_goals_count: number;
  documents_count: number;
  flashcard_decks_count: number;
  quiz_sets_count: number;
  notes_count: number;
  recent_sessions: RecentSession[];
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await authFetch("/dashboard/");
  return res.json();
}
