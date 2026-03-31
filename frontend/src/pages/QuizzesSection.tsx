import { useState, useEffect } from "react";
import {
  getQuizSets, deleteQuizSet, getAttempts,
  type QuizSet, type QuizAttempt,
} from "../api/quiz";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import QuizSetCard, { type QuizListItem, scoreColor } from "../components/quiz/QuizSetCard";
import StatCard from "../components/dashboard/StatCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import { fmtDate } from "../components/ui/utils";

const ALL_WORKSPACES = "all-workspaces";

function AttemptHistoryModal({
  quiz, attempts, onClose,
}: {
  quiz: QuizSet;
  attempts: QuizAttempt[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-2">
          {attempts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No attempts yet</p>
          ) : (
            attempts.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between bg-white/[0.04] rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">Attempt #{attempts.length - i}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(a.started_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    a.status === "completed"   ? "bg-emerald-500/15 text-emerald-400" :
                    a.status === "in_progress" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>{a.status}</span>
                  <span className={`font-black text-base ${scoreColor(a.score_pct)}`}>
                    {a.score_pct !== null ? `${Math.round(a.score_pct)}%` : "-"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizzesSection() {
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId]   = useState(ALL_WORKSPACES);
  const [quizSets, setQuizSets]         = useState<QuizListItem[]>([]);
  const [attemptsMap, setAttemptsMap]   = useState<Record<string, QuizAttempt[]>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [viewingQuiz, setViewingQuiz]   = useState<QuizListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizListItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadQuizSets(); }, [workspaceId, workspaces]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      setWorkspaceId(ws.length > 0 ? ALL_WORKSPACES : "");
      if (ws.length === 0) setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadQuizSets() {
    setLoading(true);
    try {
      const map: Record<string, QuizAttempt[]> = {};

      if (workspaceId === ALL_WORKSPACES) {
        const grouped = await Promise.all(
          workspaces.map(async (workspace) => {
            const sets = await getQuizSets(workspace.id);
            await Promise.all(sets.map(async (quiz) => {
              try {
                map[quiz.id] = await getAttempts(workspace.id, quiz.id);
              } catch {
                map[quiz.id] = [];
              }
            }));
            return sets.map((quiz) => ({ ...quiz, workspaceTitle: workspace.title }));
          }),
        );
        setQuizSets(grouped.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } else {
        const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
        if (!currentWorkspace) {
          setQuizSets([]);
        } else {
          const sets = await getQuizSets(workspaceId);
          await Promise.all(sets.map(async (quiz) => {
            try {
              map[quiz.id] = await getAttempts(workspaceId, quiz.id);
            } catch {
              map[quiz.id] = [];
            }
          }));
          setQuizSets(sets.map((quiz) => ({ ...quiz, workspaceTitle: currentWorkspace.title })));
        }
      }

      setAttemptsMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuizSet(deleteTarget.workspace_id, deleteTarget.id);
      setQuizSets(prev => prev.filter(q => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete quiz");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const allCompleted = Object.values(attemptsMap).flat().filter(a => a.status === "completed");
  const overallAvg = allCompleted.length > 0
    ? Math.round(allCompleted.filter(a => a.score_pct !== null).reduce((s, a) => s + (a.score_pct ?? 0), 0) / allCompleted.filter(a => a.score_pct !== null).length)
    : null;
  const avgAccent = overallAvg === null
    ? "text-gray-500"
    : overallAvg >= 70 ? "text-emerald-400" : overallAvg >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Quizzes</h1>
        <p className="text-sm mt-1 text-gray-500">
          {quizSets.length} quiz set{quizSets.length !== 1 ? "s" : ""} · track your scores and review history
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={workspaceId === ALL_WORKSPACES
              ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            All
          </button>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setWorkspaceId(ws.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={workspaceId === ws.id
                ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {ws.title}
            </button>
          ))}
        </div>
      )}

      {!loading && quizSets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Quiz Sets"      value={quizSets.length}                              accent="text-amber-400" />
          <StatCard label="Total Attempts" value={allCompleted.length}                           accent="text-indigo-400" />
          <StatCard label="Avg Score"      value={overallAvg !== null ? `${overallAvg}%` : "-"} accent={avgAccent} />
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <SkeletonGrid cols={3} count={6} height="h-52" />
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <p className="text-white font-bold text-xl">No workspaces yet</p>
          <p className="text-gray-500 text-sm">Create a workspace first, then generate quizzes from the workspace view.</p>
        </div>
      ) : quizSets.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-400/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">No quizzes yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Open a workspace, go to the Quizzes tab, and use AI to generate quiz sets.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizSets.map(q => (
            <QuizSetCard
              key={q.id}
              quiz={q}
              attempts={attemptsMap[q.id] ?? []}
              onViewAttempts={setViewingQuiz}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {viewingQuiz && (
        <AttemptHistoryModal
          quiz={viewingQuiz}
          attempts={attemptsMap[viewingQuiz.id] ?? []}
          onClose={() => setViewingQuiz(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Delete Quiz</h2>
            <p className="text-gray-400 text-sm mb-6">
              Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
