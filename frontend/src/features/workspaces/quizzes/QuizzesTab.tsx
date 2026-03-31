import { useEffect, useState } from "react";

import { deleteQuizSet, getAttempts, getQuizSets, type QuizAttempt, type QuizSet } from "../../../api/quiz";
import QuizSetCard, { type QuizListItem } from "../../../components/quiz/QuizSetCard";
import StatCard from "../../../components/dashboard/StatCard";
import ErrorBanner from "../../../components/ui/ErrorBanner";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
import { useWorkspaceDetailContext } from "../context/WorkspaceDetailContext";

export default function WorkspaceQuizzesTab({
  renderQuizModal,
}: {
  renderQuizModal: (quizSet: QuizSet | null, onClose: () => void) => React.ReactNode;
}) {
  const { workspaceId, workspaceTitle } = useWorkspaceDetailContext();
  const [quizSets, setQuizSets] = useState<QuizListItem[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, QuizAttempt[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizSet | null>(null);

  useEffect(() => {
    void loadQuizSets();
  }, [workspaceId, workspaceTitle]);

  async function loadQuizSets() {
    setLoading(true);
    setError(null);
    try {
      const sets = await getQuizSets(workspaceId);
      const decorated = sets.map((quiz) => ({ ...quiz, workspaceTitle }));
      const map: Record<string, QuizAttempt[]> = {};

      await Promise.all(
        sets.map(async (quiz) => {
          try {
            map[quiz.id] = await getAttempts(workspaceId, quiz.id);
          } catch {
            map[quiz.id] = [];
          }
        }),
      );

      setQuizSets(decorated);
      setAttemptsMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(quiz: QuizListItem) {
    try {
      await deleteQuizSet(workspaceId, quiz.id);
      setQuizSets((prev) => prev.filter((item) => item.id !== quiz.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete quiz");
    }
  }

  const completedAttempts = Object.values(attemptsMap).flat().filter((attempt) => attempt.status === "completed");
  const overallAvg = completedAttempts.length > 0
    ? Math.round(
        completedAttempts
          .filter((attempt) => attempt.score_pct !== null)
          .reduce((sum, attempt) => sum + (attempt.score_pct ?? 0), 0) /
          completedAttempts.filter((attempt) => attempt.score_pct !== null).length,
      )
    : null;
  const avgAccent = overallAvg === null
    ? "text-gray-500"
    : overallAvg >= 70
      ? "text-emerald-400"
      : overallAvg >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="space-y-6">
      {!loading && quizSets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Quiz Sets" value={quizSets.length} accent="text-amber-400" />
          <StatCard label="Completed" value={completedAttempts.length} accent="text-indigo-400" />
          <StatCard label="Avg Score" value={overallAvg !== null ? `${overallAvg}%` : "-"} accent={avgAccent} />
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <SkeletonGrid cols={3} count={6} height="h-52" />
      ) : quizSets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-white font-bold text-xl">No quizzes yet</p>
          <p className="text-gray-500 text-sm">
            Generate a quiz set from <span className="text-gray-400">{workspaceTitle}</span> to practice here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizSets.map((quiz) => (
            <QuizSetCard
              key={quiz.id}
              quiz={quiz}
              attempts={attemptsMap[quiz.id] ?? []}
              onViewAttempts={setActiveQuiz}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {activeQuiz && renderQuizModal(activeQuiz, () => setActiveQuiz(null))}
    </div>
  );
}
