import { test, expect } from "@playwright/test";

/**
 * Comprehensive page load tests for all major routes
 */

test.describe("Main Feature Pages", () => {
  test("should load saju page", async ({ page }) => {
    await page.goto("/saju", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load saju counselor page", async ({ page }) => {
    await page.goto("/saju/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load tarot page", async ({ page }) => {
    await page.goto("/tarot", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load tarot history page", async ({ page }) => {
    await page.goto("/tarot/history", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-map page", async ({ page }) => {
    await page.goto("/destiny-map", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-map counselor page", async ({ page }) => {
    await page.goto("/destiny-map/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-map result page", async ({ page }) => {
    await page.goto("/destiny-map/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load astrology page", async ({ page }) => {
    await page.goto("/astrology", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load astrology counselor page", async ({ page }) => {
    await page.goto("/astrology/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load dream page", async ({ page }) => {
    await page.goto("/dream", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load iching page", async ({ page }) => {
    await page.goto("/iching", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load numerology page", async ({ page }) => {
    await page.goto("/numerology", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load calendar page", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load life-prediction page", async ({ page }) => {
    await page.goto("/life-prediction", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load life-prediction result page", async ({ page }) => {
    await page.goto("/life-prediction/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load personality page", async ({ page }) => {
    await page.goto("/personality", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load personality quiz page", async ({ page }) => {
    await page.goto("/personality/quiz", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load personality result page", async ({ page }) => {
    await page.goto("/personality/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Compatibility Pages", () => {
  test("should load compatibility page", async ({ page }) => {
    await page.goto("/compatibility", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load compatibility chat page", async ({ page }) => {
    await page.goto("/compatibility/chat", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load compatibility counselor page", async ({ page }) => {
    await page.goto("/compatibility/counselor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load compatibility insights page", async ({ page }) => {
    await page.goto("/compatibility/insights", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Destiny Match Pages", () => {
  test("should load destiny-match page", async ({ page }) => {
    await page.goto("/destiny-match", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-match setup page", async ({ page }) => {
    await page.goto("/destiny-match/setup", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-match matches page", async ({ page }) => {
    await page.goto("/destiny-match/matches", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("User Account Pages", () => {
  test("should load profile page", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load myjourney page", async ({ page }) => {
    await page.goto("/myjourney", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load myjourney history page", async ({ page }) => {
    await page.goto("/myjourney/history", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load myjourney circle page", async ({ page }) => {
    await page.goto("/myjourney/circle", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load myjourney profile page", async ({ page }) => {
    await page.goto("/myjourney/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load notifications page", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("ICP Pages", () => {
  test("should load icp page", async ({ page }) => {
    await page.goto("/icp", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load icp quiz page", async ({ page }) => {
    await page.goto("/icp/quiz", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load icp result page", async ({ page }) => {
    await page.goto("/icp/result", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Static & Info Pages", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load about page", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load about features page", async ({ page }) => {
    await page.goto("/about/features", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load about matrix page", async ({ page }) => {
    await page.goto("/about/matrix", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load pricing page", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load faq page", async ({ page }) => {
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load contact page", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load blog page", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load community page", async ({ page }) => {
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-pal page", async ({ page }) => {
    await page.goto("/destiny-pal", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Policy Pages", () => {
  test("should load privacy policy", async ({ page }) => {
    await page.goto("/policy/privacy", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load terms of service", async ({ page }) => {
    await page.goto("/policy/terms", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load refund policy", async ({ page }) => {
    await page.goto("/policy/refund", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Destiny Matrix Pages", () => {
  test("should load destiny-matrix viewer page", async ({ page }) => {
    await page.goto("/destiny-matrix/viewer", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load destiny-matrix themed-reports page", async ({ page }) => {
    await page.goto("/destiny-matrix/themed-reports", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
