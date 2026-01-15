import { test, expect } from "@playwright/test";

test.describe("Homepage & Navigation", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check page loads without errors
    await expect(page).toHaveTitle(/DestinyPal|사주|Saju|Astro/i);

    // Check main content is visible
    const mainContent = page.locator("main, body");
    await expect(mainContent.first()).toBeVisible();
  });

  test("should display navigation menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check navigation or header is present
    const nav = page.locator("nav, header, [role='navigation']");
    await expect(nav.first()).toBeVisible();
  });

  test("should navigate to key pages", async ({ page }) => {
    // Navigate to saju page
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Navigate to tarot page
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Navigate to destiny-map page
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check page renders on mobile viewport
    await expect(page.locator("body")).toBeVisible();

    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test("should have proper meta tags for SEO", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute("content", /width=device-width/);
  });
});

test.describe("Static Pages", () => {
  test("should load about page", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load pricing page", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load FAQ page", async ({ page }) => {
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load privacy policy", async ({ page }) => {
    await page.goto("/policy/privacy", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load terms of service", async ({ page }) => {
    await page.goto("/policy/terms", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
