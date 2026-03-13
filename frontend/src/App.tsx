import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import { getToken, removeToken } from "./api/auth";

type Page = "home" | "login" | "register" | "dashboard";

const pathToPage = (path: string): Page => {
  if (path === "/login") return "login";
  if (path === "/register") return "register";
  if (path === "/dashboard" || path === "/subjects") return "dashboard";
  return "home";
};

const pageToPath: Record<Page, string> = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
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

  const navigate = (next: Page) => {
    const dest = guard(next, isLoggedIn);
    window.history.pushState({ page: dest }, "", pageToPath[dest]);
    setPage(dest);
  };

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const raw: Page = e.state?.page ?? pathToPage(window.location.pathname);
      const dest = guard(raw, !!getToken());
      if (dest !== raw) {
        window.history.replaceState({ page: dest }, "", pageToPath[dest]);
      }
      setPage(dest);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    window.history.pushState({ page: "dashboard" }, "", "/dashboard");
    setPage("dashboard");
  };

  const handleSignOut = () => {
    removeToken();
    setIsLoggedIn(false);
    window.history.pushState({ page: "home" }, "", "/");
    setPage("home");
  };

  // Apply guard at render time to catch any edge cases (direct URL, history navigation)
  const current = guard(page, isLoggedIn);

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
        onSignOut={handleSignOut}
        onGoToHome={() => navigate("dashboard")}
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
