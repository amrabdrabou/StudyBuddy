export default function StatusBadge({ label, bg, text, dot, pulse }: {
  label: string;
  bg: string;
  text: string;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${text}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${text.replace("text-", "bg-")} ${pulse ? "animate-pulse" : ""}`} />
      )}
      {label}
    </span>
  );
}
