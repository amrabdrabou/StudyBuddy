import type { QuizSet, QuizAttempt } from "../../api/quiz";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { fmtDate } from "../ui/utils";

export type QuizListItem = QuizSet & { workspaceTitle: string };

export function scoreColor(pct: number | null) {
  if (pct === null) return "text-gray-500";
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

export default function QuizSetCard({
  quiz,
  attempts,
  onViewAttempts,
  onDelete,
}: {
  quiz: QuizListItem;
  attempts: QuizAttempt[];
  onViewAttempts: (q: QuizListItem) => void;
  onDelete: (q: QuizListItem) => void;
}) {
  const completed = attempts.filter(a => a.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.score_pct ?? 0), 0) / completed.length)
    : null;

  return (
    <Card className="group flex flex-col hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-200">
      <CardHeader className="items-start gap-3 p-6 pb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">{quiz.title}</CardTitle>
          <p className="text-gray-600 text-xs mt-0.5 truncate">{quiz.workspaceTitle}</p>
          {quiz.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{quiz.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(quiz)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 flex-shrink-0"
          title="Delete quiz"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </CardHeader>

      <CardContent className="space-y-4 px-6 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
            <p className="text-white font-bold text-base">{attempts.length}</p>
            <p className="text-gray-600 text-[10px]">Attempts</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
            <p className={`font-bold text-base ${scoreColor(avgScore)}`}>
              {avgScore !== null ? `${avgScore}%` : "-"}
            </p>
            <p className="text-gray-600 text-[10px]">Avg Score</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-center">
            <p className="text-white font-bold text-base">{completed.length}</p>
            <p className="text-gray-600 text-[10px]">Completed</p>
          </div>
        </div>

        {completed.length > 0 && (
          <div className="space-y-1.5">
            {completed.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-500">{fmtDate(a.ended_at ?? a.started_at)}</span>
                <span className={`font-bold ${scoreColor(a.score_pct)}`}>
                  {a.score_pct !== null ? `${Math.round(a.score_pct)}%` : "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex items-center gap-2 px-6 pb-6 pt-0">
        <button
          onClick={() => onViewAttempts(quiz)}
          className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors border border-amber-500/20"
        >
          View History
        </button>
        <span className="text-xs text-gray-600 self-center ml-1 flex-shrink-0">{fmtDate(quiz.created_at)}</span>
      </CardFooter>
    </Card>
  );
}
