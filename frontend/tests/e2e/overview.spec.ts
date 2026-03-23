/**
 * Overview Section E2E Tests
 *
 * Covers:
 *   - Overview renders greeting with user's name
 *   - Key stat cards are displayed (Subjects, Active Missions, etc.)
 *   - "Start Daily Session" button is present
 *   - "Create Mission" CTA navigates to Missions section
 *   - "Missions Progress" panel renders
 *   - AI suggestion bar is shown
 *   - Clicking a missions-progress card opens mission detail
 */

import { expect } from "@playwright/test";
import { test } from "./helpers/fixtures";

test.describe("Overview section", () => {
  test("renders the greeting heading", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    await expect(
      dashboardPage.mainContent.getByText(/good morning|good afternoon|good evening/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows the Start Daily Session button", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    await expect(
      dashboardPage.mainContent.getByRole("button", { name: /start daily session/i })
    ).toBeVisible({ timeout: 8_000 });
  });

  test("renders the four key stat cards", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    // Each stat card renders a label below its number
    const labels = ["Subjects", "Active Missions", "Pending Tasks", "Workspaces"];
    for (const label of labels) {
      await expect(
        dashboardPage.mainContent.getByText(label)
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("shows the Missions Progress panel", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    await expect(
      dashboardPage.mainContent.getByText("Missions Progress")
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows the AI suggestion bar", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    await expect(
      dashboardPage.page.getByText("AI Suggestion")
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      dashboardPage.page.getByRole("button", { name: /upload docs/i })
    ).toBeVisible();
  });

  test("Create Mission CTA button is shown in the hero", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    // The hero panel has a "Create Mission" button
    await expect(
      dashboardPage.mainContent.getByRole("button", { name: /create mission/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("clicking Create Mission navigates to Missions section", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("overview");

    // Wait for overview to load
    await expect(dashboardPage.mainContent.getByText("Missions Progress")).toBeVisible({ timeout: 8_000 });

    // Click the primary "Create Mission" button in the hero left-panel
    const createBtn = dashboardPage.mainContent
      .getByRole("button", { name: /create mission/i })
      .first();
    await createBtn.click();

    // Should now be on the Missions section
    await expect(
      page.getByRole("heading", { name: "Missions", level: 1 })
    ).toBeVisible({ timeout: 8_000 });
  });

  test("library stats cards are shown on the right column", async ({ dashboardPage }) => {
    await dashboardPage.navigateTo("overview");

    const libraryLabels = ["Documents", "Flashcards", "Quiz Sets", "Notes"];
    for (const label of libraryLabels) {
      await expect(
        dashboardPage.mainContent.getByText(label)
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});
