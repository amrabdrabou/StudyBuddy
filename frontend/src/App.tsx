import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import SplashScreen from "./pages/SplashScreen";

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

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
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

  if (showSplash) return <SplashScreen />;

  if (page === "login") {
    return (
      <LoginPage
        onSuccess={loginSuccess}
        onGoToRegister={() => navigatePage("register")}
        onGoToHome={() => navigatePage("home")}
      />
    );
  }

  if (page === "register") {
    return (
      <RegisterPage
        onSuccess={() => navigatePage("login")}
        onGoToLogin={() => navigatePage("login")}
        onGoToHome={() => navigatePage("home")}
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
}
