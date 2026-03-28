import { create } from "zustand";
import { getToken, removeToken } from "../api/auth";

export type Page = "home" | "login" | "register" | "dashboard";

const PAGE_PATHS: Record<Page, string> = {
  dashboard: "/dashboard",
  login: "/login",
  register: "/register",
  home: "/",
};

function pathToPage(path: string): Page {
  if (path === "/login") return "login";
  if (path === "/register") return "register";
  if (path === "/" || path === "") return "home";
  return "dashboard";
}

function guard(page: Page, loggedIn: boolean): Page {
  if (loggedIn && (page === "home" || page === "login" || page === "register")) return "dashboard";
  if (!loggedIn && page === "dashboard") return "login";
  return page;
}

interface AuthStore {
  isLoggedIn: boolean;
  page: Page;
  showSplash: boolean;

  setShowSplash: (show: boolean) => void;
  navigatePage: (next: Page) => void;
  syncPageFromBrowser: () => void;
  loginSuccess: () => void;
  handleAuthExpired: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLoggedIn: !!getToken(),
  page: guard(pathToPage(window.location.pathname), !!getToken()),
  showSplash: true,

  setShowSplash: (show) => set({ showSplash: show }),

  navigatePage: (next) => {
    const dest = guard(next, get().isLoggedIn);
    window.history.pushState({ page: dest }, "", PAGE_PATHS[dest]);
    set({ page: dest });
  },

  syncPageFromBrowser: () => {
    const derived = pathToPage(window.location.pathname);
    const dest = guard(derived, !!getToken());
    set({ page: dest });
  },

  loginSuccess: () => {
    window.history.pushState({ page: "dashboard" }, "", "/dashboard");
    set({ isLoggedIn: true, page: "dashboard" });
  },

  handleAuthExpired: () => {
    removeToken();
    window.history.pushState({ page: "login" }, "", "/login");
    set({ isLoggedIn: false, page: "login" });
  },

  signOut: async () => {
    const token = getToken();
    removeToken();
    set({ isLoggedIn: false });
    if (token) {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"}/auth/logout`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` } }
        );
      } catch { /* ignore — local state already cleared */ }
    }
    window.history.pushState({ page: "home" }, "", "/");
    set({ page: "home" });
  },
}));
