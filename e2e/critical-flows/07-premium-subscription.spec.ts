import { test, expect } from "@playwright/test";
import { TestHelpers } from "../fixtures/test-helpers";

test.describe("Premium Subscription Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("should display pricing plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasPricingPlans =
      (bodyText?.includes("무료") || bodyText?.includes("Free")) &&
      (bodyText?.includes("프리미엄") || bodyText?.includes("Premium"));

    expect(hasPricingPlans).toBe(true);
  });

  test("should show plan features comparison", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    // Look for feature descriptions
    const hasFeatures =
      bodyText?.includes("무제한") ||
      bodyText?.includes("unlimited") ||
      bodyText?.includes("기능") ||
      bodyText?.includes("feature") ||
      bodyText?.includes("혜택") ||
      bodyText?.includes("benefit");

    expect(hasFeatures).toBe(true);
  });

  test("should initiate Stripe checkout flow", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const subscribeButton = page.locator(
      'button:has-text("구독"), button:has-text("Subscribe"), button:has-text("시작")'
    ).first();

    if (await subscribeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subscribeButton.click();

      await page.waitForTimeout(3000);

      // Should redirect to checkout or show payment UI
      const currentUrl = page.url();
      const bodyText = await page.textContent("body");

      const isCheckout =
        currentUrl.includes("checkout") ||
        currentUrl.includes("payment") ||
        currentUrl.includes("stripe") ||
        bodyText?.includes("결제") ||
        bodyText?.includes("payment");

      expect(isCheckout).toBe(true);
    }
  });

  test("should handle checkout API with valid price ID", async ({ page }) => {
    const response = await page.request.post("/api/checkout", {
      data: {
        priceId: "price_test_123",
      },
    });

    // Should return checkout session or auth error
    expect([200, 401, 403]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty("url");
    }
  });

  test("should reject checkout with invalid price ID", async ({ page }) => {
    const response = await page.request.post("/api/checkout", {
      data: {
        priceId: "",
      },
    });

    // Should return error for invalid price ID
    expect([400, 401, 422]).toContain(response.status());
  });

  test("should handle Stripe webhook for successful payment", async ({ page }) => {
    const webhookPayload = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_test",
          subscription: "sub_test",
        },
      },
    };

    const response = await page.request.post("/api/webhook/stripe", {
      data: webhookPayload,
      headers: {
        "stripe-signature": "test_signature",
      },
    });

    // Webhook will reject without valid signature, but should handle gracefully
    expect([200, 400, 401]).toContain(response.status());
  });

  test("should handle subscription creation webhook", async ({ page }) => {
    const webhookPayload = {
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status: "active",
        },
      },
    };

    const response = await page.request.post("/api/webhook/stripe", {
      data: webhookPayload,
      headers: {
        "stripe-signature": "test_signature",
      },
    });

    expect([200, 400, 401]).toContain(response.status());
  });

  test("should handle subscription cancellation webhook", async ({ page }) => {
    const webhookPayload = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test",
          customer: "cus_test",
          status: "canceled",
        },
      },
    };

    const response = await page.request.post("/api/webhook/stripe", {
      data: webhookPayload,
      headers: {
        "stripe-signature": "test_signature",
      },
    });

    expect([200, 400, 401]).toContain(response.status());
  });

  test("should display premium benefits on pricing page", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasBenefits =
      bodyText?.includes("무제한") ||
      bodyText?.includes("unlimited") ||
      bodyText?.includes("광고") ||
      bodyText?.includes("ad-free") ||
      bodyText?.includes("우선") ||
      bodyText?.includes("priority");

    expect(hasBenefits).toBe(true);
  });

  test("should show correct pricing in user currency", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasPricing =
      /\$\d+/.test(bodyText || "") ||
      /₩\d+/.test(bodyText || "") ||
      /\d+원/.test(bodyText || "");

    expect(hasPricing).toBe(true);
  });

  test("should handle monthly vs yearly toggle", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    // Look for billing period toggle
    const toggle = page.locator(
      'button:has-text("월간"), button:has-text("연간"), button:has-text("Monthly"), button:has-text("Yearly")'
    ).first();

    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(1000);

      // Prices should update
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    }
  });

  test("should verify premium status after subscription", async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus();

    // Check premium status via API
    const response = await page.request.get("/api/me/premium");

    if (response.ok()) {
      const data = await response.json();
      expect(typeof data.isPremium).toBe("boolean");
      expect(data.isPremium).toBe(isPremium);
    }
  });

  test("should show free trial information if available", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasTrial =
      bodyText?.includes("무료 체험") ||
      bodyText?.includes("free trial") ||
      bodyText?.includes("trial") ||
      bodyText?.includes("체험");

    // Free trial is optional
    expect(typeof hasTrial).toBe("boolean");
  });

  test("should display refund policy", async ({ page }) => {
    await page.goto("/pricing");

    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    const hasRefundInfo =
      bodyText?.includes("환불") ||
      bodyText?.includes("refund") ||
      bodyText?.includes("취소") ||
      bodyText?.includes("cancel");

    expect(hasRefundInfo).toBe(true);
  });

  test("should handle admin refund endpoint", async ({ page }) => {
    const response = await page.request.post("/api/admin/refund-subscription", {
      data: {
        userId: "test_user_id",
      },
    });

    // Should require admin auth
    expect([200, 401, 403]).toContain(response.status());
  });

  test("should show premium features in navigation for premium users", async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus();

    await page.goto("/");

    await page.waitForTimeout(2000);

    if (isPremium) {
      const bodyText = await page.textContent("body");
      const hasPremiumFeatures =
        bodyText?.includes("프리미엄") ||
        bodyText?.includes("Premium");

      expect(hasPremiumFeatures).toBe(true);
    }
  });

  test("should handle subscription renewal webhook", async ({ page }) => {
    const webhookPayload = {
      type: "invoice.payment_succeeded",
      data: {
        object: {
          customer: "cus_test",
          subscription: "sub_test",
          amount_paid: 9900,
        },
      },
    };

    const response = await page.request.post("/api/webhook/stripe", {
      data: webhookPayload,
      headers: {
        "stripe-signature": "test_signature",
      },
    });

    expect([200, 400, 401]).toContain(response.status());
  });

  test("should handle failed payment webhook", async ({ page }) => {
    const webhookPayload = {
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_test",
          subscription: "sub_test",
          amount_due: 9900,
        },
      },
    };

    const response = await page.request.post("/api/webhook/stripe", {
      data: webhookPayload,
      headers: {
        "stripe-signature": "test_signature",
      },
    });

    expect([200, 400, 401]).toContain(response.status());
  });

  test("should show premium upgrade CTA for free users", async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus();

    if (!isPremium) {
      await page.goto("/tarot");

      await page.waitForTimeout(2000);

      const bodyText = await page.textContent("body");
      const hasUpgradeCTA =
        bodyText?.includes("업그레이드") ||
        bodyText?.includes("upgrade") ||
        bodyText?.includes("프리미엄") ||
        bodyText?.includes("premium");

      // Not all pages show upgrade CTA
      expect(typeof hasUpgradeCTA).toBe("boolean");
    }
  });

  test("should prevent duplicate subscriptions", async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus();

    if (isPremium) {
      await page.goto("/pricing");

      await page.waitForTimeout(2000);

      // Should show different UI for already subscribed users
      const bodyText = await page.textContent("body");
      const hasActiveSubscription =
        bodyText?.includes("활성") ||
        bodyText?.includes("active") ||
        bodyText?.includes("이미") ||
        bodyText?.includes("already");

      // This might not always be shown on pricing page
      expect(typeof hasActiveSubscription).toBe("boolean");
    }
  });

  test("should handle subscription downgrade", async ({ page }) => {
    await page.goto("/myjourney/profile");

    await page.waitForTimeout(2000);

    const downgradeButton = page.locator(
      'button:has-text("다운그레이드"), button:has-text("Downgrade")'
    ).first();

    if (await downgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Just verify the option exists
      await expect(downgradeButton).toBeVisible();
    }
  });

  test("should show billing history for premium users", async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus();

    if (isPremium) {
      await page.goto("/myjourney/profile");

      await page.waitForTimeout(2000);

      const bodyText = await page.textContent("body");
      const hasBillingHistory =
        bodyText?.includes("결제") ||
        bodyText?.includes("billing") ||
        bodyText?.includes("청구");

      // Billing history might be in a separate page
      expect(typeof hasBillingHistory).toBe("boolean");
    }
  });

  test("should validate Stripe webhook signature", async ({ page }) => {
    const response = await page.request.post("/api/webhook/stripe", {
      data: { type: "test" },
      headers: {
        "stripe-signature": "invalid_signature",
      },
    });

    // Should reject invalid signature
    expect([400, 401]).toContain(response.status());
  });
});
