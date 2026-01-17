import { Page, expect } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
}

export const TEST_USERS = {
  free: {
    email: `test-free-${Date.now()}@example.com`,
    password: "Test123!@#",
    name: "Test User Free",
    birthDate: "1990-01-01",
    birthTime: "12:00",
    birthCity: "Seoul",
  },
  premium: {
    email: `test-premium-${Date.now()}@example.com`,
    password: "Test123!@#",
    name: "Test User Premium",
    birthDate: "1985-05-15",
    birthTime: "14:30",
    birthCity: "Busan",
  },
};

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Register a new user through the UI
   */
  async registerUser(user: TestUser) {
    await this.page.goto("/auth/signin");

    // Look for registration link/button
    const registerLink = this.page.getByRole("link", { name: /회원가입|register|sign up/i });
    if (await registerLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await registerLink.click();
    } else {
      // Navigate directly to register page
      await this.page.goto("/auth/register");
    }

    // Fill registration form
    await this.page.fill('input[name="email"], input[type="email"]', user.email);
    await this.page.fill('input[name="password"], input[type="password"]', user.password);
    await this.page.fill('input[name="name"]', user.name);

    // Submit form
    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for redirect or success message
    await this.page.waitForURL(/\/(profile|myjourney|$)/, { timeout: 10000 }).catch(() => {});
  }

  /**
   * Login as an existing user
   */
  async login(email: string, password: string) {
    await this.page.goto("/auth/signin");

    await this.page.fill('input[name="email"], input[type="email"]', email);
    await this.page.fill('input[name="password"], input[type="password"]', password);

    const signInButton = this.page.locator('button[type="submit"]');
    await signInButton.click();

    await this.page.waitForURL(/\/(profile|myjourney|$)/, { timeout: 10000 }).catch(() => {});
  }

  /**
   * Fill birth information form (common across many features)
   */
  async fillBirthInfo(birthDate: string, birthTime: string, city: string) {
    // Fill date - try multiple common date input patterns
    const dateInput = this.page.locator('input[type="date"], input[name*="date"], input[placeholder*="날짜"], input[placeholder*="date"]').first();
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateInput.fill(birthDate);
    }

    // Fill time
    const timeInput = this.page.locator('input[type="time"], input[name*="time"], input[placeholder*="시간"], input[placeholder*="time"]').first();
    if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timeInput.fill(birthTime);
    }

    // Fill city/location
    const cityInput = this.page.locator('input[name*="city"], input[name*="location"], input[placeholder*="도시"], input[placeholder*="city"]').first();
    if (await cityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cityInput.fill(city);
      await this.page.waitForTimeout(500);

      // Try to select from dropdown if available
      const firstOption = this.page.locator('[role="option"], .suggestion-item, .city-option').first();
      if (await firstOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstOption.click();
      }
    }
  }

  /**
   * Wait for API response and check status
   */
  async waitForApiResponse(urlPattern: string | RegExp, expectedStatus = 200) {
    const response = await this.page.waitForResponse(
      (resp) => {
        const url = resp.url();
        const matches = typeof urlPattern === "string"
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        return matches;
      },
      { timeout: 30000 }
    );

    expect(response.status()).toBe(expectedStatus);
    return response;
  }

  /**
   * Check if user has premium status
   */
  async checkPremiumStatus(): Promise<boolean> {
    try {
      const response = await this.page.request.get("/api/me/premium", { timeout: 30000 });
      if (!response.ok()) return false;

      const data = await response.json();
      return data.isPremium === true;
    } catch {
      return false;
    }
  }

  /**
   * Get user's current credit balance
   */
  async getCreditBalance(): Promise<number> {
    try {
      const response = await this.page.request.get("/api/me/credits", { timeout: 30000 });
      if (!response.ok()) return 0;

      const data = await response.json();
      return data.credits || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Wait for element with text to be visible
   */
  async waitForText(text: string | RegExp, timeout = 10000) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout });
  }

  /**
   * Take a screenshot with a meaningful name
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `e2e-screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Clear all cookies and storage
   */
  async clearSession() {
    try {
      await this.page.context().clearCookies();
      await this.page.evaluate(() => {
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
      });
    } catch {
      // Ignore if page context not available
    }
  }

  /**
   * Mock premium user by setting session
   */
  async mockPremiumUser() {
    try {
      await this.page.evaluate(() => {
        try { localStorage.setItem("mock_premium", "true"); } catch { /* ignore */ }
      });
    } catch {
      // Ignore if page context not available
    }
  }

  /**
   * Add credits to user account (for testing)
   */
  async mockCredits(amount: number) {
    try {
      await this.page.evaluate((credits) => {
        try { localStorage.setItem("mock_credits", String(credits)); } catch { /* ignore */ }
      }, amount);
    } catch {
      // Ignore if page context not available
    }
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    const spinner = this.page.locator('[data-testid="loading"], .loading, .spinner, [role="progressbar"]');
    return spinner.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout = 30000) {
    const spinner = this.page.locator('[data-testid="loading"], .loading, .spinner, [role="progressbar"]');
    await spinner.waitFor({ state: "hidden", timeout }).catch(() => {});
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    const error = this.page.locator('[role="alert"], .error, .error-message');
    return error.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    const error = this.page.locator('[role="alert"], .error, .error-message').first();
    if (await error.isVisible({ timeout: 2000 }).catch(() => false)) {
      return error.textContent();
    }
    return null;
  }
}
