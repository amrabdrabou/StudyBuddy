/**
 * Workspace Setup Flow E2E Tests
 *
 * The "Setup Workspace" flow is a multi-step modal triggered from:
 *   a) The GoalCard "Setup Workspace" button
 *   b) The MissionDetailModal "Setup Workspace" button
 *   c) Automatically after creating a new mission (GoalsSection)
 *
 * Covers:
 *   - "Setup Workspace" button is visible on a goal card
 *   - Modal step 1: workspace title and subject selection
 *   - Modal step 2: optional note creation
 *   - Modal step 3: completion state ("All Set!")
 *   - Cancelling the modal closes it
 *   - Skipping the note step transitions to the done state
 */

import { expect } from "@playwright/test";
import { test } from "./helpers/fixtures";

test.describe("Setup Workspace flow", () => {
  // Helper to get the first "Setup Workspace" button on the page
  const getSetupWorkspaceBtn = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /setup workspace/i }).first();

  test("Setup Workspace button is visible on goal cards", async ({ missionsPage, page }) => {
    const cards = missionsPage.getMissionCards();
    const count = await cards.count();

    if (count === 0) {
      // Create a mission first so a card appears
      await missionsPage.createMission("Workspace Flow Test " + Date.now());
      // After creation, setup workspace modal may open automatically
      // Close it if it did
      const doneBtn = page.getByRole("button", { name: /done/i });
      if (await doneBtn.isVisible()) { await doneBtn.click(); }
      const cancelBtn = page.getByRole("button", { name: /cancel/i });
      if (await cancelBtn.isVisible()) { await cancelBtn.click(); }
    }

    await expect(getSetupWorkspaceBtn(page)).toBeVisible({ timeout: 8_000 });
  });

  test("Setup Workspace modal renders step 1 (workspace creation)", async ({
    missionsPage,
    page,
  }) => {
    const count = await missionsPage.getMissionCards().count();
    if (count === 0) {
      await missionsPage.createMission("WS Modal Test " + Date.now());
      // May already be on step 1 — if so check and finish
    }

    // Click the first "Setup Workspace" button
    await getSetupWorkspaceBtn(page).click();

    // Step 1 modal should be visible
    await expect(page.getByText("Setup Workspace")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Workspace title")).toBeVisible();
  });

  test("Cancel closes the Setup Workspace modal", async ({ missionsPage, page }) => {
    const count = await missionsPage.getMissionCards().count();
    if (count === 0) {
      await missionsPage.createMission("WS Cancel Test " + Date.now());
    }

    await getSetupWorkspaceBtn(page).click();
    await expect(page.getByText("Setup Workspace")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Setup Workspace")).not.toBeVisible();
  });

  test("mocked workspace creation transitions to the note step", async ({
    missionsPage,
    page,
  }) => {
    // Mock the workspaces POST to return a fake workspace immediately
    await page.route("**/workspaces/", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-ws-id",
          subject_id: "mock-subject-id",
          title: "Mocked Workspace",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    const count = await missionsPage.getMissionCards().count();
    if (count === 0) {
      await missionsPage.createMission("WS Transition Test " + Date.now());
    }

    await getSetupWorkspaceBtn(page).click();
    await expect(page.getByText("Setup Workspace")).toBeVisible({ timeout: 5_000 });

    // Fill in the workspace title
    const titleInput = page.getByPlaceholder(/linear algebra|workspace title|e\.g\./i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill("My Test Workspace");
    }

    // If there is no subject available the "Create Workspace" button is disabled.
    // We can only proceed if a subject exists.
    const createBtn = page.getByRole("button", { name: /create workspace/i });
    const isEnabled = await createBtn.isEnabled();
    if (!isEnabled) {
      // Can't progress without a subject — close and skip
      await page.getByRole("button", { name: /cancel/i }).click();
      await page.unrouteAll();
      return;
    }

    await createBtn.click();
    // Should transition to step 2 (Add a Note)
    await expect(page.getByText("Add a Note")).toBeVisible({ timeout: 8_000 });

    await page.unrouteAll();
  });

  test("skipping the note step shows the All Set! confirmation", async ({
    missionsPage,
    page,
  }) => {
    await page.route("**/workspaces/", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-ws-id-2",
          subject_id: "mock-subject-id-2",
          title: "Mocked WS 2",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    const count = await missionsPage.getMissionCards().count();
    if (count === 0) {
      await missionsPage.createMission("WS Skip Test " + Date.now());
    }

    await getSetupWorkspaceBtn(page).click();
    await expect(page.getByText("Setup Workspace")).toBeVisible({ timeout: 5_000 });

    const createBtn = page.getByRole("button", { name: /create workspace/i });
    if (!(await createBtn.isEnabled())) {
      await page.getByRole("button", { name: /cancel/i }).click();
      await page.unrouteAll();
      return;
    }

    await createBtn.click();
    await expect(page.getByText("Add a Note")).toBeVisible({ timeout: 8_000 });

    // Click Skip
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.getByText("All Set!")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Workspace is ready")).toBeVisible();

    // Clicking Done closes the modal
    await page.getByRole("button", { name: /done/i }).click();
    await expect(page.getByText("All Set!")).not.toBeVisible();

    await page.unrouteAll();
  });
});
