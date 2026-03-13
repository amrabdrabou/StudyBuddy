// app/frontend/src/pages/HomePage.tsx
import React from 'react';
import homeBackground from '../assets/home.png';


interface HomePageProps {
  isLoggedIn: boolean;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onSignOut: () => void;
}

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  valueSize?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, description, icon, iconBg, valueSize }) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-3 transform transition-all hover:scale-105 hover:shadow-2xl">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
      {icon}
    </div>
    <p className="text-sm font-medium text-indigo-600 tracking-wide uppercase">{label}</p>
    <p className="font-extrabold text-gray-950 tracking-tighter leading-tight break-words"
       style={{ fontSize: valueSize ?? (value.length > 8 ? 'clamp(1.5rem, 4vw, 2.25rem)' : '3rem') }}>{value}</p>
    <p className="text-base text-gray-700 leading-relaxed">{description}</p>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ isLoggedIn, onGoToLogin, onGoToRegister, onSignOut }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 font-sans antialiased">

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="h-10 flex items-center">
            <span className="text-white font-extrabold text-xl tracking-tighter">Study<span className="text-indigo-400">Buddy</span></span>
          </button>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <button onClick={onSignOut}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-semibold border border-white/20 transition-all">
                Sign Out
              </button>
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

      {/* Hero Section */}
      <header className="relative bg-slate-950 overflow-hidden">
        {/* The background image container with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={homeBackground}
            alt="StudyBuddy — organise your learning"
            className="w-full h-full object-cover opacity-60"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:py-40 relative z-10 grid lg:grid-cols-2 lg:gap-16 items-center">

          {/* Hero Content (Left/Top) */}
          <div className="relative z-10 flex flex-col gap-10">
            <div className="inline-flex items-center gap-2 self-start bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-400/20 shadow-inner">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span className="text-sm font-semibold text-indigo-300">Subjects → Notes, Docs, Flashcards, Goals</span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white leading-[0.9]">
              Reimagine <br />
              Your <span className="text-indigo-400 relative inline-block">
                Study Flow
                {/* Embedded SVG line visual */}
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-indigo-200" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-2xl">
              Create a subject, attach notes and documents, build flashcard decks, log study sessions, and track goals. everything in one place, structured the way your brain works.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mt-4">
              <button onClick={onGoToRegister}
                className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-3">
                Create Your First Subject
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <button onClick={onGoToLogin}
                className="bg-white/10 text-white px-10 py-5 rounded-2xl font-bold text-lg border-2 border-white/20 hover:border-white/30 hover:bg-white/20 transition-all">
                Log In
              </button>
            </div>
          </div>

          {/* Hero Visual (Right/Bottom): 
            Integrating conceptual platform status info over the background.
          */}
          <div className="relative mt-16 lg:mt-0 flex items-center justify-center lg:justify-end">
            <div className="relative bg-white/5 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col items-center gap-8 transform lg:rotate-3 lg:scale-105 overflow-hidden">
              {/* Subtle internal glow */}
              <div className="absolute inset-0 bg-indigo-500/5 opacity-10 blur-3xl rounded-full scale-75"></div>

              {/* Concept visual: System Status */}
              <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 w-full">
                <div className="bg-green-100 p-4 rounded-full text-green-700 border border-green-200 flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div className="flex flex-col gap-1 text-center sm:text-left">
                  <p className="text-sm text-gray-400">YOUR STUDY SPACE</p>
                  <p className="font-extrabold text-white text-3xl sm:text-4xl tracking-tight">Ready to Study</p>
                  <p className="text-sm text-gray-500">Pick up where you left off — <span className="text-white font-medium">subjects &amp; sessions await</span></p>
                </div>
              </div>

              {/* Concept visual: Avg Response */}
              <div className="flex items-center gap-4 relative z-10 w-full bg-white/10 p-5 rounded-2xl border border-white/10">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-indigo-300">SPACED REPETITION ENGINE</p>
                  <p className="font-bold text-white text-xl">SM-2 Algorithm</p>
                </div>
                <p className="text-sm text-gray-500">Reviews scheduled across <span className="text-white font-medium">all your decks</span></p>
              </div>

              {/* Concept visual: Floating elements hint - avoid actual images */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

            </div>
          </div>

        </div>
      </header>

      {/* Features/Details Section: 
        Modern card designs on a clean background for strong contrast.
      */}
      <section className="py-24 sm:py-32 bg-white text-gray-950">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 xl:grid-cols-3 gap-12">

          {/* Feature Card: Embedded Icon visual */}
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col gap-6 transform transition-all hover:scale-105 hover:shadow-2xl hover:border-indigo-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-200">
              {/* Integrated SVG Icon for Feature 1 */}
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 11-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>
            </div>
            <h3 className="text-3xl font-extrabold text-gray-950 tracking-tight">Subjects, Notes & Documents</h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Group everything under a Study Subject. Attach written notes and uploaded documents, tag them for quick retrieval, and keep all your material in one structured place.
            </p>
            <a href="#" className="font-semibold text-indigo-600 group flex items-center gap-1.5 self-start">
              Explore Your Subjects
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          </div>

          {/* Feature Card: Embedded Icon visual */}
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col gap-6 transform transition-all hover:scale-105 hover:shadow-2xl hover:border-indigo-100">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-200">
              {/* Integrated SVG Icon for Feature 2 */}
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <h3 className="text-3xl font-extrabold text-gray-950 tracking-tight">Flashcard Decks & Reviews</h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Build flashcard decks inside any subject. Every review is logged with a quality rating and next-review date — the SM-2 spaced repetition algorithm schedules cards so you study what matters most.
            </p>
            <a href="#" className="font-semibold text-purple-600 group flex items-center gap-1.5 self-start">
              Browse Your Decks
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          </div>

          {/* Feature Card: Embedded Icon visual */}
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col gap-6 transform transition-all hover:scale-105 hover:shadow-2xl hover:border-indigo-100">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 border border-green-200">
              {/* Integrated SVG Icon for Feature 3 */}
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <h3 className="text-3xl font-extrabold text-gray-950 tracking-tight">Study Goals & Sessions</h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Set study goals per subject and log focused study sessions. Each session records what you covered and links directly to the flashcard reviews completed during that time.
            </p>
            <a href="#" className="font-semibold text-green-700 group flex items-center gap-1.5 self-start">
              View Your Progress
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          </div>

        </div>
      </section>

      {/* Stats Section: 
        Modern data display on a dramatic dark background, 
        tying back to the hero visuals.
      */}
      <section className="py-24 sm:py-32 bg-slate-950 text-white relative overflow-hidden">
        {/* Abstract pattern visual from home.png hint, overlaid conceptually */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10">
          <div className="w-[150%] h-[150%] bg-[url('data:image/svg+xml;base64,...')] bg-center bg-cover scale-150 rotate-6 blur-lg"></div> {/* Concept pattern from home.png visual hint - avoid specific images, use generic blur */}
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col gap-16">
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-5xl font-extrabold tracking-tighter leading-tight">
              Everything You Need to <span className="text-indigo-400">Actually Learn</span>
            </h2>
            <p className="text-xl text-gray-300">
              StudyBuddy structures your knowledge so nothing slips through the cracks — from a quick note to a full review session.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-8">
            <StatCard
              label="Study Subjects"
              value="∞"
              description="Organise any number of subjects. Notes, docs, and decks all nest inside."
              iconBg="bg-indigo-100"
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
            />
            <StatCard
              label="Flashcard Formats"
              value="Text & Rich"
              description="Front and back content types — text, hints, explanations, and difficulty ratings."
              iconBg="bg-purple-100"
              icon={
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              label="Review Algorithm"
              value="SM-2"
              description="Every card review updates interval, repetitions, and next scheduled date."
              iconBg="bg-amber-100"
              icon={
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Study Groups"
              value="Collaborative"
              description="Invite members, share resources, and study together across subjects."
              iconBg="bg-emerald-100"
              icon={
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Call to Action: 
        Simple and focused on a powerful light background, 
        contrasting with the previous dark section. Embedded Icon visual.
      */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-12">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border-2 border-indigo-200">
            {/* Integrated SVG Icon for CTA visual */}
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.14l1.838-1.379m1.2-1.78l1.638-1.229m-1.2-1.78l1.438-1.079M13 11c0 3.517 1.009 6.799 2.753 9.571m3.44-2.14l-1.838-1.379m-1.2-1.78l-1.638-1.229m1.2-1.78l-1.438-1.079M9 11h6"></path></svg>
          </div>
          <h2 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-gray-950 leading-[0.9]">
            Your Subjects.<br /> Your Notes. Your Pace.
          </h2>
          <p className="text-2xl text-gray-700 leading-relaxed max-w-3xl">
            Start with a subject, add your notes and documents, build flashcard decks, set a study goal, and log your first session — the whole flow takes under two minutes.
          </p>
          <button onClick={onGoToRegister}
            className="bg-indigo-600 text-white px-12 py-6 rounded-2xl font-bold text-xl shadow-xl hover:bg-indigo-500 transition-colors transform transition-all hover:scale-105">
            Create Your First Subject
          </button>
        </div>
      </section>

      {/* Footer: 
        Simple, clean, and professional. Embedded Icon visual.
      */}
      <footer className="border-t border-gray-100 bg-gray-50 py-20 text-gray-600">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="col-span-1 flex flex-col items-center md:items-start gap-4">
            <span className="text-gray-950 font-extrabold text-xl tracking-tighter">Study<span className="text-indigo-600">Buddy</span></span>
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} StudyBuddy. <br /> All rights reserved.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-gray-950">Study</h4>
            <span>Your Subjects</span>
            <span>Notes &amp; Documents</span>
            <span>Flashcard Decks</span>
            <span>Study Goals</span>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-gray-950">Community</h4>
            <span>Study Groups</span>
            <span>Shared Resources</span>
            <span>Group Members</span>
            <span>Blog</span>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-gray-950">Account</h4>
            <button onClick={onGoToRegister} className="hover:text-indigo-600 transition-colors text-left">Sign Up</button>
            <button onClick={onGoToLogin} className="hover:text-indigo-600 transition-colors text-left">Log In</button>
            <span>Support</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;