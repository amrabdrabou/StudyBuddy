import { useEffect, useState } from "react";
import { getMicroGoals, type MicroGoal } from "../api/micro_goals";

export type GoalSourceMode = "goals" | "summary";

export function useRoadmapGoalSource(workspaceId: string) {
  const [goals, setGoals] = useState<MicroGoal[]>([]);
  const [sourceMode, setSourceMode] = useState<GoalSourceMode>("goals");
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [summaryText, setSummaryText] = useState("");

  useEffect(() => {
    getMicroGoals(workspaceId).then(setGoals).catch(() => {});
  }, [workspaceId]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      next.has(goalId) ? next.delete(goalId) : next.add(goalId);
      return next;
    });
  };

  const clearSelectedGoals = () => setSelectedGoals(new Set());

  const selectedGoalList = selectedGoals.size > 0
    ? goals.filter(goal => selectedGoals.has(goal.id))
    : goals;

  const goalSummary = selectedGoalList
    .map(goal => [goal.title, goal.description].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    goals,
    sourceMode,
    setSourceMode,
    selectedGoals,
    summaryText,
    setSummaryText,
    toggleGoal,
    clearSelectedGoals,
    goalSummary,
    hasGoals: goals.length > 0,
  };
}
