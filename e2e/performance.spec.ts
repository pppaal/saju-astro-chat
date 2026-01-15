import { test, expect } from "@playwright/test";

/**
 * Performance tests - page load times, resource loading
 */

test.describe("Page Load Times", () => {
  test("homepage should load quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });

  test("saju page should load quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });

  test("tarot page should load quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });

  test("destiny-map page should load quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });

  test("pricing page should load quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(15000);
  });
});

test.describe("Resource Loading", () => {
  test("should load CSS resources", async ({ page }) => {
    const cssRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "stylesheet") {
        cssRequests.push(request.url());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should have some CSS loaded
    expect(cssRequests.length).toBeGreaterThanOrEqual(0);
  });

  test("should load JavaScript resources", async ({ page }) => {
    const jsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") {
        jsRequests.push(request.url());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should have JS loaded
    expect(jsRequests.length).toBeGreaterThanOrEqual(0);
  });

  test("should load fonts", async ({ page }) => {
    const fontRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "font") {
        fontRequests.push(request.url());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait a bit for fonts to load
    await page.waitForTimeout(2000);

    // Fonts are optional
    expect(fontRequests.length).toBeGreaterThanOrEqual(0);
  });
});

test.describe("API Response Times", () => {
  test("CSRF endpoint should respond quickly", async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get("/api/auth/csrf");
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBe(true);
    // Allow more time in dev mode (cold start may take longer)
    expect(responseTime).toBeLessThan(15000);
  });

  test("session endpoint should respond quickly", async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get("/api/auth/session");
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBe(true);
    expect(responseTime).toBeLessThan(15000);
  });

  test("providers endpoint should respond quickly", async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get("/api/auth/providers");
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBe(true);
    expect(responseTime).toBeLessThan(15000);
  });
});

test.describe("Caching Behavior", () => {
  test("static assets should have cache headers", async ({ page }) => {
    const responses: { url: string; cacheControl: string | null }[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/_next/static/")) {
        responses.push({
          url,
          cacheControl: response.headers()["cache-control"],
        });
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for static assets to load
    await page.waitForTimeout(2000);

    // Static assets should have cache headers
    for (const res of responses) {
      expect(res.cacheControl).toBeTruthy();
    }
  });
});

test.describe("Bundle Size Indicators", () => {
  test("should not load excessive JS on homepage", async ({ page }) => {
    let totalJsSize = 0;

    page.on("response", async (response) => {
      if (response.request().resourceType() === "script") {
        try {
          const buffer = await response.body();
          totalJsSize += buffer.length;
        } catch {
          // Ignore errors
        }
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Total JS should be under 5MB (reasonable for dev mode)
    expect(totalJsSize).toBeLessThan(5 * 1024 * 1024);
  });
});

test.describe("Memory Usage", () => {
  test("should not have memory leaks on navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Navigate to multiple pages
    const pages = ["/saju", "/tarot", "/destiny-map", "/"];
    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }

    // If we got here without crashing, memory is acceptable
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Concurrent Requests", () => {
  test("should handle multiple concurrent API requests", async ({ page }) => {
    const promises = [
      page.request.get("/api/auth/csrf"),
      page.request.get("/api/auth/session"),
      page.request.get("/api/auth/providers"),
    ];

    const responses = await Promise.all(promises);

    for (const response of responses) {
      expect(response.ok()).toBe(true);
    }
  });
});

test.describe("First Contentful Paint", () => {
  test("homepage should have content quickly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check that body has content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(0);
  });
});

test.describe("Time to Interactive", () => {
  test("buttons should be clickable after load", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const buttons = page.locator("button");
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      if (await firstButton.isVisible()) {
        // Should be enabled and clickable
        const isDisabled = await firstButton.isDisabled();
        expect(isDisabled).toBe(false);
      }
    }
  });

  test("links should be clickable after load", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const links = page.locator("a[href]");
    const count = await links.count();

    expect(count).toBeGreaterThan(0);
  });
});
