import type { BigGoal, BigGoalStatus } from "../../api/big_goals";
import type { Subject } from "../../api/subjects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { getMissionStatusTone, MISSION_STATUS_TOKENS } from "../ui/themeTokens";

export const statusStyles = MISSION_STATUS_TOKENS;

export function statusColor(status: BigGoalStatus) {
  const tone = getMissionStatusTone(status);
  return `${tone.text} ${tone.bg}`;
}

export function SubjectProgressCircle({ progress, color }: { progress: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <span className="relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center">
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white">
        {pct}
      </span>
    </span>
  );
}

export default function GoalCard({ goal, subjects, onDelete, onSelect, onRename, onSubjectSelect }: {
  goal: BigGoal;
  subjects: Subject[];
  onDelete: (g: BigGoal) => void;
  onSelect: (g: BigGoal) => void;
  onRename?: (g: BigGoal) => void;
  onSubjectSelect?: (goal: BigGoal, subject: Subject) => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const color = goal.cover_color ?? "#6366f1";
  const linkedSubjects = goal.subject_ids
    .map((sid) => subjectMap[sid])
    .filter((subject): subject is Subject => Boolean(subject));
  const statusLabel = goal.status.replace("_", " ");
  const progressPct = Math.max(0, Math.min(100, Math.round(goal.progress_pct ?? 0)));
  const deadlineLabel = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "No deadline";
  const progressTag =
    progressPct >= 100 ? "Complete" :
    progressPct >= 60 ? "On track" :
    progressPct > 0 ? "In motion" : "Not started";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(goal)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(goal)}
      className="group relative flex h-full flex-col overflow-hidden cursor-pointer text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: `linear-gradient(168deg, ${color}14 0%, transparent 40%)`,
        borderColor: `${color}25`,
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }}
      />

      {/* Hover actions */}
      <div className="absolute top-5 right-4 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onRename && (
          <button
            onClick={(e) => { stop(e); onRename(goal); }}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            title="Rename"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => { stop(e); onDelete(goal); }}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Header: icon + status */}
      <CardHeader className="gap-4 p-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border"
            style={{ background: `${color}20`, borderColor: `${color}38` }}
          >
            <span className="text-xl leading-none">{goal.icon ?? "🎯"}</span>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize ${statusColor(goal.status)}`}>
            {statusLabel}
          </span>
        </div>

        <div className="space-y-0.5">
          <CardTitle className="line-clamp-2 text-[15px] leading-snug text-white transition-colors group-hover:text-indigo-200">
            {goal.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-[12px] text-gray-400">
            {goal.description || linkedSubjects[0]?.name || "Mission"}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3.5 p-5 pt-1">
        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-black leading-none" style={{ color }}>{progressPct}%</span>
            <span
              className="text-[10px] font-semibold rounded-md px-2 py-0.5"
              style={{ background: `${color}15`, color }}
            >
              {progressTag}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">
            {goal.subject_ids.length} subject{goal.subject_ids.length !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-500">{deadlineLabel}</span>
        </div>

        {/* Linked subjects */}
        {linkedSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {linkedSubjects.map((subject) => {
              const sc = subject.color_hex ?? color;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    onSubjectSelect?.(goal, subject);
                  }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.08]"
                  style={{ background: `${sc}0c`, borderColor: `${sc}28` }}
                >
                  <SubjectProgressCircle progress={subject.progress_pct ?? 0} color={sc} />
                  <span className="min-w-0">
                    <span className="block max-w-[7rem] truncate text-[12px] font-semibold text-white leading-tight">
                      {subject.name}
                    </span>
                    <span className="block text-[10px] font-semibold leading-tight" style={{ color: `${sc}cc` }}>
                      {Math.round(subject.progress_pct ?? 0)}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
