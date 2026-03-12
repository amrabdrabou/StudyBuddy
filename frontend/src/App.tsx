import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { getToken, removeToken } from "./api/auth";

// The three "pages" our simple app can show
type Page = "login" | "register" | "home";

export default function App() {
  // If a token is already saved in localStorage, skip straight to home
  const [page, setPage] = useState<Page>(getToken() ? "home" : "login");

  // ── Logged-in placeholder ─────────────────────────────────────────────────
  if (page === "home") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome to Study Buddy 🎓
          </h1>
          <p className="text-slate-500">You are logged in.</p>
          <button
            onClick={() => {
              removeToken();        // clear token from localStorage
              setPage("login");     // go back to login
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm
                       text-slate-600 hover:bg-slate-100 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Auth pages ────────────────────────────────────────────────────────────
  if (page === "register") {
    return (
      <RegisterPage
        onSuccess={() => setPage("login")}       // after register → go to login
        onGoToLogin={() => setPage("login")}
      />
    );
  }

  // Default: login
  return (
    <LoginPage
      onSuccess={() => setPage("home")}          // after login → go to home
      onGoToRegister={() => setPage("register")}
    />
  );
}
