import { useState, FormEvent } from "react";
import { login, saveToken } from "../api/auth";

interface Props {
  /** Called after a successful login so the parent can switch views */
  onSuccess: () => void;
  /** Switch to the register page */
  onGoToRegister: () => void;
}

export default function LoginPage({ onSuccess, onGoToRegister }: Props) {
  // What the user typed
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setError(null);
    setLoading(true);

    try {
      // Call the API, get back { access_token, token_type }
      const data = await login(identifier, password);

      // Save the token so future requests can use it
      saveToken(data.access_token);

      // Tell the parent we're done — it will navigate away
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to Study Buddy</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email or username
              </label>
              <input
                type="text"
                required
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                           placeholder:text-slate-400 outline-none
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                           transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                           placeholder:text-slate-400 outline-none
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                           transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
                         hover:bg-indigo-700 active:bg-indigo-800
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <button
              onClick={onGoToRegister}
              className="font-medium text-indigo-600 hover:underline"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
