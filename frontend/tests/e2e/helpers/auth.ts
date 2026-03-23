import type { Page } from "@playwright/test";

/**
 * Auth helpers shared across test suites.
 *
 * Credentials are read from environment variables so they are never
 * hard-coded in test files:
 *
 *   TEST_USER_EMAIL    – defaults to "testuser@studybuddy.test"
 *   TEST_USER_PASSWORD – defaults to "TestPass123!"
 *
 * When running against a real backend, make sure this user exists or use
 * the registerAndLogin helper to create it first.
 */

export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "testuser@studybuddy.test";
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPass123!";
export const TEST_USERNAME = process.env.TEST_USER_USERNAME ?? "testuser_e2e";

/**
 * Perform a login by calling the API directly (no UI interaction).
 * Stores the token in localStorage so subsequent page loads are authenticated.
 * This is faster than clicking through the login form every time.
 */
export async function loginViaApi(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  const apiBase = process.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

  const resp = await page.evaluate(
    async ({ apiBase, email, password }) => {
      const body = new URLSearchParams({ username: email, password });
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "unknown" }));
        throw new Error(err.detail ?? `Login failed: ${res.status}`);
      }
      return res.json() as Promise<{ access_token: string; expires_in: number }>;
    },
    { apiBase, email, password }
  );

  // Store the token in localStorage so the app treats the browser as logged in
  const expiresAt = new Date(Date.now() + (resp.expires_in ?? 900) * 1000).toISOString();
  await page.evaluate(
    ({ token, expiresAt }) => {
      localStorage.setItem("access_token", token);
      localStorage.setItem("access_token_expires_at", expiresAt);
    },
    { token: resp.access_token, expiresAt }
  );
}

/**
 * Register a user via the API (best-effort: ignores 409 Conflict so tests
 * can reuse an existing account). After registration navigates to login.
 */
export async function registerUserViaApi(
  page: Page,
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
  username = TEST_USERNAME
) {
  const apiBase = process.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
  await page.evaluate(
    async ({ apiBase, email, password, username }) => {
      await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, first_name: "Test" }),
      });
      // Silently ignore — 409 means user already exists which is fine.
    },
    { apiBase, email, password, username }
  );
}

/**
 * Full setup: ensure the user exists then authenticate.
 * Call this in beforeEach for suites that need an authenticated session.
 */
export async function setupAuthenticatedSession(page: Page) {
  // Start at "/" so localStorage writes happen on the correct origin.
  await page.goto("/");
  await registerUserViaApi(page);
  await loginViaApi(page);
}

/** Clear authentication state (for sign-out tests). */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("access_token_expires_at");
  });
}
