export default function StatCard({ label, value, icon: _icon, accent, onClick }: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1 ${onClick ? "cursor-pointer hover:bg-white/10 transition-colors" : ""}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
