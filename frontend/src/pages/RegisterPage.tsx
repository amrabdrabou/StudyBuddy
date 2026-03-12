import { useState, FormEvent } from "react";
import { register } from "../api/auth";

interface Props {
  /** Called after a successful registration so the parent can switch to login */
  onSuccess: () => void;
  /** Switch back to the login page */
  onGoToLogin: () => void;
}

export default function RegisterPage({ onSuccess, onGoToLogin }: Props) {
  // Form fields
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Simple client-side check before hitting the server
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await register({
        email,
        password,
        username: username || undefined,   // send undefined if empty → backend auto-generates
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });

      // Registration worked — redirect to login so they can sign in
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Create an account</h1>
            <p className="text-slate-500 text-sm mt-1">Start studying smarter</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* First & last name side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                             placeholder:text-slate-400 outline-none
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                             transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                             placeholder:text-slate-400 outline-none
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                             transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                           placeholder:text-slate-400 outline-none
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                           transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
                <span className="ml-1 text-xs text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="janedoe"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800
                           placeholder:text-slate-400 outline-none
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                           transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {/* Success note shown after submit */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              onClick={onGoToLogin}
              className="font-medium text-indigo-600 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
