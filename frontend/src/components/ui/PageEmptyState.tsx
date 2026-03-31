import type { ReactNode } from "react";

export default function PageEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  action,
  icon,
  tone,
  compact = false,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: "indigo" | "violet";
  compact?: boolean;
}) {
  const actionGradient = tone === "violet"
    ? "linear-gradient(135deg,#7c3aed,#c4b5fd)"
    : "linear-gradient(135deg,#4f46e5,#818cf8)";
  const actionShadow = tone === "violet"
    ? "0 4px 20px rgba(124,58,237,0.25)"
    : "0 4px 20px rgba(99,102,241,0.25)";

  return (
    <div className={`flex flex-col items-center text-center ${compact ? "col-span-full gap-3 py-20" : "gap-6 py-32"}`}>
      {icon && (
        <div className={compact ? "flex items-center justify-center" : "w-20 h-20 rounded-2xl flex items-center justify-center"}>
          {icon}
        </div>
      )}
      <div className={`space-y-1.5 ${compact ? "max-w-md" : "max-w-sm"}`}>
        <p className={compact ? "text-sm font-medium text-gray-500" : "text-white font-bold text-xl"}>{title}</p>
        {description && (
          <p className={compact ? "text-xs text-gray-600" : "text-sm text-white/35"}>{description}</p>
        )}
      </div>
      {action ?? (actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
          style={{ background: actionGradient, boxShadow: actionShadow }}
        >
          {actionLabel}
        </button>
      ) : null)}
    </div>
  );
}
