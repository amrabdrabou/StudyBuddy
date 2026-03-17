import { fmtDate } from "../ui/utils";

// This QuizSet type matches the shape used in QuizzesSection (from the /quiz-sets/ endpoint)
export interface QuizSetCardData {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  source: "ai" | "user";
  status: "draft" | "ready" | "archived";
  question_count: number;
  created_at: string;
}

export interface QuizAttemptData {
  id: string;
  quiz_set_id: string;
  user_id: string;
  status: "in_progress" | "completed" | "abandoned";
  score_pct: number | null;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

function fmtDurationSeconds(seconds: number | null) {
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

export default function QuizSetCard({ quizSet, attemptCount, avgScore, onOpen, onDelete }: {
  quizSet: QuizSetCardData;
  attemptCount: number;
  avgScore: number | null;
  onOpen: (q: QuizSetCardData) => void;
  onDelete: (q: QuizSetCardData) => void;
}) {
  // onDelete is available for future use
  void onDelete;

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
              ${quizSet.source === "ai" ? "bg-indigo-500/15 text-indigo-400" : "bg-gray-500/15 text-gray-400"}`}>
              {quizSet.source === "ai" ? "AI Generated" : "Manual"}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${quizSet.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
              {quizSet.status}
            </span>
          </div>
          <p className="text-white font-semibold text-sm leading-snug">{quizSet.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{quizSet.question_count} questions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className="text-white font-bold text-base">{attemptCount}</p>
          <p className="text-gray-600 text-[10px]">Attempts</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className={`font-bold text-base ${scoreColor(avgScore)}`}>{avgScore !== null ? `${avgScore}%` : "—"}</p>
          <p className="text-gray-600 text-[10px]">Avg Score</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
          <p className="text-white font-bold text-base">{attemptCount}</p>
          <p className="text-gray-600 text-[10px]">Completed</p>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onOpen(quizSet)}
          className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors border border-amber-500/20">
          View History
        </button>
        <p className="text-xs text-gray-600 self-center ml-1">{fmtDate(quizSet.created_at)}</p>
      </div>
    </div>
  );
}

export { fmtDurationSeconds, scoreColor };
