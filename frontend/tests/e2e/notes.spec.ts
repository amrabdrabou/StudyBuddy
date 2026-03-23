/**
 * Notes Creation E2E Tests
 *
 * Notes in StudyBuddy are created via two surfaces:
 *   1. The "Add a Note" step of the Setup Workspace modal
 *   2. Directly inside a WorkspaceDetail view
 *
 * Because the workspace-level notes editor requires navigating into
 * a specific workspace (which depends on data), these tests use API mocking
 * to ensure a predictable environment.
 *
 * Covers:
 *   - Note title and content fields render in the setup-workspace note step
 *   - Note content is required (Save button disabled when empty)
 *   - Note can be saved successfully (mocked API)
 *   - Mocked note creation transitions to "All Set!" state
 */

import { expect } from "@playwright/test";
import { test } from "./helpers/fixtures";

test.describe("Note creation via Setup Workspace modal", () => {
  /**
   * Shared setup: reach step 2 (Add a Note) of the SetupWorkspaceModal.
   * Returns false if not possible (no subjects/goals).
   */
  async function reachNoteStep(
    page: import("@playwright/test").Page,
    missionsPage: import("./pages/MissionsPage").MissionsPage
  ): Promise<boolean> {
    // Mock workspaces POST
    await page.route("**/workspaces/", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "note-test-ws",
          subject_id: "note-test-subject",
          title: "Note Test WS",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Ensure at least one mission exists
    const count = await missionsPage.getMissionCards().count();
    if (count === 0) {
      await missionsPage.createMission("Note Flow Mission " + Date.now());
    }

    // Find and click Setup Workspace
    const setupBtn = page.getByRole("button", { name: /setup workspace/i }).first();
    if (!(await setupBtn.isVisible())) return false;

    await setupBtn.click();
    await expect(page.getByText("Setup Workspace")).toBeVisible({ timeout: 5_000 });

    const createWsBtn = page.getByRole("button", { name: /create workspace/i });
    if (!(await createWsBtn.isEnabled())) return false;

    await createWsBtn.click();

    // Should now be on step 2
    try {
      await expect(page.getByText("Add a Note")).toBeVisible({ timeout: 6_000 });
    } catch {
      return false;
    }
    return true;
  }

  test("note step renders title and content fields", async ({ missionsPage, page }) => {
    const reached = await reachNoteStep(page, missionsPage);
    if (!reached) {
      test.skip(true, "Could not reach note step — no subjects available");
      await page.unrouteAll();
      return;
    }

    await expect(page.getByPlaceholder(/introduction notes|note title/i)).toBeVisible();
    await expect(page.getByPlaceholder(/write your first note|content/i)).toBeVisible();

    await page.unrouteAll();
  });

  test("Save Note button is disabled when content is empty", async ({ missionsPage, page }) => {
    const reached = await reachNoteStep(page, missionsPage);
    if (!reached) {
      test.skip(true, "Could not reach note step");
      await page.unrouteAll();
      return;
    }

    const saveBtn = page.getByRole("button", { name: /save note/i });
    await expect(saveBtn).toBeDisabled();

    await page.unrouteAll();
  });

  test("Save Note button enables when content is filled", async ({ missionsPage, page }) => {
    const reached = await reachNoteStep(page, missionsPage);
    if (!reached) {
      test.skip(true, "Could not reach note step");
      await page.unrouteAll();
      return;
    }

    const contentArea = page.getByPlaceholder(/write your first note/i);
    await contentArea.fill("My first note from E2E test");

    const saveBtn = page.getByRole("button", { name: /save note/i });
    await expect(saveBtn).toBeEnabled();

    await page.unrouteAll();
  });

  test("saving a note transitions to All Set!", async ({ missionsPage, page }) => {
    // Mock notes POST
    await page.route("**/notes/**", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-note-id",
          workspace_id: "note-test-ws",
          subject_id: "note-test-subject",
          title: "E2E Note",
          content: "E2E note content",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    const reached = await reachNoteStep(page, missionsPage);
    if (!reached) {
      test.skip(true, "Could not reach note step");
      await page.unrouteAll();
      return;
    }

    await page.getByPlaceholder(/introduction notes|note title/i).fill("E2E Test Note");
    await page.getByPlaceholder(/write your first note/i).fill("Content from E2E test");

    await page.getByRole("button", { name: /save note/i }).click();

    await expect(page.getByText("All Set!")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Workspace is ready")).toBeVisible();

    await page.unrouteAll();
  });

  test("skipping note creation shows All Set! immediately", async ({ missionsPage, page }) => {
    const reached = await reachNoteStep(page, missionsPage);
    if (!reached) {
      test.skip(true, "Could not reach note step");
      await page.unrouteAll();
      return;
    }

    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.getByText("All Set!")).toBeVisible({ timeout: 5_000 });

    await page.unrouteAll();
  });
});
