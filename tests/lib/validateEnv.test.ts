/**
 * Tests for validateEnv.ts
 * Environment variable validation utilities
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv function", () => {
    it("returns valid when all required vars are present", async () => {
      process.env.TEST_VAR = "value";
      process.env.ANOTHER_VAR = "another";

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        TEST_VAR: true,
        ANOTHER_VAR: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("returns invalid when required vars are missing", async () => {
      process.env.TEST_VAR = "value";
      delete process.env.MISSING_VAR;

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        TEST_VAR: true,
        MISSING_VAR: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("MISSING_VAR");
    });

    it("skips optional vars (false requirement)", async () => {
      delete process.env.OPTIONAL_VAR;

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        OPTIONAL_VAR: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("supports function-based requirements", async () => {
      process.env.NODE_ENV = "production";
      process.env.PROD_ONLY_VAR = "value";

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        PROD_ONLY_VAR: () => process.env.NODE_ENV === "production",
      });

      expect(result.isValid).toBe(true);
    });

    it("skips when function requirement returns false", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.PROD_ONLY_VAR;

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        PROD_ONLY_VAR: () => process.env.NODE_ENV === "production",
      });

      expect(result.isValid).toBe(true);
    });

    it("fails when function requirement returns true and var is missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.PROD_ONLY_VAR;

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        PROD_ONLY_VAR: () => process.env.NODE_ENV === "production",
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("PROD_ONLY_VAR");
    });

    it("reports multiple missing vars", async () => {
      delete process.env.VAR1;
      delete process.env.VAR2;
      delete process.env.VAR3;

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        VAR1: true,
        VAR2: true,
        VAR3: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("VAR1");
      expect(result.missing).toContain("VAR2");
      expect(result.missing).toContain("VAR3");
      expect(result.missing).toHaveLength(3);
    });

    it("treats empty string as missing", async () => {
      process.env.EMPTY_VAR = "";

      const { validateEnv } = await import("@/lib/validateEnv");
      const result = validateEnv({
        EMPTY_VAR: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("EMPTY_VAR");
    });
  });

  describe("validateRequiredEnv", () => {
    it("does not throw in development with missing vars", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;
      delete process.env.NEXTAUTH_SECRET;

      const { validateRequiredEnv } = await import("@/lib/validateEnv");

      expect(() => validateRequiredEnv()).not.toThrow();
    });

    it("logs warning in development for missing vars", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;
      delete process.env.NEXTAUTH_SECRET;

      const { logger } = await import("@/lib/logger");
      const { validateRequiredEnv } = await import("@/lib/validateEnv");

      validateRequiredEnv();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Missing required environment variables")
      );
    });

    it("throws in production for missing critical vars", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      delete process.env.NEXTAUTH_SECRET;

      const { validateRequiredEnv } = await import("@/lib/validateEnv");

      expect(() => validateRequiredEnv()).toThrow("Missing required environment variables");
    });

    it("passes in production when all required vars are set", async () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.NEXTAUTH_SECRET = "secret";
      process.env.ADMIN_API_TOKEN = "token";
      process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token";

      const { validateRequiredEnv } = await import("@/lib/validateEnv");

      expect(() => validateRequiredEnv()).not.toThrow();
    });
  });

  describe("getRequiredEnv", () => {
    it("returns value when env var exists", async () => {
      process.env.MY_VAR = "my-value";

      const { getRequiredEnv } = await import("@/lib/validateEnv");
      const value = getRequiredEnv("MY_VAR");

      expect(value).toBe("my-value");
    });

    it("throws when env var is missing", async () => {
      delete process.env.MISSING_VAR;

      const { getRequiredEnv } = await import("@/lib/validateEnv");

      expect(() => getRequiredEnv("MISSING_VAR")).toThrow(
        "Missing required environment variable: MISSING_VAR"
      );
    });

    it("throws for empty string value", async () => {
      process.env.EMPTY_VAR = "";

      const { getRequiredEnv } = await import("@/lib/validateEnv");

      expect(() => getRequiredEnv("EMPTY_VAR")).toThrow(
        "Missing required environment variable: EMPTY_VAR"
      );
    });
  });

  describe("getOptionalEnv", () => {
    it("returns value when env var exists", async () => {
      process.env.MY_VAR = "my-value";

      const { getOptionalEnv } = await import("@/lib/validateEnv");
      const value = getOptionalEnv("MY_VAR", "default");

      expect(value).toBe("my-value");
    });

    it("returns default when env var is missing", async () => {
      delete process.env.MISSING_VAR;

      const { getOptionalEnv } = await import("@/lib/validateEnv");
      const value = getOptionalEnv("MISSING_VAR", "default-value");

      expect(value).toBe("default-value");
    });

    it("returns default for empty string", async () => {
      process.env.EMPTY_VAR = "";

      const { getOptionalEnv } = await import("@/lib/validateEnv");
      const value = getOptionalEnv("EMPTY_VAR", "default");

      expect(value).toBe("default");
    });
  });

  describe("isProduction", () => {
    it("returns true when NODE_ENV is production", async () => {
      process.env.NODE_ENV = "production";

      const { isProduction } = await import("@/lib/validateEnv");

      expect(isProduction()).toBe(true);
    });

    it("returns false when NODE_ENV is development", async () => {
      process.env.NODE_ENV = "development";

      const { isProduction } = await import("@/lib/validateEnv");

      expect(isProduction()).toBe(false);
    });

    it("returns false when NODE_ENV is test", async () => {
      process.env.NODE_ENV = "test";

      const { isProduction } = await import("@/lib/validateEnv");

      expect(isProduction()).toBe(false);
    });
  });

  describe("getApiToken", () => {
    it("returns token when available", async () => {
      process.env.NODE_ENV = "development";
      process.env.ADMIN_API_TOKEN = "my-token";

      const { getApiToken } = await import("@/lib/validateEnv");
      const token = getApiToken();

      expect(token).toBe("my-token");
    });

    it("returns null when not in production and token is missing", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.ADMIN_API_TOKEN;

      const { getApiToken } = await import("@/lib/validateEnv");
      const token = getApiToken();

      expect(token).toBeNull();
    });

    it("throws in production when token is missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ADMIN_API_TOKEN;

      const { getApiToken } = await import("@/lib/validateEnv");

      expect(() => getApiToken()).toThrow("ADMIN_API_TOKEN is required in production");
    });

    it("returns token in production when available", async () => {
      process.env.NODE_ENV = "production";
      process.env.ADMIN_API_TOKEN = "production-token";

      const { getApiToken } = await import("@/lib/validateEnv");
      const token = getApiToken();

      expect(token).toBe("production-token");
    });
  });
});
