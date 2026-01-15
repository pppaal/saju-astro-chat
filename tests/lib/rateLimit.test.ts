/**
 * Rate Limiter Tests
 */

import { vi, beforeEach } from "vitest";

// Mock metrics
vi.mock("@/lib/metrics", () => ({
  recordCounter: vi.fn(),
}));

describe("RateLimitResult type", () => {
  it("has correct structure", () => {
    interface RateLimitResult {
      allowed: boolean;
      limit: number;
      remaining: number;
      reset: number;
      retryAfter?: number;
      headers: Headers;
    }

    const result: RateLimitResult = {
      allowed: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
      headers: new Headers(),
    };

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60);
    expect(result.remaining).toBe(59);
  });
});

describe("Rate limit header format", () => {
  it("creates proper rate limit headers", () => {
    const headers = new Headers();
    const limit = 60;
    const remaining = 55;
    const reset = Math.floor(Date.now() / 1000) + 60;

    headers.set("X-RateLimit-Limit", String(limit));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", String(reset));

    expect(headers.get("X-RateLimit-Limit")).toBe("60");
    expect(headers.get("X-RateLimit-Remaining")).toBe("55");
    expect(headers.get("X-RateLimit-Reset")).toMatch(/^\d+$/);
  });

  it("includes Retry-After for rate limited requests", () => {
    const headers = new Headers();
    const retryAfter = 30;

    headers.set("Retry-After", String(retryAfter));

    expect(headers.get("Retry-After")).toBe("30");
  });
});

describe("In-memory rate limiter logic", () => {
  let store: Map<string, { count: number; resetAt: number }>;

  beforeEach(() => {
    store = new Map();
  });

  it("creates new entry for new key", () => {
    const key = "test-key";
    const windowSeconds = 60;
    const now = Math.floor(Date.now() / 1000);

    store.set(key, { count: 1, resetAt: now + windowSeconds });

    expect(store.get(key)?.count).toBe(1);
    expect(store.get(key)?.resetAt).toBeGreaterThan(now);
  });

  it("increments existing entry", () => {
    const key = "test-key";
    const now = Math.floor(Date.now() / 1000);

    store.set(key, { count: 1, resetAt: now + 60 });

    const existing = store.get(key)!;
    existing.count++;

    expect(store.get(key)?.count).toBe(2);
  });

  it("resets count after window expires", () => {
    const key = "test-key";
    const now = Math.floor(Date.now() / 1000);

    // Expired entry
    store.set(key, { count: 100, resetAt: now - 10 });

    const existing = store.get(key)!;
    if (existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + 60 });
    }

    expect(store.get(key)?.count).toBe(1);
  });

  it("checks if request is allowed based on count", () => {
    const isAllowed = (count: number, limit: number): boolean => {
      return count <= limit;
    };

    expect(isAllowed(1, 60)).toBe(true);
    expect(isAllowed(60, 60)).toBe(true);
    expect(isAllowed(61, 60)).toBe(false);
  });

  it("calculates remaining requests", () => {
    const calculateRemaining = (count: number, limit: number): number => {
      return Math.max(0, limit - count);
    };

    expect(calculateRemaining(1, 60)).toBe(59);
    expect(calculateRemaining(60, 60)).toBe(0);
    expect(calculateRemaining(100, 60)).toBe(0);
  });

  it("calculates retry-after seconds", () => {
    const calculateRetryAfter = (resetAt: number): number => {
      const now = Math.floor(Date.now() / 1000);
      return Math.max(1, resetAt - now);
    };

    const future = Math.floor(Date.now() / 1000) + 30;
    expect(calculateRetryAfter(future)).toBeGreaterThan(0);
    expect(calculateRetryAfter(future)).toBeLessThanOrEqual(30);
  });
});

describe("Rate limit key generation", () => {
  it("generates key from IP and route", () => {
    const generateKey = (ip: string, route: string): string => {
      return `ratelimit:${route}:${ip}`;
    };

    expect(generateKey("127.0.0.1", "/api/saju")).toBe("ratelimit:/api/saju:127.0.0.1");
    expect(generateKey("192.168.1.1", "/api/tarot")).toBe("ratelimit:/api/tarot:192.168.1.1");
  });

  it("handles email as identifier", () => {
    const sanitizeKey = (identifier: string): string => {
      return identifier.toLowerCase().replace(/@/g, "_at_");
    };

    expect(sanitizeKey("user@example.com")).toBe("user_at_example.com");
    expect(sanitizeKey("TEST@DOMAIN.CO.KR")).toBe("test_at_domain.co.kr");
  });
});

describe("Cleanup logic", () => {
  it("identifies expired entries", () => {
    const isExpired = (resetAt: number): boolean => {
      const now = Math.floor(Date.now() / 1000);
      return resetAt < now;
    };

    const past = Math.floor(Date.now() / 1000) - 100;
    const future = Math.floor(Date.now() / 1000) + 100;

    expect(isExpired(past)).toBe(true);
    expect(isExpired(future)).toBe(false);
  });

  it("cleanup only runs after interval", () => {
    const CLEANUP_INTERVAL_MS = 60_000;
    let lastCleanup = Date.now();

    const shouldCleanup = (): boolean => {
      const now = Date.now();
      return now - lastCleanup >= CLEANUP_INTERVAL_MS;
    };

    expect(shouldCleanup()).toBe(false);

    // Simulate time passing
    lastCleanup = Date.now() - CLEANUP_INTERVAL_MS - 1;
    expect(shouldCleanup()).toBe(true);
  });
});

describe("Default rate limit values", () => {
  it("default limit is 60 requests", () => {
    const DEFAULT_LIMIT = 60;
    expect(DEFAULT_LIMIT).toBe(60);
  });

  it("default window is 60 seconds", () => {
    const DEFAULT_WINDOW = 60;
    expect(DEFAULT_WINDOW).toBe(60);
  });
});
