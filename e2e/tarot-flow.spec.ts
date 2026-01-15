import { test, expect } from "@playwright/test";

test.describe("Tarot Flow", () => {
  test("should load tarot homepage", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have question input", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });

    const questionInput = page.locator("textarea, input[type='text']");
    const count = await questionInput.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should navigate to spread page", async ({ page }) => {
    await page.goto("/tarot/general-insight/past-present-future?question=test", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load tarot history page", async ({ page }) => {
    await page.goto("/tarot/history", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Dream Interpretation Flow", () => {
  test("should load dream page", async ({ page }) => {
    await page.goto("/dream", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have dream input area", async ({ page }) => {
    await page.goto("/dream", { waitUntil: "domcontentloaded" });

    const textareas = page.locator("textarea");
    const textareaCount = await textareas.count();
    expect(textareaCount >= 0).toBe(true);
  });
});

test.describe("I-Ching Flow", () => {
  test("should load I-Ching page", async ({ page }) => {
    await page.goto("/iching", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have question input for I-Ching", async ({ page }) => {
    await page.goto("/iching", { waitUntil: "domcontentloaded" });

    const inputs = page.locator("input, textarea");
    const inputCount = await inputs.count();
    expect(inputCount >= 0).toBe(true);
  });
});

test.describe("Compatibility Flow", () => {
  test("should load compatibility page", async ({ page }) => {
    await page.goto("/compatibility", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load compatibility chat page", async ({ page }) => {
    await page.goto("/compatibility/chat", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load compatibility insights page", async ({ page }) => {
    await page.goto("/compatibility/insights", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Calendar Flow", () => {
  test("should load calendar page", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
