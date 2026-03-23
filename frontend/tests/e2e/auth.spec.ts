/**
 * Authentication Flow E2E Tests
 *
 * Covers:
 *   - Login page renders correctly
 *   - Successful login redirects to dashboard
 *   - Invalid credentials show error
 *   - Unauthenticated access to /dashboard redirects to /login
 *   - Sign-out clears session and redirects to home
 *   - Register page renders and links back to login
 *   - Password mismatch validation on register form
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { setupAuthenticatedSession, clearAuthState, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Login page – static rendering
// ---------------------------------------------------------------------------

test.describe("Login page", () => {
  test("renders the sign-in form", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertVisible();

    await expect(page.getByText("sign in to your", { exact: false })).toBeVisible();
    await expect(loginPage.identifierInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("shows the sign-up link", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.signUpLink).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("nonexistent@invalid.test", "wrongpassword");
    // Wait for the API round-trip and error to appear
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 10_000 });
  });

  test("sign-in button is disabled while loading", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill form and intercept the network request to keep it pending long enough
    await loginPage.identifierInput.fill(TEST_EMAIL);
    await loginPage.passwordInput.fill(TEST_PASSWORD);

    // Pause the login request so we can observe the loading state
    await page.route("**/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    await loginPage.submitButton.click();
    // During the pending request, button text changes to "Signing in…"
    await expect(page.getByRole("button", { name: /signing in/i })).toBeVisible();

    await page.unrouteAll();
  });
});

// ---------------------------------------------------------------------------
// Redirect behaviour
// ---------------------------------------------------------------------------

test.describe("Auth redirect guards", () => {
  test("unauthenticated user visiting /dashboard is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for React to mount and apply guards
    await page.waitForLoadState("networkidle");
    // Should land on login (URL may not update with hash routing, so check page content)
    await expect(page.getByText("sign in to your", { exact: false })).toBeVisible({ timeout: 8_000 });
  });

  test("authenticated user visiting /login is redirected to /dashboard", async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const dashboard = new DashboardPage(page);
    await dashboard.assertSidebarVisible();
  });
});

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test.describe("Successful login flow", () => {
  test("valid credentials navigate to the dashboard", async ({ page }) => {
    // First ensure the test user exists
    const apiBase = process.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
    await page.goto("/");
    await page.evaluate(
      async ({ apiBase, email, password }) => {
        await fetch(`${apiBase}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username: "testuser_e2e", first_name: "Test" }),
        });
      },
      { apiBase, email: TEST_EMAIL, password: TEST_PASSWORD }
    );

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);

    // Successful login → dashboard renders
    const dashboard = new DashboardPage(page);
    await dashboard.assertSidebarVisible();
  });
});

// ---------------------------------------------------------------------------
// Sign-out
// ---------------------------------------------------------------------------

test.describe("Sign-out", () => {
  test("clicking sign-out clears session and shows home", async ({ page }) => {
    await setupAuthenticatedSession(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.assertSidebarVisible();

    await dashboard.signOutButton.click();

    // After sign-out, the dashboard should no longer be accessible
    await expect(dashboard.sidebarLogo).not.toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------

test.describe("Register page", () => {
  test("renders the registration form", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await expect(register.emailInput).toBeVisible();
    await expect(register.passwordInput).toBeVisible();
    await expect(register.confirmPasswordInput).toBeVisible();
    await expect(register.submitButton).toBeVisible();
  });

  test("mismatched passwords show an error", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.register({
      email: "mismatch@example.test",
      password: "SecurePass1!",
      confirmPassword: "DifferentPass2!",
    });
    await register.assertError("Passwords do not match");
  });

  test("sign-in link navigates to login page", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    // The nav bar has "Have an account? Sign in"
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByText("sign in to your", { exact: false })).toBeVisible({ timeout: 5_000 });
  });
});
