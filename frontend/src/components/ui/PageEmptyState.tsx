import type { ReactNode } from "react";

export default function PageEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  compact = false,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  compact?: boolean;
}) {
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
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", boxShadow: "0 4px 20px rgba(99,102,241,0.25)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
