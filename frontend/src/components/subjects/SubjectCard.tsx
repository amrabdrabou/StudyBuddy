import type { Subject } from "../../api/subjects";

export const SUBJECT_ACCENT_COLORS = [
  { icon: "text-violet-400", iconBg: "bg-violet-500/15 border-violet-500/20", iconBgHover: "group-hover:border-violet-500/50", border: "hover:border-violet-500/60" },
  { icon: "text-indigo-400",  iconBg: "bg-indigo-500/15 border-indigo-500/20",  iconBgHover: "group-hover:border-indigo-500/50",  border: "hover:border-indigo-500/60"  },
  { icon: "text-cyan-400",    iconBg: "bg-cyan-500/15 border-cyan-500/20",      iconBgHover: "group-hover:border-cyan-500/50",    border: "hover:border-cyan-500/60"    },
  { icon: "text-emerald-400", iconBg: "bg-emerald-500/15 border-emerald-500/20",iconBgHover: "group-hover:border-emerald-500/50", border: "hover:border-emerald-500/60" },
  { icon: "text-amber-400",   iconBg: "bg-amber-500/15 border-amber-500/20",    iconBgHover: "group-hover:border-amber-500/50",   border: "hover:border-amber-500/60"   },
  { icon: "text-rose-400",    iconBg: "bg-rose-500/15 border-rose-500/20",      iconBgHover: "group-hover:border-rose-500/50",    border: "hover:border-rose-500/60"    },
];

export const SUBJECT_ICONS = [
  // book
  <svg key="book" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  // code
  <svg key="code" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  // flask/beaker
  <svg key="flask" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 3h6m-6 0v7l-4 9a1 1 0 001 1h12a1 1 0 001-1l-4-9V3m-6 0h6M9 12h6" /></svg>,
  // chart
  <svg key="chart" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  // brain / lightbulb
  <svg key="bulb" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  // scroll / history
  <svg key="scroll" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
];

export default function SubjectCard({ subject, onRename, onDelete, onClick, index = 0 }: {
  subject: Subject;
  index?: number;
  onClick?: (s: Subject) => void;
  onRename: (s: Subject) => void;
  onDelete: (s: Subject) => void;
}) {
  const accent = SUBJECT_ACCENT_COLORS[index % SUBJECT_ACCENT_COLORS.length];
  const icon = SUBJECT_ICONS[index % SUBJECT_ICONS.length];

  return (
    <div
      onClick={() => onClick?.(subject)}
      className={`group relative bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 flex flex-col
                   transition-all duration-200 ${accent.border}
                   ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={(e) => { e.stopPropagation(); onRename(subject); }} title="Rename"
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(subject); }} title="Delete"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Icon + Name */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${accent.iconBg} ${accent.iconBgHover} transition-colors`}>
          <div className={accent.icon}>{icon}</div>
        </div>
        <h3 className="text-lg font-bold text-white leading-snug">{subject.name}</h3>
      </div>

      {/* Stats badges */}
      <div className="flex gap-3 mt-auto">
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">Sessions</span>
        </div>
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">Docs</span>
        </div>
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">Notes</span>
        </div>
      </div>
    </div>
  );
}
