/**
 * Tests for email/emailService.ts
 * Email sending service with templates and logging
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock prisma
const mockPrismaEmailLog = {
  create: vi.fn(),
};
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    emailLog: mockPrismaEmailLog,
  },
}));

// Mock email provider
const mockProviderSend = vi.fn();
vi.mock("@/lib/email/providers", () => ({
  getEmailProvider: () => ({
    name: "mock-provider",
    send: mockProviderSend,
  }),
}));

// Mock templates
vi.mock("@/lib/email/templates", () => ({
  welcomeTemplate: vi.fn(() => ({
    subject: "Welcome!",
    html: "<h1>Welcome</h1>",
  })),
  paymentReceiptTemplate: vi.fn(() => ({
    subject: "Payment Receipt",
    html: "<h1>Receipt</h1>",
  })),
  subscriptionConfirmTemplate: vi.fn(() => ({
    subject: "Subscription Confirmed",
    html: "<h1>Confirmed</h1>",
  })),
  subscriptionCancelledTemplate: vi.fn(() => ({
    subject: "Subscription Cancelled",
    html: "<h1>Cancelled</h1>",
  })),
  paymentFailedTemplate: vi.fn(() => ({
    subject: "Payment Failed",
    html: "<h1>Failed</h1>",
  })),
  referralRewardTemplate: vi.fn(() => ({
    subject: "Referral Reward",
    html: "<h1>Reward</h1>",
  })),
}));

describe("emailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockProviderSend.mockReset();
    mockPrismaEmailLog.create.mockReset();
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "test-resend-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("sendEmail", () => {
    it("sends email successfully", async () => {
      mockProviderSend.mockResolvedValueOnce({
        success: true,
        messageId: "msg-123",
      });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      const result = await sendEmail(
        "welcome",
        "test@example.com",
        { locale: "ko" },
        "user-123"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
    });

    it("returns error when no email provider configured", async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.SENDGRID_API_KEY;

      const { sendEmail } = await import("@/lib/email/emailService");
      const { logger } = await import("@/lib/logger");

      const result = await sendEmail("welcome", "test@example.com", {
        locale: "ko",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email provider not configured");
      expect(logger.warn).toHaveBeenCalled();
    });

    it("returns error for unknown email type", async () => {
      const { sendEmail } = await import("@/lib/email/emailService");

      const result = await sendEmail(
        "unknown_type" as never,
        "test@example.com",
        { locale: "ko" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown email type");
    });

    it("handles provider error", async () => {
      mockProviderSend.mockRejectedValueOnce(new Error("Provider failed"));
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      const { logger } = await import("@/lib/logger");

      const result = await sendEmail("welcome", "test@example.com", {
        locale: "ko",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Provider failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("logs email to database", async () => {
      mockProviderSend.mockResolvedValueOnce({
        success: true,
        messageId: "msg-456",
      });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      await sendEmail(
        "welcome",
        "test@example.com",
        { locale: "ko" },
        "user-789"
      );

      expect(mockPrismaEmailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-789",
          email: "test@example.com",
          type: "welcome",
          status: "sent",
          provider: "mock-provider",
          messageId: "msg-456",
        }),
      });
    });

    it("logs failed email status", async () => {
      mockProviderSend.mockResolvedValueOnce({
        success: false,
        error: "Invalid recipient",
      });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      await sendEmail("welcome", "invalid@example.com", { locale: "ko" });

      expect(mockPrismaEmailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "failed",
          errorMsg: "Invalid recipient",
        }),
      });
    });

    it("handles database logging error gracefully", async () => {
      mockProviderSend.mockResolvedValueOnce({
        success: true,
        messageId: "msg-789",
      });
      mockPrismaEmailLog.create.mockRejectedValueOnce(new Error("DB error"));

      const { sendEmail } = await import("@/lib/email/emailService");
      const { logger } = await import("@/lib/logger");

      // Should not throw
      const result = await sendEmail("welcome", "test@example.com", {
        locale: "ko",
      });

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        "[sendEmail] Failed to log email:",
        expect.any(Error)
      );
    });
  });

  describe("sendWelcomeEmail", () => {
    it("sends welcome email with correct data", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendWelcomeEmail } = await import("@/lib/email/emailService");
      const result = await sendWelcomeEmail(
        "user-123",
        "user@example.com",
        "John",
        "en",
        "REF123"
      );

      expect(result.success).toBe(true);
      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Welcome!",
        })
      );
    });

    it("uses default locale when not provided", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendWelcomeEmail } = await import("@/lib/email/emailService");
      await sendWelcomeEmail("user-123", "user@example.com", "John");

      // Should use 'ko' as default
      expect(mockProviderSend).toHaveBeenCalled();
    });
  });

  describe("sendPaymentReceiptEmail", () => {
    it("sends payment receipt with amount and currency", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendPaymentReceiptEmail } = await import(
        "@/lib/email/emailService"
      );
      const result = await sendPaymentReceiptEmail("user-123", "user@example.com", {
        userName: "John",
        amount: 9900,
        currency: "KRW",
        productName: "Premium Plan",
        transactionId: "txn_123",
      });

      expect(result.success).toBe(true);
      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Payment Receipt",
        })
      );
    });
  });

  describe("sendSubscriptionConfirmEmail", () => {
    it("sends subscription confirmation", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendSubscriptionConfirmEmail } = await import(
        "@/lib/email/emailService"
      );
      const result = await sendSubscriptionConfirmEmail(
        "user-123",
        "user@example.com",
        {
          userName: "Jane",
          planName: "Pro Monthly",
          billingCycle: "monthly",
          nextBillingDate: "2024-02-15",
        }
      );

      expect(result.success).toBe(true);
    });
  });

  describe("sendSubscriptionCancelledEmail", () => {
    it("sends cancellation email", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendSubscriptionCancelledEmail } = await import(
        "@/lib/email/emailService"
      );
      const result = await sendSubscriptionCancelledEmail(
        "user-123",
        "user@example.com",
        {
          userName: "Alex",
          planName: "Premium",
        }
      );

      expect(result.success).toBe(true);
      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Subscription Cancelled",
        })
      );
    });
  });

  describe("sendPaymentFailedEmail", () => {
    it("sends payment failed notification", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendPaymentFailedEmail } = await import(
        "@/lib/email/emailService"
      );
      const result = await sendPaymentFailedEmail(
        "user-123",
        "user@example.com",
        {
          userName: "Sam",
          planName: "Annual",
          locale: "en",
        }
      );

      expect(result.success).toBe(true);
      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Payment Failed",
        })
      );
    });
  });

  describe("sendReferralRewardEmail", () => {
    it("sends referral reward notification", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendReferralRewardEmail } = await import(
        "@/lib/email/emailService"
      );
      const result = await sendReferralRewardEmail(
        "referrer-123",
        "referrer@example.com",
        {
          userName: "Referrer",
          creditsAwarded: 5,
          referredUserName: "NewUser",
        }
      );

      expect(result.success).toBe(true);
      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Referral Reward",
        })
      );
    });

    it("uses default locale for referral email", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendReferralRewardEmail } = await import(
        "@/lib/email/emailService"
      );
      await sendReferralRewardEmail("user-123", "user@example.com", {
        creditsAwarded: 3,
      });

      expect(mockProviderSend).toHaveBeenCalled();
    });
  });

  describe("email tags", () => {
    it("includes email type as tag", async () => {
      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      await sendEmail("welcome", "test@example.com", { locale: "ko" });

      expect(mockProviderSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["welcome"],
        })
      );
    });
  });

  describe("with SENDGRID_API_KEY", () => {
    it("sends email when only SendGrid is configured", async () => {
      delete process.env.RESEND_API_KEY;
      process.env.SENDGRID_API_KEY = "test-sendgrid-key";

      mockProviderSend.mockResolvedValueOnce({ success: true });
      mockPrismaEmailLog.create.mockResolvedValueOnce({});

      const { sendEmail } = await import("@/lib/email/emailService");
      const result = await sendEmail("welcome", "test@example.com", {
        locale: "ko",
      });

      expect(result.success).toBe(true);
    });
  });
});
