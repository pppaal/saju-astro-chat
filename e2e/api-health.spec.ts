import { test, expect } from "@playwright/test";

test.describe("API Health Checks", () => {
  test("should respond to auth endpoints", async ({ page }) => {
    const csrfResponse = await page.request.get("/api/auth/csrf");
    expect(csrfResponse.ok()).toBe(true);

    const providersResponse = await page.request.get("/api/auth/providers");
    expect(providersResponse.ok()).toBe(true);

    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.ok()).toBe(true);
  });

  test("should return proper content types", async ({ page }) => {
    const response = await page.request.get("/api/auth/csrf");
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("should handle 404 for non-existent API routes", async ({ page }) => {
    const response = await page.request.get("/api/non-existent-route-xyz");
    expect([404, 405]).toContain(response.status());
  });
});

test.describe("Page Load Performance", () => {
  test("homepage should load within reasonable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(30000);
  });

  test("saju page should load within reasonable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(30000);
  });
});

test.describe("Error Handling", () => {
  test("should handle missing pages gracefully", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible();
  });
});
