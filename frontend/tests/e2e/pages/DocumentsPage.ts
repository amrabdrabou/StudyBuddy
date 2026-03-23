import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import path from "path";

/**
 * Page Object Model for the Documents section (DocumentsSection component).
 *
 * Documents live inside workspaces. The section loads the first available
 * workspace on mount and lets users switch via a workspace picker.
 */
export class DocumentsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly uploadButton: Locator;

  /** Upload modal */
  readonly uploadModal: Locator;
  readonly fileDropZone: Locator;
  readonly fileInput: Locator;
  readonly uploadSubmitButton: Locator;
  readonly uploadCancelButton: Locator;
  readonly uploadErrorText: Locator;

  /** "No workspaces yet" empty state */
  readonly noWorkspacesState: Locator;

  /** "No documents yet" empty state */
  readonly noDocumentsState: Locator;

  /** Document count label */
  readonly docCountLabel: Locator;

  /** Delete confirmation modal */
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  /** Filter tabs */
  readonly filterAll: Locator;
  readonly filterReady: Locator;
  readonly filterProcessing: Locator;
  readonly filterFailed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Documents", level: 1 });
    // Upload button: text is "Upload" with a plus icon
    this.uploadButton = page.getByRole("button", { name: /^upload$/i });

    this.uploadModal = page.locator(".fixed.inset-0.z-\\[60\\]");
    this.fileDropZone = page.locator(".border-dashed");
    this.fileInput = page.locator('input[type="file"]');
    this.uploadSubmitButton = page.getByRole("button", { name: /^upload$/i }).last();
    this.uploadCancelButton = page.getByRole("button", { name: /cancel/i });
    this.uploadErrorText = page.locator(".text-red-400").first();

    this.noWorkspacesState = page.getByText(/no workspaces yet/i);
    this.noDocumentsState = page.getByText(/no documents yet/i);
    this.docCountLabel = page.locator("p").filter({ hasText: /document/ }).first();

    this.deleteModal = page.locator(".fixed.inset-0.z-\\[60\\]");
    this.deleteConfirmButton = page.getByRole("button", { name: /^delete$/i });
    this.deleteCancelButton = page.getByRole("button", { name: /cancel/i });

    this.filterAll = page.getByRole("button", { name: /^all/i }).first();
    this.filterReady = page.getByRole("button", { name: /^ready/i });
    this.filterProcessing = page.getByRole("button", { name: /^processing/i });
    this.filterFailed = page.getByRole("button", { name: /^failed/i });
  }

  async assertVisible() {
    await expect(this.heading).toBeVisible();
  }

  async openUploadModal() {
    await this.uploadButton.click();
    await expect(this.uploadModal).toBeVisible();
  }

  /**
   * Upload a file by providing an absolute path to a file on disk.
   * Uses setInputFiles which bypasses the click-to-open-dialog step.
   */
  async uploadFile(absoluteFilePath: string) {
    await this.openUploadModal();
    await this.fileInput.setInputFiles(absoluteFilePath);
    // The file name should now be visible in the drop zone
    const filename = path.basename(absoluteFilePath);
    await expect(this.page.getByText(filename)).toBeVisible();
    // Click the modal-level Upload button (not the header button)
    await this.page
      .locator(".fixed.inset-0.z-\\[60\\]")
      .getByRole("button", { name: /^upload$/i })
      .click();
    // Modal closes on success
    await expect(this.uploadModal).not.toBeVisible({ timeout: 15_000 });
  }

  /** Get all document card elements currently rendered. */
  getDocumentCards() {
    return this.page.locator(".grid > div").filter({ hasText: /\.(pdf|docx|txt|png|jpg)/i });
  }
}
