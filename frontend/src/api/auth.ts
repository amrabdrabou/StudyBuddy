// Base URL of our FastAPI backend.
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
  profile_picture_url: string | null;
  timezone: string | null;
  study_goal_minutes_per_day: number | null;
  preferred_study_time: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  auth_provider: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      // Pydantic validation error array → join messages
      return body.detail.map((e: { msg: string }) => e.msg).join("; ");
    }
    return "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function register(data: RegisterData): Promise<UserResponse> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function login(
  identifier: string,
  password: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: identifier, password });
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function logout(token: string): Promise<void> {
  // Best-effort — clear local state regardless of server response
  try {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore network errors — local state cleared below
  }
}

export async function getMe(token: string): Promise<UserResponse> {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    removeToken();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

// ── Token storage ─────────────────────────────────────────────────────────────
// Tokens are stored in localStorage with an expiry timestamp.
// On every read we check if the token has expired and clear it proactively.
// Note: HttpOnly cookies are the gold standard but require server-side changes
// that are tracked in the security roadmap.

const TOKEN_KEY = "access_token";
const EXPIRY_KEY = "access_token_expires_at"; // ISO timestamp

export function saveToken(token: string, expiresInSeconds: number): void {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, expiresAt);
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = localStorage.getItem(EXPIRY_KEY);
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    // Token has expired locally — clear storage
    removeToken();
    return null;
  }

  return token;
}

export function getTokenExpiresAt(): Date | null {
  const raw = localStorage.getItem(EXPIRY_KEY);
  return raw ? new Date(raw) : null;
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  // Clear any active workspace timer so it doesn't leak across sessions
  localStorage.removeItem("sb_active_timer");
}

// ── Profile update ─────────────────────────────────────────────────────────────

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  username?: string;
  profile_picture_url?: string;
  timezone?: string;
  study_goal_minutes_per_day?: number;
  preferred_study_time?: string;
}

export async function updateProfile(
  token: string,
  data: UpdateProfileData
): Promise<UserResponse> {
  const res = await fetch(`${API}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (res.status === 401) {
    removeToken();
    throw new Error("Session expired — please log in again");
  }
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
