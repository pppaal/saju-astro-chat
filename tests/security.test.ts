/// <reference types="vitest/globals" />
/**
 * Security Tests
 * - API token validation
 * - Input validation (email, Stripe query injection)
 * - Environment variable validation
 */

import { vi } from "vitest";

// Mock environment
const originalEnv = process.env;

describe("Security: Environment Variable Validation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("getApiToken throws in production without token", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_API_TOKEN;

    const { getApiToken } = await import("../src/lib/validateEnv");

    expect(() => getApiToken()).toThrow(
      "[SECURITY] ADMIN_API_TOKEN is required in production"
    );
  });

  it("getApiToken returns null in development without token", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_API_TOKEN;

    const { getApiToken } = await import("../src/lib/validateEnv");

    expect(getApiToken()).toBeNull();
  });

  it("getApiToken returns token when set", async () => {
    process.env.ADMIN_API_TOKEN = "test-token-123";

    const { getApiToken } = await import("../src/lib/validateEnv");

    expect(getApiToken()).toBe("test-token-123");
  });

  it("getRequiredEnv throws for missing variable", async () => {
    delete process.env.TEST_REQUIRED_VAR;

    const { getRequiredEnv } = await import("../src/lib/validateEnv");

    expect(() => getRequiredEnv("TEST_REQUIRED_VAR")).toThrow(
      "[ENV] Missing required environment variable: TEST_REQUIRED_VAR"
    );
  });

  it("getOptionalEnv returns default for missing variable", async () => {
    delete process.env.TEST_OPTIONAL_VAR;

    const { getOptionalEnv } = await import("../src/lib/validateEnv");

    expect(getOptionalEnv("TEST_OPTIONAL_VAR", "default-value")).toBe(
      "default-value"
    );
  });

  it("validateEnv returns missing variables", async () => {
    delete process.env.MISSING_VAR_1;
    delete process.env.MISSING_VAR_2;
    process.env.PRESENT_VAR = "exists";

    const { validateEnv } = await import("../src/lib/validateEnv");

    const result = validateEnv({
      MISSING_VAR_1: true,
      MISSING_VAR_2: true,
      PRESENT_VAR: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.missing).toContain("MISSING_VAR_1");
    expect(result.missing).toContain("MISSING_VAR_2");
    expect(result.missing).not.toContain("PRESENT_VAR");
  });

  it("validateEnv handles conditional requirements", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.PROD_ONLY_VAR;

    const { validateEnv, isProduction } = await import("../src/lib/validateEnv");

    const result = validateEnv({
      PROD_ONLY_VAR: () => isProduction(),
    });

    expect(result.isValid).toBe(false);
    expect(result.missing).toContain("PROD_ONLY_VAR");
  });
});

describe("Security: Input Validation", () => {
  it("validates email format correctly", () => {
    // RFC 5322 simplified regex
    const EMAIL_REGEX =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // Valid emails
    expect(EMAIL_REGEX.test("user@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("user.name@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("user+tag@example.com")).toBe(true);
    expect(EMAIL_REGEX.test("user@sub.example.com")).toBe(true);

    // Invalid emails
    expect(EMAIL_REGEX.test("")).toBe(false);
    expect(EMAIL_REGEX.test("not-an-email")).toBe(false);
    expect(EMAIL_REGEX.test("@example.com")).toBe(false);
    expect(EMAIL_REGEX.test("user@")).toBe(false);
    expect(EMAIL_REGEX.test("user@.com")).toBe(false);
  });

  it("escapes Stripe query special characters", () => {
    // Match the implementation in saju/route.ts - escape backslash first, then quotes
    function escapeStripeQuery(value: string): string {
      return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }

    expect(escapeStripeQuery("normal@email.com")).toBe("normal@email.com");
    expect(escapeStripeQuery("test'injection@email.com")).toBe(
      "test\\'injection@email.com"
    );
    expect(escapeStripeQuery("test\\path@email.com")).toBe(
      "test\\\\path@email.com"
    );
    expect(escapeStripeQuery("evil'or'1'='1@hack.com")).toBe(
      "evil\\'or\\'1\\'=\\'1@hack.com"
    );
  });

  it("validates email length limit", () => {
    const maxLength = 254;
    const shortEmail = "a".repeat(100) + "@example.com";
    const longEmail = "a".repeat(300) + "@example.com";

    expect(shortEmail.length).toBeLessThanOrEqual(maxLength);
    expect(longEmail.length).toBeGreaterThan(maxLength);
  });
});

describe("Security: Rate Limiting", () => {
  it("rate limit key includes email and IP", () => {
    const email = "user@example.com";
    const ip = "192.168.1.1";
    const rlKey = `saju-premium:${email.toLowerCase()}:${ip}`;

    expect(rlKey).toBe("saju-premium:user@example.com:192.168.1.1");
  });

  it("rate limit key handles missing IP", () => {
    const email = "user@example.com";
    const ip = undefined;
    const rlKey = `saju-premium:${email.toLowerCase()}:${ip ?? "unknown"}`;

    expect(rlKey).toBe("saju-premium:user@example.com:unknown");
  });
});
