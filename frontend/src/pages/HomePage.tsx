import React from 'react';
import homeBackground from '../assets/home.png';

interface HomePageProps {
  isLoggedIn: boolean;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onSignOut: () => void;
  onGoToDashboard: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ isLoggedIn, onGoToLogin, onGoToRegister, onSignOut, onGoToDashboard }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="h-10 flex items-center cursor-pointer select-none">
            <span className="text-white font-extrabold text-xl tracking-tighter">
              Study<span className="text-indigo-400">Buddy</span>
            </span>
          </button>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button onClick={onGoToDashboard}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                  Dashboard
                </button>
                <button onClick={onSignOut}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-semibold border border-white/20 transition-all">
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button onClick={onGoToLogin}
                  className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Log In
                </button>
                <button onClick={onGoToRegister}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={homeBackground} alt="StudyBuddy"
            className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]
                        bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 lg:py-48 relative z-10
                        flex flex-col items-center text-center gap-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5
                          rounded-full border border-indigo-400/20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
            </span>
            <span className="text-sm font-semibold text-indigo-300">
              Subjects → Notes, Docs, Flashcards, Goals
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white leading-[0.9]">
            Reimagine <br />
            Your{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">
                Study Flow
              </span>
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-indigo-400/40"
                viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 25 0, 50 5 T 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-2xl">
            Stop juggling tabs. Build your knowledge the way your brain actually works
            subjects, notes, flashcards, and sessions all connected in one focused space.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onGoToRegister}
              className="group bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl
                         font-bold text-lg shadow-lg shadow-indigo-900/40 transition-all
                         flex items-center justify-center gap-3">
              Create Your First Subject
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button onClick={onGoToLogin}
              className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-2xl
                         font-bold text-lg border-2 border-white/20 hover:border-white/30 transition-all">
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* ── How it works ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">How it works</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              From zero to first session<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                in minutes
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: "01", title: "Create a subject", tag: "Setup",
                desc: "Group all your material under one subject — Calculus, History, Python, anything.",
                accent: "from-indigo-500 to-indigo-700", glow: "bg-indigo-500/10",
                border: "border-indigo-500/20 hover:border-indigo-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
              },
              {
                step: "02", title: "Add your material", tag: "Organise",
                desc: "Write notes, upload documents, build flashcard decks. Tag everything for quick retrieval.",
                accent: "from-violet-500 to-violet-700", glow: "bg-violet-500/10",
                border: "border-violet-500/20 hover:border-violet-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
              },
              {
                step: "03", title: "Start a session", tag: "Study",
                desc: "Set your intention, get AI-generated micro-goals and quiz questions tailored to your material.",
                accent: "from-purple-500 to-purple-700", glow: "bg-purple-500/10",
                border: "border-purple-500/20 hover:border-purple-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              },
              {
                step: "04", title: "Track progress", tag: "Grow",
                desc: "Session logs, SM-2 schedules, focus scores, and mood ratings show how you're improving.",
                accent: "from-fuchsia-500 to-fuchsia-700", glow: "bg-fuchsia-500/10",
                border: "border-fuchsia-500/20 hover:border-fuchsia-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              },
            ].map((item) => (
              <div key={item.step}
                className={`group relative bg-white/3 border ${item.border} rounded-3xl p-7
                            flex flex-col gap-5 transition-all duration-300 hover:bg-white/6 overflow-hidden`}>
                <div className={`absolute inset-0 ${item.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-black text-white/20 tracking-widest">{item.step}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${item.accent} text-white`}>{item.tag}</span>
                </div>
                <div className={`relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br ${item.accent}
                                flex items-center justify-center text-white flex-shrink-0
                                shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
                <span className="absolute -bottom-4 -right-3 text-8xl font-black text-white/[0.03] select-none pointer-events-none leading-none">
                  {item.step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Everything You Need ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">Built to last</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              Everything You Need to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                Actually Learn
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Study Subjects", value: "∞", valueSize: "4rem",
                desc: "Organise any number of subjects. Notes, docs, and decks all nest inside.",
                accent: "from-indigo-500 to-indigo-700", glow: "bg-indigo-500/10",
                border: "border-indigo-500/20 hover:border-indigo-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
              },
              {
                label: "Flashcard Formats", value: "Text & Rich", valueSize: undefined,
                desc: "Front and back content types — text, hints, explanations, and difficulty ratings.",
                accent: "from-violet-500 to-violet-700", glow: "bg-violet-500/10",
                border: "border-violet-500/20 hover:border-violet-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
              },
              {
                label: "Review Algorithm", value: "SM-2", valueSize: undefined,
                desc: "Every card review updates interval, repetitions, and next scheduled date.",
                accent: "from-amber-500 to-amber-700", glow: "bg-amber-500/10",
                border: "border-amber-500/20 hover:border-amber-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              },
              {
                label: "Study Groups", value: "Collaborative", valueSize: undefined,
                desc: "Invite members, share resources, and study together across subjects.",
                accent: "from-emerald-500 to-emerald-700", glow: "bg-emerald-500/10",
                border: "border-emerald-500/20 hover:border-emerald-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
              },
            ].map((item) => (
              <div key={item.label}
                className={`group relative bg-white/3 border ${item.border} rounded-3xl p-7
                            flex flex-col gap-5 transition-all duration-300 hover:bg-white/6 overflow-hidden`}>
                <div className={`absolute inset-0 ${item.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
                <div className={`relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br ${item.accent}
                                flex items-center justify-center text-white flex-shrink-0
                                shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">{item.label}</p>
                  <p className="font-extrabold text-white tracking-tighter leading-none"
                    style={{ fontSize: item.valueSize ?? (item.value.length > 6 ? 'clamp(1.4rem, 3vw, 2rem)' : '2.5rem') }}>
                    {item.value}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center gap-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600
                          flex items-center justify-center text-white shadow-xl shadow-indigo-900/40">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.14l1.838-1.379m1.2-1.78l1.638-1.229m-1.2-1.78l1.438-1.079M13 11c0 3.517 1.009 6.799 2.753 9.571m3.44-2.14l-1.838-1.379m-1.2-1.78l-1.638-1.229m1.2-1.78l-1.438-1.079M9 11h6" />
            </svg>
          </div>
          <h2 className="text-6xl sm:text-7xl font-extrabold tracking-tighter leading-[0.9]">
            Your Subjects.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              Your Pace.
            </span>
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
            Start with a subject, add your notes and documents, build flashcard decks, set a study goal,
            and log your first session. The whole flow takes under two minutes.
          </p>
          <button onClick={onGoToRegister}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-2xl font-bold
                       text-xl shadow-xl shadow-indigo-900/40 hover:scale-105 transition-all">
            Create Your First Subject
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 bg-slate-950 py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="col-span-1 flex flex-col items-center md:items-start gap-4">
            <span className="text-white font-extrabold text-xl tracking-tighter">
              Study<span className="text-indigo-400">Buddy</span>
            </span>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} StudyBuddy.<br />All rights reserved.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-gray-500">
            <h4 className="font-semibold text-gray-300">Study</h4>
            <span>Your Subjects</span>
            <span>Notes &amp; Documents</span>
            <span>Flashcard Decks</span>
            <span>Study Goals</span>
          </div>
          <div className="flex flex-col gap-3 text-gray-500">
            <h4 className="font-semibold text-gray-300">Community</h4>
            <span>Study Groups</span>
            <span>Shared Resources</span>
            <span>Group Members</span>
            <span>Blog</span>
          </div>
          <div className="flex flex-col gap-3 text-gray-500">
            <h4 className="font-semibold text-gray-300">Account</h4>
            <button onClick={onGoToRegister} className="hover:text-indigo-400 transition-colors text-left">Sign Up</button>
            <button onClick={onGoToLogin} className="hover:text-indigo-400 transition-colors text-left">Log In</button>
            <span>Support</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
