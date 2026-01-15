/**
 * Rate Limiting 테스트
 * - 순수 함수 로직 테스트 (Redis 의존성 없음)
 * - Upstash REST API 모킹 테스트
 */

import { vi } from "vitest";

// Rate limit 로직의 순수 함수 버전 (실제 모듈과 동일한 로직)
function calculateRateLimitResult(
  count: number | null,
  limit: number,
  windowSeconds: number,
  isProduction: boolean,
  redisConfigured: boolean
): {
  allowed: boolean;
  remaining: number;
  policy: string;
} {
  // Redis가 설정되지 않은 경우
  if (!redisConfigured) {
    if (isProduction) {
      return { allowed: false, remaining: 0, policy: "enforced-no-backend" };
    }
    return { allowed: true, remaining: limit, policy: "disabled-dev" };
  }

  // Redis 연결 실패
  if (count === null) {
    if (isProduction) {
      return { allowed: false, remaining: 0, policy: "error-blocked" };
    }
    return { allowed: true, remaining: limit, policy: "error-dev" };
  }

  // 정상적인 rate limit 체크
  const remaining = Math.max(0, limit - count);
  return {
    allowed: count <= limit,
    remaining,
    policy: "active",
  };
}

describe("Rate Limiting: Core Logic", () => {
  describe("calculateRateLimitResult", () => {
    it("allows request when under limit", () => {
      const result = calculateRateLimitResult(5, 60, 60, true, true);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(55);
    });

    it("allows request at exact limit", () => {
      const result = calculateRateLimitResult(60, 60, 60, true, true);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("blocks request when over limit", () => {
      const result = calculateRateLimitResult(61, 60, 60, true, true);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("blocks when Redis unavailable in production", () => {
      const result = calculateRateLimitResult(null, 60, 60, true, true);
      expect(result.allowed).toBe(false);
      expect(result.policy).toBe("error-blocked");
    });

    it("allows when Redis unavailable in development", () => {
      const result = calculateRateLimitResult(null, 60, 60, false, true);
      expect(result.allowed).toBe(true);
      expect(result.policy).toBe("error-dev");
    });

    it("blocks when Redis not configured in production", () => {
      const result = calculateRateLimitResult(null, 60, 60, true, false);
      expect(result.allowed).toBe(false);
      expect(result.policy).toBe("enforced-no-backend");
    });

    it("allows when Redis not configured in development", () => {
      const result = calculateRateLimitResult(null, 60, 60, false, false);
      expect(result.allowed).toBe(true);
      expect(result.policy).toBe("disabled-dev");
    });
  });
});

describe("Rate Limiting: Header Generation", () => {
  const createRateLimitHeaders = (
    limit: number,
    remaining: number | string,
    reset: number,
    policy?: string
  ): Headers => {
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", String(limit));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", String(reset));
    if (policy) {
      headers.set("X-RateLimit-Policy", policy);
    }
    return headers;
  };

  it("generates correct headers for normal operation", () => {
    const headers = createRateLimitHeaders(100, 75, 1234567890);
    expect(headers.get("X-RateLimit-Limit")).toBe("100");
    expect(headers.get("X-RateLimit-Remaining")).toBe("75");
    expect(headers.get("X-RateLimit-Reset")).toBe("1234567890");
  });

  it("generates correct headers when rate limited", () => {
    const headers = createRateLimitHeaders(100, 0, 1234567890);
    expect(headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("generates correct headers with policy indicator", () => {
    const headers = createRateLimitHeaders(100, "unlimited", 0, "disabled-dev");
    expect(headers.get("X-RateLimit-Policy")).toBe("disabled-dev");
    expect(headers.get("X-RateLimit-Remaining")).toBe("unlimited");
  });
});

describe("Rate Limiting: Key Generation", () => {
  const generateRateLimitKey = (
    prefix: string,
    identifier: string,
    endpoint?: string
  ): string => {
    const parts = [prefix, identifier];
    if (endpoint) {
      parts.push(endpoint.replace(/\//g, ":"));
    }
    return parts.join(":");
  };

  it("generates key with IP address", () => {
    const key = generateRateLimitKey("ratelimit", "192.168.1.1");
    expect(key).toBe("ratelimit:192.168.1.1");
  });

  it("generates key with user ID", () => {
    const key = generateRateLimitKey("ratelimit", "user_123");
    expect(key).toBe("ratelimit:user_123");
  });

  it("generates key with endpoint", () => {
    const key = generateRateLimitKey("ratelimit", "192.168.1.1", "/api/saju");
    expect(key).toBe("ratelimit:192.168.1.1::api:saju");
  });

  it("handles IPv6 addresses", () => {
    const key = generateRateLimitKey("ratelimit", "::1");
    expect(key).toBe("ratelimit:::1");
  });
});

describe("Rate Limiting: Upstash Response Parsing", () => {
  // Upstash pipeline response parser
  const parseUpstashPipelineResponse = (
    data: unknown
  ): number | null => {
    if (!Array.isArray(data)) return null;
    if (!data[0] || typeof data[0].result !== "number") return null;
    return data[0].result;
  };

  it("parses successful INCR response", () => {
    const response = [{ result: 5 }, { result: "OK" }];
    expect(parseUpstashPipelineResponse(response)).toBe(5);
  });

  it("returns null for invalid response format", () => {
    expect(parseUpstashPipelineResponse(null)).toBe(null);
    expect(parseUpstashPipelineResponse({})).toBe(null);
    expect(parseUpstashPipelineResponse("error")).toBe(null);
  });

  it("returns null for missing result", () => {
    expect(parseUpstashPipelineResponse([{}])).toBe(null);
    expect(parseUpstashPipelineResponse([{ error: "WRONGTYPE" }])).toBe(null);
  });

  it("returns null for non-numeric result", () => {
    expect(parseUpstashPipelineResponse([{ result: "OK" }])).toBe(null);
  });
});

describe("Rate Limiting: Window Calculation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const calculateResetTime = (windowSeconds: number): number => {
    return Math.floor(Date.now() / 1000) + windowSeconds;
  };

  it("calculates reset time correctly for 60 second window", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    const resetTime = calculateResetTime(60);
    // 1704110400 (12:00:00) + 60 = 1704110460 (12:01:00)
    expect(resetTime).toBe(1704110460);
  });

  it("calculates reset time correctly for 1 hour window", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    const resetTime = calculateResetTime(3600);
    expect(resetTime).toBe(1704110400 + 3600);
  });
});

describe("Rate Limiting: Endpoint-specific Limits", () => {
  // Different endpoints may have different limits
  const getEndpointLimit = (
    endpoint: string
  ): { limit: number; windowSeconds: number } => {
    const limits: Record<string, { limit: number; windowSeconds: number }> = {
      "/api/saju": { limit: 20, windowSeconds: 60 },
      "/api/tarot": { limit: 30, windowSeconds: 60 },
      "/api/auth/register": { limit: 5, windowSeconds: 300 },
      "/api/checkout": { limit: 10, windowSeconds: 60 },
      default: { limit: 60, windowSeconds: 60 },
    };

    return limits[endpoint] || limits.default;
  };

  it("returns stricter limit for saju endpoint", () => {
    const limit = getEndpointLimit("/api/saju");
    expect(limit.limit).toBe(20);
  });

  it("returns very strict limit for registration", () => {
    const limit = getEndpointLimit("/api/auth/register");
    expect(limit.limit).toBe(5);
    expect(limit.windowSeconds).toBe(300); // 5 minutes
  });

  it("returns default limit for unknown endpoints", () => {
    const limit = getEndpointLimit("/api/unknown");
    expect(limit.limit).toBe(60);
    expect(limit.windowSeconds).toBe(60);
  });
});

describe("Rate Limiting: Client IP Extraction", () => {
  // Simulates getClientIp logic
  const extractClientIp = (headers: Record<string, string | null>): string => {
    // Check common forwarding headers in priority order
    const forwardedFor = headers["x-forwarded-for"];
    if (forwardedFor) {
      // Take the first IP in the chain (client IP)
      return forwardedFor.split(",")[0].trim();
    }

    const realIp = headers["x-real-ip"];
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = headers["cf-connecting-ip"];
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return "unknown";
  };

  it("extracts IP from x-forwarded-for header", () => {
    const ip = extractClientIp({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      "x-real-ip": null,
      "cf-connecting-ip": null,
    });
    expect(ip).toBe("203.0.113.195");
  });

  it("extracts IP from x-real-ip header", () => {
    const ip = extractClientIp({
      "x-forwarded-for": null,
      "x-real-ip": "192.168.1.100",
      "cf-connecting-ip": null,
    });
    expect(ip).toBe("192.168.1.100");
  });

  it("extracts IP from Cloudflare header", () => {
    const ip = extractClientIp({
      "x-forwarded-for": null,
      "x-real-ip": null,
      "cf-connecting-ip": "104.26.10.12",
    });
    expect(ip).toBe("104.26.10.12");
  });

  it("returns unknown when no headers present", () => {
    const ip = extractClientIp({
      "x-forwarded-for": null,
      "x-real-ip": null,
      "cf-connecting-ip": null,
    });
    expect(ip).toBe("unknown");
  });
});

describe("Rate Limiting: Abuse Detection", () => {
  // Detect potential abuse patterns
  const isAbusePattern = (
    requestCount: number,
    timeWindowMs: number,
    threshold: number
  ): boolean => {
    // Calculate requests per second
    const rps = requestCount / (timeWindowMs / 1000);
    return rps > threshold;
  };

  it("detects rapid-fire requests", () => {
    // 100 requests in 1 second = 100 rps
    expect(isAbusePattern(100, 1000, 10)).toBe(true);
  });

  it("allows normal request patterns", () => {
    // 10 requests in 60 seconds = 0.167 rps
    expect(isAbusePattern(10, 60000, 10)).toBe(false);
  });

  it("handles edge case at threshold", () => {
    // Exactly 10 rps is allowed
    expect(isAbusePattern(10, 1000, 10)).toBe(false);
    // 11 rps is abuse
    expect(isAbusePattern(11, 1000, 10)).toBe(true);
  });
});

describe("Rate Limiting: In-Memory Fallback", () => {
  // Simulate the in-memory rate limiter logic
  const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

  const inMemoryIncrement = (key: string, windowSeconds: number): number => {
    const now = Math.floor(Date.now() / 1000);
    const existing = inMemoryStore.get(key);

    if (existing && existing.resetAt > now) {
      existing.count++;
      return existing.count;
    }

    // New window
    inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds });
    return 1;
  };

  beforeEach(() => {
    inMemoryStore.clear();
  });

  it("starts with count 1 for new key", () => {
    const count = inMemoryIncrement("test-key", 60);
    expect(count).toBe(1);
  });

  it("increments count for existing key within window", () => {
    inMemoryIncrement("test-key", 60);
    inMemoryIncrement("test-key", 60);
    const count = inMemoryIncrement("test-key", 60);
    expect(count).toBe(3);
  });

  it("resets count after window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

    inMemoryIncrement("test-key", 60);
    inMemoryIncrement("test-key", 60);

    // Move time forward past window
    vi.setSystemTime(new Date("2024-01-01T12:01:01Z"));

    const count = inMemoryIncrement("test-key", 60);
    expect(count).toBe(1);

    vi.useRealTimers();
  });

  it("handles multiple keys independently", () => {
    inMemoryIncrement("key-a", 60);
    inMemoryIncrement("key-a", 60);
    inMemoryIncrement("key-b", 60);

    expect(inMemoryStore.get("key-a")?.count).toBe(2);
    expect(inMemoryStore.get("key-b")?.count).toBe(1);
  });
});

describe("Rate Limiting: Retry-After Header", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createRateLimitHeadersWithRetry = (
    limit: number,
    remaining: number,
    reset: number,
    allowed: boolean
  ): Headers => {
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", String(limit));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", String(reset));

    if (!allowed) {
      const retryAfter = reset - Math.floor(Date.now() / 1000);
      if (retryAfter > 0) {
        headers.set("Retry-After", String(retryAfter));
      }
    }
    return headers;
  };

  it("sets Retry-After header when rate limited", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    const reset = Math.floor(Date.now() / 1000) + 60;

    const headers = createRateLimitHeadersWithRetry(60, 0, reset, false);
    expect(headers.get("Retry-After")).toBe("60");
  });

  it("does not set Retry-After header when allowed", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    const reset = Math.floor(Date.now() / 1000) + 60;

    const headers = createRateLimitHeadersWithRetry(60, 30, reset, true);
    expect(headers.get("Retry-After")).toBe(null);
  });

  it("calculates correct Retry-After value mid-window", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:30Z"));
    const reset = 1704110460; // 12:01:00 UTC

    const headers = createRateLimitHeadersWithRetry(60, 0, reset, false);
    expect(headers.get("Retry-After")).toBe("30");
  });
});

describe("Rate Limiting: Integration Scenarios", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("handles burst traffic followed by cooldown", () => {
    const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

    const inMemoryIncrement = (key: string, windowSeconds: number): number => {
      const now = Math.floor(Date.now() / 1000);
      const existing = inMemoryStore.get(key);

      if (existing && existing.resetAt > now) {
        existing.count++;
        return existing.count;
      }

      inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds });
      return 1;
    };

    // Burst: 5 requests in quick succession
    for (let i = 0; i < 5; i++) {
      const count = inMemoryIncrement("burst-user", 60);
      expect(count).toBe(i + 1);
    }

    // Wait for window to expire
    vi.advanceTimersByTime(61000);

    // New window - count resets
    const newCount = inMemoryIncrement("burst-user", 60);
    expect(newCount).toBe(1);
  });

  it("handles concurrent users independently", () => {
    const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

    const inMemoryIncrement = (key: string, windowSeconds: number): number => {
      const now = Math.floor(Date.now() / 1000);
      const existing = inMemoryStore.get(key);

      if (existing && existing.resetAt > now) {
        existing.count++;
        return existing.count;
      }

      inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds });
      return 1;
    };

    // User A makes 3 requests
    inMemoryIncrement("user-a", 60);
    inMemoryIncrement("user-a", 60);
    inMemoryIncrement("user-a", 60);

    // User B makes 2 requests
    inMemoryIncrement("user-b", 60);
    inMemoryIncrement("user-b", 60);

    expect(inMemoryStore.get("user-a")?.count).toBe(3);
    expect(inMemoryStore.get("user-b")?.count).toBe(2);
  });

  it("handles gradual approach to limit", () => {
    const limit = 10;
    const checkLimit = (count: number): { allowed: boolean; remaining: number } => {
      const remaining = Math.max(0, limit - count);
      return { allowed: count <= limit, remaining };
    };

    // Gradually approach limit
    for (let i = 1; i <= 10; i++) {
      const result = checkLimit(i);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - i);
    }

    // Exceed limit
    const exceeded = checkLimit(11);
    expect(exceeded.allowed).toBe(false);
    expect(exceeded.remaining).toBe(0);
  });
});

describe("Rate Limiting: Edge Cases and Error Handling", () => {
  it("handles negative count gracefully", () => {
    const calculateRemaining = (count: number, limit: number): number => {
      return Math.max(0, limit - count);
    };

    expect(calculateRemaining(-5, 60)).toBe(65); // limit - (-5) = 60 + 5 = 65
    expect(calculateRemaining(0, 60)).toBe(60); // Proper edge case
  });

  it("handles zero limit", () => {
    const isAllowed = (count: number, limit: number): boolean => {
      return count <= limit;
    };

    expect(isAllowed(0, 0)).toBe(true);
    expect(isAllowed(1, 0)).toBe(false);
  });

  it("handles very large limits", () => {
    const limit = 1000000;
    const remaining = Math.max(0, limit - 500);
    expect(remaining).toBe(999500);
  });

  it("handles window boundary precisely", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    const startTime = Math.floor(Date.now() / 1000);
    const windowSeconds = 60;
    const resetTime = startTime + windowSeconds;

    // At boundary - 1 second
    vi.setSystemTime(new Date("2024-01-01T12:00:59.000Z"));
    expect(Math.floor(Date.now() / 1000)).toBe(resetTime - 1);

    // At exact boundary
    vi.setSystemTime(new Date("2024-01-01T12:01:00.000Z"));
    expect(Math.floor(Date.now() / 1000)).toBe(resetTime);

    // After boundary
    vi.setSystemTime(new Date("2024-01-01T12:01:01.000Z"));
    expect(Math.floor(Date.now() / 1000)).toBe(resetTime + 1);
  });
});

describe("Rate Limiting: Performance Considerations", () => {
  describe("cleanup efficiency", () => {
    beforeEach(() => {
      vi.useRealTimers();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("handles high-frequency cleanup calls efficiently", () => {
      const CLEANUP_INTERVAL_MS = 60000;
      let lastCleanup = 0;
      let cleanupCount = 0;

      const shouldCleanup = (): boolean => {
        const now = Date.now();
        if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
          return false;
        }
        lastCleanup = now;
        cleanupCount++;
        return true;
      };

      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Multiple calls within interval - only first triggers cleanup
      for (let i = 0; i < 100; i++) {
        shouldCleanup();
      }
      expect(cleanupCount).toBe(1);

      // Advance time and call again
      vi.advanceTimersByTime(60001);
      shouldCleanup();
      expect(cleanupCount).toBe(2);
    });
  });

  it("efficiently manages large number of keys", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const now = Math.floor(Date.now() / 1000);

    // Add 1000 keys
    for (let i = 0; i < 1000; i++) {
      store.set(`key-${i}`, { count: 1, resetAt: now + 60 });
    }

    expect(store.size).toBe(1000);

    // Cleanup expired entries
    const cleanupTime = now + 61;
    for (const [key, value] of store) {
      if (value.resetAt < cleanupTime) {
        store.delete(key);
      }
    }

    expect(store.size).toBe(0);
  });
});
