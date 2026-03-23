import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Missions section (GoalsPage component).
 *
 * Missions are the top-level "big goals" concept in StudyBuddy. This POM
 * covers goal listing, creation via the modal, and status filter tabs.
 */
export class MissionsPage {
  readonly page: Page;

  /** Section heading */
  readonly heading: Locator;

  /** "New Mission" button in the header */
  readonly newMissionButton: Locator;

  /** Filter strip buttons */
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterPaused: Locator;
  readonly filterCompleted: Locator;
  readonly filterOverdue: Locator;

  /** "No missions yet" empty state */
  readonly emptyState: Locator;

  /** Create Mission modal */
  readonly modal: Locator;
  readonly modalTitleInput: Locator;
  readonly modalDescriptionInput: Locator;
  readonly modalDeadlineInput: Locator;
  readonly modalCreateButton: Locator;
  readonly modalCancelButton: Locator;

  /** Error banner inside the main section */
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Missions", level: 1 });
    this.newMissionButton = page.getByRole("button", { name: /new mission/i });

    // Filter tabs — the buttons are rendered as plain text labels
    this.filterAll = page.getByRole("button", { name: /^all$/i });
    this.filterActive = page.getByRole("button", { name: /^active$/i });
    this.filterPaused = page.getByRole("button", { name: /^paused$/i });
    this.filterCompleted = page.getByRole("button", { name: /^completed$/i });
    this.filterOverdue = page.getByRole("button", { name: /^overdue$/i });

    this.emptyState = page.getByText(/no missions yet/i);
    this.errorBanner = page.locator(".bg-red-500\\/10");

    // Modal elements — scoped to the modal dialog container
    this.modal = page.locator(".fixed.inset-0.z-\\[60\\]");
    this.modalTitleInput = page.getByPlaceholder(/mission title/i);
    this.modalDescriptionInput = page.getByPlaceholder(/description.*optional/i);
    this.modalDeadlineInput = page.locator('input[type="date"]');
    this.modalCreateButton = page.getByRole("button", { name: /create mission/i });
    this.modalCancelButton = page.getByRole("button", { name: /cancel/i });
  }

  /**
   * Open the "New Mission" modal and fill in the form.
   * Only title is required; description and deadline are optional.
   */
  async openCreateModal() {
    await this.newMissionButton.click();
    await expect(this.modal).toBeVisible();
  }

  async fillCreateForm(title: string, description?: string, deadline?: string) {
    await this.modalTitleInput.fill(title);
    if (description) await this.modalDescriptionInput.fill(description);
    if (deadline) await this.modalDeadlineInput.fill(deadline);
  }

  async submitCreateForm() {
    await this.modalCreateButton.click();
  }

  /**
   * Full flow: open modal → fill → submit.
   * Waits for the modal to close after submission.
   */
  async createMission(title: string, description?: string, deadline?: string) {
    await this.openCreateModal();
    await this.fillCreateForm(title, description, deadline);
    await this.submitCreateForm();
    // Modal should close when creation succeeds
    await expect(this.modal).not.toBeVisible({ timeout: 10_000 });
  }

  /** Return all rendered mission card containers. */
  getMissionCards() {
    // Goal cards have role="button" and contain the title text
    return this.page.locator('[role="button"]').filter({ hasText: /progress/i });
  }

  /** Return the card for a specific mission title. */
  getMissionCardByTitle(title: string) {
    return this.page.locator('[role="button"]').filter({ hasText: title });
  }

  /** Click a mission card to open its detail view. */
  async openMission(title: string) {
    await this.getMissionCardByTitle(title).click();
  }

  async assertVisible() {
    await expect(this.heading).toBeVisible();
  }
}
