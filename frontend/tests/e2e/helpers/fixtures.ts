import { test as base } from "@playwright/test";
import { setupAuthenticatedSession } from "./auth";
import { DashboardPage } from "../pages/DashboardPage";
import { MissionsPage } from "../pages/MissionsPage";
import { DocumentsPage } from "../pages/DocumentsPage";

/**
 * Extended test fixture that provides pre-authenticated page objects.
 *
 * Usage:
 *   import { test } from "../helpers/fixtures";
 *
 *   test("my test", async ({ dashboardPage, missionsPage }) => { ... });
 */
type StudyBuddyFixtures = {
  /** Page navigated to /dashboard with a valid session token */
  dashboardPage: DashboardPage;
  missionsPage: MissionsPage;
  documentsPage: DocumentsPage;
};

export const test = base.extend<StudyBuddyFixtures>({
  dashboardPage: async ({ page }, use) => {
    await setupAuthenticatedSession(page);
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await use(dashboardPage);
  },

  missionsPage: async ({ page }, use) => {
    await setupAuthenticatedSession(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateTo("missions");
    const missionsPage = new MissionsPage(page);
    await use(missionsPage);
  },

  documentsPage: async ({ page }, use) => {
    await setupAuthenticatedSession(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    // Documents are accessible via the sidebar → we reach them through
    // the Missions detail → Workspace flow, but for isolation purposes
    // we just navigate directly after auth.
    await use(new DocumentsPage(page));
  },
});

export { expect } from "@playwright/test";
