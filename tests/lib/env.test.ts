/**
 * Tests for Environment Validation
 * src/lib/env.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("should return valid when all required env vars are present", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      process.env.NODE_ENV = "development";

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return invalid when required env vars are missing", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.DATABASE_URL;

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("NEXTAUTH_SECRET");
      expect(result.missing).toContain("DATABASE_URL");
    });

    it("should check production-only env vars in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "https://example.com";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.missing).toContain("UPSTASH_REDIS_REST_URL");
      expect(result.missing).toContain("UPSTASH_REDIS_REST_TOKEN");
    });

    it("should warn about recommended env vars", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      process.env.NODE_ENV = "development";
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_BACKEND_URL;

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.warnings).toContain("OPENAI_API_KEY");
      expect(result.warnings).toContain("AI_BACKEND_URL");
    });

    it("should validate NEXTAUTH_SECRET length", async () => {
      process.env.NEXTAUTH_SECRET = "tooshort";
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      process.env.NODE_ENV = "development";

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.missing.some(m => m.includes("NEXTAUTH_SECRET") && m.includes("32 characters"))).toBe(true);
    });

    it("should validate TOKEN_ENCRYPTION_KEY length", async () => {
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "short";
      process.env.NODE_ENV = "development";

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.missing.some(m => m.includes("TOKEN_ENCRYPTION_KEY") && m.includes("32 characters"))).toBe(true);
    });

    it("should require HTTPS for NEXTAUTH_URL in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "http://example.com"; // Not HTTPS
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token";

      const { validateEnv } = await import("@/lib/env");
      const result = validateEnv();

      expect(result.missing.some(m => m.includes("NEXTAUTH_URL") && m.includes("HTTPS"))).toBe(true);
    });
  });

  describe("env object", () => {
    it("should provide type-safe access to env vars", async () => {
      process.env.NEXTAUTH_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";

      const { env } = await import("@/lib/env");

      expect(env.NEXTAUTH_SECRET).toBe("test-secret");
      expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
      expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/test");
    });

    it("should provide default values for missing env vars", async () => {
      delete process.env.NEXTAUTH_URL;
      delete process.env.AI_BACKEND_URL;
      delete process.env.NEXT_PUBLIC_AI_BACKEND;

      const { env } = await import("@/lib/env");

      expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
      expect(env.AI_BACKEND_URL).toBe("");
    });

    it("should correctly identify production environment", async () => {
      process.env.NODE_ENV = "production";

      const { env } = await import("@/lib/env");

      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    it("should correctly identify development environment", async () => {
      process.env.NODE_ENV = "development";

      const { env } = await import("@/lib/env");

      expect(env.isProduction).toBe(false);
      expect(env.isDevelopment).toBe(true);
    });

    it("should prefer AI_BACKEND_URL over NEXT_PUBLIC_AI_BACKEND", async () => {
      process.env.AI_BACKEND_URL = "http://backend-private.example.com";
      process.env.NEXT_PUBLIC_AI_BACKEND = "http://backend-public.example.com";

      const { env } = await import("@/lib/env");

      expect(env.AI_BACKEND_URL).toBe("http://backend-private.example.com");
    });

    it("should fall back to NEXT_PUBLIC_AI_BACKEND when AI_BACKEND_URL is not set", async () => {
      delete process.env.AI_BACKEND_URL;
      process.env.NEXT_PUBLIC_AI_BACKEND = "http://backend-public.example.com";

      const { env } = await import("@/lib/env");

      expect(env.AI_BACKEND_URL).toBe("http://backend-public.example.com");
    });
  });

  describe("logEnvValidation", () => {
    it("should log warnings for missing recommended env vars", async () => {
      const { logger } = await import("@/lib/logger");
      process.env.NEXTAUTH_SECRET = "a".repeat(32);
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.DATABASE_URL = "postgresql://localhost:5432/test";
      process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(32);
      process.env.NODE_ENV = "development";
      delete process.env.OPENAI_API_KEY;

      const { logEnvValidation } = await import("@/lib/env");
      logEnvValidation();

      expect(logger.warn).toHaveBeenCalled();
    });

    it("should log error for missing required env vars", async () => {
      const { logger } = await import("@/lib/logger");
      process.env.NODE_ENV = "development";
      delete process.env.NEXTAUTH_SECRET;

      const { logEnvValidation } = await import("@/lib/env");
      logEnvValidation();

      expect(logger.error).toHaveBeenCalled();
    });

    it("should throw in production when required env vars are missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.DATABASE_URL;

      const { logEnvValidation } = await import("@/lib/env");

      expect(() => logEnvValidation()).toThrow("Missing required environment variables");
    });
  });
});
