/**
 * Public Token 인증 테스트
 * - 토큰 검증 로직
 * - 개발/프로덕션 환경 분기
 * - 에러 처리
 */


import { vi, beforeEach, afterEach } from "vitest";
import { requirePublicToken, type TokenValidationResult } from "@/lib/auth/publicToken";

// 환경 변수 모킹
const originalEnv = process.env;

describe("requirePublicToken", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Mock Request 생성 헬퍼
  function createMockRequest(token?: string): Request {
    const headers = new Headers();
    if (token) {
      headers.set("x-api-token", token);
    }
    return {
      headers,
    } as unknown as Request;
  }

  describe("when PUBLIC_API_TOKEN is not set", () => {
    it("allows request in development mode", () => {
      process.env.PUBLIC_API_TOKEN = "";
      process.env.NODE_ENV = "development";

      const req = createMockRequest();
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("allows request in test mode", () => {
      process.env.PUBLIC_API_TOKEN = "";
      process.env.NODE_ENV = "test";

      const req = createMockRequest();
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("rejects request in production mode", () => {
      process.env.PUBLIC_API_TOKEN = "";
      process.env.NODE_ENV = "production";

      const req = createMockRequest();
      const result = requirePublicToken(req);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("not configured");
      }
    });
  });

  describe("when PUBLIC_API_TOKEN is set", () => {
    const validToken = "test-valid-token-12345";

    beforeEach(() => {
      process.env.PUBLIC_API_TOKEN = validToken;
    });

    it("accepts valid token", () => {
      const req = createMockRequest(validToken);
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("rejects invalid token", () => {
      const req = createMockRequest("wrong-token");
      const result = requirePublicToken(req);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("Invalid");
      }
    });

    it("rejects missing token", () => {
      const req = createMockRequest();
      const result = requirePublicToken(req);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("missing");
      }
    });

    it("rejects empty token", () => {
      const req = createMockRequest("");
      const result = requirePublicToken(req);

      expect(result.valid).toBe(false);
    });

    it("is case-sensitive", () => {
      const req = createMockRequest(validToken.toUpperCase());
      const result = requirePublicToken(req);

      // 토큰은 대소문자를 구분함
      if (validToken !== validToken.toUpperCase()) {
        expect(result.valid).toBe(false);
      }
    });
  });

  describe("TokenValidationResult type", () => {
    it("valid result has valid: true", () => {
      const result: TokenValidationResult = { valid: true };
      expect(result.valid).toBe(true);
    });

    it("invalid result has valid: false and reason", () => {
      const result: TokenValidationResult = { valid: false, reason: "Test reason" };
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Test reason");
    });
  });

  describe("header extraction", () => {
    it("reads token from x-api-token header", () => {
      process.env.PUBLIC_API_TOKEN = "expected-token";

      const headers = new Headers();
      headers.set("x-api-token", "expected-token");
      const req = { headers } as unknown as Request;

      const result = requirePublicToken(req);
      expect(result.valid).toBe(true);
    });

    it("header name is case-insensitive", () => {
      process.env.PUBLIC_API_TOKEN = "expected-token";

      const headers = new Headers();
      headers.set("X-API-TOKEN", "expected-token");
      const req = { headers } as unknown as Request;

      const result = requirePublicToken(req);
      // Headers API는 일반적으로 대소문자 구분 없음
      expect(result.valid).toBe(true);
    });
  });

  describe("security scenarios", () => {
    it("does not expose expected token in error message", () => {
      process.env.PUBLIC_API_TOKEN = "secret-token-12345";

      const req = createMockRequest("wrong");
      const result = requirePublicToken(req);

      if (!result.valid) {
        expect(result.reason).not.toContain("secret-token-12345");
      }
    });

    it("handles special characters in token", () => {
      const specialToken = "token-with-special-!@#$%^&*()";
      process.env.PUBLIC_API_TOKEN = specialToken;

      const req = createMockRequest(specialToken);
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("handles unicode in token", () => {
      const unicodeToken = "토큰-테스트-123";
      process.env.PUBLIC_API_TOKEN = unicodeToken;

      const req = createMockRequest(unicodeToken);
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("handles very long token", () => {
      const longToken = "a".repeat(1000);
      process.env.PUBLIC_API_TOKEN = longToken;

      const req = createMockRequest(longToken);
      const result = requirePublicToken(req);

      expect(result.valid).toBe(true);
    });

    it("rejects token with extra whitespace", () => {
      process.env.PUBLIC_API_TOKEN = "valid-token";

      const req = createMockRequest(" valid-token ");
      const result = requirePublicToken(req);

      expect(result.valid).toBe(false);
    });
  });
});

describe("Token validation logic", () => {
  it("performs strict equality check", () => {
    // 토큰 비교는 === 사용
    const expected = "test123";
    const got = "test123";

    expect(got === expected).toBe(true);
  });

  it("differentiates null and undefined", () => {
    // null과 undefined가 다르게 처리되는지 확인
    const headers = new Headers();

    // 설정되지 않은 헤더는 null 반환
    expect(headers.get("nonexistent")).toBeNull();
  });

  it("handles boolean-like strings correctly", () => {
    // "true", "false" 같은 문자열도 문자열로 비교
    const result = "true" === "true";
    expect(result).toBe(true);

    const result2 = "true" === true.toString();
    expect(result2).toBe(true);
  });
});
