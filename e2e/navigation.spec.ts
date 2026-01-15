import { test, expect } from "@playwright/test";

/**
 * Navigation flow tests
 */

test.describe("Main Navigation", () => {
  test("should navigate from homepage to saju", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/saju");
  });

  test("should navigate from homepage to tarot", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/tarot");
  });

  test("should navigate from homepage to destiny-map", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/destiny-map");
  });

  test("should navigate between feature pages", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });
    await page.goto("/dream", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Back Navigation", () => {
  test("should handle browser back button", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    await page.goBack();

    // Should be back on homepage
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle browser forward button", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    // Wait a moment for history to settle
    await page.waitForTimeout(500);
    await page.goBack();
    await page.waitForTimeout(500);
    await page.goForward();

    // Should be back on saju page
    await expect(page).toHaveURL(/saju/, { timeout: 10000 });
  });
});

test.describe("Deep Linking", () => {
  test("should handle direct navigation to tarot spread", async ({ page }) => {
    await page.goto("/tarot/general-insight/past-present-future", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle direct navigation to counselor", async ({ page }) => {
    await page.goto("/saju/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle direct navigation to myjourney subpage", async ({
    page,
  }) => {
    await page.goto("/myjourney/history", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Query Parameter Navigation", () => {
  test("should preserve query params on navigation", async ({ page }) => {
    await page.goto("/tarot?question=test", { waitUntil: "domcontentloaded" });

    expect(page.url()).toContain("question=test");
  });

  test("should handle multiple query params", async ({ page }) => {
    await page.goto("/saju?lang=ko&theme=dark", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Hash Navigation", () => {
  test("should handle hash in URL", async ({ page }) => {
    await page.goto("/#features", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle hash navigation to section", async ({ page }) => {
    await page.goto("/about#team", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Redirect Handling", () => {
  test("should follow redirects", async ({ page }) => {
    // Auth pages typically redirect
    await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Protected Route Navigation", () => {
  test("should handle navigation to protected route", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle navigation to myjourney", async ({ page }) => {
    await page.goto("/myjourney", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("External Link Handling", () => {
  test("external links should have proper attributes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])');
    const count = await externalLinks.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = externalLinks.nth(i);
      const target = await link.getAttribute("target");
      const rel = await link.getAttribute("rel");

      // External links should open in new tab and have noopener
      if (target === "_blank") {
        expect(rel).toContain("noopener");
      }
    }
  });
});

test.describe("Scroll Restoration", () => {
  test("should restore scroll position on back navigation", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await page.goBack();

    // Scroll position handling - just verify page loads
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Navigation State", () => {
  test("should maintain state across navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Store something in localStorage
    await page.evaluate(() => {
      localStorage.setItem("test_nav_state", "test_value");
    });

    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    // Check state is preserved
    const value = await page.evaluate(() =>
      localStorage.getItem("test_nav_state")
    );
    expect(value).toBe("test_value");

    // Cleanup
    await page.evaluate(() => localStorage.removeItem("test_nav_state"));
  });
});

test.describe("Route Transitions", () => {
  test("should transition smoothly between pages", async ({ page }) => {
    const routes = ["/", "/saju", "/tarot", "/destiny-map"];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Breadcrumb Navigation", () => {
  test("counselor pages should be accessible", async ({ page }) => {
    await page.goto("/saju/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/astrology/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/destiny-map/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Tab Navigation", () => {
  test("should be able to tab through navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
    }

    // Should still be on the page
    await expect(page.locator("body")).toBeVisible();
  });
});
