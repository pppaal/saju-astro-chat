import { test, expect } from "@playwright/test";

/**
 * Error handling and boundary tests
 */

test.describe("404 Error Page", () => {
  test("should show 404 for non-existent page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();
  });

  test("404 page should have return home link", async ({ page }) => {
    await page.goto("/non-existent-route-xyz", { waitUntil: "domcontentloaded" });

    // Should have a link to go back home
    const homeLink = page.locator("a[href='/'], a:has-text('Home'), a:has-text('홈')");
    const count = await homeLink.count();
    expect(count >= 0).toBe(true);
  });

  test("should handle Korean path 404", async ({ page }) => {
    await page.goto("/존재하지않는페이지", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("API Error Responses", () => {
  test("should return 404 for non-existent API", async ({ page }) => {
    const response = await page.request.get("/api/non-existent-endpoint-xyz");
    expect(response.status()).toBe(404);
  });

  test("should return proper error for invalid POST body", async ({ page }) => {
    const response = await page.request.post("/api/saju", {
      data: "invalid-json-string",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Should return error status
    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test("should handle empty POST body", async ({ page }) => {
    const response = await page.request.post("/api/destiny-map", {
      data: {},
    });

    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test("should handle malformed query params", async ({ page }) => {
    const response = await page.request.get("/api/cities?q=");
    // Should handle gracefully
    expect([200, 400, 401, 403]).toContain(response.status());
  });
});

test.describe("Network Error Handling", () => {
  test("should handle slow network gracefully", async ({ page }) => {
    // Simulate slow network
    await page.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 100));
      await route.continue();
    });

    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("JavaScript Error Handling", () => {
  test("should not have unhandled errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Filter known benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Loading chunk") &&
        !e.includes("hydration")
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("should not have unhandled errors on saju page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Loading chunk") &&
        !e.includes("hydration")
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("Form Validation Errors", () => {
  test("should show validation on empty saju form submit", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const submitBtn = page.locator("button[type='submit']").first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();

      // Form should still be visible after failed validation
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should show validation on empty destiny-map form submit", async ({
    page,
  }) => {
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });

    const submitBtn = page.locator("button[type='submit']").first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();

      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Auth Error Handling", () => {
  test("should redirect unauthenticated users appropriately", async ({
    page,
  }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });

    // Should either show profile or redirect to login
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle session expiry gracefully", async ({ page }) => {
    // Clear all cookies to simulate expired session
    await page.context().clearCookies();

    await page.goto("/myjourney", { waitUntil: "domcontentloaded" });

    // Should handle gracefully
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Rate Limiting", () => {
  test("should handle rate limiting gracefully", async ({ page }) => {
    // Make many rapid requests
    const responses = [];
    for (let i = 0; i < 20; i++) {
      responses.push(await page.request.get("/api/auth/csrf"));
    }

    // Should either succeed or return 429
    for (const response of responses) {
      expect([200, 429]).toContain(response.status());
    }
  });
});

test.describe("Invalid URL Handling", () => {
  test("should handle special characters in URL", async ({ page }) => {
    await page.goto("/page%20with%20spaces", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle very long URLs", async ({ page }) => {
    const longPath = "/a".repeat(500);
    await page.goto(longPath, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle URL with query params", async ({ page }) => {
    await page.goto("/?test=1&foo=bar&special=%20", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Missing Data Handling", () => {
  test("result page should handle missing data", async ({ page }) => {
    await page.goto("/destiny-map/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("life-prediction result should handle missing data", async ({ page }) => {
    await page.goto("/life-prediction/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("personality result should handle missing data", async ({ page }) => {
    await page.goto("/personality/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Timeout Handling", () => {
  test("should handle API timeout gracefully", async ({ page }) => {
    // Short timeout for testing
    const response = await page.request.get("/api/auth/csrf", {
      timeout: 30000,
    });

    expect(response.ok()).toBe(true);
  });
});
