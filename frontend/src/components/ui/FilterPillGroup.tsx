type FilterOption<T extends string> = {
  id: T;
  label?: string;
};

const toneStyles = {
  indigo: {
    active: { background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" },
    idle: { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" },
  },
  violet: {
    active: { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" },
    idle: { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" },
  },
} as const;

export default function FilterPillGroup<T extends string>({
  options,
  value,
  onChange,
  tone = "indigo",
  compact = false,
  className = "",
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: keyof typeof toneStyles;
  compact?: boolean;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <div className={`${compact ? "flex gap-2 flex-wrap" : "flex gap-2 overflow-x-auto pb-1 scrollbar-none"} ${className}`}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`flex-shrink-0 font-semibold transition-colors ${compact ? "px-3 py-1.5 rounded-lg text-xs capitalize" : "px-4 py-2 rounded-xl text-sm"}`}
          style={value === option.id ? styles.active : styles.idle}
        >
          {option.label ?? option.id}
        </button>
      ))}
    </div>
  );
}
