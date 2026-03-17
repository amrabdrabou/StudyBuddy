type Section = "overview" | "subjects" | "library" | "goals" | "groups" | "settings";

const SUBJECT_SECTIONS: Section[] = ["subjects"];

const mainNavItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview", label: "Dashboard",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    id: "subjects", label: "Subjects",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    id: "library", label: "Library",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>,
  },
  {
    id: "goals", label: "Missions",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    id: "groups", label: "Study Groups",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
];

export default function Sidebar({ section, sidebarOpen, onNav, onSignOut }: {
  section: string;
  sidebarOpen: boolean;
  onNav: (s: string) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className={`fixed top-16 left-0 bottom-0 z-40 flex flex-col w-72 bg-slate-950/80 border-r border-white/5
                       backdrop-blur-2xl transition-transform duration-300 shadow-2xl
                       ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      {/* Background glow for sidebar */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* User Profile */}
      <div className="px-6 py-6 border-b border-white/5 flex-shrink-0 flex items-center gap-4">
        <div className="relative w-12 h-12 flex-shrink-0">
          <div className="absolute inset-1 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
              <span className="text-indigo-200 font-bold text-sm">S</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">Scholar</p>
          <p className="text-xs text-indigo-400 font-medium">StudyBuddy</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto w-full">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-4">Navigation</p>
        <div className="flex flex-col gap-1 w-full">
          {mainNavItems.map((item) => {
            const isActive = item.id === "subjects"
              ? SUBJECT_SECTIONS.includes(section as Section)
              : section === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left group overflow-hidden
                            ${isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
                {isActive && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/5 opacity-100" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                  </>
                )}
                <div className={`relative z-10 flex items-center justify-center transition-colors ${isActive ? "text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" : "text-gray-500 group-hover:text-gray-300"}`}>
                  {item.icon}
                </div>
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </button>
            );
          })}

          {/* Settings */}
          <div className="mt-2 pt-2 border-t border-white/5">
            {(() => {
              const isActive = section === "settings";
              return (
                <button onClick={() => onNav("settings")}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left group overflow-hidden
                              ${isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/5 opacity-100" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    </>
                  )}
                  <div className={`relative z-10 flex items-center justify-center transition-colors ${isActive ? "text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" : "text-gray-500 group-hover:text-gray-300"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="relative z-10">Settings</span>
                  {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                </button>
              );
            })()}
          </div>
        </div>
      </nav>

      {/* Daily Streak & Sign Out */}
      <div className="p-5 border-t border-white/5 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-white text-xs font-bold leading-none">Keep it up!</p>
              <p className="text-[10px] text-amber-400/80 mt-1">You're on fire!</p>
            </div>
          </div>
        </div>

        <button onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
