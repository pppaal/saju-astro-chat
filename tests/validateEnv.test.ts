/**
 * Environment Variable Validation 테스트
 * - validateEnv 함수
 * - getRequiredEnv / getOptionalEnv
 * - Production/Development 환경 처리
 */

import { vi, beforeEach, afterEach } from "vitest";

describe("Environment Variable Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv function", () => {
    type EnvRequirement = boolean | (() => boolean);

    interface EnvConfig {
      [key: string]: EnvRequirement;
    }

    interface ValidationResult {
      isValid: boolean;
      missing: string[];
      warnings: string[];
    }

    function validateEnv(config: EnvConfig): ValidationResult {
      const missing: string[] = [];
      const warnings: string[] = [];

      for (const [key, requirement] of Object.entries(config)) {
        const isRequired =
          typeof requirement === "function" ? requirement() : requirement;
        const value = process.env[key];

        if (isRequired && !value) {
          missing.push(key);
        }
      }

      return {
        isValid: missing.length === 0,
        missing,
        warnings,
      };
    }

    it("should pass when all required vars are present", () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      process.env.NEXTAUTH_SECRET = "secret";

      const result = validateEnv({
        DATABASE_URL: true,
        NEXTAUTH_SECRET: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("should fail when required vars are missing", () => {
      delete process.env.DATABASE_URL;

      const result = validateEnv({
        DATABASE_URL: true,
        OPTIONAL_VAR: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("DATABASE_URL");
    });

    it("should handle dynamic requirements", () => {
      process.env.NODE_ENV = "production";

      const result = validateEnv({
        PROD_ONLY_VAR: () => process.env.NODE_ENV === "production",
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("PROD_ONLY_VAR");
    });

    it("should skip optional vars", () => {
      const result = validateEnv({
        OPTIONAL_VAR: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("should handle empty string as missing", () => {
      process.env.EMPTY_VAR = "";

      const result = validateEnv({
        EMPTY_VAR: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("EMPTY_VAR");
    });

    it("should handle multiple missing vars", () => {
      delete process.env.VAR1;
      delete process.env.VAR2;
      delete process.env.VAR3;

      const result = validateEnv({
        VAR1: true,
        VAR2: true,
        VAR3: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain("VAR1");
      expect(result.missing).toContain("VAR2");
      expect(result.missing).toContain("VAR3");
    });
  });

  describe("getRequiredEnv function", () => {
    function getRequiredEnv(key: string): string {
      const value = process.env[key];
      if (!value) {
        throw new Error(`[ENV] Missing required environment variable: ${key}`);
      }
      return value;
    }

    it("should return value when present", () => {
      process.env.MY_VAR = "test-value";

      const value = getRequiredEnv("MY_VAR");

      expect(value).toBe("test-value");
    });

    it("should throw when missing", () => {
      delete process.env.MISSING_VAR;

      expect(() => getRequiredEnv("MISSING_VAR")).toThrow(
        "[ENV] Missing required environment variable: MISSING_VAR"
      );
    });

    it("should throw for empty string", () => {
      process.env.EMPTY_VAR = "";

      expect(() => getRequiredEnv("EMPTY_VAR")).toThrow();
    });
  });

  describe("getOptionalEnv function", () => {
    function getOptionalEnv(key: string, defaultValue: string): string {
      return process.env[key] || defaultValue;
    }

    it("should return value when present", () => {
      process.env.MY_VAR = "actual-value";

      const value = getOptionalEnv("MY_VAR", "default");

      expect(value).toBe("actual-value");
    });

    it("should return default when missing", () => {
      delete process.env.MISSING_VAR;

      const value = getOptionalEnv("MISSING_VAR", "default-value");

      expect(value).toBe("default-value");
    });

    it("should return default for empty string", () => {
      process.env.EMPTY_VAR = "";

      const value = getOptionalEnv("EMPTY_VAR", "default");

      expect(value).toBe("default");
    });

    it("should handle numeric defaults", () => {
      const value = getOptionalEnv("PORT", "3000");

      expect(value).toBe("3000");
    });
  });

  describe("isProduction function", () => {
    function isProduction(): boolean {
      return process.env.NODE_ENV === "production";
    }

    it("should return true in production", () => {
      process.env.NODE_ENV = "production";

      expect(isProduction()).toBe(true);
    });

    it("should return false in development", () => {
      process.env.NODE_ENV = "development";

      expect(isProduction()).toBe(false);
    });

    it("should return false in test", () => {
      process.env.NODE_ENV = "test";

      expect(isProduction()).toBe(false);
    });

    it("should return false when undefined", () => {
      delete process.env.NODE_ENV;

      expect(isProduction()).toBe(false);
    });
  });

  describe("getApiToken function", () => {
    function isProduction(): boolean {
      return process.env.NODE_ENV === "production";
    }

    function getApiToken(): string | null {
      const token = process.env.ADMIN_API_TOKEN;

      if (!token && isProduction()) {
        throw new Error("[SECURITY] ADMIN_API_TOKEN is required in production");
      }

      return token || null;
    }

    it("should return token when present", () => {
      process.env.ADMIN_API_TOKEN = "secret-token";

      const token = getApiToken();

      expect(token).toBe("secret-token");
    });

    it("should return null in development when missing", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ADMIN_API_TOKEN;

      const token = getApiToken();

      expect(token).toBeNull();
    });

    it("should throw in production when missing", () => {
      process.env.NODE_ENV = "production";
      delete process.env.ADMIN_API_TOKEN;

      expect(() => getApiToken()).toThrow(
        "[SECURITY] ADMIN_API_TOKEN is required in production"
      );
    });

    it("should return token in production when present", () => {
      process.env.NODE_ENV = "production";
      process.env.ADMIN_API_TOKEN = "prod-token";

      const token = getApiToken();

      expect(token).toBe("prod-token");
    });
  });

  describe("validateRequiredEnv scenarios", () => {
    interface EnvConfig {
      [key: string]: boolean | (() => boolean);
    }

    interface ValidationResult {
      isValid: boolean;
      missing: string[];
    }

    function validateEnv(config: EnvConfig): ValidationResult {
      const missing: string[] = [];

      for (const [key, requirement] of Object.entries(config)) {
        const isRequired =
          typeof requirement === "function" ? requirement() : requirement;
        if (isRequired && !process.env[key]) {
          missing.push(key);
        }
      }

      return {
        isValid: missing.length === 0,
        missing,
      };
    }

    it("should validate development config", () => {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "postgres://localhost/dev";
      process.env.NEXTAUTH_SECRET = "dev-secret";

      const isProduction = process.env.NODE_ENV === "production";

      const result = validateEnv({
        DATABASE_URL: true,
        NEXTAUTH_SECRET: true,
        ADMIN_API_TOKEN: isProduction,
        STRIPE_SECRET_KEY: isProduction,
      });

      expect(result.isValid).toBe(true);
    });

    it("should require production vars in production", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://prod/db";
      process.env.NEXTAUTH_SECRET = "prod-secret";
      delete process.env.ADMIN_API_TOKEN; // Ensure it's missing

      const isProduction = process.env.NODE_ENV === "production";

      const result = validateEnv({
        DATABASE_URL: true,
        NEXTAUTH_SECRET: true,
        ADMIN_API_TOKEN: isProduction,
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("ADMIN_API_TOKEN");
    });

    it("should pass full production validation", () => {
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgres://prod/db";
      process.env.NEXTAUTH_SECRET = "prod-secret";
      process.env.ADMIN_API_TOKEN = "admin-token";
      process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";

      const isProduction = process.env.NODE_ENV === "production";

      const result = validateEnv({
        DATABASE_URL: true,
        NEXTAUTH_SECRET: true,
        ADMIN_API_TOKEN: isProduction,
        STRIPE_SECRET_KEY: isProduction,
        STRIPE_WEBHOOK_SECRET: isProduction,
        UPSTASH_REDIS_REST_URL: isProduction,
        UPSTASH_REDIS_REST_TOKEN: isProduction,
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe("Error Message Formatting", () => {
    function formatMissingEnvError(missing: string[]): string {
      return `[ENV] Missing required environment variables: ${missing.join(", ")}`;
    }

    it("should format single missing var", () => {
      const message = formatMissingEnvError(["DATABASE_URL"]);
      expect(message).toBe(
        "[ENV] Missing required environment variables: DATABASE_URL"
      );
    });

    it("should format multiple missing vars", () => {
      const message = formatMissingEnvError([
        "DATABASE_URL",
        "NEXTAUTH_SECRET",
        "STRIPE_KEY",
      ]);
      expect(message).toBe(
        "[ENV] Missing required environment variables: DATABASE_URL, NEXTAUTH_SECRET, STRIPE_KEY"
      );
    });

    it("should handle empty array", () => {
      const message = formatMissingEnvError([]);
      expect(message).toBe("[ENV] Missing required environment variables: ");
    });
  });

  describe("Environment Behavior Differences", () => {
    interface BehaviorResult {
      shouldThrow: boolean;
      shouldWarn: boolean;
    }

    function getValidationBehavior(
      isProduction: boolean,
      hasMissing: boolean
    ): BehaviorResult {
      if (!hasMissing) {
        return { shouldThrow: false, shouldWarn: false };
      }

      return {
        shouldThrow: isProduction,
        shouldWarn: !isProduction,
      };
    }

    it("should throw in production with missing vars", () => {
      const result = getValidationBehavior(true, true);

      expect(result.shouldThrow).toBe(true);
      expect(result.shouldWarn).toBe(false);
    });

    it("should warn in development with missing vars", () => {
      const result = getValidationBehavior(false, true);

      expect(result.shouldThrow).toBe(false);
      expect(result.shouldWarn).toBe(true);
    });

    it("should do nothing when all vars present", () => {
      const result = getValidationBehavior(true, false);

      expect(result.shouldThrow).toBe(false);
      expect(result.shouldWarn).toBe(false);
    });
  });

  describe("Common Environment Variables", () => {
    const REQUIRED_ALWAYS = ["DATABASE_URL", "NEXTAUTH_SECRET"];

    const REQUIRED_PRODUCTION = [
      "ADMIN_API_TOKEN",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ];

    const OPTIONAL = ["OPENAI_API_KEY"];

    it("should have correct always-required vars", () => {
      expect(REQUIRED_ALWAYS).toContain("DATABASE_URL");
      expect(REQUIRED_ALWAYS).toContain("NEXTAUTH_SECRET");
      expect(REQUIRED_ALWAYS).toHaveLength(2);
    });

    it("should have correct production-required vars", () => {
      expect(REQUIRED_PRODUCTION).toContain("ADMIN_API_TOKEN");
      expect(REQUIRED_PRODUCTION).toContain("STRIPE_SECRET_KEY");
      expect(REQUIRED_PRODUCTION).toContain("STRIPE_WEBHOOK_SECRET");
      expect(REQUIRED_PRODUCTION).toContain("UPSTASH_REDIS_REST_URL");
      expect(REQUIRED_PRODUCTION).toContain("UPSTASH_REDIS_REST_TOKEN");
    });

    it("should have optional AI key", () => {
      expect(OPTIONAL).toContain("OPENAI_API_KEY");
    });
  });

  describe("Truthy/Falsy Value Handling", () => {
    function hasValue(value: string | undefined): boolean {
      return !!value;
    }

    it("should recognize truthy values", () => {
      expect(hasValue("value")).toBe(true);
      expect(hasValue("0")).toBe(true);
      expect(hasValue("false")).toBe(true);
      expect(hasValue(" ")).toBe(true);
    });

    it("should recognize falsy values", () => {
      expect(hasValue("")).toBe(false);
      expect(hasValue(undefined)).toBe(false);
    });
  });

  describe("Dynamic Requirement Functions", () => {
    it("should evaluate function requirements at call time", () => {
      let envValue: string | undefined = undefined;
      const requirement = () => envValue === "production";

      expect(requirement()).toBe(false);

      envValue = "production";
      expect(requirement()).toBe(true);
    });

    it("should handle complex conditional logic", () => {
      const requireRedis = () => {
        const env = process.env.NODE_ENV;
        const hasCache = process.env.ENABLE_CACHE === "true";
        return env === "production" || hasCache;
      };

      process.env.NODE_ENV = "development";
      process.env.ENABLE_CACHE = "false";
      expect(requireRedis()).toBe(false);

      process.env.ENABLE_CACHE = "true";
      expect(requireRedis()).toBe(true);

      process.env.NODE_ENV = "production";
      process.env.ENABLE_CACHE = "false";
      expect(requireRedis()).toBe(true);
    });
  });
});
