import { useState, useEffect } from "react";
import {
  getQuizSets, deleteQuizSet, getAttempts,
  type QuizSet, type QuizAttempt,
} from "../api/quiz";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(pct: number | null) {
  if (pct === null) return "text-gray-500";
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

// ── Attempt History Modal ──────────────────────────────────────────────────────

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
                    {a.score_pct !== null ? `${Math.round(a.score_pct)}%` : "—"}
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

// ── Quiz Card ──────────────────────────────────────────────────────────────────

function QuizCard({
  quiz, attempts, workspaceTitle, onViewAttempts, onDelete,
}: {
  quiz: QuizSet;
  attempts: QuizAttempt[];
  workspaceTitle: string;
  onViewAttempts: (q: QuizSet) => void;
  onDelete: (q: QuizSet) => void;
}) {
  const completed = attempts.filter(a => a.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.score_pct ?? 0), 0) / completed.length)
    : null;

  return (
    <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4
                    hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-snug truncate">{quiz.title}</p>
          <p className="text-gray-600 text-xs mt-0.5 truncate">{workspaceTitle}</p>
          {quiz.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{quiz.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(quiz)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className="text-white font-bold text-base">{attempts.length}</p>
          <p className="text-gray-600 text-[10px]">Attempts</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className={`font-bold text-base ${scoreColor(avgScore)}`}>{avgScore !== null ? `${avgScore}%` : "—"}</p>
          <p className="text-gray-600 text-[10px]">Avg Score</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className="text-white font-bold text-base">{completed.length}</p>
          <p className="text-gray-600 text-[10px]">Completed</p>
        </div>
      </div>

      {/* Recent attempts */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          {completed.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-1.5 text-xs">
              <span className="text-gray-500">{fmtDate(a.ended_at ?? a.started_at)}</span>
              <span className={`font-bold ${scoreColor(a.score_pct)}`}>
                {a.score_pct !== null ? `${Math.round(a.score_pct)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onViewAttempts(quiz)}
          className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors border border-amber-500/20"
        >
          View History
        </button>
        <span className="text-xs text-gray-600 self-center ml-1 flex-shrink-0">{fmtDate(quiz.created_at)}</span>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function QuizzesSection() {
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId]   = useState("");
  const [quizSets, setQuizSets]         = useState<QuizSet[]>([]);
  const [attemptsMap, setAttemptsMap]   = useState<Record<string, QuizAttempt[]>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [viewingQuiz, setViewingQuiz]   = useState<QuizSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizSet | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadQuizSets(workspaceId); }, [workspaceId]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      if (ws.length > 0) setWorkspaceId(ws[0].id);
      else setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadQuizSets(wsId: string) {
    setLoading(true);
    try {
      const sets = await getQuizSets(wsId);
      setQuizSets(sets);
      const map: Record<string, QuizAttempt[]> = {};
      await Promise.all(sets.map(async s => {
        try {
          map[s.id] = await getAttempts(wsId, s.id);
        } catch {
          map[s.id] = [];
        }
      }));
      setAttemptsMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !workspaceId) return;
    setDeleting(true);
    try {
      await deleteQuizSet(workspaceId, deleteTarget.id);
      setQuizSets(prev => prev.filter(q => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete quiz");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const totalAttempts   = Object.values(attemptsMap).flat().filter(a => a.status === "completed").length;
  const allCompleted    = Object.values(attemptsMap).flat().filter(a => a.status === "completed" && a.score_pct !== null);
  const overallAvg      = allCompleted.length > 0
    ? Math.round(allCompleted.reduce((s, a) => s + (a.score_pct ?? 0), 0) / allCompleted.length)
    : null;
  const workspaceTitle  = workspaces.find(w => w.id === workspaceId)?.title ?? "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Quizzes</h1>
        <p className="text-sm mt-1 text-gray-500">
          {quizSets.length} quiz set{quizSets.length !== 1 ? "s" : ""} · track your scores and review history
        </p>
      </div>

      {/* Scrollable workspace tabs */}
      {workspaces.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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

      {/* Overview stats */}
      {!loading && quizSets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Quiz Sets",      value: quizSets.length, color: "text-amber-400" },
            { label: "Total Attempts", value: totalAttempts,   color: "text-indigo-400" },
            {
              label: "Avg Score",
              value: overallAvg !== null ? `${overallAvg}%` : "—",
              color: overallAvg !== null
                ? (overallAvg >= 70 ? "text-emerald-400" : overallAvg >= 50 ? "text-amber-400" : "text-red-400")
                : "text-gray-500",
            },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
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
            <QuizCard
              key={q.id}
              quiz={q}
              attempts={attemptsMap[q.id] ?? []}
              workspaceTitle={workspaceTitle}
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
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
