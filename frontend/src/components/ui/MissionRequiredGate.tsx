import { useEffect, useState, ReactNode } from "react";
import { getBigGoals } from "../../api/big_goals";
import { useNavStore } from "../../store/navStore";

interface Props {
  children: ReactNode;
  /** Label shown in the card, e.g. "Subjects", "Workspaces" */
  feature?: string;
}

export default function MissionRequiredGate({ children, feature }: Props) {
  const { toGoals } = useNavStore();
  const [hasMissions, setHasMissions] = useState<boolean | null>(null);

  useEffect(() => {
    getBigGoals()
      .then(goals => setHasMissions(goals.length > 0))
      .catch(() => setHasMissions(true)); // fail open — don't block on error
  }, []);

  if (hasMissions === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-indigo-500/40 animate-spin" />
      </div>
    );
  }

  if (!hasMissions) {
    const desc = feature
      ? `You need at least one mission before you can use ${feature}.`
      : "You need at least one mission before you can use this feature.";

    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-6">
        {/* Icon card */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{
              background: "linear-gradient(145deg,#4f46e520,#7c3aed14)",
              border: "1px solid #818cf825",
              boxShadow: "0 0 40px #4f46e518",
            }}
          >
            🎯
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 2px 8px #7c3aed55" }}
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 max-w-sm">
          <p className="text-white font-extrabold text-xl tracking-tight">Start with a Mission</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</p>
        </div>

        {/* CTA */}
        <button
          onClick={toGoals}
          className="shimmer-btn flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
          style={{ boxShadow: "0 4px 20px rgba(79,70,229,0.4)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Create First Mission
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
