import { useEffect, useRef, useState, type ReactNode } from "react";
import { GlowCard } from "../ui/GlowCard";

/* ── Design tokens (shared across all ActionCards) ───────────────────────── */
const RADIUS   = "rounded-2xl";
const PADDING  = "p-5";
const FONT     = "'Lexend', sans-serif";
const SHADOW   = (c: string) =>
  `0 2px 0 ${c}10, 0 8px 24px rgba(0,0,0,0.28)`;

/* ── Glow colour mapping ─────────────────────────────────────────────────── */
const GLOW_MAP: Record<string, "blue" | "purple" | "green" | "red" | "orange"> = {
  "#818cf8": "blue",  "#a78bfa": "purple", "#c084fc": "purple",
  "#e879f9": "purple","#fb923c": "orange", "#f59e0b": "orange",
  "#34d399": "green", "#2dd4bf": "green",  "#22d3ee": "blue",
  "#60a5fa": "blue",  "#f87171": "red",
};
function toGlow(hex: string) {
  return GLOW_MAP[hex.toLowerCase()] ?? "purple";
}

/* ── CountUp ─────────────────────────────────────────────────────────────── */
function CountUp({ to, duration = 850 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{val}</>;
}

/* ── Public types ────────────────────────────────────────────────────────── */

export interface ActionCardProps {
  /** Accent colour (hex). Drives icon tint, progress bar, glow, CTA. */
  color: string;
  /** Card icon — rendered at 20×20 inside a tinted container. */
  icon: ReactNode;
  /** Primary label shown in the header. */
  title: string;
  /** Short description below the metric. */
  description: string;
  /** Large numeric metric (animated). */
  metric: number;
  /** Secondary line below the metric — status, progress hint, etc. */
  status: string;
  /** 0‑100 progress value. Omit to hide the progress bar. */
  progress?: number;
  /** Primary CTA label — defaults to "Open". */
  ctaLabel?: string;
  /** Fires when the user clicks the card body OR the CTA. */
  onAction: () => void;
  /** Optional secondary "Create" / "+ New" button handler. */
  onNew?: () => void;
  /** Optional span across two grid rows. */
  span?: boolean;
}

/* ── ActionCard ──────────────────────────────────────────────────────────── */

export function ActionCard({
  color, icon, title, description, metric,
  status, progress, ctaLabel = "Open", onAction, onNew, span,
}: ActionCardProps) {
  /* Lighter tint for gradient text end */
  const light = `${color}cc`;

  return (
    <GlowCard customSize glowColor={toGlow(color)} className={`h-full ${span ? "row-span-2" : ""}`}>
      <div
        onClick={onAction}
        className={`group h-full flex flex-col ${RADIUS} ${PADDING} overflow-hidden relative cursor-pointer transition-transform duration-300 hover:-translate-y-0.5`}
        style={{
          background: `linear-gradient(155deg, ${color}0e 0%, ${color}04 100%)`,
          boxShadow: SHADOW(color),
          fontFamily: FONT,
        }}
      >
        {/* Ambient glow — large, soft, like the hero radial */}
        <div
          className="absolute -top-10 -right-10 w-52 h-52 pointer-events-none"
          style={{ background: `radial-gradient(circle at 70% 20%, ${color}20 0%, transparent 65%)` }}
        />

        {/* ── Header: icon + title ── */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}28` }}
          >
            <span className="flex" style={{ color }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold tracking-tight text-white truncate">{title}</p>
            <p className="text-[11px] mt-0.5 font-medium truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
              {description}
            </p>
          </div>
          {onNew && (
            <button
              onClick={e => { e.stopPropagation(); onNew(); }}
              className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-125 active:scale-95"
              style={{ background: `${color}18`, color }}
            >
              + New
            </button>
          )}
        </div>

        {/* ── Body: big gradient metric + pulsing status ── */}
        <p
          className="leading-none"
          style={{
            fontWeight: 900,
            fontSize: "clamp(44px, 5.5vw, 60px)",
            letterSpacing: "-0.04em",
            background: `linear-gradient(135deg, ${color}, ${light})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 0 18px ${color}55)`,
          }}
        >
          <CountUp to={metric} />
        </p>

        <div className="flex items-center gap-2 mt-2.5">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
          </span>
          <p className="text-xs font-semibold truncate" style={{ color: `${color}cc` }}>
            {status}
          </p>
        </div>

        {/* ── Progress bar (optional) ── */}
        {progress !== undefined && progress > 0 && (
          <div
            className="mt-3 h-1.5 rounded-full overflow-hidden"
            style={{ background: `${color}12` }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: `linear-gradient(90deg, ${color}50, ${color})`,
              }}
            />
          </div>
        )}

        {/* ── Footer: gradient CTA button ── */}
        <div className="flex items-center gap-3 mt-auto pt-4">
          <button
            onClick={e => { e.stopPropagation(); onAction(); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${color}cc, ${color})`,
              boxShadow: `0 4px 16px ${color}40`,
            }}
          >
            {ctaLabel}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </GlowCard>
  );
}

/* ── Category section — wraps a set of ActionCards with a header ────────── */

export function ActionSection({
  label, tagline, color, icon, children,
}: {
  label: string;
  tagline: string;
  color: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4 items-stretch">
      {/* Vertical rail */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 28 }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}28` }}
        >
          <span className="flex" style={{ color, transform: "scale(0.8)" }}>{icon}</span>
        </div>
        <div
          className="flex-1 w-px mt-2"
          style={{ background: `linear-gradient(to bottom, ${color}25, transparent)` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex items-baseline gap-3">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">{label}</h3>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>{tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
