/**
 * Payment Receipt Email Template Tests
 *
 * Tests for payment receipt email template generation
 */


import { paymentReceiptTemplate } from "@/lib/email/templates/paymentReceipt";
import type { PaymentReceiptTemplateData } from "@/lib/email/types";

describe("paymentReceiptTemplate", () => {
  describe("Korean locale", () => {
    it("generates Korean subject with formatted amount", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        userName: "김철수",
        amount: 990000, // 9,900 KRW in cents
        currency: "KRW",
        productName: "프리미엄 플랜",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.subject).toContain("DestinyPal");
      expect(result.subject).toContain("결제 완료");
    });

    it("generates Korean HTML content", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        userName: "김철수",
        amount: 990000,
        currency: "KRW",
        productName: "프리미엄 플랜",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("결제가 완료되었습니다");
      expect(result.html).toContain("프리미엄 플랜");
      expect(result.html).toContain("결제 금액");
      expect(result.html).toContain("결제일");
    });

    it("includes transaction ID when provided", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        userName: "김철수",
        amount: 990000,
        currency: "KRW",
        productName: "크레딧 팩",
        transactionId: "txn_123456789",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("txn_123456789");
      expect(result.html).toContain("거래 번호");
    });

    it("excludes transaction ID when not provided", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        userName: "김철수",
        amount: 990000,
        currency: "KRW",
        productName: "크레딧 팩",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).not.toContain("거래 번호");
    });

    it("uses default name when userName not provided", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        amount: 990000,
        currency: "KRW",
        productName: "테스트",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("회원");
    });
  });

  describe("English locale", () => {
    it("generates English subject with formatted amount", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        userName: "John",
        amount: 999, // $9.99 in cents
        currency: "USD",
        productName: "Premium Plan",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.subject).toContain("DestinyPal");
      expect(result.subject).toContain("Payment Receipt");
    });

    it("generates English HTML content", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        userName: "John",
        amount: 999,
        currency: "USD",
        productName: "Premium Plan",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("Payment Confirmed");
      expect(result.html).toContain("Premium Plan");
      expect(result.html).toContain("Amount");
      expect(result.html).toContain("Date");
    });

    it("includes transaction ID when provided", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        userName: "John",
        amount: 999,
        currency: "USD",
        productName: "Credit Pack",
        transactionId: "pi_abc123xyz",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("pi_abc123xyz");
      expect(result.html).toContain("Transaction ID");
    });

    it("uses default name when userName not provided", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 999,
        currency: "USD",
        productName: "Test",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("Member");
    });
  });

  describe("Currency formatting", () => {
    it("formats KRW correctly", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        amount: 990000, // ₩9,900
        currency: "KRW",
        productName: "테스트",
      };

      const result = paymentReceiptTemplate(data);

      // Should contain Korean Won symbol or formatting
      expect(result.html).toContain("₩");
    });

    it("formats USD correctly", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 999, // $9.99
        currency: "USD",
        productName: "Test",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("$");
    });

    it("handles uppercase currency code", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 1000,
        currency: "usd",
        productName: "Test",
      };

      // Should not throw
      const result = paymentReceiptTemplate(data);
      expect(result.html).toBeDefined();
    });
  });

  describe("HTML structure", () => {
    it("returns object with subject and html", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 100,
        currency: "USD",
        productName: "Test",
      };

      const result = paymentReceiptTemplate(data);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes CTA button to profile", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 100,
        currency: "USD",
        productName: "Test",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("https://destinypal.me/profile");
      expect(result.html).toContain("View My Account");
    });

    it("includes Korean CTA button", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "ko",
        amount: 100,
        currency: "KRW",
        productName: "테스트",
      };

      const result = paymentReceiptTemplate(data);

      expect(result.html).toContain("내 계정 확인");
    });

    it("includes preheader text", () => {
      const enData: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 100,
        currency: "USD",
        productName: "Test",
      };
      const koData: PaymentReceiptTemplateData = {
        locale: "ko",
        amount: 100,
        currency: "KRW",
        productName: "테스트",
      };

      const enResult = paymentReceiptTemplate(enData);
      const koResult = paymentReceiptTemplate(koData);

      expect(enResult.html).toContain("successful");
      expect(koResult.html).toContain("성공적으로");
    });
  });

  describe("Amount conversion", () => {
    it("divides amount by 100 for display", () => {
      const data: PaymentReceiptTemplateData = {
        locale: "en",
        amount: 1999, // $19.99 in cents
        currency: "USD",
        productName: "Test",
      };

      const result = paymentReceiptTemplate(data);

      // Should contain formatted amount like $19.99
      expect(result.html).toContain("19.99");
    });
  });
});
