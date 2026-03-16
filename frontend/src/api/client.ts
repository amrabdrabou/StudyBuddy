/**
 * Shared authenticated fetch wrapper used by all API modules.
 *
 * Centralises:
 * - Attaching the Bearer token to every request
 * - Handling 401 Unauthorised by clearing local state and dispatching
 *   an "auth:expired" event so App.tsx can redirect to login
 * - Normalising FastAPI error responses into plain Error objects
 */
import { getToken, removeToken } from "./auth";

export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

/** Dispatch once so the whole app can react without prop-drilling. */
function dispatchAuthExpired(): void {
  window.dispatchEvent(new CustomEvent("auth:expired"));
}

export async function authFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    removeToken();
    dispatchAuthExpired();
    throw new Error("Session expired — please log in again");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Pydantic validation errors come as arrays
    if (Array.isArray(err.detail)) {
      throw new Error(err.detail.map((e: { msg: string }) => e.msg).join("; "));
    }
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }

  return res;
}
