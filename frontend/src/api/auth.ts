// Base URL of our FastAPI backend.
// Vite exposes env vars prefixed with VITE_ to the browser.
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Reads the error message FastAPI sends back (it's always in `detail`).
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Register a new account.
 * Sends a JSON body → FastAPI returns the created UserResponse.
 */
export async function register(data: RegisterData): Promise<UserResponse> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/**
 * Log in with email/username + password.
 *
 * The FastAPI login endpoint uses OAuth2 form encoding (not JSON),
 * so we send the body as URLSearchParams.
 * The field must be called `username` — the backend accepts email too.
 */
export async function login(
  identifier: string,
  password: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: identifier, password });

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    // OAuth2 requires this content type
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/**
 * Fetch the current user's profile using their stored token.
 */
export async function getMe(token: string): Promise<UserResponse> {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

// ── Token helpers (localStorage) ──────────────────────────────────────────────

export const saveToken = (token: string) =>
  localStorage.setItem("access_token", token);

export const getToken = () => localStorage.getItem("access_token");

export const removeToken = () => localStorage.removeItem("access_token");
