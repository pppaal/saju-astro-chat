/**
 * API Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  extractLocale,
  initializeApiContext,
  withApiMiddleware,
  parseJsonBody,
  validateRequired,
  apiError,
  apiSuccess,
  ErrorCodes,
} from "@/lib/api/middleware";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/authOptions", () => ({
  authOptions: {},
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/auth/publicToken", () => ({
  requirePublicToken: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/api/errorHandler", () => ({
  createErrorResponse: vi.fn((options) =>
    NextResponse.json({ error: options.code }, { status: 429 })
  ),
  createSuccessResponse: vi.fn((data) => NextResponse.json(data)),
  ErrorCodes: {
    RATE_LIMITED: "RATE_LIMITED",
    UNAUTHORIZED: "UNAUTHORIZED",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
}));

import { getServerSession } from "next-auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";

describe("API Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClientIp).mockReturnValue("127.0.0.1");
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      reset: Date.now() + 60000,
    });
    vi.mocked(requirePublicToken).mockReturnValue({ valid: true });
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  describe("extractLocale", () => {
    it("extracts Korean from URL", () => {
      const req = new Request("http://localhost?locale=ko");
      expect(extractLocale(req)).toBe("ko");
    });

    it("extracts Korean from header", () => {
      const req = new Request("http://localhost", {
        headers: { "accept-language": "ko-KR" },
      });
      expect(extractLocale(req)).toBe("ko");
    });

    it("defaults to English", () => {
      const req = new Request("http://localhost");
      expect(extractLocale(req)).toBe("en");
    });
  });

  describe("initializeApiContext", () => {
    it("initializes basic context", async () => {
      const req = new NextRequest("http://localhost/api/test");
      const { context, error } = await initializeApiContext(req);

      expect(error).toBeUndefined();
      expect(context.ip).toBe("127.0.0.1");
      expect(context.isAuthenticated).toBe(false);
    });

    it("handles rate limiting", async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now(),
      });

      const req = new NextRequest("http://localhost/api/test");
      const { error } = await initializeApiContext(req, {
        rateLimit: { limit: 10, windowSeconds: 60 },
      });

      expect(error).toBeDefined();
    });

    it("validates token when required", async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: "Invalid",
      });

      const req = new NextRequest("http://localhost/api/test");
      const { error } = await initializeApiContext(req, {
        requireToken: true,
      });

      expect(error).toBeDefined();
    });

    it("attaches session", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "123", plan: "premium" },
        expires: "2025-12-31",
      });

      const req = new NextRequest("http://localhost/api/test");
      const { context } = await initializeApiContext(req);

      expect(context.userId).toBe("123");
      expect(context.isPremium).toBe(true);
    });
  });

  describe("validateRequired", () => {
    it("validates present fields", () => {
      const result = validateRequired({ name: "test" }, ["name"]);
      expect(result.valid).toBe(true);
    });

    it("detects missing fields", () => {
      const result = validateRequired({}, ["name"]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missing).toContain("name");
      }
    });
  });

  describe("apiError", () => {
    it("creates error result", () => {
      const result = apiError(ErrorCodes.NOT_FOUND, "Not found");
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
      expect(result.error?.message).toBe("Not found");
    });
  });

  describe("apiSuccess", () => {
    it("creates success result", () => {
      const result = apiSuccess({ id: "123" });
      expect(result.data).toEqual({ id: "123" });
    });
  });
});