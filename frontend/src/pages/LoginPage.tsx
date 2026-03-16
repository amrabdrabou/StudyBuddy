import { useState, FormEvent } from "react";
import { login, saveToken } from "../api/auth";
import homeBackground from "../assets/home.png";

interface Props {
  /** Called after a successful login so the parent can switch views */
  onSuccess: () => void;
  /** Switch to the register page */
  onGoToRegister: () => void;
  onGoToHome: () => void;
}

export default function LoginPage({ onSuccess, onGoToRegister, onGoToHome }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(identifier, password);
      saveToken(data.access_token, data.expires_in ?? 900);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-950 font-sans antialiased flex flex-col">

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onGoToHome} className="flex items-center gap-2 cursor-pointer select-none">
            <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-8 h-8" />
            <span className="text-white font-extrabold text-xl tracking-tighter">
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
            </span>
          </button>
          <button
            onClick={onGoToRegister}
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            No account?{" "}
            <span className="text-indigo-400 font-semibold">Sign up free</span>
          </button>
        </div>
      </nav>

      {/* Background */}
      <div className="absolute inset-0 z-0 top-16">
        <img src={homeBackground} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <div className="w-full max-w-md flex flex-col gap-8">

          {/* Heading */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 self-start bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-400/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
              </span>
              <span className="text-sm font-semibold text-indigo-300">Welcome back</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[0.9]">
              Sign in to your<br />
              <span className="text-indigo-400">study space</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              Pick up right where your subjects, notes, and decks left off.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Email or username</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white
                             placeholder:text-gray-600 outline-none text-sm
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white
                             placeholder:text-gray-600 outline-none text-sm
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl
                           font-bold text-base shadow-lg transition-colors mt-1
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? "Signing in…" : (
                  <>
                    Sign In
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              onClick={onGoToRegister}
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
            >
              Create one free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
