import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import { getToken, removeToken } from "./api/auth";

type Page = "home" | "login" | "register";

// Map URL pathnames to page names and back
const pathToPage = (path: string): Page => {
  if (path === "/login") return "login";
  if (path === "/register") return "register";
  return "home";
};

const pageToPath: Record<Page, string> = {
  home: "/",
  login: "/login",
  register: "/register",
};

export default function App() {
  const [page, setPage] = useState<Page>(() => pathToPage(window.location.pathname));

  // Push a new history entry and update state
  const navigate = (next: Page) => {
    window.history.pushState({ page: next }, "", pageToPath[next]);
    setPage(next);
  };

  // Sync state when the user hits the browser back/forward buttons
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      setPage(e.state?.page ?? pathToPage(window.location.pathname));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isLoggedIn = !!getToken();

  const handleSignOut = () => {
    removeToken();
    navigate("home");
  };

  if (page === "login") {
    return (
      <LoginPage
        onSuccess={() => navigate("home")}
        onGoToRegister={() => navigate("register")}
        onGoToHome={() => navigate("home")}
      />
    );
  }

  if (page === "register") {
    return (
      <RegisterPage
        onSuccess={() => navigate("login")}
        onGoToLogin={() => navigate("login")}
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
    />
  );
}
