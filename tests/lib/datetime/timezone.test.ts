/**
 * Tests for src/lib/datetime/timezone.ts
 * Timezone utilities for date/time handling
 */
import { describe, it, expect } from "vitest";
import {
  getNowInTimezone,
  getDateInTimezone,
  formatDateString,
  getIsoInTimezone,
  isValidTimezone,
  DEFAULT_TIMEZONE,
} from "@/lib/datetime/timezone";

describe("Timezone Utilities", () => {
  describe("DEFAULT_TIMEZONE", () => {
    it("should be Asia/Seoul", () => {
      expect(DEFAULT_TIMEZONE).toBe("Asia/Seoul");
    });
  });

  describe("getNowInTimezone", () => {
    it("should return year, month, day components", () => {
      const result = getNowInTimezone("Asia/Seoul");

      expect(result).toHaveProperty("year");
      expect(result).toHaveProperty("month");
      expect(result).toHaveProperty("day");

      expect(typeof result.year).toBe("number");
      expect(typeof result.month).toBe("number");
      expect(typeof result.day).toBe("number");
    });

    it("should return valid date components", () => {
      const result = getNowInTimezone();

      expect(result.year).toBeGreaterThanOrEqual(2024);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
    });

    it("returns valid date components when no timezone is given", () => {
      // 전 세계 서비스 — 무인자 기본값을 특정 국가(한국)로 가정하지 않는다.
      // 실사용 경로는 항상 사용자 타임존을 넘기므로 여기선 유효성만 보장.
      // (옛 테스트는 default==Asia/Seoul 을 단언해 KST 자정~오전9시에 깨지는
      //  타임존 의존 플래키였음 — audit 2026-06)
      const withDefault = getNowInTimezone();
      expect(withDefault.year).toBeGreaterThanOrEqual(2024);
      expect(withDefault.month).toBeGreaterThanOrEqual(1);
      expect(withDefault.month).toBeLessThanOrEqual(12);
      expect(withDefault.day).toBeGreaterThanOrEqual(1);
      expect(withDefault.day).toBeLessThanOrEqual(31);
    });

    it("should handle different timezones", () => {
      const utc = getNowInTimezone("UTC");
      const tokyo = getNowInTimezone("Asia/Tokyo");
      const newYork = getNowInTimezone("America/New_York");

      expect(utc.year).toBeGreaterThanOrEqual(2024);
      expect(tokyo.year).toBeGreaterThanOrEqual(2024);
      expect(newYork.year).toBeGreaterThanOrEqual(2024);
    });

    it("falls back to a valid date (no throw) for invalid timezone", () => {
      // 잘못된 IANA 이름은 요청을 깨뜨리지 않고 중립값으로 폴백해야 한다.
      // 특정 국가(한국)로 단언하지 않는다 — 전 세계 서비스.
      const result = getNowInTimezone("Invalid/Timezone");
      expect(result.year).toBeGreaterThanOrEqual(2024);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
    });
  });

  describe("getDateInTimezone", () => {
    it("should return date string in YYYY-MM-DD format", () => {
      const result = getDateInTimezone("Asia/Seoul");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return valid ISO date when no timezone provided", () => {
      const result = getDateInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle different timezones", () => {
      const utc = getDateInTimezone("UTC");
      const tokyo = getDateInTimezone("Asia/Tokyo");

      expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should fallback gracefully for invalid timezone", () => {
      const result = getDateInTimezone("Invalid/Timezone");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("formatDateString", () => {
    it("should format date components to YYYY-MM-DD", () => {
      expect(formatDateString(2024, 1, 15)).toBe("2024-01-15");
      expect(formatDateString(2024, 12, 31)).toBe("2024-12-31");
    });

    it("should pad single-digit months and days", () => {
      expect(formatDateString(2024, 1, 1)).toBe("2024-01-01");
      expect(formatDateString(2024, 9, 5)).toBe("2024-09-05");
    });

    it("should handle edge cases", () => {
      expect(formatDateString(2024, 2, 29)).toBe("2024-02-29");
      expect(formatDateString(1999, 12, 31)).toBe("1999-12-31");
    });
  });

  describe("getIsoInTimezone", () => {
    it("should return ISO datetime format", () => {
      const result = getIsoInTimezone("Asia/Seoul");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("should use default timezone when not specified", () => {
      const result = getIsoInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("should handle different timezones", () => {
      const utc = getIsoInTimezone("UTC");
      const tokyo = getIsoInTimezone("Asia/Tokyo");

      expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("should fallback for invalid timezone", () => {
      const result = getIsoInTimezone("Invalid/Timezone");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("isValidTimezone", () => {
    it("should return true for valid IANA timezones", () => {
      expect(isValidTimezone("Asia/Seoul")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("should return false for invalid timezones", () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("NotATimezone")).toBe(false);
      expect(isValidTimezone("Asia/NotReal")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidTimezone("Etc/GMT")).toBe(true);
      expect(isValidTimezone("Etc/UTC")).toBe(true);
      expect(isValidTimezone("GMT")).toBe(true);
    });
  });

  describe("Cross-timezone consistency", () => {
    it("should return consistent date from getNowInTimezone and getDateInTimezone", () => {
      const tz = "Asia/Seoul";
      const components = getNowInTimezone(tz);
      const dateString = getDateInTimezone(tz);

      const formattedFromComponents = formatDateString(
        components.year,
        components.month,
        components.day
      );

      expect(formattedFromComponents).toBe(dateString);
    });

    it("should have consistent date in ISO format", () => {
      const tz = "UTC";
      const dateString = getDateInTimezone(tz);
      const isoString = getIsoInTimezone(tz);

      expect(isoString.startsWith(dateString)).toBe(true);
    });
  });

  describe("Time zone offset handling", () => {
    it("should handle timezone at midnight edge", () => {
      const seoul = getNowInTimezone("Asia/Seoul");
      const utc = getNowInTimezone("UTC");

      expect(seoul.year).toBeGreaterThanOrEqual(2024);
      expect(utc.year).toBeGreaterThanOrEqual(2024);
    });

    it("should handle Pacific timezones", () => {
      const result = getNowInTimezone("Pacific/Auckland");
      expect(result.year).toBeGreaterThanOrEqual(2024);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
    });
  });
});
