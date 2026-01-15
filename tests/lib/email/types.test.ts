/**
 * Email Types Tests
 *
 * Tests for email type definitions
 */


import type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
  EmailType,
  Locale,
  BaseTemplateData,
  WelcomeTemplateData,
  PaymentReceiptTemplateData,
  SubscriptionTemplateData,
  ReferralRewardTemplateData,
} from "@/lib/email/types";

describe("EmailType", () => {
  it("includes all expected email types", () => {
    const types: EmailType[] = [
      "welcome",
      "payment_receipt",
      "subscription_confirm",
      "subscription_renewal",
      "payment_failed",
      "subscription_cancelled",
      "referral_reward",
    ];

    expect(types).toHaveLength(7);
  });
});

describe("Locale", () => {
  it("supports Korean and English", () => {
    const locales: Locale[] = ["ko", "en"];
    expect(locales).toContain("ko");
    expect(locales).toContain("en");
  });
});

describe("SendEmailOptions type", () => {
  it("accepts required fields", () => {
    const options: SendEmailOptions = {
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test body</p>",
    };

    expect(options.to).toBe("test@example.com");
    expect(options.subject).toBe("Test Subject");
    expect(options.html).toBe("<p>Test body</p>");
  });

  it("accepts optional fields", () => {
    const options: SendEmailOptions = {
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test body</p>",
      text: "Plain text body",
      replyTo: "reply@example.com",
      tags: ["tag1", "tag2"],
    };

    expect(options.text).toBe("Plain text body");
    expect(options.replyTo).toBe("reply@example.com");
    expect(options.tags).toEqual(["tag1", "tag2"]);
  });
});

describe("SendEmailResult type", () => {
  it("represents success result", () => {
    const result: SendEmailResult = {
      success: true,
      messageId: "msg-123",
    };

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-123");
  });

  it("represents failure result", () => {
    const result: SendEmailResult = {
      success: false,
      error: "Failed to send email",
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to send email");
  });
});

describe("BaseTemplateData type", () => {
  it("accepts required locale", () => {
    const data: BaseTemplateData = {
      locale: "en",
    };

    expect(data.locale).toBe("en");
  });

  it("accepts optional userName", () => {
    const data: BaseTemplateData = {
      locale: "ko",
      userName: "John",
    };

    expect(data.userName).toBe("John");
  });
});

describe("WelcomeTemplateData type", () => {
  it("extends BaseTemplateData with referralCode", () => {
    const data: WelcomeTemplateData = {
      locale: "en",
      userName: "John",
      referralCode: "ABC123",
    };

    expect(data.locale).toBe("en");
    expect(data.userName).toBe("John");
    expect(data.referralCode).toBe("ABC123");
  });
});

describe("PaymentReceiptTemplateData type", () => {
  it("includes payment details", () => {
    const data: PaymentReceiptTemplateData = {
      locale: "en",
      userName: "John",
      amount: 9900,
      currency: "KRW",
      productName: "Premium Plan",
      transactionId: "txn-123",
    };

    expect(data.amount).toBe(9900);
    expect(data.currency).toBe("KRW");
    expect(data.productName).toBe("Premium Plan");
    expect(data.transactionId).toBe("txn-123");
  });
});

describe("SubscriptionTemplateData type", () => {
  it("includes subscription details", () => {
    const data: SubscriptionTemplateData = {
      locale: "ko",
      userName: "Kim",
      planName: "Premium",
      billingCycle: "monthly",
      nextBillingDate: "2024-02-01",
    };

    expect(data.planName).toBe("Premium");
    expect(data.billingCycle).toBe("monthly");
    expect(data.nextBillingDate).toBe("2024-02-01");
  });
});

describe("ReferralRewardTemplateData type", () => {
  it("includes referral reward details", () => {
    const data: ReferralRewardTemplateData = {
      locale: "en",
      userName: "John",
      creditsAwarded: 100,
      referredUserName: "Jane",
    };

    expect(data.creditsAwarded).toBe(100);
    expect(data.referredUserName).toBe("Jane");
  });
});

describe("EmailProvider interface", () => {
  it("defines provider structure", () => {
    const mockProvider: EmailProvider = {
      name: "TestProvider",
      send: async (options: SendEmailOptions): Promise<SendEmailResult> => {
        return { success: true, messageId: "test-123" };
      },
    };

    expect(mockProvider.name).toBe("TestProvider");
    expect(typeof mockProvider.send).toBe("function");
  });
});
