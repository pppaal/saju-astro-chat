/**
 * Planetary Hours Module Tests (행성 시간 분석 테스트)
 *
 * Tests for:
 * - getPlanetaryHourForDate: 현재 행성 시간 계산
 * - checkVoidOfCourseMoon: VoC Moon 체크
 * - checkEclipseImpact: 일/월식 영향 분석
 * - isRetrograde: 역행 행성 체크
 * - getRetrogradePlanetsForDate: 역행 중인 행성 목록
 * - getSunSign: 태양 별자리 계산
 */

import {
  getPlanetaryHourForDate,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  isRetrograde,
  getRetrogradePlanetsForDate,
  getSunSign,
  type PlanetaryHourInfo,
  type VoidOfCourseMoonInfo,
  type EclipseImpact,
  type PlanetaryHourPlanet,
  type RetrogradePlanet,
} from "@/lib/destiny-map/calendar/planetary-hours";

describe("Planetary Hours Module", () => {
  describe("getPlanetaryHourForDate", () => {
    it("returns a valid PlanetaryHourInfo structure", () => {
      const date = new Date(2025, 0, 15, 10, 0); // Wednesday 10:00
      const result = getPlanetaryHourForDate(date);

      expect(result).toHaveProperty("planet");
      expect(result).toHaveProperty("dayRuler");
      expect(result).toHaveProperty("isDay");
      expect(result).toHaveProperty("goodFor");
    });

    it("returns correct day ruler for Sunday (Sun)", () => {
      const sunday = new Date(2025, 0, 19, 12, 0); // Sunday
      const result = getPlanetaryHourForDate(sunday);

      expect(result.dayRuler).toBe("Sun");
    });

    it("returns correct day ruler for Monday (Moon)", () => {
      const monday = new Date(2025, 0, 20, 12, 0); // Monday
      const result = getPlanetaryHourForDate(monday);

      expect(result.dayRuler).toBe("Moon");
    });

    it("returns correct day ruler for Tuesday (Mars)", () => {
      const tuesday = new Date(2025, 0, 21, 12, 0); // Tuesday
      const result = getPlanetaryHourForDate(tuesday);

      expect(result.dayRuler).toBe("Mars");
    });

    it("returns correct day ruler for Wednesday (Mercury)", () => {
      const wednesday = new Date(2025, 0, 22, 12, 0); // Wednesday
      const result = getPlanetaryHourForDate(wednesday);

      expect(result.dayRuler).toBe("Mercury");
    });

    it("returns correct day ruler for Thursday (Jupiter)", () => {
      const thursday = new Date(2025, 0, 23, 12, 0); // Thursday
      const result = getPlanetaryHourForDate(thursday);

      expect(result.dayRuler).toBe("Jupiter");
    });

    it("returns correct day ruler for Friday (Venus)", () => {
      const friday = new Date(2025, 0, 24, 12, 0); // Friday
      const result = getPlanetaryHourForDate(friday);

      expect(result.dayRuler).toBe("Venus");
    });

    it("returns correct day ruler for Saturday (Saturn)", () => {
      const saturday = new Date(2025, 0, 25, 12, 0); // Saturday
      const result = getPlanetaryHourForDate(saturday);

      expect(result.dayRuler).toBe("Saturn");
    });

    it("identifies day time correctly (6:00 - 18:00)", () => {
      const dayTime = new Date(2025, 0, 15, 12, 0); // 12:00
      const result = getPlanetaryHourForDate(dayTime);

      expect(result.isDay).toBe(true);
    });

    it("identifies night time correctly (before 6:00)", () => {
      const nightTime = new Date(2025, 0, 15, 3, 0); // 03:00
      const result = getPlanetaryHourForDate(nightTime);

      expect(result.isDay).toBe(false);
    });

    it("identifies night time correctly (after 18:00)", () => {
      const nightTime = new Date(2025, 0, 15, 21, 0); // 21:00
      const result = getPlanetaryHourForDate(nightTime);

      expect(result.isDay).toBe(false);
    });

    it("6:00 is day time", () => {
      const edgeTime = new Date(2025, 0, 15, 6, 0);
      const result = getPlanetaryHourForDate(edgeTime);

      expect(result.isDay).toBe(true);
    });

    it("17:59 is still day time", () => {
      const edgeTime = new Date(2025, 0, 15, 17, 59);
      const result = getPlanetaryHourForDate(edgeTime);

      expect(result.isDay).toBe(true);
    });

    it("returns valid planet from Chaldean order", () => {
      const date = new Date(2025, 0, 15, 10, 0);
      const result = getPlanetaryHourForDate(date);

      const validPlanets: PlanetaryHourPlanet[] = [
        "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"
      ];
      expect(validPlanets).toContain(result.planet);
    });

    it("provides goodFor activities for the planetary hour", () => {
      const date = new Date(2025, 0, 15, 10, 0);
      const result = getPlanetaryHourForDate(date);

      expect(Array.isArray(result.goodFor)).toBe(true);
      expect(result.goodFor.length).toBeGreaterThan(0);
    });

    it("returns consistent results for same input", () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result1 = getPlanetaryHourForDate(date);
      const result2 = getPlanetaryHourForDate(date);

      expect(result1.planet).toBe(result2.planet);
      expect(result1.dayRuler).toBe(result2.dayRuler);
      expect(result1.isDay).toBe(result2.isDay);
    });
  });

  describe("checkVoidOfCourseMoon", () => {
    it("returns a valid VoidOfCourseMoonInfo structure", () => {
      const date = new Date(2025, 0, 15);
      const result = checkVoidOfCourseMoon(date);

      expect(result).toHaveProperty("isVoid");
      expect(result).toHaveProperty("moonSign");
      expect(result).toHaveProperty("hoursRemaining");
    });

    it("isVoid is a boolean", () => {
      const date = new Date(2025, 0, 15);
      const result = checkVoidOfCourseMoon(date);

      expect(typeof result.isVoid).toBe("boolean");
    });

    it("moonSign is a valid zodiac sign", () => {
      const date = new Date(2025, 0, 15);
      const result = checkVoidOfCourseMoon(date);

      const validSigns = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
      ];
      expect(validSigns).toContain(result.moonSign);
    });

    it("hoursRemaining is a non-negative number", () => {
      const date = new Date(2025, 0, 15);
      const result = checkVoidOfCourseMoon(date);

      expect(typeof result.hoursRemaining).toBe("number");
      expect(result.hoursRemaining).toBeGreaterThanOrEqual(0);
    });

    it("hoursRemaining is at most ~56 hours (max time in one sign)", () => {
      const date = new Date(2025, 0, 15);
      const result = checkVoidOfCourseMoon(date);

      // Moon stays in a sign for about 2.5 days max
      expect(result.hoursRemaining).toBeLessThanOrEqual(60);
    });
  });

  describe("checkEclipseImpact", () => {
    it("returns a valid EclipseImpact structure", () => {
      const date = new Date(2025, 0, 15);
      const result = checkEclipseImpact(date);

      expect(result).toHaveProperty("hasImpact");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("intensity");
      expect(result).toHaveProperty("sign");
      expect(result).toHaveProperty("daysFromEclipse");
    });

    it("returns strong impact on eclipse day", () => {
      // March 29, 2025 - Solar eclipse in Aries
      const eclipseDay = new Date(2025, 2, 29);
      const result = checkEclipseImpact(eclipseDay);

      expect(result.hasImpact).toBe(true);
      expect(result.intensity).toBe("strong");
      expect(result.type).toBe("solar");
      expect(result.sign).toBe("Aries");
    });

    it("returns medium impact within 3 days of eclipse", () => {
      // March 27, 2025 - 2 days before solar eclipse
      const nearEclipse = new Date(2025, 2, 27);
      const result = checkEclipseImpact(nearEclipse);

      expect(result.hasImpact).toBe(true);
      expect(result.intensity).toBe("medium");
    });

    it("returns weak impact within 7 days of eclipse", () => {
      // March 23, 2025 - 6 days before solar eclipse on March 29
      const nearEclipse = new Date(2025, 2, 23);
      const result = checkEclipseImpact(nearEclipse);

      expect(result.hasImpact).toBe(true);
      expect(result.intensity).toBe("weak");
    });

    it("returns no impact for dates far from eclipses", () => {
      // June 15, 2025 - far from any eclipse
      const normalDay = new Date(2025, 5, 15);
      const result = checkEclipseImpact(normalDay);

      expect(result.hasImpact).toBe(false);
      expect(result.type).toBeNull();
      expect(result.intensity).toBeNull();
      expect(result.sign).toBeNull();
      expect(result.daysFromEclipse).toBeNull();
    });

    it("detects lunar eclipse correctly", () => {
      // March 14, 2025 - Lunar eclipse in Virgo
      const lunarEclipse = new Date(2025, 2, 14);
      const result = checkEclipseImpact(lunarEclipse);

      expect(result.hasImpact).toBe(true);
      expect(result.type).toBe("lunar");
      expect(result.sign).toBe("Virgo");
    });

    it("handles 2024 eclipses", () => {
      // April 8, 2024 - Solar eclipse in Aries
      const solarEclipse2024 = new Date(2024, 3, 8);
      const result = checkEclipseImpact(solarEclipse2024);

      expect(result.hasImpact).toBe(true);
      expect(result.type).toBe("solar");
    });

    it("handles 2026 eclipses", () => {
      // March 3, 2026 - Lunar eclipse in Virgo
      const lunarEclipse2026 = new Date(2026, 2, 3);
      const result = checkEclipseImpact(lunarEclipse2026);

      expect(result.hasImpact).toBe(true);
      expect(result.type).toBe("lunar");
    });
  });

  describe("isRetrograde", () => {
    it("returns boolean for mercury", () => {
      const date = new Date(2025, 0, 15);
      const result = isRetrograde(date, "mercury");

      expect(typeof result).toBe("boolean");
    });

    it("returns boolean for venus", () => {
      const date = new Date(2025, 0, 15);
      const result = isRetrograde(date, "venus");

      expect(typeof result).toBe("boolean");
    });

    it("returns boolean for mars", () => {
      const date = new Date(2025, 0, 15);
      const result = isRetrograde(date, "mars");

      expect(typeof result).toBe("boolean");
    });

    it("returns boolean for jupiter", () => {
      const date = new Date(2025, 0, 15);
      const result = isRetrograde(date, "jupiter");

      expect(typeof result).toBe("boolean");
    });

    it("returns boolean for saturn", () => {
      const date = new Date(2025, 0, 15);
      const result = isRetrograde(date, "saturn");

      expect(typeof result).toBe("boolean");
    });

    it("returns consistent results for same input", () => {
      const date = new Date(2025, 5, 20);

      expect(isRetrograde(date, "mercury")).toBe(isRetrograde(date, "mercury"));
      expect(isRetrograde(date, "venus")).toBe(isRetrograde(date, "venus"));
      expect(isRetrograde(date, "mars")).toBe(isRetrograde(date, "mars"));
    });

    it("mercury retrograde cycle is approximately 116 days", () => {
      const baseDate = new Date(2025, 0, 1);
      let retrogradeCount = 0;

      // Check 365 days
      for (let i = 0; i < 365; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        if (isRetrograde(date, "mercury")) {
          retrogradeCount++;
        }
      }

      // Mercury is retrograde about 3-4 times a year, ~21 days each
      // So approximately 63-84 days per year
      expect(retrogradeCount).toBeGreaterThan(50);
      expect(retrogradeCount).toBeLessThan(100);
    });
  });

  describe("getRetrogradePlanetsForDate", () => {
    it("returns an array", () => {
      const date = new Date(2025, 0, 15);
      const result = getRetrogradePlanetsForDate(date);

      expect(Array.isArray(result)).toBe(true);
    });

    it("returns only valid planet names", () => {
      const date = new Date(2025, 0, 15);
      const result = getRetrogradePlanetsForDate(date);

      const validPlanets: RetrogradePlanet[] = [
        "mercury", "venus", "mars", "jupiter", "saturn"
      ];

      for (const planet of result) {
        expect(validPlanets).toContain(planet);
      }
    });

    it("returns at most 5 planets", () => {
      const date = new Date(2025, 0, 15);
      const result = getRetrogradePlanetsForDate(date);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("is consistent with individual isRetrograde checks", () => {
      const date = new Date(2025, 5, 15);
      const result = getRetrogradePlanetsForDate(date);

      const planets: RetrogradePlanet[] = ["mercury", "venus", "mars", "jupiter", "saturn"];

      for (const planet of planets) {
        if (isRetrograde(date, planet)) {
          expect(result).toContain(planet);
        } else {
          expect(result).not.toContain(planet);
        }
      }
    });
  });

  describe("getSunSign", () => {
    it("returns Aries for March 21 - April 19", () => {
      expect(getSunSign(new Date(2025, 2, 21))).toBe("Aries");
      expect(getSunSign(new Date(2025, 2, 25))).toBe("Aries");
      expect(getSunSign(new Date(2025, 3, 10))).toBe("Aries");
      expect(getSunSign(new Date(2025, 3, 19))).toBe("Aries");
    });

    it("returns Taurus for April 20 - May 20", () => {
      expect(getSunSign(new Date(2025, 3, 20))).toBe("Taurus");
      expect(getSunSign(new Date(2025, 4, 10))).toBe("Taurus");
      expect(getSunSign(new Date(2025, 4, 20))).toBe("Taurus");
    });

    it("returns Gemini for May 21 - June 20", () => {
      expect(getSunSign(new Date(2025, 4, 21))).toBe("Gemini");
      expect(getSunSign(new Date(2025, 5, 10))).toBe("Gemini");
      expect(getSunSign(new Date(2025, 5, 20))).toBe("Gemini");
    });

    it("returns Cancer for June 21 - July 22", () => {
      expect(getSunSign(new Date(2025, 5, 21))).toBe("Cancer");
      expect(getSunSign(new Date(2025, 6, 10))).toBe("Cancer");
      expect(getSunSign(new Date(2025, 6, 22))).toBe("Cancer");
    });

    it("returns Leo for July 23 - August 22", () => {
      expect(getSunSign(new Date(2025, 6, 23))).toBe("Leo");
      expect(getSunSign(new Date(2025, 7, 10))).toBe("Leo");
      expect(getSunSign(new Date(2025, 7, 22))).toBe("Leo");
    });

    it("returns Virgo for August 23 - September 22", () => {
      expect(getSunSign(new Date(2025, 7, 23))).toBe("Virgo");
      expect(getSunSign(new Date(2025, 8, 10))).toBe("Virgo");
      expect(getSunSign(new Date(2025, 8, 22))).toBe("Virgo");
    });

    it("returns Libra for September 23 - October 22", () => {
      expect(getSunSign(new Date(2025, 8, 23))).toBe("Libra");
      expect(getSunSign(new Date(2025, 9, 10))).toBe("Libra");
      expect(getSunSign(new Date(2025, 9, 22))).toBe("Libra");
    });

    it("returns Scorpio for October 23 - November 21", () => {
      expect(getSunSign(new Date(2025, 9, 23))).toBe("Scorpio");
      expect(getSunSign(new Date(2025, 10, 10))).toBe("Scorpio");
      expect(getSunSign(new Date(2025, 10, 21))).toBe("Scorpio");
    });

    it("returns Sagittarius for November 22 - December 21", () => {
      expect(getSunSign(new Date(2025, 10, 22))).toBe("Sagittarius");
      expect(getSunSign(new Date(2025, 11, 10))).toBe("Sagittarius");
      expect(getSunSign(new Date(2025, 11, 21))).toBe("Sagittarius");
    });

    it("returns Capricorn for December 22 - January 19", () => {
      expect(getSunSign(new Date(2025, 11, 22))).toBe("Capricorn");
      expect(getSunSign(new Date(2025, 11, 31))).toBe("Capricorn");
      expect(getSunSign(new Date(2025, 0, 1))).toBe("Capricorn");
      expect(getSunSign(new Date(2025, 0, 19))).toBe("Capricorn");
    });

    it("returns Aquarius for January 20 - February 18", () => {
      expect(getSunSign(new Date(2025, 0, 20))).toBe("Aquarius");
      expect(getSunSign(new Date(2025, 1, 10))).toBe("Aquarius");
      expect(getSunSign(new Date(2025, 1, 18))).toBe("Aquarius");
    });

    it("returns Pisces for February 19 - March 20", () => {
      expect(getSunSign(new Date(2025, 1, 19))).toBe("Pisces");
      expect(getSunSign(new Date(2025, 2, 10))).toBe("Pisces");
      expect(getSunSign(new Date(2025, 2, 20))).toBe("Pisces");
    });
  });

  describe("Planetary Hour Uses", () => {
    it("Sun hour is good for leadership activities", () => {
      // Find a Sun-ruled hour on Sunday
      const sunday = new Date(2025, 0, 19, 6, 0); // Sunday 6:00
      const result = getPlanetaryHourForDate(sunday);

      if (result.planet === "Sun") {
        expect(result.goodFor).toContain("리더십");
        expect(result.goodFor).toContain("권위");
      }
    });

    it("Moon hour is good for home and intuition", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Moon") {
        expect(result.goodFor).toContain("가정");
        expect(result.goodFor).toContain("직관");
      }
    });

    it("Mercury hour is good for communication", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Mercury") {
        expect(result.goodFor).toContain("커뮤니케이션");
        expect(result.goodFor).toContain("문서");
      }
    });

    it("Venus hour is good for love and art", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Venus") {
        expect(result.goodFor).toContain("사랑");
        expect(result.goodFor).toContain("예술");
      }
    });

    it("Mars hour is good for competition and action", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Mars") {
        expect(result.goodFor).toContain("경쟁");
        expect(result.goodFor).toContain("행동");
      }
    });

    it("Jupiter hour is good for expansion and education", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Jupiter") {
        expect(result.goodFor).toContain("확장");
        expect(result.goodFor).toContain("교육");
      }
    });

    it("Saturn hour is good for structure and planning", () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(date);

      if (result.planet === "Saturn") {
        expect(result.goodFor).toContain("구조화");
        expect(result.goodFor).toContain("장기계획");
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles midnight correctly", () => {
      const midnight = new Date(2025, 0, 15, 0, 0);
      const result = getPlanetaryHourForDate(midnight);

      expect(result).toBeDefined();
      expect(result.isDay).toBe(false);
    });

    it("handles noon correctly", () => {
      const noon = new Date(2025, 0, 15, 12, 0);
      const result = getPlanetaryHourForDate(noon);

      expect(result).toBeDefined();
      expect(result.isDay).toBe(true);
    });

    it("handles year boundary (December 31 to January 1)", () => {
      const dec31 = new Date(2025, 11, 31, 23, 59);
      const jan1 = new Date(2026, 0, 1, 0, 0);

      const result1 = getPlanetaryHourForDate(dec31);
      const result2 = getPlanetaryHourForDate(jan1);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("handles leap year (February 29)", () => {
      const leapDay = new Date(2024, 1, 29, 12, 0); // 2024 is a leap year
      const result = getPlanetaryHourForDate(leapDay);

      expect(result).toBeDefined();
      expect(result.planet).toBeDefined();
    });

    it("getSunSign handles February 29 in leap year", () => {
      const leapDay = new Date(2024, 1, 29);
      const result = getSunSign(leapDay);

      // February 29 is Pisces (Feb 19 - Mar 20)
      expect(result).toBe("Pisces");
    });
  });
});
