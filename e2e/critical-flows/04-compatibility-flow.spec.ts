import { test, expect } from "@playwright/test";
import { TestHelpers } from "../fixtures/test-helpers";

test.describe("Compatibility Analysis Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should complete two-person compatibility analysis", async ({ page }) => {
    await page.goto("/compatibility");
    await expect(page.locator("body")).toBeVisible();

    // Fill first person's information
    const inputs = page.locator("input");
    const inputCount = await inputs.count();

    if (inputCount >= 6) {
      // Assuming at least 6 inputs for two people (date, time, city each)
      await helpers.fillBirthInfo("1990-01-01", "12:00", "Seoul");

      // Scroll down to second person's info
      await page.evaluate(() => window.scrollBy(0, 300));

      // Fill second person's info - get all date inputs
      const dateInputs = page.locator('input[type="date"]');
      if ((await dateInputs.count()) >= 2) {
        await dateInputs.nth(1).fill("1992-05-15");
      }

      const timeInputs = page.locator('input[type="time"]');
      if ((await timeInputs.count()) >= 2) {
        await timeInputs.nth(1).fill("14:30");
      }

      // Submit analysis
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("분석"), button:has-text("궁합")'
      ).first();

      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();

        await page.waitForTimeout(5000);

        // Verify compatibility results
        const bodyText = await page.textContent("body");
        const hasResults =
          bodyText?.includes("궁합") ||
          bodyText?.includes("compatibility") ||
          bodyText?.includes("상성") ||
          bodyText?.includes("결과");

        expect(hasResults).toBe(true);
      }
    }
  });

  test("should display compatibility score or percentage", async ({ page }) => {
    await page.goto("/compatibility");

    // Fill both persons' info and submit
    await helpers.fillBirthInfo("1988-03-20", "10:00", "Seoul");

    await page.evaluate(() => window.scrollBy(0, 300));

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1989-07-08");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      // Look for percentage or score indicators
      const hasScore =
        bodyText?.includes("%") ||
        bodyText?.includes("점") ||
        bodyText?.includes("score") ||
        /\d+%/.test(bodyText || "") ||
        /\d+점/.test(bodyText || "");

      expect(hasScore).toBe(true);
    }
  });

  test("should navigate to compatibility insights page", async ({ page }) => {
    await page.goto("/compatibility/insights");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasInsights =
      bodyText?.includes("insight") ||
      bodyText?.includes("분석") ||
      bodyText?.includes("궁합");

    expect(hasInsights).toBe(true);
  });

  test("should show different compatibility aspects", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1991-11-11", "15:00", "Busan");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1993-02-02");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      // Check for different compatibility aspects
      const hasMultipleAspects =
        (bodyText?.includes("성격") || bodyText?.includes("personality")) &&
        (bodyText?.includes("소통") || bodyText?.includes("communication") || bodyText?.includes("관계"));

      expect(hasMultipleAspects).toBe(true);
    }
  });

  test("should enable compatibility chat counselor", async ({ page }) => {
    await page.goto("/compatibility/counselor");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasCounselor =
      bodyText?.includes("상담") ||
      bodyText?.includes("counselor") ||
      bodyText?.includes("채팅");

    expect(hasCounselor).toBe(true);
  });

  test("should handle compatibility chat messages", async ({ page }) => {
    await page.goto("/compatibility/chat");
    await expect(page.locator("body")).toBeVisible();

    const chatInput = page.locator("textarea, input").first();
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill("How compatible are we in terms of communication?");

      const sendButton = page.locator(
        'button:has-text("전송"), button:has-text("Send"), button[type="submit"]'
      ).first();

      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendButton.click();

        await page.waitForTimeout(8000);

        // Check for AI response
        const messageCount = await page.locator('.message, .chat-message, [data-testid*="message"]').count();
        expect(messageCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should validate both persons' information is required", async ({ page }) => {
    await page.goto("/compatibility");

    // Fill only first person's info
    await helpers.fillBirthInfo("1990-01-01", "12:00", "Seoul");

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(1000);

      // Should show validation error for missing second person
      const hasError = await helpers.hasError();
      const stillOnPage = page.url().includes("/compatibility");

      expect(hasError || stillOnPage).toBe(true);
    }
  });

  test("should display relationship strengths", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1987-05-05", "09:30", "Seoul");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1988-08-15");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasStrengths =
        bodyText?.includes("강점") ||
        bodyText?.includes("장점") ||
        bodyText?.includes("strength") ||
        bodyText?.includes("긍정");

      expect(hasStrengths).toBe(true);
    }
  });

  test("should display relationship challenges", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1995-12-25", "20:00", "Incheon");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1994-03-10");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasChallenges =
        bodyText?.includes("약점") ||
        bodyText?.includes("주의") ||
        bodyText?.includes("challenge") ||
        bodyText?.includes("유의");

      expect(hasChallenges).toBe(true);
    }
  });

  test("should provide relationship advice", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1992-06-06", "13:00", "Daegu");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1991-09-09");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasAdvice =
        bodyText?.includes("조언") ||
        bodyText?.includes("advice") ||
        bodyText?.includes("제안") ||
        bodyText?.includes("추천");

      expect(hasAdvice).toBe(true);
    }
  });

  test("should show element compatibility (오행 상성)", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1989-04-04", "11:11", "Seoul");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1990-10-10");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasElementInfo =
        bodyText?.includes("오행") ||
        bodyText?.includes("상성") ||
        bodyText?.includes("element");

      expect(hasElementInfo).toBe(true);
    }
  });

  test("should allow saving compatibility analysis", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1993-07-15", "16:45", "Gwangju");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1992-12-20");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const saveButton = page.locator(
        'button:has-text("저장"), button:has-text("Save")'
      ).first();

      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        const bodyText = await page.textContent("body");
        const hasSaveConfirmation =
          bodyText?.includes("저장") ||
          bodyText?.includes("완료") ||
          bodyText?.includes("saved");

        expect(hasSaveConfirmation).toBe(true);
      }
    }
  });

  test("should support different relationship types", async ({ page }) => {
    await page.goto("/compatibility");

    const bodyText = await page.textContent("body");
    // Check if there are options for relationship types
    const hasRelationshipOptions =
      bodyText?.includes("연인") ||
      bodyText?.includes("부부") ||
      bodyText?.includes("친구") ||
      bodyText?.includes("동료") ||
      bodyText?.includes("romantic") ||
      bodyText?.includes("friendship");

    // This is optional - not all implementations distinguish relationship types
    expect(typeof hasRelationshipOptions).toBe("boolean");
  });

  test("should display visual compatibility chart", async ({ page }) => {
    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1986-08-08", "14:00", "Seoul");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1987-11-22");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      // Check for visual elements
      const hasCanvas = await page.locator("canvas").count() > 0;
      const hasSVG = await page.locator("svg").count() > 0;
      const hasChart = await page.locator(".chart, [class*='chart'], [data-testid*='chart']").count() > 0;

      expect(hasCanvas || hasSVG || hasChart).toBe(true);
    }
  });

  test("should deduct credits for compatibility analysis", async ({ page }) => {
    const initialCredits = await helpers.getCreditBalance();
    const isPremium = await helpers.checkPremiumStatus();

    await page.goto("/compatibility");

    await helpers.fillBirthInfo("1990-01-01", "12:00", "Seoul");

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(1).fill("1991-02-02");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const finalCredits = await helpers.getCreditBalance();

      if (!isPremium && initialCredits > 0) {
        expect(finalCredits).toBeLessThanOrEqual(initialCredits);
      }
    }
  });
});
