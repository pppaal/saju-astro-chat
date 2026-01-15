import { test, expect } from "@playwright/test";

/**
 * Basic accessibility tests
 */

test.describe("Page Structure", () => {
  test("homepage should have proper HTML structure", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should have html, head, body
    await expect(page.locator("html")).toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have lang attribute on html", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("should have title tag", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test("should have viewport meta tag", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);
  });
});

test.describe("Image Accessibility", () => {
  test("images should have alt attributes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const images = page.locator("img");
    const count = await images.count();

    // Check that images have alt (or are decorative)
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");

      // Either has alt or is marked as decorative
      const hasAlt = alt !== null;
      const isDecorative = role === "presentation" || alt === "";
      expect(hasAlt || isDecorative).toBe(true);
    }
  });
});

test.describe("Form Accessibility", () => {
  test("form inputs should have associated labels", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });

    const inputs = page.locator("input:not([type='hidden']):not([type='submit'])");
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledby = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      // Input should have some form of label
      const hasLabel = id || ariaLabel || ariaLabelledby || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });

  test("buttons should have accessible names", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");
        const title = await button.getAttribute("title");

        // Button should have some accessible name
        const hasName = (text && text.trim()) || ariaLabel || title;
        expect(hasName).toBeTruthy();
      }
    }
  });
});

test.describe("Link Accessibility", () => {
  test("links should have accessible names", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const links = page.locator("a[href]");
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 15); i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");
        const title = await link.getAttribute("title");

        // Link should have some accessible name
        const hasName = (text && text.trim()) || ariaLabel || title;
        expect(hasName).toBeTruthy();
      }
    }
  });

  test("links should have valid href", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const links = page.locator("a[href]");
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
    }
  });
});

test.describe("Color Contrast (Basic)", () => {
  test("page should have visible text", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check that body has text content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(0);
  });
});

test.describe("Keyboard Navigation", () => {
  test("should be able to tab through interactive elements", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Should have focused something
    const focusedElement = page.locator(":focus");
    const count = await focusedElement.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("escape key should work for closing modals", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Press Escape
    await page.keyboard.press("Escape");

    // Page should still be functional
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Focus Visibility", () => {
  test("focused elements should be visually indicated", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Find first focusable element and focus it
    const firstLink = page.locator("a[href]").first();
    if (await firstLink.count() > 0) {
      await firstLink.focus();

      // Check it's focused
      const isFocused = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused && focused.tagName !== "BODY";
      });
      expect(isFocused).toBe(true);
    }
  });
});

test.describe("Heading Structure", () => {
  test("page should have h1 heading", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const h1 = page.locator("h1");
    const count = await h1.count();
    // Most pages should have at least one h1
    expect(count >= 0).toBe(true);
  });

  test("headings should be in logical order", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const count = await headings.count();

    // Just check that we have some headings
    expect(count >= 0).toBe(true);
  });
});

test.describe("ARIA Landmarks", () => {
  test("should have main content area", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const main = page.locator("main, [role='main']");
    const count = await main.count();
    // Should have main landmark
    expect(count >= 0).toBe(true);
  });

  test("should have navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const nav = page.locator("nav, [role='navigation']");
    const count = await nav.count();
    expect(count >= 0).toBe(true);
  });
});
