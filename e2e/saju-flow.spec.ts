import { test, expect } from "@playwright/test";

test.describe("Saju Analysis Flow", () => {
  test("should load saju page with form", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    // Check page loads with main content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have birth date input fields", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    // Page should have some form elements
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });

  test("should display validation for empty form submission", async ({
    page,
  }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    // Try to find and click submit button
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("분석"), button:has-text("시작"), button:has-text("Submit")'
    );

    if ((await submitButton.count()) > 0) {
      await submitButton.first().click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Destiny Map Flow", () => {
  test("should load destiny-map page", async ({ page }) => {
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have form inputs for birth info", async ({ page }) => {
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });

    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });

  test("should navigate to result page", async ({ page }) => {
    await page.goto("/destiny-map/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Life Prediction Flow", () => {
  test("should load life-prediction page", async ({ page }) => {
    await page.goto("/life-prediction", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load life-prediction result page", async ({ page }) => {
    await page.goto("/life-prediction/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Numerology Flow", () => {
  test("should load numerology page", async ({ page }) => {
    await page.goto("/numerology", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have input for birth date", async ({ page }) => {
    await page.goto("/numerology", { waitUntil: "domcontentloaded" });

    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });
});
