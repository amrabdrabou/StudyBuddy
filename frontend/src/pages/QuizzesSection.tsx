import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizSet {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  source: "ai" | "user";
  status: "draft" | "ready" | "archived";
  question_count: number;
  created_at: string;
}

interface QuizAttempt {
  id: string;
  quiz_set_id: string;
  user_id: string;
  status: "in_progress" | "completed" | "abandoned";
  score_pct: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function scoreColor(pct: number | null) {
  if (pct === null) return "text-gray-500";
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

// ── Quiz Set Card ─────────────────────────────────────────────────────────────

function QuizCard({ quiz, attempts, onViewAttempts }: {
  quiz: QuizSet;
  attempts: QuizAttempt[];
  onViewAttempts: (q: QuizSet) => void;
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
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${quiz.source === "ai" ? "bg-indigo-500/15 text-indigo-400" : "bg-gray-500/15 text-gray-400"}`}>
              {quiz.source === "ai" ? "AI Generated" : "Manual"}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${quiz.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
              {quiz.status}
            </span>
          </div>
          <p className="text-white font-semibold text-sm leading-snug">{quiz.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{quiz.question_count} questions</p>
        </div>
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
              <span className="text-gray-500">{fmtDate(a.completed_at ?? a.started_at)}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">{fmtDuration(a.time_taken_seconds)}</span>
                <span className={`font-bold ${scoreColor(a.score_pct)}`}>{a.score_pct !== null ? `${a.score_pct}%` : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onViewAttempts(quiz)}
          className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors border border-amber-500/20">
          View History
        </button>
        <p className="text-xs text-gray-600 self-center ml-1">{fmtDate(quiz.created_at)}</p>
      </div>
    </div>
  );
}

// ── Attempt History Modal ─────────────────────────────────────────────────────

function AttemptHistoryModal({ quiz, attempts, onClose }: {
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
            <p className="text-gray-500 text-sm mt-0.5">{quiz.question_count} questions • {attempts.length} attempts</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {attempts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No attempts yet</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between bg-white/[0.04] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">Attempt #{attempts.length - i}</p>
                    <p className="text-gray-500 text-xs">{fmtDate(a.started_at)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500 text-xs">{fmtDuration(a.time_taken_seconds)}</span>
                    <span className={`font-black text-base ${scoreColor(a.score_pct)}`}>
                      {a.score_pct !== null ? `${a.score_pct}%` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function QuizzesSection() {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, QuizAttempt[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingQuiz, setViewingQuiz] = useState<QuizSet | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/quiz-sets/");
      const sets: QuizSet[] = await res.json();
      setQuizSets(sets);
      // Load attempts for each set
      const map: Record<string, QuizAttempt[]> = {};
      await Promise.all(sets.map(async s => {
        try {
          const ar = await authFetch(`/quiz-sets/${s.id}/attempts`);
          map[s.id] = await ar.json();
        } catch { map[s.id] = []; }
      }));
      setAttemptsMap(map);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load quizzes"); }
    finally { setLoading(false); }
  }

  const totalAttempts = Object.values(attemptsMap).flat().filter(a => a.status === "completed").length;
  const allCompleted = Object.values(attemptsMap).flat().filter(a => a.status === "completed" && a.score_pct !== null);
  const overallAvg = allCompleted.length > 0
    ? Math.round(allCompleted.reduce((s, a) => s + (a.score_pct ?? 0), 0) / allCompleted.length)
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quizzes</h1>
          <p className="text-gray-500 text-sm mt-1">{quizSets.length} quiz set{quizSets.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Overview stats */}
      {!loading && quizSets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Quiz Sets", value: quizSets.length, color: "text-amber-400" },
            { label: "Total Attempts", value: totalAttempts, color: "text-indigo-400" },
            { label: "Avg Score", value: overallAvg !== null ? `${overallAvg}%` : "—", color: overallAvg !== null ? (overallAvg >= 70 ? "text-emerald-400" : overallAvg >= 50 ? "text-amber-400" : "text-red-400") : "text-gray-500" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
          {error}<button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-white/[0.04] rounded-2xl animate-pulse" />)}
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
            <p className="text-gray-500 text-sm mt-1">Quizzes are generated by AI from your workspace documents</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl px-6 py-4 text-sm text-amber-300/80 max-w-sm">
            Upload documents in a workspace and AI will automatically generate quizzes for you.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizSets.map(q => (
            <QuizCard
              key={q.id}
              quiz={q}
              attempts={attemptsMap[q.id] ?? []}
              onViewAttempts={setViewingQuiz}
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
    </div>
  );
}
