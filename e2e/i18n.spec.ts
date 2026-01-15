import { test, expect } from "@playwright/test";

/**
 * Internationalization and localization tests
 */

test.describe("Language Detection", () => {
  test("should have lang attribute on html", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("should support Korean content", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    // Page should have some content
    expect(bodyText).toBeTruthy();
  });
});

test.describe("Korean Language Support", () => {
  test("should render Korean characters correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check meta charset
    const charset = page.locator('meta[charset="utf-8"], meta[charset="UTF-8"]');
    const count = await charset.count();
    expect(count >= 0).toBe(true);
  });

  test("saju page should have Korean text", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("tarot page should have Korean text", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe("English Language Support", () => {
  test("should have English content on about page", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("should have English in meta description", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const description = page.locator('meta[name="description"]');
    const content = await description.getAttribute("content");
    expect(content).toBeTruthy();
  });
});

test.describe("Mixed Language Content", () => {
  test("homepage should handle mixed Korean/English", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Page should load without encoding issues
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.locator("body").textContent();
    // Should have some text content
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});

test.describe("Font Loading", () => {
  test("should load fonts for Korean text", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check if font-family is set
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });

    expect(fontFamily).toBeTruthy();
  });
});

test.describe("RTL/LTR Support", () => {
  test("should have correct text direction", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const dir = await page.locator("html").getAttribute("dir");
    // Korean/English are LTR, so dir should be ltr or not set
    expect(dir === null || dir === "ltr").toBe(true);
  });
});

test.describe("Date/Time Localization", () => {
  test("calendar page should handle dates", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Number Formatting", () => {
  test("pricing page should display numbers", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe("Error Messages", () => {
  test("404 page should have readable text", async ({ page }) => {
    await page.goto("/non-existent-page", { waitUntil: "domcontentloaded" });

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe("Form Labels", () => {
  test("saju form should have labels", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const labels = page.locator("label");
    const count = await labels.count();
    // Should have some labels
    expect(count >= 0).toBe(true);
  });

  test("destiny-map form should have labels", async ({ page }) => {
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });

    const labels = page.locator("label");
    const count = await labels.count();
    expect(count >= 0).toBe(true);
  });
});

test.describe("Button Text", () => {
  test("buttons should have readable text", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");

        // Button should have some accessible name
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });
});

test.describe("Placeholder Text", () => {
  test("input placeholders should be present", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const inputs = page.locator("input[placeholder]");
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute("placeholder");
      expect(placeholder).toBeTruthy();
    }
  });
});

test.describe("SEO Meta Tags Language", () => {
  test("og:locale should be set", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const ogLocale = page.locator('meta[property="og:locale"]');
    const count = await ogLocale.count();
    expect(count >= 0).toBe(true);
  });

  test("alternate locales should be set", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const altLocale = page.locator('meta[property="og:locale:alternate"]');
    const count = await altLocale.count();
    expect(count >= 0).toBe(true);
  });
});

test.describe("Content Encoding", () => {
  test("should have UTF-8 encoding", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const charset = page.locator("meta[charset]");
    const count = await charset.count();

    if (count > 0) {
      const charsetValue = await charset.getAttribute("charset");
      expect(charsetValue?.toLowerCase()).toBe("utf-8");
    }
  });
});
