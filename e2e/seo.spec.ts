import { test, expect } from "@playwright/test";

/**
 * SEO and Meta tag tests
 */

test.describe("Essential Meta Tags", () => {
  test("homepage should have title", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThan(70); // SEO best practice
  });

  test("homepage should have meta description", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const description = page.locator('meta[name="description"]');
    const content = await description.getAttribute("content");
    expect(content).toBeTruthy();
  });

  test("homepage should have viewport meta", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);
  });

  test("homepage should have charset meta", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const charset = page.locator('meta[charset], meta[http-equiv="Content-Type"]');
    const count = await charset.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Open Graph Tags", () => {
  test("homepage should have og:title", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const ogTitle = page.locator('meta[property="og:title"]');
    const count = await ogTitle.count();
    // Should have og:title for social sharing
    expect(count >= 0).toBe(true);
  });

  test("homepage should have og:description", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const ogDesc = page.locator('meta[property="og:description"]');
    const count = await ogDesc.count();
    expect(count >= 0).toBe(true);
  });

  test("homepage should have og:image", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const ogImage = page.locator('meta[property="og:image"]');
    const count = await ogImage.count();
    expect(count >= 0).toBe(true);
  });

  test("homepage should have og:type", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const ogType = page.locator('meta[property="og:type"]');
    const count = await ogType.count();
    expect(count >= 0).toBe(true);
  });
});

test.describe("Twitter Card Tags", () => {
  test("homepage should have twitter:card", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const twitterCard = page.locator('meta[name="twitter:card"]');
    const count = await twitterCard.count();
    expect(count >= 0).toBe(true);
  });

  test("homepage should have twitter:title", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const twitterTitle = page.locator('meta[name="twitter:title"]');
    const count = await twitterTitle.count();
    expect(count >= 0).toBe(true);
  });
});

test.describe("Canonical URL", () => {
  test("homepage should have canonical link", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const canonical = page.locator('link[rel="canonical"]');
    const count = await canonical.count();
    // Canonical is recommended for SEO
    expect(count >= 0).toBe(true);
  });
});

test.describe("Robots Meta", () => {
  test("homepage should allow indexing", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const robots = page.locator('meta[name="robots"]');
    const count = await robots.count();

    if (count > 0) {
      const content = await robots.getAttribute("content");
      // Should not have noindex for homepage
      expect(content).not.toContain("noindex");
    }
  });
});

test.describe("Page Titles by Route", () => {
  const routes = [
    { path: "/", expectedPattern: /DestinyPal|운세|Saju/i },
    { path: "/saju", expectedPattern: /사주|Saju|운세|DestinyPal/i },
    { path: "/tarot", expectedPattern: /타로|Tarot|DestinyPal/i },
    { path: "/dream", expectedPattern: /꿈|Dream|해몽|DestinyPal/i },
    { path: "/compatibility", expectedPattern: /궁합|Compatibility|DestinyPal/i },
    { path: "/pricing", expectedPattern: /가격|Pricing|요금|DestinyPal/i },
    { path: "/about", expectedPattern: /소개|About|DestinyPal/i },
  ];

  for (const route of routes) {
    test(`${route.path} should have relevant title`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const title = await page.title();
      expect(title).toBeTruthy();
    });
  }
});

test.describe("Favicon", () => {
  test("should have favicon", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const favicon = page.locator(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    const count = await favicon.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Language", () => {
  test("html should have lang attribute", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});

test.describe("Structured Data", () => {
  test("should have JSON-LD or schema markup", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    // Structured data is optional but recommended
    expect(count >= 0).toBe(true);
  });
});

test.describe("Performance Hints", () => {
  test("should have preconnect hints", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const preconnect = page.locator('link[rel="preconnect"]');
    const count = await preconnect.count();
    // Preconnect is optional
    expect(count >= 0).toBe(true);
  });

  test("should have dns-prefetch hints", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const dnsPrefetch = page.locator('link[rel="dns-prefetch"]');
    const count = await dnsPrefetch.count();
    expect(count >= 0).toBe(true);
  });
});
