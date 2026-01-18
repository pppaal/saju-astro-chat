/**
 * Resend Email Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResendProvider } from "@/lib/email/providers/resendProvider";

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(),
    },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { Resend } from "resend";

describe("ResendProvider", () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
    vi.mocked(Resend).mockImplementation(
      () =>
        ({
          emails: { send: mockSend },
        }) as any
    );
  });

  describe("constructor", () => {
    it("throws error when RESEND_API_KEY not set", () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      expect(() => new ResendProvider()).toThrow(
        "RESEND_API_KEY is not configured"
      );

      process.env.RESEND_API_KEY = originalKey;
    });

    it("creates provider when API key is set", () => {
      process.env.RESEND_API_KEY = "test-key";

      const provider = new ResendProvider();

      expect(provider).toBeDefined();
      expect(provider.name).toBe("resend");
    });
  });

  describe("send", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "test-key";
    });

    it("sends email successfully", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const provider = new ResendProvider();
      const result = await provider.send({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
    });

    it("handles send error from Resend", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid email" },
      });

      const provider = new ResendProvider();
      const result = await provider.send({
        to: "invalid",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email");
    });

    it("handles thrown errors", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const provider = new ResendProvider();
      const result = await provider.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("passes all email options", async () => {
      mockSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const provider = new ResendProvider();
      await provider.send({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>HTML content</p>",
        text: "Text content",
        replyTo: "reply@example.com",
        tags: ["tag1", "tag2"],
      });

      expect(mockSend).toHaveBeenCalledWith({
        from: expect.any(String),
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>HTML content</p>",
        text: "Text content",
        replyTo: "reply@example.com",
        tags: [
          { name: "tag1", value: "true" },
          { name: "tag2", value: "true" },
        ],
      });
    });

    it("uses default from address", async () => {
      const originalFrom = process.env.EMAIL_FROM;
      delete process.env.EMAIL_FROM;

      mockSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const provider = new ResendProvider();
      await provider.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "DestinyPal <noreply@destinypal.me>",
        })
      );

      process.env.EMAIL_FROM = originalFrom;
    });

    it("uses custom from address from env", async () => {
      process.env.EMAIL_FROM = "Custom <custom@example.com>";

      mockSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const provider = new ResendProvider();
      await provider.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Custom <custom@example.com>",
        })
      );
    });

    it("handles non-Error exceptions", async () => {
      mockSend.mockRejectedValue("String error");

      const provider = new ResendProvider();
      const result = await provider.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });
});
