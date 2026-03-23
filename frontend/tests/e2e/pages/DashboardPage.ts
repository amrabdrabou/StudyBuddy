import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Dashboard shell.
 *
 * The sidebar is the primary navigation surface. There are no data-testid
 * attributes in the current codebase, so we use the label text that
 * ROOT_NAV defines: "Overview", "Missions", "Study Groups", plus "Settings"
 * at the bottom.
 */
export class DashboardPage {
  readonly page: Page;

  /** Sidebar navigation buttons */
  readonly overviewNav: Locator;
  readonly missionsNav: Locator;
  readonly studyGroupsNav: Locator;
  readonly settingsNav: Locator;
  readonly signOutButton: Locator;

  /** The "StudyBuddy" logo text in the sidebar */
  readonly sidebarLogo: Locator;

  /** Main content area */
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overviewNav = page.getByRole("button", { name: "Overview" });
    this.missionsNav = page.getByRole("button", { name: "Missions" });
    this.studyGroupsNav = page.getByRole("button", { name: "Study Groups" });
    this.settingsNav = page.getByRole("button", { name: "Settings" });
    // Sign-out button has a title attribute
    this.signOutButton = page.locator('button[title="Sign out"]');
    this.sidebarLogo = page.locator("aside").getByText("StudyBuddy");
    this.mainContent = page.locator("main");
  }

  async goto() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  /** Click a sidebar nav item and wait for the content area to update. */
  async navigateTo(section: "overview" | "missions" | "groups" | "settings") {
    const map: Record<string, Locator> = {
      overview: this.overviewNav,
      missions: this.missionsNav,
      groups: this.studyGroupsNav,
      settings: this.settingsNav,
    };
    await map[section].click();
    // Give React time to re-render the new section
    await this.page.waitForLoadState("domcontentloaded");
  }

  /** Assert the sidebar is rendered. */
  async assertSidebarVisible() {
    await expect(this.sidebarLogo).toBeVisible();
    await expect(this.overviewNav).toBeVisible();
    await expect(this.missionsNav).toBeVisible();
  }

  /** Assert a heading in the main content area. */
  async assertSectionHeading(text: string | RegExp) {
    await expect(this.mainContent.getByRole("heading", { name: text })).toBeVisible();
  }
}
