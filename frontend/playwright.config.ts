import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for StudyBuddy E2E tests.
 *
 * Tests assume:
 *   - Frontend:  http://localhost:5173  (Vite dev server)
 *   - Backend:   http://localhost:8000  (FastAPI)
 *
 * Set VITE_API_URL env var to point the frontend at a different backend.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",

  /* Maximum time a single test may run. */
  timeout: 30_000,

  /* Fail the build on CI if any test.only is accidentally left in. */
  forbidOnly: !!process.env.CI,

  /* Retry once on CI to reduce flakiness noise. */
  retries: process.env.CI ? 1 : 0,

  /* Reporter: list for local, junit+html for CI. */
  reporter: process.env.CI
    ? [["junit", { outputFile: "test-results/junit.xml" }], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  /* Shared browser context settings. */
  use: {
    baseURL: "http://localhost:5173",

    /* Record traces on first retry so failures are easy to debug. */
    trace: "on-first-retry",

    /* Capture screenshot on failure. */
    screenshot: "only-on-failure",

    /* Capture video on first retry. */
    video: "on-first-retry",

    /* Default navigation timeout (separate from test timeout). */
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Output directory for test artifacts (screenshots, videos, traces). */
  outputDir: "test-results/artifacts",
});
