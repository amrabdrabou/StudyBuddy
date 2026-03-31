import { useEffect, useRef } from "react";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import SplashScreen from "./pages/SplashScreen";

const HOME_NAVIGATION_LOADER_MS = 550;
const DASHBOARD_HOME_SPLASH_EVENT = "studybuddy:dashboard-home-splash";

export default function App() {
  const {
    isLoggedIn,
    page,
    showSplash,
    setShowSplash,
    navigatePage,
    syncPageFromBrowser,
    loginSuccess,
    handleAuthExpired,
    signOut,
  } = useAuthStore();
  const splashTimerRef = useRef<number | null>(null);

  const showSplashFor = (durationMs: number) => {
    if (splashTimerRef.current !== null) {
      window.clearTimeout(splashTimerRef.current);
    }

    setShowSplash(true);
    splashTimerRef.current = window.setTimeout(() => {
      setShowSplash(false);
      splashTimerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    showSplashFor(1500);
    return () => {
      if (splashTimerRef.current !== null) {
        window.clearTimeout(splashTimerRef.current);
      }
    };
  }, [setShowSplash]);

  const goHomeWithLoader = () => {
    showSplashFor(HOME_NAVIGATION_LOADER_MS);
    navigatePage("dashboard");
  };

  useEffect(() => {
    const onDashboardHomeSplash = () => showSplashFor(HOME_NAVIGATION_LOADER_MS);
    window.addEventListener(DASHBOARD_HOME_SPLASH_EVENT, onDashboardHomeSplash);
    return () => window.removeEventListener(DASHBOARD_HOME_SPLASH_EVENT, onDashboardHomeSplash);
  }, [setShowSplash]);

  useEffect(() => {
    const onPop = () => syncPageFromBrowser();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncPageFromBrowser]);

  useEffect(() => {
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [handleAuthExpired]);

  // Render the target page immediately so data fetches start during the splash.
  // SplashScreen overlays on top until the timer expires.
  const renderPage = () => {
    if (page === "login") {
      return (
        <LoginPage
          onSuccess={loginSuccess}
          onGoToRegister={() => navigatePage("register")}
          onGoToHome={goHomeWithLoader}
        />
      );
    }

    if (page === "register") {
      return (
        <RegisterPage
          onSuccess={() => navigatePage("login")}
          onGoToLogin={() => navigatePage("login")}
          onGoToHome={goHomeWithLoader}
        />
      );
    }

    if (page === "dashboard") {
      return <DashboardPage onSignOut={signOut} />;
    }

    return (
      <HomePage
        isLoggedIn={isLoggedIn}
        onGoToLogin={() => navigatePage("login")}
        onGoToRegister={() => navigatePage("register")}
        onSignOut={signOut}
        onGoToDashboard={() => navigatePage("dashboard")}
      />
    );
  };

  return (
    <>
      {showSplash && <SplashScreen />}
      {renderPage()}
    </>
  );
}
