/**
 * Email Templates Tests
 * Tests for email template generation and structure
 */

import { describe, it, expect } from "vitest";
import { wrapInBaseTemplate } from "@/lib/email/templates/base";
import { subscriptionConfirmTemplate } from "@/lib/email/templates/subscriptionConfirm";
import { subscriptionCancelledTemplate } from "@/lib/email/templates/subscriptionCancelled";
import { paymentFailedTemplate } from "@/lib/email/templates/paymentFailed";

describe("Email Templates", () => {
  describe("Base Template", () => {
    it("generates valid HTML document", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Test content</p>",
      });

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html lang=\"en\">");
      expect(result).toContain("</html>");
    });

    it("includes content in body", () => {
      const testContent = "<p>This is test content</p>";
      const result = wrapInBaseTemplate({
        locale: "en",
        content: testContent,
      });

      expect(result).toContain(testContent);
    });

    it("includes preheader when provided", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
        preheader: "Preview text here",
      });

      expect(result).toContain("Preview text here");
      expect(result).toContain("display:none");
    });

    it("does not include preheader span when not provided", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).not.toContain("mso-hide:all");
    });

    it("includes DestinyPal branding", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).toContain("DestinyPal");
      expect(result).toContain("destinypal.me");
    });

    it("uses English tagline for en locale", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).toContain("Your Destiny Guide");
    });

    it("uses Korean tagline for ko locale", () => {
      const result = wrapInBaseTemplate({
        locale: "ko",
        content: "<p>Content</p>",
      });

      expect(result).toContain("당신의 운명을 안내합니다");
    });

    it("includes responsive meta tag", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).toContain('viewport');
      expect(result).toContain('width=device-width');
    });

    it("includes CSS styles", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).toContain("<style>");
      expect(result).toContain("</style>");
      expect(result).toContain(".container");
      expect(result).toContain(".header");
      expect(result).toContain(".footer");
    });

    it("includes footer with unsubscribe info", () => {
      const result = wrapInBaseTemplate({
        locale: "en",
        content: "<p>Content</p>",
      });

      expect(result).toContain("unsubscribe");
    });

    it("uses correct language attribute", () => {
      const enResult = wrapInBaseTemplate({
        locale: "en",
        content: "<p>EN</p>",
      });
      const koResult = wrapInBaseTemplate({
        locale: "ko",
        content: "<p>KO</p>",
      });

      expect(enResult).toContain('<html lang="en">');
      expect(koResult).toContain('<html lang="ko">');
    });
  });

  describe("Subscription Confirm Template", () => {
    const baseData = {
      userName: "John",
      planName: "premium",
      billingCycle: "monthly" as const,
      locale: "en" as const,
    };

    it("returns subject and html", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(typeof result.subject).toBe("string");
      expect(typeof result.html).toBe("string");
    });

    it("includes plan name in subject", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.subject).toContain("Premium");
      expect(result.subject).toContain("DestinyPal");
    });

    it("includes user name in content", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.html).toContain("John");
    });

    it("uses default name when not provided", () => {
      const result = subscriptionConfirmTemplate({
        ...baseData,
        userName: undefined,
      });

      expect(result.html).toContain("Member");
    });

    it("shows monthly billing cycle", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.html).toContain("Monthly");
    });

    it("shows annual billing cycle", () => {
      const result = subscriptionConfirmTemplate({
        ...baseData,
        billingCycle: "annual",
      });

      expect(result.html).toContain("Annual");
    });

    it("includes next billing date when provided", () => {
      const result = subscriptionConfirmTemplate({
        ...baseData,
        nextBillingDate: "2025-02-15",
      });

      expect(result.html).toContain("2025-02-15");
      expect(result.html).toContain("Next Billing Date");
    });

    it("generates Korean content for ko locale", () => {
      const result = subscriptionConfirmTemplate({
        ...baseData,
        locale: "ko",
      });

      expect(result.subject).toContain("구독");
      expect(result.html).toContain("구독이 시작되었습니다");
    });

    it("includes feature list", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.html).toContain("Unlimited");
      expect(result.html).toContain("Premium");
    });

    it("includes CTA button", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.html).toContain("class=\"button\"");
      expect(result.html).toContain("destinypal.me");
    });

    it("wraps content in base template", () => {
      const result = subscriptionConfirmTemplate(baseData);

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("DestinyPal");
    });
  });

  describe("Subscription Cancelled Template", () => {
    const baseData = {
      userName: "Jane",
      planName: "premium",
      locale: "en" as const,
    };

    it("returns subject and html", () => {
      const result = subscriptionCancelledTemplate(baseData);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes cancellation message", () => {
      const result = subscriptionCancelledTemplate(baseData);

      expect(result.subject.toLowerCase()).toContain("cancel");
    });

    it("generates Korean content for ko locale", () => {
      const result = subscriptionCancelledTemplate({
        ...baseData,
        locale: "ko",
      });

      expect(result.html).toContain("취소");
    });

    it("includes user name", () => {
      const result = subscriptionCancelledTemplate(baseData);

      expect(result.html).toContain("Jane");
    });
  });

  describe("Payment Failed Template", () => {
    const baseData = {
      userName: "Bob",
      planName: "premium",
      locale: "en" as const,
    };

    it("returns subject and html", () => {
      const result = paymentFailedTemplate(baseData);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes failure message in subject", () => {
      const result = paymentFailedTemplate(baseData);

      expect(result.subject.toLowerCase()).toContain("failed");
    });

    it("generates Korean content for ko locale", () => {
      const result = paymentFailedTemplate({
        ...baseData,
        locale: "ko",
      });

      expect(result.html).toContain("실패");
    });

    it("includes action guidance", () => {
      const result = paymentFailedTemplate(baseData);

      // Should include guidance on updating payment method
      expect(result.html.toLowerCase()).toContain("payment");
    });
  });

  describe("Template HTML Structure", () => {
    it("all templates have proper HTML structure", () => {
      const templates = [
        subscriptionConfirmTemplate({
          userName: "Test",
          planName: "premium",
          locale: "en",
        }),
        subscriptionCancelledTemplate({
          userName: "Test",
          planName: "premium",
          locale: "en",
        }),
        paymentFailedTemplate({
          userName: "Test",
          planName: "premium",
          locale: "en",
        }),
      ];

      templates.forEach((template) => {
        expect(template.html).toContain("<!DOCTYPE html>");
        expect(template.html).toContain("<head>");
        expect(template.html).toContain("<body>");
        expect(template.html).toContain("</body>");
        expect(template.html).toContain("</html>");
      });
    });

    it("all templates have UTF-8 charset", () => {
      const result = subscriptionConfirmTemplate({
        userName: "Test",
        planName: "premium",
        locale: "en",
      });

      expect(result.html).toContain('charset="UTF-8"');
    });
  });

  describe("Localization", () => {
    it("English templates contain English text", () => {
      const result = subscriptionConfirmTemplate({
        userName: "Test",
        planName: "premium",
        locale: "en",
      });

      expect(result.html).not.toMatch(/[가-힣]/); // No Korean characters in main content area before footer
    });

    it("Korean templates contain Korean text", () => {
      const result = subscriptionConfirmTemplate({
        userName: "Test",
        planName: "premium",
        locale: "ko",
      });

      expect(result.html).toMatch(/[가-힣]/); // Contains Korean characters
    });
  });
});
