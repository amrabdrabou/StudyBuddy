export default function EmptyState({ icon, iconBg, title, subtitle, action }: {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-32 text-center">
      {icon && (
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${iconBg ?? ""}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-white font-bold text-xl">{title}</p>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
