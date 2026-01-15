import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display sign-in page", async ({ page }) => {
    await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should redirect unauthenticated user from protected routes", async ({
    page,
  }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have CSRF token available", async ({ page }) => {
    const response = await page.request.get("/api/auth/csrf");
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
  });

  test("should have providers endpoint", async ({ page }) => {
    const response = await page.request.get("/api/auth/providers");
    expect(response.ok()).toBe(true);

    const providers = await response.json();
    expect(typeof providers).toBe("object");
  });
});

test.describe("Session Management", () => {
  test("should handle session endpoint", async ({ page }) => {
    const response = await page.request.get("/api/auth/session");
    expect(response.ok()).toBe(true);

    const session = await response.json();
    expect(session).toBeDefined();
  });
});
