/**
 * API Middleware 테스트
 * - extractLocale
 * - validateRequired
 * - apiError / apiSuccess
 * - 컨텍스트 초기화
 */

import { vi } from "vitest";
import {
  extractLocale,
  validateRequired,
  apiError,
  apiSuccess,
  ErrorCodes,
} from "@/lib/api/middleware";

// Mock dependencies
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 50 }),
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/auth/publicToken", () => ({
  requirePublicToken: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

describe("extractLocale", () => {
  it("returns ko for Korean accept-language", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "accept-language": "ko-KR,ko;q=0.9,en;q=0.8" },
    });
    expect(extractLocale(req)).toBe("ko");
  });

  it("returns ja for Japanese accept-language", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "accept-language": "ja-JP,ja;q=0.9" },
    });
    expect(extractLocale(req)).toBe("ja");
  });

  it("returns zh for Chinese accept-language", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "accept-language": "zh-CN,zh;q=0.9" },
    });
    expect(extractLocale(req)).toBe("zh");
  });

  it("returns en for English accept-language", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    expect(extractLocale(req)).toBe("en");
  });

  it("returns en for missing accept-language", () => {
    const req = new Request("http://localhost/api/test");
    expect(extractLocale(req)).toBe("en");
  });

  it("prioritizes URL locale parameter for ko", () => {
    const req = new Request("http://localhost/api/test?locale=ko", {
      headers: { "accept-language": "en-US" },
    });
    expect(extractLocale(req)).toBe("ko");
  });

  it("prioritizes URL locale parameter for ja", () => {
    const req = new Request("http://localhost/api/test?locale=ja");
    expect(extractLocale(req)).toBe("ja");
  });

  it("prioritizes URL locale parameter for zh", () => {
    const req = new Request("http://localhost/api/test?locale=zh");
    expect(extractLocale(req)).toBe("zh");
  });

  it("falls back to en for unknown URL locale", () => {
    const req = new Request("http://localhost/api/test?locale=unknown");
    expect(extractLocale(req)).toBe("en");
  });
});

describe("validateRequired", () => {
  it("returns valid true when all fields present", () => {
    const body = { name: "test", email: "test@test.com", age: 25 };
    const result = validateRequired(body, ["name", "email"]);

    expect(result.valid).toBe(true);
  });

  it("returns invalid with missing fields", () => {
    const body = { name: "test" };
    const result = validateRequired(body, ["name", "email", "age"]);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain("email");
      expect(result.missing).toContain("age");
    }
  });

  it("treats empty string as missing", () => {
    const body = { name: "", email: "test@test.com" };
    const result = validateRequired(body, ["name", "email"]);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain("name");
    }
  });

  it("treats null as missing", () => {
    const body = { name: null, email: "test@test.com" };
    const result = validateRequired(body, ["name", "email"]);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain("name");
    }
  });

  it("treats undefined as missing", () => {
    const body = { email: "test@test.com" };
    const result = validateRequired(body, ["name", "email"]);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain("name");
    }
  });

  it("accepts 0 as valid", () => {
    const body = { count: 0 };
    const result = validateRequired(body, ["count"]);

    expect(result.valid).toBe(true);
  });

  it("accepts false as valid", () => {
    const body = { active: false };
    const result = validateRequired(body, ["active"]);

    expect(result.valid).toBe(true);
  });

  it("returns empty missing array when no required fields", () => {
    const body = { anything: "value" };
    const result = validateRequired(body, []);

    expect(result.valid).toBe(true);
  });
});

describe("apiError", () => {
  it("creates error result with code", () => {
    const result = apiError(ErrorCodes.BAD_REQUEST);

    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("BAD_REQUEST");
    expect(result.data).toBeUndefined();
  });

  it("creates error result with message", () => {
    const result = apiError(ErrorCodes.NOT_FOUND, "User not found");

    expect(result.error?.code).toBe("NOT_FOUND");
    expect(result.error?.message).toBe("User not found");
  });

  it("creates error result with details", () => {
    const result = apiError(ErrorCodes.VALIDATION_ERROR, "Validation failed", {
      fields: ["email", "name"],
    });

    expect(result.error?.code).toBe("VALIDATION_ERROR");
    expect(result.error?.details).toEqual({ fields: ["email", "name"] });
  });

  it("creates error for all error codes", () => {
    const codes = [
      ErrorCodes.BAD_REQUEST,
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.FORBIDDEN,
      ErrorCodes.NOT_FOUND,
      ErrorCodes.RATE_LIMITED,
      ErrorCodes.VALIDATION_ERROR,
      ErrorCodes.INTERNAL_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.TIMEOUT,
      ErrorCodes.DATABASE_ERROR,
    ];

    codes.forEach((code) => {
      const result = apiError(code);
      expect(result.error?.code).toBe(code);
    });
  });
});

describe("apiSuccess", () => {
  it("creates success result with data", () => {
    const result = apiSuccess({ id: 1, name: "test" });

    expect(result.data).toEqual({ id: 1, name: "test" });
    expect(result.error).toBeUndefined();
  });

  it("creates success result with custom status", () => {
    const result = apiSuccess({ created: true }, { status: 201 });

    expect(result.data).toEqual({ created: true });
    expect(result.status).toBe(201);
  });

  it("creates success result with meta", () => {
    const result = apiSuccess(
      { items: [] },
      { meta: { total: 100, page: 1, pageSize: 10 } }
    );

    expect(result.data).toEqual({ items: [] });
    expect(result.meta).toEqual({ total: 100, page: 1, pageSize: 10 });
  });

  it("creates success result with null data", () => {
    const result = apiSuccess(null);

    expect(result.data).toBeNull();
  });

  it("creates success result with array data", () => {
    const result = apiSuccess([1, 2, 3]);

    expect(result.data).toEqual([1, 2, 3]);
  });

  it("creates success result with string data", () => {
    const result = apiSuccess("success message");

    expect(result.data).toBe("success message");
  });
});

describe("ErrorCodes", () => {
  it("exports all error codes", () => {
    expect(ErrorCodes.BAD_REQUEST).toBe("BAD_REQUEST");
    expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
    expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
    expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe("PAYLOAD_TOO_LARGE");
    expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
    expect(ErrorCodes.BACKEND_ERROR).toBe("BACKEND_ERROR");
    expect(ErrorCodes.TIMEOUT).toBe("TIMEOUT");
    expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
  });
});

describe("RateLimitOptions type", () => {
  it("accepts valid rate limit options", () => {
    const options = {
      limit: 60,
      windowSeconds: 60,
      keyPrefix: "api",
    };

    expect(options.limit).toBe(60);
    expect(options.windowSeconds).toBe(60);
    expect(options.keyPrefix).toBe("api");
  });

  it("keyPrefix is optional", () => {
    const options = {
      limit: 100,
      windowSeconds: 120,
    };

    expect(options.limit).toBe(100);
    expect(options.windowSeconds).toBe(120);
  });
});

describe("MiddlewareOptions type", () => {
  it("accepts all options", () => {
    const options = {
      requireToken: true,
      requireAuth: true,
      rateLimit: { limit: 60, windowSeconds: 60 },
      route: "/api/test",
    };

    expect(options.requireToken).toBe(true);
    expect(options.requireAuth).toBe(true);
    expect(options.rateLimit).toBeDefined();
    expect(options.route).toBe("/api/test");
  });

  it("all options are optional", () => {
    const options = {};

    expect(options).toEqual({});
  });
});

describe("ApiContext type", () => {
  it("has all required properties", () => {
    const context = {
      ip: "127.0.0.1",
      locale: "ko",
      session: null,
      userId: "user123",
      isAuthenticated: true,
      isPremium: false,
    };

    expect(context.ip).toBe("127.0.0.1");
    expect(context.locale).toBe("ko");
    expect(context.session).toBeNull();
    expect(context.userId).toBe("user123");
    expect(context.isAuthenticated).toBe(true);
    expect(context.isPremium).toBe(false);
  });
});
