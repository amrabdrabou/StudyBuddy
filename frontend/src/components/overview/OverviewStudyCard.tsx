import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CardStackItem } from "../ui/CardStack";
import { GlowCard } from "../ui/GlowCard";

export type CardSize = "hero" | "default" | "compact";

export type StudyCardData = CardStackItem & {
  step: string;
  color: string;
  icon: ReactNode;
  value: number;
  sub: string;
  desc: string;
  size: CardSize;
  rowSpan?: number;
  colSpan?: number;
  vizRing?: number;
  vizBars?: number[];
  vizFill?: number;
  onClick: () => void;
  onNew: () => void;
};

export function CategorySection({
  label,
  tagline,
  color,
  icon,
  cards,
  gridCols,
}: {
  label: string;
  tagline: string;
  color: string;
  icon: ReactNode;
  cards: StudyCardData[];
  gridCols: string;
}) {
  return (
    <div className="flex gap-4 items-stretch">
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
          <span style={{ color, display: "flex", transform: "scale(0.8)" }}>{icon}</span>
        </div>
        <div className="flex-1 w-px mt-2" style={{ background: `linear-gradient(to bottom, ${color}30, transparent)` }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-baseline gap-2">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">{label}</h3>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${color}55` }}>
            {cards.length} stage{cards.length !== 1 ? "s" : ""}
          </span>
          <p className="text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.2)" }}>{tagline}</p>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: gridCols, gridAutoRows: "minmax(120px, auto)" }}>
          {cards.map((item) => (
            <div
              key={item.id}
              style={{
                gridColumn: item.colSpan ? `span ${item.colSpan}` : undefined,
                gridRow: item.rowSpan ? `span ${item.rowSpan}` : undefined,
              }}
            >
              <StudyCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CountUp({ to, duration = 950 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (to === 0) {
      setVal(0);
      return;
    }
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

function colorToGlow(hex: string): "blue" | "purple" | "green" | "red" | "orange" {
  const map: Record<string, "blue" | "purple" | "green" | "red" | "orange"> = {
    "#818cf8": "blue",
    "#a78bfa": "purple",
    "#c084fc": "purple",
    "#e879f9": "purple",
    "#fb923c": "orange",
    "#f59e0b": "orange",
    "#34d399": "green",
    "#2dd4bf": "green",
    "#22d3ee": "blue",
    "#60a5fa": "blue",
    "#f87171": "red",
  };
  return map[hex.toLowerCase()] ?? "purple";
}

function StudyCard({ item }: { item: StudyCardData }) {
  const shadow = `0 2px 0 ${item.color}12, 0 6px 0 ${item.color}08, 0 14px 28px rgba(0,0,0,0.32)`;

  if (item.size === "hero") {
    return (
      <GlowCard customSize glowColor={colorToGlow(item.color)} className="h-full group cursor-pointer">
        <div className="h-full flex flex-col p-5 rounded-2xl overflow-hidden relative transition-transform duration-300 group-hover:-translate-y-1" style={{ background: `linear-gradient(145deg,${item.color}0e 0%,${item.color}05 100%)`, boxShadow: shadow }} onClick={item.onClick}>
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 10%, ${item.color}22 0%, transparent 70%)` }} />
          <span className="absolute bottom-[-8px] right-1 select-none pointer-events-none" style={{ color: `${item.color}07`, fontSize: 110, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, lineHeight: 1 }}>{item.step}</span>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full" style={{ background: `${item.color}20`, color: item.color }}>STEP {item.step}</span>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${item.color}20`, border: `1px solid ${item.color}35` }}>
            <span style={{ color: item.color, display: "flex" }}>{item.icon}</span>
          </div>
          <p style={{ color: item.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(56px,7vw,80px)", letterSpacing: "-0.03em", lineHeight: 1, filter: `drop-shadow(0 0 20px ${item.color}60)` }}>
            <CountUp to={item.value} duration={900} />
          </p>
          <p className="text-base font-extrabold text-white mt-3 leading-tight">{item.title}</p>
          <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{item.desc}</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: `${item.color}cc` }}>{item.sub}</p>
          <div className="flex items-center gap-2 mt-auto pt-4" style={{ borderTop: `1px solid ${item.color}20` }}>
            <button onClick={(e) => { e.stopPropagation(); item.onNew(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white active:scale-95 transition-transform" style={{ background: `linear-gradient(90deg, ${item.color}99, ${item.color}, rgba(255,255,255,0.18), ${item.color}, ${item.color}99)`, backgroundSize: "300% auto", animation: "shimmer 3s linear infinite", boxShadow: `0 4px 16px ${item.color}45` }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
            <button onClick={(e) => { e.stopPropagation(); item.onClick(); }} className="ml-auto flex items-center gap-0.5 text-xs font-semibold transition-all hover:opacity-80" style={{ color: `${item.color}bb` }}>
              Explore
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </GlowCard>
    );
  }

  if (item.size === "default") {
    const ringPct = item.vizRing !== undefined ? Math.max(0, Math.min(100, Math.round(item.vizRing))) : undefined;
    const ringRadius = 14;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringDash = ringPct !== undefined ? (ringPct / 100) * ringCircumference : 0;

    return (
      <GlowCard customSize glowColor={colorToGlow(item.color)} className="h-full group cursor-pointer">
        <div className="h-full flex flex-col p-4 rounded-2xl overflow-hidden relative transition-transform duration-300 group-hover:-translate-y-1" style={{ background: `${item.color}0a`, boxShadow: shadow }} onClick={item.onClick}>
          <div className="absolute bottom-[-6px] right-0 select-none pointer-events-none" style={{ color: `${item.color}06`, fontSize: 80, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, lineHeight: 1 }}>{item.step}</div>
          {ringPct !== undefined && ringPct > 0 && (
            <svg className="absolute top-3 right-3 z-[1]" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r={ringRadius} fill="none" stroke={`${item.color}15`} strokeWidth="2.5" />
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeDasharray={`${ringDash} ${ringCircumference}`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
              <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fill={item.color} fontSize="8" fontWeight="800">
                {ringPct}%
              </text>
            </svg>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black tracking-[0.18em] uppercase px-2 py-1 rounded-full" style={{ background: `${item.color}15`, color: item.color }}>
              Step {item.step}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); item.onNew(); }}
              className="rounded-lg px-2.5 py-1 text-[10px] font-bold transition-opacity hover:opacity-80"
              style={{ background: `${item.color}15`, color: item.color }}
            >
              + New
            </button>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}16` }}>
            <span style={{ color: item.color, display: "flex", transform: "scale(0.9)" }}>{item.icon}</span>
          </div>
          <p style={{ color: item.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(40px,5vw,56px)", letterSpacing: "-0.03em", lineHeight: 1, filter: `drop-shadow(0 0 14px ${item.color}55)` }}>
            <CountUp to={item.value} duration={900} />
          </p>
          <p className="text-sm font-bold text-white mt-2">{item.title}</p>
          <p className="text-[11px] mt-1 leading-relaxed font-medium min-h-[2.5rem]" style={{ color: "rgba(255,255,255,0.55)" }}>{item.desc}</p>
          <p className="text-xs mt-0.5 font-medium truncate" style={{ color: `${item.color}cc` }}>{item.sub}</p>
          {item.vizBars && item.vizBars.length > 0 && (
            <div className="flex items-end gap-[2px] mt-3 h-[18px]">
              {item.vizBars.slice(0, 8).map((h, i) => (
                <div
                  key={`${item.id}-bar-${i}`}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(h, 10)}%`,
                    background: `linear-gradient(to top, ${item.color}30, ${item.color}${h > 50 ? "70" : "40"})`,
                  }}
                />
              ))}
            </div>
          )}
          {item.vizFill !== undefined && item.vizFill > 0 && !item.vizBars && (
            <div className="mt-3 h-[2px] rounded-full overflow-hidden" style={{ background: `${item.color}12` }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(1, item.vizFill)) * 100}%`, background: `linear-gradient(90deg, ${item.color}40, ${item.color})` }}
              />
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); item.onClick(); }} className="mt-auto pt-3 flex items-center gap-1 text-xs font-semibold transition-all hover:opacity-80 self-start" style={{ color: item.color }}>
            Open
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard customSize glowColor={colorToGlow(item.color)} className="h-full group cursor-pointer">
      <div className="h-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-transform duration-300 group-hover:-translate-y-1" style={{ background: `${item.color}08`, boxShadow: shadow }} onClick={item.onClick}>
        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${item.color}18` }}>
          <span style={{ color: item.color, display: "flex", transform: "scale(0.85)" }}>{item.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{item.title}</p>
          <p className="text-xs font-medium truncate" style={{ color: `${item.color}cc` }}>{item.sub}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p style={{ color: item.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 36, letterSpacing: "-0.03em", lineHeight: 1, filter: `drop-shadow(0 0 10px ${item.color}50)` }}>
            <CountUp to={item.value} duration={900} />
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
