
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import SplashScreen from "./pages/SplashScreen";
import { getToken, removeToken } from "./api/auth";

type Page = "home" | "login" | "register" | "dashboard";

type Section = "overview" | "subjects" | "library" | "goals" | "groups" | "settings";

const sectionToPath: Record<Section, string> = {
  overview:  "/dashboard",
  subjects:  "/subjects",
  library:   "/library",
  goals:     "/goals",
  groups:    "/groups",
  settings:  "/settings",
};

const pathToSection = (path: string): Section | null => {
  // Subject detail: /subjects/{uuid}
  if (/^\/subjects\/[0-9a-f-]{36}$/i.test(path)) return "subjects";
  for (const [section, p] of Object.entries(sectionToPath)) {
    if (path === p) return section as Section;
  }
  return null;
};

const pathToPage = (path: string): Page => {
  if (path === "/login") return "login";
  if (path === "/register") return "register";
  if (pathToSection(path) !== null) return "dashboard";
  return "home";
};

/** Enforce auth rules: logged-in users can't access auth/home pages; guests can't access dashboard. */
const guard = (page: Page, loggedIn: boolean): Page => {
  if (loggedIn && (page === "home" || page === "login" || page === "register")) return "dashboard";
  if (!loggedIn && page === "dashboard") return "login";
  return page;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  const [page, setPage] = useState<Page>(() => guard(pathToPage(window.location.pathname), !!getToken()));
  const [showSplash, setShowSplash] = useState(true);

  const initialSection = pathToSection(window.location.pathname) ?? "overview";

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const navigate = (next: Page) => {
    const dest = guard(next, isLoggedIn);
    let path: string;
    if (dest === "dashboard") path = "/dashboard";
    else if (dest === "login") path = "/login";
    else if (dest === "register") path = "/register";
    else path = "/";
    window.history.pushState({ page: dest }, "", path);
    setPage(dest);
  };

  useEffect(() => {
    const onPop = () => {
      const derived = pathToPage(window.location.pathname);
      const dest = guard(derived, !!getToken());
      setPage(dest);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Global handler for token expiry — any authFetch 401 fires this event
  useEffect(() => {
    const onAuthExpired = () => {
      setIsLoggedIn(false);
      window.history.pushState({ page: "login" }, "", "/login");
      setPage("login");
    };
    window.addEventListener("auth:expired", onAuthExpired);
    return () => window.removeEventListener("auth:expired", onAuthExpired);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    window.history.pushState({ page: "dashboard" }, "", "/dashboard");
    setPage("dashboard");
  };

  const handleSignOut = async () => {
    const token = getToken();
    removeToken(); // clear local state immediately
    setIsLoggedIn(false);
    // Fire-and-forget server-side logout to invalidate the hashed token in DB
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore — local state already cleared */ }
    }
    window.history.pushState({ page: "home" }, "", "/");
    setPage("home");
  };

  // Apply guard at render time to catch any edge cases (direct URL, history navigation)
  const current = guard(page, isLoggedIn);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (current === "login") {
    return (
      <LoginPage
        onSuccess={handleLoginSuccess}
        onGoToRegister={() => navigate("register")}
        onGoToHome={() => navigate("home")}
      />
    );
  }

  if (current === "register") {
    return (
      <RegisterPage
        onSuccess={() => navigate("login")}
        onGoToLogin={() => navigate("login")}
        onGoToHome={() => navigate("home")}
      />
    );
  }

  if (current === "dashboard") {
    return (
      <DashboardPage
        initialSection={initialSection}
        onSignOut={handleSignOut}
        onGoToHome={() => navigate("home")}
      />
    );
  }

  return (
    <HomePage
      isLoggedIn={isLoggedIn}
      onGoToLogin={() => navigate("login")}
      onGoToRegister={() => navigate("register")}
      onSignOut={handleSignOut}
      onGoToDashboard={() => navigate("dashboard")}
    />
  );
}
