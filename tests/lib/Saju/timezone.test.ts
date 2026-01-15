import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
} from "@/lib/Saju/timezone";

describe("Saju Timezone Utils", () => {
  describe("getSupportedTimezones", () => {
    it("returns a non-empty array of timezone strings", () => {
      const timezones = getSupportedTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
    });

    it("returns sorted timezones", () => {
      const timezones = getSupportedTimezones();
      const sorted = [...timezones].sort((a, b) => a.localeCompare(b));
      expect(timezones).toEqual(sorted);
    });

    it("includes common timezones", () => {
      const timezones = getSupportedTimezones();
      // These should be in any reasonable timezone list
      // Note: Some environments may not include "UTC" directly but use "Etc/UTC"
      expect(timezones.some(tz => tz.includes("Seoul"))).toBe(true);
      expect(timezones.some(tz => tz.includes("New_York"))).toBe(true);
    });

    it("returns only valid timezone strings", () => {
      const timezones = getSupportedTimezones();
      timezones.forEach(tz => {
        expect(typeof tz).toBe("string");
        expect(tz.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getUserTimezone", () => {
    it("returns a string", () => {
      const tz = getUserTimezone();
      expect(typeof tz).toBe("string");
    });

    it("returns a valid timezone or UTC", () => {
      const tz = getUserTimezone();
      // Should not throw when used with Intl
      expect(() => {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
      }).not.toThrow();
    });
  });

  describe("getOffsetMinutes", () => {
    it("returns 0 for UTC", () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
      expect(getOffsetMinutes(instant, "UTC")).toBe(0);
    });

    it("returns 540 for Asia/Seoul (KST = UTC+9)", () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
      expect(getOffsetMinutes(instant, "Asia/Seoul")).toBe(540);
    });

    it("returns correct offset for America/New_York", () => {
      // During standard time (EST = UTC-5)
      const winter = new Date(Date.UTC(2024, 0, 15, 12, 0, 0)); // January
      const winterOffset = getOffsetMinutes(winter, "America/New_York");
      expect(winterOffset).toBe(-300); // -5 hours

      // During daylight time (EDT = UTC-4)
      const summer = new Date(Date.UTC(2024, 6, 15, 12, 0, 0)); // July
      const summerOffset = getOffsetMinutes(summer, "America/New_York");
      expect(summerOffset).toBe(-240); // -4 hours
    });

    it("returns 0 for invalid timezone", () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
      expect(getOffsetMinutes(instant, "Invalid/Timezone")).toBe(0);
    });

    it("handles different dates correctly", () => {
      // Asia/Seoul doesn't have DST, should always be +9
      const date1 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
      const date2 = new Date(Date.UTC(2024, 6, 1, 0, 0, 0));

      expect(getOffsetMinutes(date1, "Asia/Seoul")).toBe(540);
      expect(getOffsetMinutes(date2, "Asia/Seoul")).toBe(540);
    });

    it("handles edge case timezones", () => {
      const instant = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));

      // India has +5:30 offset
      const indiaOffset = getOffsetMinutes(instant, "Asia/Kolkata");
      expect(indiaOffset).toBe(330); // 5.5 hours

      // Nepal has +5:45 offset
      const nepalOffset = getOffsetMinutes(instant, "Asia/Kathmandu");
      expect(nepalOffset).toBe(345); // 5.75 hours
    });
  });

  describe("formatOffset", () => {
    it("formats positive offsets correctly", () => {
      expect(formatOffset(0)).toBe("UTC+00:00");
      expect(formatOffset(540)).toBe("UTC+09:00");
      expect(formatOffset(330)).toBe("UTC+05:30");
      expect(formatOffset(345)).toBe("UTC+05:45");
    });

    it("formats negative offsets correctly", () => {
      expect(formatOffset(-300)).toBe("UTC-05:00");
      expect(formatOffset(-480)).toBe("UTC-08:00");
      expect(formatOffset(-210)).toBe("UTC-03:30");
    });

    it("handles edge cases", () => {
      expect(formatOffset(60)).toBe("UTC+01:00");
      expect(formatOffset(-60)).toBe("UTC-01:00");
      expect(formatOffset(720)).toBe("UTC+12:00"); // Maximum offset
      expect(formatOffset(-720)).toBe("UTC-12:00");
    });

    it("pads single digit hours and minutes", () => {
      expect(formatOffset(90)).toBe("UTC+01:30");
      expect(formatOffset(9)).toBe("UTC+00:09");
    });
  });
});
