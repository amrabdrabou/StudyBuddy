import { authFetch } from "./client";

export type GoalType = "finish_course" | "exam_prep" | "hours_target" | "topic_mastery" | "custom";
export type GoalStatus = "active" | "paused" | "completed" | "abandoned";

export interface LearningGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_type: GoalType;
  status: GoalStatus;
  study_subject_id: string | null;
  target_date: string | null;
  target_hours: number | null;
  target_score_pct: number | null;
  progress_pct: number;
  total_hours_logged: number;
  created_at: string;
  updated_at: string;
}

export async function getGoals(status?: GoalStatus): Promise<LearningGoal[]> {
  const q = status ? `?status=${status}` : "";
  const res = await authFetch(`/learning-goals/${q}`);
  return res.json();
}

export async function createGoal(data: {
  title: string;
  description?: string;
  goal_type?: GoalType;
  status?: GoalStatus;
  study_subject_id?: string | null;
  target_date?: string | null;
  target_hours?: number | null;
  target_score_pct?: number | null;
}): Promise<LearningGoal> {
  const res = await authFetch("/learning-goals/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateGoal(id: string, data: Partial<{
  title: string;
  description: string | null;
  goal_type: GoalType;
  status: GoalStatus;
  target_date: string | null;
  target_hours: number | null;
  target_score_pct: number | null;
  progress_pct: number;
}>): Promise<LearningGoal> {
  const res = await authFetch(`/learning-goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteGoal(id: string): Promise<void> {
  await authFetch(`/learning-goals/${id}`, { method: "DELETE" });
}
