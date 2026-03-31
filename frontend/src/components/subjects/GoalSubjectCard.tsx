import type { Subject } from "../../api/subjects";
import { Card, CardContent } from "../ui/card";
import { SubjectProgressCircle } from "../goals/GoalCard";

interface Props {
  subject: Subject;
  onClick: (subject: Subject) => void;
}

export default function GoalSubjectCard({ subject, onClick }: Props) {
  const color = subject.color_hex ?? "#6366f1";
  const pct = Math.min(100, Math.max(0, Math.round(subject.progress_pct ?? 0)));

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(subject)}
      onKeyDown={(e) => e.key === "Enter" && onClick(subject)}
      className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
      style={{
        background: `linear-gradient(168deg, ${color}14 0%, transparent 40%)`,
        borderColor: `${color}25`,
      }}
    >
      {/* Accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }}
      />

      <CardContent className="p-5 pt-5 space-y-4">
        {/* Icon + name + chevron */}
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border"
            style={{ background: `${color}20`, borderColor: `${color}38` }}
          >
            {subject.icon ?? "📚"}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[14px] font-bold text-white leading-tight truncate group-hover:text-indigo-200 transition-colors">
              {subject.name}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {new Date(subject.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </p>
          </div>

          <svg
            className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors mt-1 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Progress row */}
        <div className="flex items-center gap-3">
          <SubjectProgressCircle progress={pct} color={color} />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-gray-500">Progress</span>
              <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
