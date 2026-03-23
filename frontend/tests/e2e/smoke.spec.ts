/**
 * Smoke Tests — Fast sanity checks for the most critical paths.
 *
 * These run first in CI and should complete in under 60 seconds.
 * They are intentionally broad rather than deep: just verify the
 * app renders without a white screen or unhandled error.
 *
 * Covers:
 *   - Home page loads
 *   - Login page loads
 *   - Register page loads
 *   - Dashboard loads after authentication
 *   - No console errors on any of the above pages
 */

import { test, expect } from "@playwright/test";
import { setupAuthenticatedSession } from "./helpers/auth";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Smoke tests", () => {
  test("home page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The page must have rendered something — at minimum a body
    await expect(page.locator("body")).toBeVisible();

    // No unhandled JS errors
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("login page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("register page loads without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("dashboard loads after authentication", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await setupAuthenticatedSession(page);

    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.assertSidebarVisible();
    await expect(dashboard.mainContent).toBeVisible();

    expect(errors.filter((e) => !e.includes("ResizeObserver") && !e.includes("network"))).toHaveLength(0);
  });

  test("Vite dev server is responding", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBeLessThan(400);
  });
});
