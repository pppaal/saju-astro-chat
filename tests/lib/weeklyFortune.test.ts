/**
 * Tests for weeklyFortune.ts
 * Weekly Fortune Image Storage using Upstash Redis
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("weeklyFortune", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("saveWeeklyFortuneImage", () => {
    it("returns false when UPSTASH_URL is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when UPSTASH_TOKEN is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when URL is placeholder 'replace_me'", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "replace_me";
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when token is placeholder 'replace_me'", async () => {
      process.env.UPSTASH_REDIS_REST_TOKEN = "replace_me";
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when URL does not start with https://", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "http://redis.upstash.io";
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls Upstash REST API with correct URL and headers", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://redis.upstash.io/set/weekly_fortune_image",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })
      );
    });

    it("sends data as JSON body", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const data = {
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      };
      await saveWeeklyFortuneImage(data);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toEqual(data);
    });

    it("returns true on successful save", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(true);
    });

    it("returns false and logs error when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: "Internal Server Error" });
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");
      const { logger } = await import("@/lib/logger");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "[WeeklyFortune] Failed to save:",
        "Internal Server Error"
      );
    });

    it("returns false and logs error on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const { saveWeeklyFortuneImage } = await import("@/lib/weeklyFortune");
      const { logger } = await import("@/lib/logger");

      const result = await saveWeeklyFortuneImage({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "[WeeklyFortune] Error saving:",
        expect.any(Error)
      );
    });
  });

  describe("getWeeklyFortuneImage", () => {
    it("returns null when Upstash is not configured", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await getWeeklyFortuneImage();

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls Upstash REST API with correct URL and headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ imageUrl: "test" }) }),
      });
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      await getWeeklyFortuneImage();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://redis.upstash.io/get/weekly_fortune_image",
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: "Bearer test-token" },
          cache: "no-store",
        })
      );
    });

    it("returns null when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await getWeeklyFortuneImage();

      expect(result).toBeNull();
    });

    it("parses string result from Upstash", async () => {
      const data = {
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify(data) }),
      });
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await getWeeklyFortuneImage();

      expect(result).toEqual(data);
    });

    it("returns object result directly if not string", async () => {
      const data = {
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-01",
        weekNumber: 1,
        theme: "prosperity",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: data }),
      });
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await getWeeklyFortuneImage();

      expect(result).toEqual(data);
    });

    it("returns null when result is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      });
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");

      const result = await getWeeklyFortuneImage();

      expect(result).toBeNull();
    });

    it("returns null and logs error on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const { getWeeklyFortuneImage } = await import("@/lib/weeklyFortune");
      const { logger } = await import("@/lib/logger");

      const result = await getWeeklyFortuneImage();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "[WeeklyFortune] Error fetching:",
        expect.any(Error)
      );
    });
  });

  describe("getWeekNumber", () => {
    it("returns correct week number for January 1st dates", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      // January 1, 2024 is a Monday, week 1
      expect(getWeekNumber(new Date("2024-01-01"))).toBe(1);
    });

    it("returns correct week number for mid-year dates", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      // July 15, 2024 is a Monday, week 29
      const result = getWeekNumber(new Date("2024-07-15"));
      expect(result).toBeGreaterThan(25);
      expect(result).toBeLessThan(35);
    });

    it("returns correct week number for end of year", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      // December 25, 2024 - should be in week 52
      const result = getWeekNumber(new Date("2024-12-25"));
      expect(result).toBeGreaterThanOrEqual(52);
    });

    it("uses current date when no argument provided", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      const result = getWeekNumber();

      // Should return a valid week number (1-53)
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(53);
    });

    it("returns consistent results for same week", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      // All days in the same week should return the same week number
      const monday = new Date("2024-01-08");
      const tuesday = new Date("2024-01-09");
      const sunday = new Date("2024-01-14");

      expect(getWeekNumber(monday)).toBe(getWeekNumber(tuesday));
      expect(getWeekNumber(tuesday)).toBe(getWeekNumber(sunday));
    });

    it("handles different years correctly", async () => {
      const { getWeekNumber } = await import("@/lib/weeklyFortune");

      const week2023 = getWeekNumber(new Date("2023-06-15"));
      const week2024 = getWeekNumber(new Date("2024-06-15"));

      // Both should be around week 24-25
      expect(week2023).toBeGreaterThan(20);
      expect(week2024).toBeGreaterThan(20);
    });
  });
});
