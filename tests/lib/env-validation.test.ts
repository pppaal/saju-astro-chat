/**
 * Environment Validation Tests
 * Tests for environment variable validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { validateEnv } from "@/lib/env-validation";
import { logger } from "@/lib/logger";

describe("validateEnv", () => {
  const originalEnv = process.env;
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
  });

  it("should pass validation with all required env vars", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    validateEnv();

    expect(logger.info).toHaveBeenCalledWith(
      "✅ Environment variables validated successfully"
    );
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should pass with optional env vars included", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
      OPENAI_API_KEY: "sk-abc123",
      GOOGLE_GEMINI_API_KEY: "gemini-key",
      REDIS_URL: "redis://localhost:6379",
      UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token123",
    };

    validateEnv();

    expect(logger.info).toHaveBeenCalledWith(
      "✅ Environment variables validated successfully"
    );
  });

  it("should fail when DATABASE_URL is missing", () => {
    process.env = {
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when DATABASE_URL is invalid URL", () => {
    process.env = {
      DATABASE_URL: "not-a-url",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when NEXTAUTH_SECRET is too short", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "tooshort",
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when NEXTAUTH_URL is invalid", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "not-a-url",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when STRIPE_SECRET_KEY missing sk_ prefix", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "bad_key",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when STRIPE_PUBLISHABLE_KEY missing pk_ prefix", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "bad_key",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when ADMIN_EMAILS is missing", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when OPENAI_API_KEY missing sk- prefix", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
      OPENAI_API_KEY: "bad_key",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when REDIS_URL is invalid", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
      REDIS_URL: "not-a-url",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should fail when UPSTASH_REDIS_REST_URL is invalid", () => {
    process.env = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
      UPSTASH_REDIS_REST_URL: "invalid",
    };

    expect(() => validateEnv()).toThrow();
  });

  it("should exit process with code 1 on validation failure", () => {
    process.env = {
      NEXTAUTH_SECRET: "short",
      NEXTAUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      ADMIN_EMAILS: "admin@example.com",
    };

    expect(() => validateEnv()).toThrow();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
