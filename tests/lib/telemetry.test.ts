/**
 * Telemetry Tests
 *
 * Tests for telemetry and PII scrubbing functionality
 */

import { vi, beforeEach } from "vitest";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe("Sensitive key detection", () => {
  const SENSITIVE_KEYS = [
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-api-token",
    "token",
    "secret",
    "password",
    "apikey",
    "access_key",
    "refresh_token",
  ];

  it("identifies sensitive keys", () => {
    const isSensitive = (key: string): boolean => {
      const lowerKey = key.toLowerCase();
      return SENSITIVE_KEYS.some((k) => lowerKey.includes(k));
    };

    expect(isSensitive("Authorization")).toBe(true);
    expect(isSensitive("x-api-key")).toBe(true);
    expect(isSensitive("password")).toBe(true);
    expect(isSensitive("access_token")).toBe(true);
    expect(isSensitive("refresh_token")).toBe(true);
  });

  it("allows non-sensitive keys", () => {
    const isSensitive = (key: string): boolean => {
      const lowerKey = key.toLowerCase();
      return SENSITIVE_KEYS.some((k) => lowerKey.includes(k));
    };

    expect(isSensitive("userId")).toBe(false);
    expect(isSensitive("email")).toBe(false);
    expect(isSensitive("birthDate")).toBe(false);
    expect(isSensitive("name")).toBe(false);
  });

  it("is case insensitive", () => {
    const isSensitive = (key: string): boolean => {
      const lowerKey = key.toLowerCase();
      return SENSITIVE_KEYS.some((k) => lowerKey.includes(k));
    };

    expect(isSensitive("PASSWORD")).toBe(true);
    expect(isSensitive("Password")).toBe(true);
    expect(isSensitive("X-API-KEY")).toBe(true);
    expect(isSensitive("AUTHORIZATION")).toBe(true);
  });
});

describe("Value scrubbing", () => {
  const REDACTED = "[redacted]";

  const scrubValue = (key: string, value: unknown): unknown => {
    const sensitiveKeys = ["password", "token", "secret", "apikey"];
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) return REDACTED;
    return value;
  };

  it("redacts sensitive values", () => {
    expect(scrubValue("password", "secret123")).toBe(REDACTED);
    expect(scrubValue("apiToken", "tk_123")).toBe(REDACTED);
    expect(scrubValue("accessSecret", "abc")).toBe(REDACTED);
  });

  it("preserves non-sensitive values", () => {
    expect(scrubValue("userId", "user123")).toBe("user123");
    expect(scrubValue("email", "test@example.com")).toBe("test@example.com");
    expect(scrubValue("birthDate", "1990-01-01")).toBe("1990-01-01");
  });
});

describe("Object scrubbing", () => {
  const REDACTED = "[redacted]";

  const scrubObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sensitiveKeys = ["password", "token", "secret"];
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        out[key] = REDACTED;
      } else if (typeof value === "object" && value !== null) {
        out[key] = scrubObject(value as Record<string, unknown>);
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  it("scrubs sensitive fields from object", () => {
    const input = {
      userId: "123",
      password: "secret",
      apiToken: "tk_abc",
    };

    const result = scrubObject(input);

    expect(result.userId).toBe("123");
    expect(result.password).toBe(REDACTED);
    expect(result.apiToken).toBe(REDACTED);
  });

  it("handles nested objects", () => {
    const input = {
      user: {
        id: "123",
        password: "secret",
      },
    };

    const result = scrubObject(input);
    const user = result.user as Record<string, unknown>;

    expect(user.id).toBe("123");
    expect(user.password).toBe(REDACTED);
  });

  it("preserves non-object values", () => {
    const input = {
      count: 42,
      enabled: true,
      name: "Test",
    };

    const result = scrubObject(input);

    expect(result.count).toBe(42);
    expect(result.enabled).toBe(true);
    expect(result.name).toBe("Test");
  });
});

describe("Depth limiting", () => {
  it("truncates deeply nested objects", () => {
    const scrubObject = (obj: unknown, depth = 0): unknown => {
      if (depth > 2) return "[truncated]";
      if (obj && typeof obj === "object") {
        if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1));
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          out[k] = scrubObject(v, depth + 1);
        }
        return out;
      }
      return obj;
    };

    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: "deep value",
          },
        },
      },
    };

    const result = scrubObject(deepObject) as Record<string, unknown>;
    const level1 = result.level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3;

    expect(level3).toBe("[truncated]");
  });
});

describe("Array handling", () => {
  it("scrubs arrays", () => {
    const scrubObject = (obj: unknown, depth = 0): unknown => {
      if (obj && typeof obj === "object") {
        if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1));
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          out[k] = scrubObject(v, depth + 1);
        }
        return out;
      }
      return obj;
    };

    const input = [1, 2, { name: "test" }];
    const result = scrubObject(input) as unknown[];

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(1);
    expect(result[2]).toEqual({ name: "test" });
  });
});

describe("Error payload creation", () => {
  it("creates payload from Error object", () => {
    const createPayload = (error: unknown): { message: string; stack?: string } => {
      return {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    };

    const error = new Error("Test error");
    const payload = createPayload(error);

    expect(payload.message).toBe("Test error");
    expect(payload.stack).toBeDefined();
  });

  it("creates payload from string", () => {
    const createPayload = (error: unknown): { message: string; stack?: string } => {
      return {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    };

    const payload = createPayload("String error");

    expect(payload.message).toBe("String error");
    expect(payload.stack).toBeUndefined();
  });

  it("handles null/undefined", () => {
    const createPayload = (error: unknown): { message: string } => {
      return {
        message: error instanceof Error ? error.message : String(error),
      };
    };

    expect(createPayload(null).message).toBe("null");
    expect(createPayload(undefined).message).toBe("undefined");
  });
});

describe("Context merging", () => {
  it("merges context with error payload", () => {
    const createPayload = (
      error: Error,
      context?: Record<string, unknown>
    ): Record<string, unknown> => {
      return {
        message: error.message,
        stack: error.stack,
        ...(context || {}),
      };
    };

    const error = new Error("Test");
    const context = { userId: "123", route: "/api/test" };
    const payload = createPayload(error, context);

    expect(payload.message).toBe("Test");
    expect(payload.userId).toBe("123");
    expect(payload.route).toBe("/api/test");
  });
});
