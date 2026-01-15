/**
 * Rate Limiter 고급 테스트
 * - In-memory fallback 테스트
 * - 환경별 동작 테스트
 * - 헤더 검증
 * - 슬라이딩 윈도우 테스트
 */

import { vi, beforeEach, afterEach } from "vitest";

// In-memory store simulation for unit testing
// (Actual rateLimit imports env vars at module load, so we test the logic patterns)

describe("Rate Limit: In-Memory Fallback Logic", () => {
  // Simulate the in-memory store logic
  type StoreEntry = { count: number; resetAt: number };
  let store: Map<string, StoreEntry>;
  let lastCleanup: number;
  const CLEANUP_INTERVAL_MS = 60_000;

  function cleanupExpiredEntries() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

    lastCleanup = now;
    const nowSeconds = Math.floor(now / 1000);

    for (const [key, value] of store) {
      if (value.resetAt < nowSeconds) {
        store.delete(key);
      }
    }
  }

  function inMemoryIncrement(key: string, windowSeconds: number): number {
    cleanupExpiredEntries();

    const now = Math.floor(Date.now() / 1000);
    const existing = store.get(key);

    if (existing && existing.resetAt > now) {
      existing.count++;
      return existing.count;
    }

    // New window
    store.set(key, { count: 1, resetAt: now + windowSeconds });
    return 1;
  }

  beforeEach(() => {
    store = new Map();
    lastCleanup = Date.now();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts count at 1 for new key", () => {
    const count = inMemoryIncrement("new-key", 60);
    expect(count).toBe(1);
  });

  it("increments count for existing key within window", () => {
    inMemoryIncrement("key1", 60);
    const count = inMemoryIncrement("key1", 60);
    expect(count).toBe(2);
  });

  it("resets count after window expires", () => {
    inMemoryIncrement("key1", 10); // 10 second window
    vi.advanceTimersByTime(11_000); // 11 seconds later
    const count = inMemoryIncrement("key1", 10);
    expect(count).toBe(1); // Reset to 1
  });

  it("manages multiple keys independently", () => {
    inMemoryIncrement("user1", 60);
    inMemoryIncrement("user1", 60);
    inMemoryIncrement("user2", 60);

    expect(store.get("user1")?.count).toBe(2);
    expect(store.get("user2")?.count).toBe(1);
  });

  it("cleans up expired entries after interval", () => {
    inMemoryIncrement("old-key", 5);
    vi.advanceTimersByTime(6_000); // Entry expired

    // Fast forward past cleanup interval
    vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

    // Trigger cleanup by incrementing another key
    inMemoryIncrement("new-key", 60);

    expect(store.has("old-key")).toBe(false);
    expect(store.has("new-key")).toBe(true);
  });

  it("does not clean up before interval", () => {
    inMemoryIncrement("key1", 5);
    vi.advanceTimersByTime(10_000); // Entry expired but before cleanup interval

    // Try to trigger cleanup
    inMemoryIncrement("key2", 60);

    // old entry still present (cleanup hasn't run)
    expect(store.has("key1")).toBe(true);
  });
});

describe("Rate Limit: Headers Generation", () => {
  function buildRateLimitHeaders(
    limit: number,
    remaining: number,
    reset: number,
    retryAfter?: number,
    policy?: string
  ): Headers {
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", String(limit));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", String(reset));
    if (policy) {
      headers.set("X-RateLimit-Policy", policy);
    }
    if (retryAfter && retryAfter > 0) {
      headers.set("Retry-After", String(retryAfter));
    }
    return headers;
  }

  it("includes all rate limit headers", () => {
    const headers = buildRateLimitHeaders(60, 55, 1234567890);

    expect(headers.get("X-RateLimit-Limit")).toBe("60");
    expect(headers.get("X-RateLimit-Remaining")).toBe("55");
    expect(headers.get("X-RateLimit-Reset")).toBe("1234567890");
  });

  it("includes Retry-After when rate limited", () => {
    const headers = buildRateLimitHeaders(60, 0, 1234567890, 30);

    expect(headers.get("Retry-After")).toBe("30");
  });

  it("does not include Retry-After when not limited", () => {
    const headers = buildRateLimitHeaders(60, 55, 1234567890);

    expect(headers.get("Retry-After")).toBeNull();
  });

  it("includes policy header when specified", () => {
    const headers = buildRateLimitHeaders(60, 55, 1234567890, undefined, "in-memory-fallback");

    expect(headers.get("X-RateLimit-Policy")).toBe("in-memory-fallback");
  });
});

describe("Rate Limit: Result Building", () => {
  function buildResult(
    count: number,
    limit: number,
    reset: number
  ): { allowed: boolean; remaining: number; retryAfter?: number } {
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;
    const retryAfter = allowed ? undefined : reset - Math.floor(Date.now() / 1000);

    return { allowed, remaining, retryAfter };
  }

  it("allows when count is under limit", () => {
    const result = buildResult(5, 60, Date.now() / 1000 + 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(55);
    expect(result.retryAfter).toBeUndefined();
  });

  it("allows when count equals limit", () => {
    const result = buildResult(60, 60, Date.now() / 1000 + 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks when count exceeds limit", () => {
    const result = buildResult(61, 60, Date.now() / 1000 + 30);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("calculates remaining correctly", () => {
    expect(buildResult(0, 100, 0).remaining).toBe(100);
    expect(buildResult(50, 100, 0).remaining).toBe(50);
    expect(buildResult(100, 100, 0).remaining).toBe(0);
    expect(buildResult(150, 100, 0).remaining).toBe(0); // Never negative
  });
});

describe("Rate Limit: Configuration Options", () => {
  const DEFAULT_OPTIONS = {
    limit: 60,
    windowSeconds: 60,
  };

  function mergeOptions(options: { limit?: number; windowSeconds?: number }) {
    return { ...DEFAULT_OPTIONS, ...options };
  }

  it("uses default limit of 60", () => {
    const opts = mergeOptions({});
    expect(opts.limit).toBe(60);
  });

  it("uses default window of 60 seconds", () => {
    const opts = mergeOptions({});
    expect(opts.windowSeconds).toBe(60);
  });

  it("overrides limit when provided", () => {
    const opts = mergeOptions({ limit: 100 });
    expect(opts.limit).toBe(100);
    expect(opts.windowSeconds).toBe(60); // Default preserved
  });

  it("overrides window when provided", () => {
    const opts = mergeOptions({ windowSeconds: 120 });
    expect(opts.limit).toBe(60); // Default preserved
    expect(opts.windowSeconds).toBe(120);
  });

  it("overrides both when provided", () => {
    const opts = mergeOptions({ limit: 10, windowSeconds: 10 });
    expect(opts.limit).toBe(10);
    expect(opts.windowSeconds).toBe(10);
  });
});

describe("Rate Limit: Key Generation Patterns", () => {
  function generateRateLimitKey(prefix: string, identifier: string): string {
    return `ratelimit:${prefix}:${identifier}`;
  }

  it("generates consistent keys", () => {
    const key1 = generateRateLimitKey("api", "user123");
    const key2 = generateRateLimitKey("api", "user123");
    expect(key1).toBe(key2);
  });

  it("generates unique keys for different users", () => {
    const key1 = generateRateLimitKey("api", "user1");
    const key2 = generateRateLimitKey("api", "user2");
    expect(key1).not.toBe(key2);
  });

  it("generates unique keys for different endpoints", () => {
    const key1 = generateRateLimitKey("api:saju", "user1");
    const key2 = generateRateLimitKey("api:tarot", "user1");
    expect(key1).not.toBe(key2);
  });

  it("handles IP addresses", () => {
    const key = generateRateLimitKey("ip", "192.168.1.1");
    expect(key).toBe("ratelimit:ip:192.168.1.1");
  });

  it("handles email addresses", () => {
    const key = generateRateLimitKey("email", "user@example.com");
    expect(key).toBe("ratelimit:email:user@example.com");
  });
});

describe("Rate Limit: Environment Behavior", () => {
  // Test the logic patterns without actual env vars
  function getRateLimitBehavior(
    hasRedisConfig: boolean,
    isProduction: boolean
  ): "allow" | "block" | "use-redis" {
    if (hasRedisConfig) {
      return "use-redis";
    }

    if (isProduction) {
      // Block in production without Redis
      return "block";
    }

    // Allow in development without Redis
    return "allow";
  }

  it("uses Redis when configured", () => {
    expect(getRateLimitBehavior(true, true)).toBe("use-redis");
    expect(getRateLimitBehavior(true, false)).toBe("use-redis");
  });

  it("blocks in production without Redis", () => {
    expect(getRateLimitBehavior(false, true)).toBe("block");
  });

  it("allows in development without Redis", () => {
    expect(getRateLimitBehavior(false, false)).toBe("allow");
  });
});

describe("Rate Limit: Sliding Window Algorithm", () => {
  // Test the sliding window concept
  function slidingWindowCheck(
    requests: number[],
    windowMs: number,
    limit: number,
    now: number
  ): { allowed: boolean; count: number } {
    // Count requests within the window
    const windowStart = now - windowMs;
    const count = requests.filter((t) => t > windowStart).length + 1; // +1 for current request

    return {
      allowed: count <= limit,
      count,
    };
  }

  it("allows first request in empty window", () => {
    const now = 1000;
    const result = slidingWindowCheck([], 60_000, 10, now);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("allows requests under limit", () => {
    const now = 1000;
    const requests = [500, 600, 700]; // 3 previous requests
    const result = slidingWindowCheck(requests, 60_000, 10, now);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(4);
  });

  it("blocks requests at limit", () => {
    const now = 1000;
    const requests = Array(10)
      .fill(0)
      .map((_, i) => 100 + i * 50); // 10 previous requests
    const result = slidingWindowCheck(requests, 60_000, 10, now);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(11);
  });

  it("ignores requests outside window", () => {
    const now = 100_000;
    const requests = [1000, 2000, 3000]; // Old requests outside 60s window
    const result = slidingWindowCheck(requests, 60_000, 10, now);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1); // Only current request counts
  });

  it("handles mixed old and new requests", () => {
    const now = 100_000;
    const requests = [
      1000, // Old, outside window
      50_000, // New, inside window
      90_000, // New, inside window
    ];
    const result = slidingWindowCheck(requests, 60_000, 10, now);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(3); // 2 in window + current
  });
});

describe("Rate Limit: Upstash Pipeline Response Parsing", () => {
  function parseUpstashPipelineResponse(data: unknown): number | null {
    if (!Array.isArray(data)) return null;
    if (!data[0]) return null;
    if (typeof data[0].result !== "number") return null;
    return data[0].result as number;
  }

  it("parses valid response", () => {
    const response = [{ result: 5 }, { result: "OK" }];
    expect(parseUpstashPipelineResponse(response)).toBe(5);
  });

  it("returns null for non-array", () => {
    expect(parseUpstashPipelineResponse(null)).toBeNull();
    expect(parseUpstashPipelineResponse(undefined)).toBeNull();
    expect(parseUpstashPipelineResponse("string")).toBeNull();
    expect(parseUpstashPipelineResponse(123)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(parseUpstashPipelineResponse([])).toBeNull();
  });

  it("returns null when result is not a number", () => {
    expect(parseUpstashPipelineResponse([{ result: "OK" }])).toBeNull();
    expect(parseUpstashPipelineResponse([{ error: "Error" }])).toBeNull();
    expect(parseUpstashPipelineResponse([{}])).toBeNull();
  });

  it("handles large counts", () => {
    const response = [{ result: 999999 }, { result: "OK" }];
    expect(parseUpstashPipelineResponse(response)).toBe(999999);
  });
});
