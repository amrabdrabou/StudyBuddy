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
            className="flex items-center gap-2 cursor-pointer select-none">
            <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-8 h-8" />
            <span className="text-white font-extrabold text-xl tracking-tighter">
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
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
              AI-Powered Study Platform
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
            Upload your study materials, generate quizzes and flashcards, track study workspaces, and reach your learning goals faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onGoToRegister}
              className="group bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl
                         font-bold text-lg shadow-lg shadow-indigo-900/40 transition-all
                         flex items-center justify-center gap-3">
              Start Studying Free
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button onClick={onGoToLogin}
              className="bg-white/10 hover:bg-white/20 text-white px-10 py-5 rounded-2xl
                         font-bold text-lg border-2 border-white/20 hover:border-white/30 transition-all">
              See How It Works
            </button>
          </div>
        </div>
      </header>

      {/* ── Problem ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">The problem</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              Studying today is scattered<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                and inefficient
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: "01", title: "Notes everywhere", tag: "Problem",
                desc: "Notes are spread across multiple apps with no connection to your study workspaces or goals.",
                accent: "from-rose-500 to-rose-700", glow: "bg-rose-500/10",
                border: "border-rose-500/20 hover:border-rose-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
              },
              {
                step: "02", title: "No structure", tag: "Problem",
                desc: "Study workspaces are unstructured and lack clear intentions, making it hard to stay focused.",
                accent: "from-orange-500 to-orange-700", glow: "bg-orange-500/10",
                border: "border-orange-500/20 hover:border-orange-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              },
              {
                step: "03", title: "Poor retention", tag: "Problem",
                desc: "Without spaced repetition, it's hard to remember what you learn long-term.",
                accent: "from-amber-500 to-amber-700", glow: "bg-amber-500/10",
                border: "border-amber-500/20 hover:border-amber-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
              },
              {
                step: "04", title: "No visibility", tag: "Problem",
                desc: "Progress toward learning goals is unclear, making it impossible to know if you're improving.",
                accent: "from-red-500 to-red-700", glow: "bg-red-500/10",
                border: "border-red-500/20 hover:border-red-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
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

      {/* ── How it works ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">How it works</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              One intelligent platform<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                for focused learning
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: "01", title: "Upload your materials", tag: "Start",
                desc: "Upload PDFs, slides, and notes. StudyBuddy ingests your content and prepares it for learning.",
                accent: "from-indigo-500 to-indigo-700", glow: "bg-indigo-500/10",
                border: "border-indigo-500/20 hover:border-indigo-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
              },
              {
                step: "02", title: "AI analyses your content", tag: "Analyse",
                desc: "AI reads your materials and suggests study goals, quiz questions, and flashcard decks automatically.",
                accent: "from-violet-500 to-violet-700", glow: "bg-violet-500/10",
                border: "border-violet-500/20 hover:border-violet-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
              },
              {
                step: "03", title: "Start a focused workspace", tag: "Study",
                desc: "Set your intention and study with integrated notes, AI-generated flashcards, and quiz questions.",
                accent: "from-purple-500 to-purple-700", glow: "bg-purple-500/10",
                border: "border-purple-500/20 hover:border-purple-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              },
              {
                step: "04", title: "Track your progress", tag: "Grow",
                desc: "Workspace logs, spaced repetition schedules, and goal tracking show exactly how you're improving.",
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

      {/* ── Features ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">Features</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              Everything you need to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                actually learn
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Smart Workspaces", value: "Focused",
                desc: "Create focused workspaces with specific goals — review, practice, or exam prep.",
                accent: "from-indigo-500 to-indigo-700", glow: "bg-indigo-500/10",
                border: "border-indigo-500/20 hover:border-indigo-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              },
              {
                label: "Integrated Notes", value: "Connected",
                desc: "Capture notes linked directly to your study workspaces and subjects.",
                accent: "from-violet-500 to-violet-700", glow: "bg-violet-500/10",
                border: "border-violet-500/20 hover:border-violet-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
              },
              {
                label: "Spaced Repetition", value: "SM-2",
                desc: "Flashcards reviewed at optimal intervals to strengthen long-term memory.",
                accent: "from-purple-500 to-purple-700", glow: "bg-purple-500/10",
                border: "border-purple-500/20 hover:border-purple-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
              },
              {
                label: "AI Quiz Generation", value: "Auto",
                desc: "Turn your study materials into quizzes instantly to test your knowledge.",
                accent: "from-fuchsia-500 to-fuchsia-700", glow: "bg-fuchsia-500/10",
                border: "border-fuchsia-500/20 hover:border-fuchsia-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              },
              {
                label: "Goal Tracking", value: "Visual",
                desc: "Set learning goals and visualize your study progress over time.",
                accent: "from-emerald-500 to-emerald-700", glow: "bg-emerald-500/10",
                border: "border-emerald-500/20 hover:border-emerald-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              },
              {
                label: "Document-Based Learning", value: "PDF & More",
                desc: "Upload PDFs, slides, and notes to generate learning materials automatically.",
                accent: "from-cyan-500 to-cyan-700", glow: "bg-cyan-500/10",
                border: "border-cyan-500/20 hover:border-cyan-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
              },
              {
                label: "AI Study Assistant", value: "Smart",
                desc: "Receive intelligent suggestions, summaries, and study recommendations powered by AI.",
                accent: "from-amber-500 to-amber-700", glow: "bg-amber-500/10",
                border: "border-amber-500/20 hover:border-amber-400/40",
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
              },
              {
                label: "Collaborative Groups", value: "Together",
                desc: "Study with friends, share learning resources, and collaborate across subjects.",
                accent: "from-rose-500 to-rose-700", glow: "bg-rose-500/10",
                border: "border-rose-500/20 hover:border-rose-400/40",
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
                    style={{ fontSize: item.value.length > 6 ? 'clamp(1.4rem, 3vw, 2rem)' : '2.5rem' }}>
                    {item.value}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-indigo-400 tracking-widest uppercase mb-4">What students say</p>
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">
              Loved by learners<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                everywhere
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {[
              {
                quote: "StudyBuddy helped me prepare for exams much faster by turning my notes into quizzes automatically.",
                author: "University Student",
                accent: "from-indigo-500 to-indigo-700", glow: "bg-indigo-500/10",
                border: "border-indigo-500/20 hover:border-indigo-400/40",
              },
              {
                quote: "Finally a study tool that combines workspaces, flashcards, and AI in one place. I stopped juggling five different apps.",
                author: "Engineering Student",
                accent: "from-violet-500 to-violet-700", glow: "bg-violet-500/10",
                border: "border-violet-500/20 hover:border-violet-400/40",
              },
            ].map((item) => (
              <div key={item.author}
                className={`group relative bg-white/3 border ${item.border} rounded-3xl p-8
                            flex flex-col gap-6 transition-all duration-300 hover:bg-white/6 overflow-hidden`}>
                <div className={`absolute inset-0 ${item.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
                <svg className="relative z-10 w-8 h-8 text-indigo-400/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="relative z-10 text-lg text-gray-300 leading-relaxed italic">"{item.quote}"</p>
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.accent} flex-shrink-0`} />
                  <span className="text-sm font-semibold text-gray-400">— {item.author}</span>
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
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-6xl sm:text-7xl font-extrabold tracking-tighter leading-[0.9]">
            Ready to study<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              smarter?
            </span>
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
            Start organizing your learning, track your study workspaces, and improve your results with AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onGoToRegister}
              className="group bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-2xl font-bold
                         text-xl shadow-xl shadow-indigo-900/40 hover:scale-105 transition-all flex items-center gap-3">
              Start Studying Free
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button onClick={onGoToRegister}
              className="bg-white/10 hover:bg-white/20 text-white px-12 py-5 rounded-2xl
                         font-bold text-xl border-2 border-white/20 hover:border-white/30 transition-all">
              Create Your First Workspace
            </button>
          </div>
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
            <span>Workspaces</span>
            <span>Notes &amp; Documents</span>
            <span>Flashcard Decks</span>
            <span>Study Goals</span>
          </div>
          <div className="flex flex-col gap-3 text-gray-500">
            <h4 className="font-semibold text-gray-300">Community</h4>
            <span>Study Groups</span>
            <span>Shared Resources</span>
            <span>AI Assistant</span>
            <span>Blog</span>
          </div>
          <div className="flex flex-col gap-3 text-gray-500">
            <h4 className="font-semibold text-gray-300">Account</h4>
            <button onClick={onGoToRegister} className="hover:text-indigo-400 transition-colors text-left">Sign Up Free</button>
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
