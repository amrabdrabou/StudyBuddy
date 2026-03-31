import { useEffect, useState } from "react";
import { aiGenerateQuiz, type Difficulty } from "../api/ai";
import { getQuizSets, type QuizSet } from "../api/quiz";
import type { GoalSourceMode } from "./useRoadmapGoalSource";

export function useQuizGenerator(workspaceId: string) {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [configMode, setConfigMode] = useState<"auto" | "custom">("auto");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [quizTitle, setQuizTitle] = useState("AI Quiz");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quizToSolve, setQuizToSolve] = useState<QuizSet | null>(null);

  const loadQuizSets = () => getQuizSets(workspaceId).then(setQuizSets).catch(() => {});

  useEffect(() => {
    loadQuizSets();
  }, [workspaceId]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const generate = async ({ sourceMode, summaryText, goalSummary }: {
    sourceMode: GoalSourceMode;
    summaryText: string;
    goalSummary: string;
  }) => {
    if (sourceMode === "summary" && summaryText.trim().length < 50) {
      setError("Please paste a summary of at least 50 characters.");
      return;
    }

    if (sourceMode === "goals" && goalSummary.trim().length < 10) {
      setError("No roadmap goals found. Generate goals in the Road Map tab first.");
      return;
    }

    setGenerating(true);
    clearFeedback();
    try {
      const res = await aiGenerateQuiz(workspaceId, {
        summary: sourceMode === "goals" ? goalSummary.trim() : summaryText.trim(),
        difficulty: configMode === "custom" ? difficulty : "normal",
        count: configMode === "custom" ? count : 10,
        quiz_title: quizTitle.trim() || "AI Quiz",
      });
      setSuccess(`Created "${res.quiz_title}" with ${res.questions_created} questions.`);
      await loadQuizSets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  return {
    quizSets,
    configMode,
    setConfigMode,
    difficulty,
    setDifficulty,
    quizTitle,
    setQuizTitle,
    count,
    setCount,
    generating,
    error,
    success,
    quizToSolve,
    setQuizToSolve,
    clearFeedback,
    generate,
  };
}
