import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for the Registration page.
 */
export class RegisterPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly usernameInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    // Inputs are identified by their placeholder text, which is stable.
    this.emailInput = page.getByPlaceholder("you@example.com");
    this.usernameInput = page.getByPlaceholder(/username/i);
    this.firstNameInput = page.getByPlaceholder(/first name/i);
    this.lastNameInput = page.getByPlaceholder(/last name/i);
    // password inputs ordered as they appear in the DOM
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.submitButton = page.getByRole("button", { name: /create account|sign up|register/i });
    this.errorBanner = page.locator(".bg-red-500\\/10").first();
    this.signInLink = page.getByRole("button", { name: /sign in/i }).first();
  }

  async goto() {
    await this.page.goto("/register");
    await this.page.waitForLoadState("networkidle");
  }

  async register(data: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    password: string;
    confirmPassword?: string;
  }) {
    await this.emailInput.fill(data.email);
    if (data.username) await this.usernameInput.fill(data.username);
    if (data.firstName) await this.firstNameInput.fill(data.firstName);
    if (data.lastName) await this.lastNameInput.fill(data.lastName);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword ?? data.password);
    await this.submitButton.click();
  }

  async assertVisible() {
    await expect(this.page.getByText(/create.*account|join|register/i).first()).toBeVisible();
  }

  async assertError(fragment: string) {
    await expect(this.errorBanner).toContainText(fragment);
  }
}
