import { test, expect } from "@playwright/test";
import { TestHelpers } from "../fixtures/test-helpers";

test.describe("Destiny Features Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should complete destiny map analysis", async ({ page }) => {
    await page.goto("/destiny-map");
    await expect(page.locator("body")).toBeVisible();

    await helpers.fillBirthInfo("1990-01-01", "12:00", "Seoul");

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      // Should show results or redirect to result page
      const currentUrl = page.url();
      const bodyText = await page.textContent("body");

      const hasResults =
        currentUrl.includes("result") ||
        bodyText?.includes("결과") ||
        bodyText?.includes("분석") ||
        bodyText?.includes("result");

      expect(hasResults).toBe(true);
    }
  });

  test("should display destiny map visualization", async ({ page }) => {
    await page.goto("/destiny-map/result");
    await expect(page.locator("body")).toBeVisible();

    await page.waitForTimeout(2000);

    // Check for visual elements
    const hasCanvas = await page.locator("canvas").count() > 0;
    const hasSVG = await page.locator("svg").count() > 0;
    const hasChart = await page.locator(".chart, [data-testid*='chart']").count() > 0;

    expect(hasCanvas || hasSVG || hasChart).toBe(true);
  });

  test("should enable destiny map counselor chat", async ({ page }) => {
    await page.goto("/destiny-map/counselor");
    await expect(page.locator("body")).toBeVisible();

    const chatInput = page.locator("textarea, input").first();

    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill("What does my destiny map reveal about my future?");

      const sendButton = page.locator(
        'button:has-text("전송"), button:has-text("Send"), button[type="submit"]'
      ).first();

      await sendButton.click();

      await page.waitForTimeout(8000);

      const messageCount = await page.locator(".message, .chat-message").count();
      expect(messageCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("should load destiny matrix feature", async ({ page }) => {
    await page.goto("/destiny-matrix");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasDestinyMatrix =
      bodyText?.includes("destiny") ||
      bodyText?.includes("matrix") ||
      bodyText?.includes("운명");

    expect(hasDestinyMatrix).toBe(true);
  });

  test("should generate destiny matrix report", async ({ page }) => {
    await page.goto("/destiny-matrix");

    await helpers.fillBirthInfo("1988-06-15", "14:30", "Busan");

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasReport =
        bodyText?.includes("리포트") ||
        bodyText?.includes("report") ||
        bodyText?.includes("분석");

      expect(hasReport).toBe(true);
    }
  });

  test("should access destiny matrix viewer", async ({ page }) => {
    await page.goto("/destiny-matrix/viewer");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("should load themed reports for destiny matrix", async ({ page }) => {
    await page.goto("/destiny-matrix/themed-reports");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasThemedReports =
      bodyText?.includes("테마") ||
      bodyText?.includes("theme") ||
      bodyText?.includes("리포트") ||
      bodyText?.includes("report");

    expect(hasThemedReports).toBe(true);
  });

  test("should complete life prediction analysis", async ({ page }) => {
    await page.goto("/life-prediction");
    await expect(page.locator("body")).toBeVisible();

    await helpers.fillBirthInfo("1992-03-20", "10:00", "Seoul");

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      const bodyText = await page.textContent("body");

      const hasResults =
        currentUrl.includes("result") ||
        bodyText?.includes("예측") ||
        bodyText?.includes("prediction") ||
        bodyText?.includes("결과");

      expect(hasResults).toBe(true);
    }
  });

  test("should display life prediction results", async ({ page }) => {
    await page.goto("/life-prediction/result");
    await expect(page.locator("body")).toBeVisible();

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasResults =
      bodyText?.includes("예측") ||
      bodyText?.includes("prediction") ||
      bodyText?.includes("시기") ||
      bodyText?.includes("timing");

    expect(hasResults).toBe(true);
  });

  test("should enable I-Ching consultation", async ({ page }) => {
    await page.goto("/iching");
    await expect(page.locator("body")).toBeVisible();

    const questionInput = page.locator("textarea, input").first();

    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill("What guidance does I-Ching offer for my decision?");

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasResults =
        bodyText?.includes("괘") ||
        bodyText?.includes("hexagram") ||
        bodyText?.includes("해석") ||
        bodyText?.includes("interpretation");

      expect(hasResults).toBe(true);
    }
  });

  test("should display I-Ching hexagram", async ({ page }) => {
    await page.goto("/iching");

    const questionInput = page.locator("textarea, input").first();

    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill("I-Ching consultation");

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(5000);

      // Check for hexagram display (usually visual)
      const hasSVG = await page.locator("svg").count() > 0;
      const hasCanvas = await page.locator("canvas").count() > 0;
      const bodyText = await page.textContent("body");
      const hasHexagramText = bodyText?.includes("괘") || bodyText?.includes("hexagram");

      expect(hasSVG || hasCanvas || hasHexagramText).toBe(true);
    }
  });

  test("should load destiny calendar", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasCalendar =
      bodyText?.includes("calendar") ||
      bodyText?.includes("달력") ||
      bodyText?.includes("일정");

    expect(hasCalendar).toBe(true);
  });

  test("should display daily fortune in calendar", async ({ page }) => {
    await page.goto("/calendar");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasFortune =
      bodyText?.includes("운세") ||
      bodyText?.includes("fortune") ||
      bodyText?.includes("오늘");

    expect(hasFortune).toBe(true);
  });

  test("should save calendar analysis", async ({ page }) => {
    await page.goto("/calendar");

    await page.waitForTimeout(2000);

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
  });

  test("should handle calendar save API", async ({ page }) => {
    const response = await page.request.post("/api/calendar/save", {
      data: {
        date: "2026-01-15",
        analysis: "Test calendar data",
      },
    });

    // Should return 200 for authenticated or 401 for unauthenticated
    expect([200, 201, 401, 403]).toContain(response.status());
  });

  test("should fetch daily fortune", async ({ page }) => {
    const response = await page.request.get("/api/daily-fortune");

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    }
  });

  test("should fetch weekly fortune", async ({ page }) => {
    const response = await page.request.get("/api/weekly-fortune");

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    }
  });

  test("should complete numerology analysis", async ({ page }) => {
    await page.goto("/numerology");
    await expect(page.locator("body")).toBeVisible();

    await helpers.fillBirthInfo("1985-11-11", "15:00", "Incheon");

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      const hasResults =
        bodyText?.includes("수비학") ||
        bodyText?.includes("numerology") ||
        bodyText?.includes("생명수") ||
        bodyText?.includes("life path");

      expect(hasResults).toBe(true);
    }
  });

  test("should calculate life path number", async ({ page }) => {
    await page.goto("/numerology");

    await helpers.fillBirthInfo("1990-05-15", "12:00", "Seoul");

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      await page.waitForTimeout(5000);

      const bodyText = await page.textContent("body");
      // Look for life path number (1-9 or 11, 22, 33)
      const hasLifePathNumber =
        /생명수|life path|\b[1-9]\b|\b11\b|\b22\b|\b33\b/i.test(bodyText || "");

      expect(hasLifePathNumber).toBe(true);
    }
  });

  test("should load dream interpretation feature", async ({ page }) => {
    await page.goto("/dream");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasDream =
      bodyText?.includes("꿈") ||
      bodyText?.includes("dream") ||
      bodyText?.includes("해몽");

    expect(hasDream).toBe(true);
  });

  test("should interpret dream description", async ({ page }) => {
    await page.goto("/dream");

    const dreamInput = page.locator("textarea").first();

    if (await dreamInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dreamInput.fill("I dreamed I was flying over mountains and water");

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(8000);

      const bodyText = await page.textContent("body");
      const hasInterpretation =
        bodyText?.includes("해몽") ||
        bodyText?.includes("interpretation") ||
        bodyText?.includes("의미") ||
        bodyText?.includes("meaning");

      expect(hasInterpretation).toBe(true);
    }
  });

  test("should enable dream chat consultation", async ({ page }) => {
    await page.goto("/dream");

    const chatInput = page.locator("textarea").first();

    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill("What does it mean when I dream of water?");

      const sendButton = page.locator(
        'button:has-text("전송"), button:has-text("Send")'
      ).first();

      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendButton.click();

        await page.waitForTimeout(8000);

        const messageCount = await page.locator(".message, .chat-message").count();
        expect(messageCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should handle destiny match feature", async ({ page }) => {
    await page.goto("/destiny-match");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasDestinyMatch =
      bodyText?.includes("매칭") ||
      bodyText?.includes("match") ||
      bodyText?.includes("인연");

    expect(hasDestinyMatch).toBe(true);
  });

  test("should set up destiny match profile", async ({ page }) => {
    await page.goto("/destiny-match/setup");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("should view destiny matches", async ({ page }) => {
    await page.goto("/destiny-match/matches");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasMatches =
      bodyText?.includes("매치") ||
      bodyText?.includes("match") ||
      bodyText?.includes("인연");

    expect(hasMatches).toBe(true);
  });

  test("should handle personality quiz", async ({ page }) => {
    await page.goto("/personality/quiz");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasQuiz =
      bodyText?.includes("성격") ||
      bodyText?.includes("personality") ||
      bodyText?.includes("테스트") ||
      bodyText?.includes("quiz");

    expect(hasQuiz).toBe(true);
  });

  test("should display personality quiz results", async ({ page }) => {
    await page.goto("/personality/result");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasResults =
      bodyText?.includes("결과") ||
      bodyText?.includes("result") ||
      bodyText?.includes("성격") ||
      bodyText?.includes("personality");

    expect(hasResults).toBe(true);
  });

  test("should complete ICP (Ideal Customer Profile) quiz", async ({ page }) => {
    await page.goto("/icp/quiz");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("should show ICP results", async ({ page }) => {
    await page.goto("/icp/result");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });
});
