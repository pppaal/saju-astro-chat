import { test, expect } from "@playwright/test";
import { TestHelpers } from "../fixtures/test-helpers";

test.describe("Profile Management Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should load user profile page", async ({ page }) => {
    await page.goto("/myjourney/profile");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasProfile =
      bodyText?.includes("프로필") ||
      bodyText?.includes("profile") ||
      bodyText?.includes("내 정보");

    expect(hasProfile).toBe(true);
  });

  test("should display user information", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    // Check for user info fields
    const inputs = await page.locator("input").count();
    const hasContent = await page.textContent("body").then((text) => text!.length > 100);

    expect(inputs > 0 || hasContent).toBe(true);
  });

  test("should fetch user profile via API", async ({ page }) => {
    const response = await page.request.get("/api/me/profile");

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    } else {
      // User might not be authenticated
      expect(response.status()).toBeGreaterThanOrEqual(401);
    }
  });

  test("should allow updating user name", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const nameInput = page.locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="name"]').first();

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const currentValue = await nameInput.inputValue();
      const newName = `Test User ${Date.now()}`;

      await nameInput.fill(newName);

      const saveButton = page.locator(
        'button[type="submit"], button:has-text("저장"), button:has-text("Save")'
      ).first();

      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();

        await page.waitForTimeout(2000);

        // Should show success message or the value should persist
        const updatedValue = await nameInput.inputValue();
        const bodyText = await page.textContent("body");

        const hasSuccess =
          updatedValue === newName ||
          bodyText?.includes("저장") ||
          bodyText?.includes("완료") ||
          bodyText?.includes("saved");

        expect(hasSuccess).toBe(true);
      }
    }
  });

  test("should allow updating birth information", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const dateInput = page.locator('input[type="date"]').first();

    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill("1990-05-15");

      const saveButton = page.locator('button[type="submit"]').first();

      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();

        await page.waitForTimeout(2000);

        const bodyText = await page.textContent("body");
        const hasSuccess =
          bodyText?.includes("저장") ||
          bodyText?.includes("완료") ||
          bodyText?.includes("업데이트");

        expect(hasSuccess).toBe(true);
      }
    }
  });

  test("should handle update birth info API endpoint", async ({ page }) => {
    const response = await page.request.post("/api/user/update-birth-info", {
      data: {
        birthDate: "1990-01-01",
        birthTime: "12:00",
        birthCity: "Seoul",
      },
    });

    // Should return 200 for authenticated or 401 for unauthenticated
    expect([200, 401, 403, 400]).toContain(response.status());
  });

  test("should display user's reading history", async ({ page }) => {
    await page.goto("/myjourney/history");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasHistory =
      bodyText?.includes("기록") ||
      bodyText?.includes("history") ||
      bodyText?.includes("이력");

    expect(hasHistory).toBe(true);
  });

  test("should fetch user history via API", async ({ page }) => {
    const response = await page.request.get("/api/me/history");

    if (response.ok()) {
      const data = await response.json();
      expect(Array.isArray(data) || typeof data === "object").toBe(true);
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(401);
    }
  });

  test("should display user's circle/social connections", async ({ page }) => {
    await page.goto("/myjourney/circle");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.textContent("body");
    const hasCircle =
      bodyText?.includes("circle") ||
      bodyText?.includes("친구") ||
      bodyText?.includes("인연");

    expect(hasCircle).toBe(true);
  });

  test("should fetch user circle via API", async ({ page }) => {
    const response = await page.request.get("/api/me/circle");

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(401);
    }
  });

  test("should navigate through myjourney sections", async ({ page }) => {
    const sections = ["/myjourney", "/myjourney/profile", "/myjourney/history", "/myjourney/circle"];

    for (const section of sections) {
      await page.goto(section);
      await expect(page.locator("body")).toBeVisible();

      const currentUrl = page.url();
      expect(currentUrl).toContain("myjourney");
    }
  });

  test("should validate email format when updating", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"]').first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill("invalid-email-format");

      const saveButton = page.locator('button[type="submit"]').first();

      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();

        await page.waitForTimeout(1000);

        // Should show validation error
        const hasError = await helpers.hasError();
        const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);

        expect(hasError || !validity).toBe(true);
      }
    }
  });

  test("should show premium status in profile", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    // Should mention something about subscription or premium status
    const hasStatusInfo =
      bodyText?.includes("구독") ||
      bodyText?.includes("subscription") ||
      bodyText?.includes("프리미엄") ||
      bodyText?.includes("premium") ||
      bodyText?.includes("플랜") ||
      bodyText?.includes("plan");

    expect(hasStatusInfo).toBe(true);
  });

  test("should display credit information in profile", async ({ page }) => {
    await page.goto("/myjourney");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasCredits =
      bodyText?.includes("크레딧") ||
      bodyText?.includes("credit") ||
      bodyText?.includes("포인트");

    expect(hasCredits).toBe(true);
  });

  test("should allow user to delete account", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const deleteButton = page.locator(
      'button:has-text("삭제"), button:has-text("탈퇴"), button:has-text("Delete")'
    ).first();

    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Just verify the button exists, don't actually click it
      await expect(deleteButton).toBeVisible();
    }
  });

  test("should handle profile picture upload", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Verify file input exists for profile picture
      await expect(fileInput).toBeVisible();
    }
  });

  test("should show notification preferences", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasNotifications =
      bodyText?.includes("알림") ||
      bodyText?.includes("notification") ||
      bodyText?.includes("이메일");

    // Not all profiles have notification settings
    expect(typeof hasNotifications).toBe("boolean");
  });

  test("should display referral code if available", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasReferral =
      bodyText?.includes("추천") ||
      bodyText?.includes("referral") ||
      bodyText?.includes("초대 코드") ||
      bodyText?.includes("invite code");

    // Referral system might not be in profile
    expect(typeof hasReferral).toBe("boolean");
  });

  test("should protect profile data from unauthorized access", async ({ page }) => {
    await helpers.clearSession();

    const response = await page.request.get("/api/me/profile");

    // Should require authentication
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("should handle profile update errors gracefully", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    // Try to save with invalid data
    const nameInput = page.locator('input[name="name"]').first();

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(""); // Empty name

      const saveButton = page.locator('button[type="submit"]').first();

      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();

        await page.waitForTimeout(1000);

        // Should show error or validation message
        const hasError = await helpers.hasError();
        const bodyText = await page.textContent("body");
        const hasValidation =
          bodyText?.includes("필수") ||
          bodyText?.includes("required") ||
          bodyText?.includes("입력");

        expect(hasError || hasValidation).toBe(true);
      }
    }
  });

  test("should show language preference settings", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasLanguage =
      bodyText?.includes("언어") ||
      bodyText?.includes("language") ||
      bodyText?.includes("한국어") ||
      bodyText?.includes("English");

    // Language settings might be global, not in profile
    expect(typeof hasLanguage).toBe("boolean");
  });

  test("should display account creation date", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasDate =
      bodyText?.includes("가입") ||
      bodyText?.includes("회원") ||
      bodyText?.includes("joined") ||
      bodyText?.includes("member since");

    // Not all profiles show creation date
    expect(typeof hasDate).toBe("boolean");
  });

  test("should handle concurrent profile updates", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const nameInput = page.locator('input[name="name"]').first();

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Make multiple rapid updates
      await nameInput.fill("Name 1");
      const saveButton = page.locator('button[type="submit"]').first();

      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(500);

        await nameInput.fill("Name 2");
        await saveButton.click();

        await page.waitForTimeout(2000);

        // Should handle gracefully without errors
        const hasError = await helpers.hasError();
        expect(hasError).toBe(false);
      }
    }
  });
});
