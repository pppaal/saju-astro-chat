/**
 * Destiny Map Astrology Helpers Tests
 */

import { describe, it, expect, vi } from "vitest";
import {
  maskInput,
  resolveTimezone,
  getNowInTimezone,
} from "@/lib/destiny-map/astrology/helpers";

vi.mock("tz-lookup", () => ({
  default: vi.fn((lat: number, lon: number) => {
    if (lat === 37.5665 && lon === 126.978) return "Asia/Seoul";
    if (lat === 40.7128 && lon === -74.006) return "America/New_York";
    throw new Error("Invalid coordinates");
  }),
}));

describe("Destiny Map Astrology Helpers", () => {
  describe("maskInput", () => {
    it("masks sensitive user data", () => {
      const input = {
        name: "John Doe",
        birthDate: "1990-01-01",
        birthTime: "12:30",
        latitude: 37.5665,
        longitude: 126.978,
        timezone: "Asia/Seoul",
        gender: "M" as const,
      };

      const masked = maskInput(input);

      expect(masked.name).toBe("J***");
      expect(masked.birthDate).toBe("****-**-**");
      expect(masked.birthTime).toBe("**:**");
      expect(masked.gender).toBe("M");
    });

    it("rounds coordinates for privacy", () => {
      const input = {
        birthDate: "1990-01-01",
        latitude: 37.56655123,
        longitude: 126.97811234,
        gender: "M" as const,
      };

      const masked = maskInput(input);

      expect(masked.latitude).toBe(37.567);
      expect(masked.longitude).toBe(126.978);
    });

    it("handles undefined name", () => {
      const input = {
        birthDate: "1990-01-01",
        latitude: 37.5665,
        longitude: 126.978,
        gender: "M" as const,
      };

      const masked = maskInput(input);

      expect(masked.name).toBeUndefined();
    });

    it("handles undefined birth data", () => {
      const input = {
        name: "John",
        latitude: 37.5665,
        longitude: 126.978,
        gender: "M" as const,
      };

      const masked = maskInput(input);

      expect(masked.birthDate).toBeUndefined();
      expect(masked.birthTime).toBeUndefined();
    });
  });

  describe("resolveTimezone", () => {
    it("returns explicit timezone if provided", () => {
      const tz = resolveTimezone("America/Los_Angeles", 37.5665, 126.978);
      expect(tz).toBe("America/Los_Angeles");
    });

    it("looks up timezone from coordinates", () => {
      const tz = resolveTimezone(undefined, 37.5665, 126.978);
      expect(tz).toBe("Asia/Seoul");
    });

    it("looks up New York timezone", () => {
      const tz = resolveTimezone(undefined, 40.7128, -74.006);
      expect(tz).toBe("America/New_York");
    });

    it("falls back to Asia/Seoul on error", () => {
      const tz = resolveTimezone(undefined, 999, 999);
      expect(tz).toBe("Asia/Seoul");
    });
  });

  describe("getNowInTimezone", () => {
    it("returns UTC time when no timezone specified", () => {
      const now = getNowInTimezone();

      expect(now.year).toBeGreaterThan(2020);
      expect(now.month).toBeGreaterThanOrEqual(1);
      expect(now.month).toBeLessThanOrEqual(12);
      expect(now.day).toBeGreaterThanOrEqual(1);
      expect(now.day).toBeLessThanOrEqual(31);
      expect(now.hour).toBeGreaterThanOrEqual(0);
      expect(now.hour).toBeLessThanOrEqual(23);
      expect(now.minute).toBeGreaterThanOrEqual(0);
      expect(now.minute).toBeLessThanOrEqual(59);
    });

    it("returns time in specified timezone", () => {
      const now = getNowInTimezone("Asia/Seoul");

      expect(now.year).toBeGreaterThan(2020);
      expect(now.month).toBeGreaterThanOrEqual(1);
      expect(now.month).toBeLessThanOrEqual(12);
    });

    it("falls back to UTC on invalid timezone", () => {
      const now = getNowInTimezone("Invalid/Timezone");

      expect(now.year).toBeGreaterThan(2020);
      expect(now.month).toBeGreaterThanOrEqual(1);
    });

    it("returns consistent structure", () => {
      const now = getNowInTimezone("America/New_York");

      expect(now).toHaveProperty("year");
      expect(now).toHaveProperty("month");
      expect(now).toHaveProperty("day");
      expect(now).toHaveProperty("hour");
      expect(now).toHaveProperty("minute");
    });
  });
});
