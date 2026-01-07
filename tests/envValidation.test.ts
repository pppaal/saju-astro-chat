/**
 * 환경 변수 검증 테스트
 * - 필수 환경 변수 체크
 * - 환경별 검증 로직
 * - 포맷 유효성 검사
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Required environment variables
const REQUIRED_SERVER_ENV = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "DATABASE_URL",
  "TOKEN_ENCRYPTION_KEY",
] as const;

const REQUIRED_PRODUCTION_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const RECOMMENDED_ENV = ["OPENAI_API_KEY", "AI_BACKEND_URL"] as const;

describe("Environment Validation: Required Variables", () => {
  interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
  }

  const validateEnv = (
    env: Record<string, string | undefined>,
    isProduction: boolean
  ): EnvValidationResult => {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required server env vars
    for (const key of REQUIRED_SERVER_ENV) {
      if (!env[key]) {
        missing.push(key);
      }
    }

    // Check production-only env vars
    if (isProduction) {
      for (const key of REQUIRED_PRODUCTION_ENV) {
        if (!env[key]) {
          missing.push(key);
        }
      }
    }

    // Check recommended (non-blocking)
    for (const key of RECOMMENDED_ENV) {
      if (!env[key]) {
        warnings.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  };

  it("passes validation with all required env vars", () => {
    const env = {
      NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      NEXTAUTH_URL: "https://example.com",
      DATABASE_URL: "postgresql://localhost:5432/db",
      TOKEN_ENCRYPTION_KEY: "another-very-long-key-at-least-32-chars",
      OPENAI_API_KEY: "sk-xxxx",
      AI_BACKEND_URL: "https://api.example.com",
    };

    const result = validateEnv(env, false);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("fails validation with missing required vars", () => {
    const env = {
      NEXTAUTH_URL: "https://example.com",
    };

    const result = validateEnv(env, false);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("NEXTAUTH_SECRET");
    expect(result.missing).toContain("DATABASE_URL");
    expect(result.missing).toContain("TOKEN_ENCRYPTION_KEY");
  });

  it("requires Redis in production", () => {
    const env = {
      NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      NEXTAUTH_URL: "https://example.com",
      DATABASE_URL: "postgresql://localhost:5432/db",
      TOKEN_ENCRYPTION_KEY: "another-very-long-key-at-least-32-chars",
    };

    const devResult = validateEnv(env, false);
    expect(devResult.valid).toBe(true);

    const prodResult = validateEnv(env, true);
    expect(prodResult.valid).toBe(false);
    expect(prodResult.missing).toContain("UPSTASH_REDIS_REST_URL");
    expect(prodResult.missing).toContain("UPSTASH_REDIS_REST_TOKEN");
  });

  it("reports missing recommended vars as warnings", () => {
    const env = {
      NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      NEXTAUTH_URL: "https://example.com",
      DATABASE_URL: "postgresql://localhost:5432/db",
      TOKEN_ENCRYPTION_KEY: "another-very-long-key-at-least-32-chars",
    };

    const result = validateEnv(env, false);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("OPENAI_API_KEY");
    expect(result.warnings).toContain("AI_BACKEND_URL");
  });
});

describe("Environment Validation: Secret Length", () => {
  const validateSecretLength = (secret: string | undefined, minLength: number): boolean => {
    if (!secret) return false;
    return secret.length >= minLength;
  };

  it("accepts secrets meeting minimum length", () => {
    const secret = "a".repeat(32);
    expect(validateSecretLength(secret, 32)).toBe(true);
  });

  it("rejects secrets below minimum length", () => {
    const secret = "a".repeat(31);
    expect(validateSecretLength(secret, 32)).toBe(false);
  });

  it("rejects undefined secrets", () => {
    expect(validateSecretLength(undefined, 32)).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(validateSecretLength("", 32)).toBe(false);
  });
});

describe("Environment Validation: URL Format", () => {
  const validateUrl = (
    url: string | undefined,
    requireHttps: boolean = false
  ): { valid: boolean; error?: string } => {
    if (!url) {
      return { valid: false, error: "missing" };
    }

    try {
      const parsed = new URL(url);

      if (requireHttps && parsed.protocol !== "https:") {
        return { valid: false, error: "must_use_https" };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: "invalid_url" };
    }
  };

  it("validates correct HTTP URL", () => {
    const result = validateUrl("http://localhost:3000");
    expect(result.valid).toBe(true);
  });

  it("validates correct HTTPS URL", () => {
    const result = validateUrl("https://example.com");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = validateUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_url");
  });

  it("enforces HTTPS when required", () => {
    const httpResult = validateUrl("http://example.com", true);
    expect(httpResult.valid).toBe(false);
    expect(httpResult.error).toBe("must_use_https");

    const httpsResult = validateUrl("https://example.com", true);
    expect(httpsResult.valid).toBe(true);
  });

  it("rejects missing URL", () => {
    const result = validateUrl(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing");
  });
});

describe("Environment Validation: Placeholder Detection", () => {
  const isPlaceholder = (value: string | undefined): boolean => {
    if (!value) return true;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return true;

    const placeholders = [
      "replace_me",
      "your_key_here",
      "xxx",
      "changeme",
      "todo",
      "fixme",
    ];

    return placeholders.some((p) => trimmed.includes(p));
  };

  it("detects REPLACE_ME placeholder", () => {
    expect(isPlaceholder("REPLACE_ME")).toBe(true);
    expect(isPlaceholder("replace_me")).toBe(true);
  });

  it("detects empty values as placeholders", () => {
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder("   ")).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
  });

  it("detects common placeholders", () => {
    expect(isPlaceholder("your_key_here")).toBe(true);
    expect(isPlaceholder("changeme")).toBe(true);
    expect(isPlaceholder("TODO: add key")).toBe(true);
  });

  it("accepts real values", () => {
    expect(isPlaceholder("sk-1234567890abcdef")).toBe(false);
    expect(isPlaceholder("https://api.example.com")).toBe(false);
    expect(isPlaceholder("a-real-secure-secret-key")).toBe(false);
  });
});

describe("Environment Validation: Cookie Domain", () => {
  const validateCookieDomain = (
    cookieDomain: string | undefined,
    authUrl: string | undefined
  ): { valid: boolean; error?: string } => {
    if (!cookieDomain) {
      return { valid: false, error: "missing" };
    }

    // Must start with a dot
    if (!cookieDomain.startsWith(".")) {
      return { valid: false, error: "must_start_with_dot" };
    }

    // Must match NEXTAUTH_URL host
    if (authUrl) {
      try {
        const authHost = new URL(authUrl).hostname.toLowerCase();
        const domainWithoutDot = cookieDomain.slice(1);
        if (!authHost.endsWith(domainWithoutDot)) {
          return { valid: false, error: "domain_mismatch" };
        }
      } catch {
        return { valid: false, error: "invalid_auth_url" };
      }
    }

    return { valid: true };
  };

  it("validates correct cookie domain", () => {
    const result = validateCookieDomain(".example.com", "https://app.example.com");
    expect(result.valid).toBe(true);
  });

  it("rejects domain without leading dot", () => {
    const result = validateCookieDomain("example.com", "https://app.example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("must_start_with_dot");
  });

  it("rejects mismatched domain", () => {
    const result = validateCookieDomain(".other.com", "https://app.example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("domain_mismatch");
  });

  it("rejects missing domain", () => {
    const result = validateCookieDomain(undefined, "https://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing");
  });
});

describe("Environment Validation: Stripe Key Format", () => {
  const validateStripeKey = (
    key: string | undefined,
    type: "secret" | "publishable"
  ): { valid: boolean; error?: string } => {
    if (!key) {
      return { valid: false, error: "missing" };
    }

    if (type === "secret") {
      if (!key.startsWith("sk_")) {
        return { valid: false, error: "must_start_with_sk_" };
      }
      // Check for test vs live
      if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
        return { valid: false, error: "invalid_mode" };
      }
    }

    if (type === "publishable") {
      if (!key.startsWith("pk_")) {
        return { valid: false, error: "must_start_with_pk_" };
      }
    }

    return { valid: true };
  };

  it("validates test secret key", () => {
    const result = validateStripeKey("sk_test_123456", "secret");
    expect(result.valid).toBe(true);
  });

  it("validates live secret key", () => {
    const result = validateStripeKey("sk_live_abcdef", "secret");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid secret key prefix", () => {
    const result = validateStripeKey("pk_test_123456", "secret");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("must_start_with_sk_");
  });

  it("validates publishable key", () => {
    const result = validateStripeKey("pk_test_123456", "publishable");
    expect(result.valid).toBe(true);
  });

  it("rejects missing key", () => {
    const result = validateStripeKey(undefined, "secret");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing");
  });
});

describe("Environment Validation: Email Provider", () => {
  type EmailProvider = "none" | "resend" | "sendgrid" | "nodemailer";

  interface EmailConfig {
    provider: EmailProvider;
    resendApiKey?: string;
    sendgridApiKey?: string;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
  }

  const validateEmailConfig = (config: EmailConfig): { valid: boolean; error?: string } => {
    if (config.provider === "none") {
      return { valid: true };
    }

    if (config.provider === "resend") {
      if (!config.resendApiKey) {
        return { valid: false, error: "missing_resend_api_key" };
      }
      return { valid: true };
    }

    if (config.provider === "sendgrid") {
      if (!config.sendgridApiKey) {
        return { valid: false, error: "missing_sendgrid_api_key" };
      }
      return { valid: true };
    }

    if (config.provider === "nodemailer") {
      const required = ["smtpHost", "smtpPort", "smtpUser", "smtpPass"];
      const missing = required.filter(
        (k) => !config[k as keyof EmailConfig]
      );
      if (missing.length > 0) {
        return { valid: false, error: `missing_smtp: ${missing.join(", ")}` };
      }
      return { valid: true };
    }

    return { valid: false, error: "unknown_provider" };
  };

  it("validates disabled email", () => {
    const result = validateEmailConfig({ provider: "none" });
    expect(result.valid).toBe(true);
  });

  it("validates resend with API key", () => {
    const result = validateEmailConfig({
      provider: "resend",
      resendApiKey: "re_xxxx",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects resend without API key", () => {
    const result = validateEmailConfig({ provider: "resend" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing_resend_api_key");
  });

  it("validates sendgrid with API key", () => {
    const result = validateEmailConfig({
      provider: "sendgrid",
      sendgridApiKey: "SG.xxxx",
    });
    expect(result.valid).toBe(true);
  });

  it("validates nodemailer with full config", () => {
    const result = validateEmailConfig({
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
      smtpPort: "587",
      smtpUser: "user",
      smtpPass: "pass",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects nodemailer with missing config", () => {
    const result = validateEmailConfig({
      provider: "nodemailer",
      smtpHost: "smtp.example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("missing_smtp");
  });
});

describe("Environment Validation: Base URL Matching", () => {
  const validateBaseUrlMatch = (
    baseUrl: string | undefined,
    authUrl: string | undefined
  ): { valid: boolean; error?: string } => {
    if (!baseUrl || !authUrl) {
      return { valid: false, error: "missing_url" };
    }

    try {
      const baseHost = new URL(baseUrl).hostname.toLowerCase();
      const authHost = new URL(authUrl).hostname.toLowerCase();

      if (baseHost !== authHost) {
        return { valid: false, error: "host_mismatch" };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: "invalid_url" };
    }
  };

  it("validates matching hosts", () => {
    const result = validateBaseUrlMatch(
      "https://example.com",
      "https://example.com/api/auth"
    );
    expect(result.valid).toBe(true);
  });

  it("rejects mismatched hosts", () => {
    const result = validateBaseUrlMatch(
      "https://app.example.com",
      "https://api.example.com"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("host_mismatch");
  });

  it("handles missing URLs", () => {
    expect(validateBaseUrlMatch(undefined, "https://example.com").error).toBe(
      "missing_url"
    );
    expect(validateBaseUrlMatch("https://example.com", undefined).error).toBe(
      "missing_url"
    );
  });

  it("handles invalid URLs", () => {
    const result = validateBaseUrlMatch("not-a-url", "https://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_url");
  });
});
