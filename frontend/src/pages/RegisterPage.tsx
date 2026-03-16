import { useState, FormEvent } from "react";
import { register } from "../api/auth";
import homeBackground from "../assets/home.png";

interface Props {
  /** Called after a successful registration so the parent can switch to login */
  onSuccess: () => void;
  /** Switch back to the login page */
  onGoToLogin: () => void;
  onGoToHome: () => void;
}

export default function RegisterPage({ onSuccess, onGoToLogin, onGoToHome }: Props) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        username: username || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white " +
    "placeholder:text-gray-600 outline-none text-sm " +
    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

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
            onClick={onGoToLogin}
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Have an account?{" "}
            <span className="text-indigo-400 font-semibold">Sign in</span>
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
              <span className="text-sm font-semibold text-indigo-300">Free forever</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[0.9]">
              Create your<br />
              <span className="text-indigo-400">study space</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              Start with a subject — add notes, flashcard decks, and study goals in minutes.
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

              {/* First & last name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Email <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Username
                  <span className="ml-1.5 text-xs text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="janedoe"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Password <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Confirm password <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
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
                {loading ? "Creating account…" : (
                  <>
                    Create Account
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              onClick={onGoToLogin}
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
