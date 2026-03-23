import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Login page.
 *
 * The login form has no data-testid attributes, so we use stable semantic
 * selectors: label text, button text, and input types.
 */
export class LoginPage {
  readonly page: Page;

  /** Identifier (email/username) input */
  readonly identifierInput: Locator;

  /** Password input */
  readonly passwordInput: Locator;

  /** Submit button */
  readonly submitButton: Locator;

  /** Error banner shown after failed login */
  readonly errorBanner: Locator;

  /** "Sign up free" link */
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.identifierInput = page.locator('input[type="text"]').first();
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole("button", { name: /sign in/i });
    this.errorBanner = page.locator(".bg-red-500\\/10").first();
    this.signUpLink = page.getByRole("button", { name: /sign up free/i });
  }

  /** Navigate directly to the login page. */
  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  /** Fill credentials and submit the form. */
  async login(identifier: string, password: string) {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Assert the page heading is visible (quick smoke check). */
  async assertVisible() {
    await expect(this.page.getByText("Sign in to your")).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /** Assert an error banner with the given text fragment is shown. */
  async assertError(fragment: string) {
    await expect(this.errorBanner).toContainText(fragment);
  }
}
