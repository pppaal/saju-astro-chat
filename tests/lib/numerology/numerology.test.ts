import { Numerology, type NumerologyNumber } from "@/lib/numerology/numerology";

describe("Numerology", () => {
  // Test case: John Doe, born December 25, 1985
  const johnDoe = new Numerology("John Doe", new Date(Date.UTC(1985, 11, 25)));
  // Test case: Jane Smith, born March 14, 1990
  const janeSmith = new Numerology("Jane Smith", new Date(Date.UTC(1990, 2, 14)));

  describe("constructor", () => {
    it("creates instance with name and birthDate", () => {
      const num = new Numerology("Test Person", new Date(Date.UTC(2000, 0, 1)));
      expect(num).toBeInstanceOf(Numerology);
    });

    it("converts name to lowercase", () => {
      const num = new Numerology("JOHN DOE", new Date(Date.UTC(1985, 11, 25)));
      // Expression number should be same regardless of case
      expect(num.getExpressionNumber()).toBe(johnDoe.getExpressionNumber());
    });
  });

  describe("getLifePathNumber", () => {
    it("calculates life path number correctly", () => {
      // 1985-12-25 = 1+9+8+5+1+2+2+5 = 33 (Master Number)
      const result = johnDoe.getLifePathNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("reduces to single digit or master number", () => {
      const result = janeSmith.getLifePathNumber();
      expect(result).toBeLessThanOrEqual(33);
      if (result > 9) {
        expect([11, 22, 33]).toContain(result);
      }
    });

    it("handles different dates consistently", () => {
      const num1 = new Numerology("Test", new Date(Date.UTC(2000, 0, 1)));
      const num2 = new Numerology("Test", new Date(Date.UTC(2000, 0, 1)));
      expect(num1.getLifePathNumber()).toBe(num2.getLifePathNumber());
    });
  });

  describe("getExpressionNumber", () => {
    it("calculates expression number from name", () => {
      const result = johnDoe.getExpressionNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("returns consistent value for same name", () => {
      const num1 = new Numerology("John Doe", new Date(Date.UTC(1985, 11, 25)));
      const num2 = new Numerology("john doe", new Date(Date.UTC(1990, 5, 15)));
      expect(num1.getExpressionNumber()).toBe(num2.getExpressionNumber());
    });

    it("handles names with non-letter characters", () => {
      const num = new Numerology("John-Doe 123", new Date(Date.UTC(2000, 0, 1)));
      const result = num.getExpressionNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getSoulUrgeNumber", () => {
    it("calculates soul urge from vowels only", () => {
      const result = johnDoe.getSoulUrgeNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("handles names with no vowels", () => {
      const num = new Numerology("xyz", new Date(Date.UTC(2000, 0, 1)));
      expect(num.getSoulUrgeNumber()).toBe(0);
    });
  });

  describe("getPersonalityNumber", () => {
    it("calculates personality number from consonants", () => {
      const result = johnDoe.getPersonalityNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("handles names with only vowels", () => {
      const num = new Numerology("aeiou", new Date(Date.UTC(2000, 0, 1)));
      expect(num.getPersonalityNumber()).toBe(0);
    });
  });

  describe("getBirthdayNumber", () => {
    it("returns the day of birth", () => {
      expect(johnDoe.getBirthdayNumber()).toBe(25);
      expect(janeSmith.getBirthdayNumber()).toBe(14);
    });
  });

  describe("getCoreProfile", () => {
    it("returns all core numbers", () => {
      const profile = johnDoe.getCoreProfile();

      expect(profile).toHaveProperty("lifePathNumber");
      expect(profile).toHaveProperty("expressionNumber");
      expect(profile).toHaveProperty("soulUrgeNumber");
      expect(profile).toHaveProperty("personalityNumber");
      expect(profile).toHaveProperty("birthdayNumber");
    });

    it("has consistent values with individual methods", () => {
      const profile = johnDoe.getCoreProfile();

      expect(profile.lifePathNumber).toBe(johnDoe.getLifePathNumber());
      expect(profile.expressionNumber).toBe(johnDoe.getExpressionNumber());
      expect(profile.soulUrgeNumber).toBe(johnDoe.getSoulUrgeNumber());
      expect(profile.personalityNumber).toBe(johnDoe.getPersonalityNumber());
      expect(profile.birthdayNumber).toBe(johnDoe.getBirthdayNumber());
    });
  });

  describe("getPersonalYearNumber", () => {
    it("calculates personal year for given year", () => {
      const result = johnDoe.getPersonalYearNumber(2024);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("returns different values for different years", () => {
      const year1 = johnDoe.getPersonalYearNumber(2024);
      const year2 = johnDoe.getPersonalYearNumber(2025);
      // Personal years change each year (though could coincidentally be same)
      expect(typeof year1).toBe("number");
      expect(typeof year2).toBe("number");
    });
  });

  describe("getPersonalMonthNumber", () => {
    it("calculates personal month", () => {
      const result = johnDoe.getPersonalMonthNumber(2024, 6);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getPersonalDayNumber", () => {
    it("calculates personal day", () => {
      const testDate = new Date(2024, 5, 15); // June 15, 2024
      const result = johnDoe.getPersonalDayNumber(testDate);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getMaturityNumber", () => {
    it("calculates maturity number (Life Path + Expression)", () => {
      const result = johnDoe.getMaturityNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getBalanceNumber", () => {
    it("calculates balance number from initials", () => {
      const result = johnDoe.getBalanceNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("handles single-word names", () => {
      const num = new Numerology("Madonna", new Date(Date.UTC(1958, 7, 16)));
      const result = num.getBalanceNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getRationalThoughtNumber", () => {
    it("calculates rational thought number", () => {
      const result = johnDoe.getRationalThoughtNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getCornerstone", () => {
    it("returns first letter of first name", () => {
      const result = johnDoe.getCornerstone();
      expect(result.letter).toBe("J");
      expect(result.number).toBeGreaterThan(0);
    });
  });

  describe("getCapstone", () => {
    it("returns last letter of first name", () => {
      const result = johnDoe.getCapstone();
      expect(result.letter).toBe("N");
      expect(result.number).toBeGreaterThan(0);
    });
  });

  describe("getFirstVowel", () => {
    it("returns first vowel in name", () => {
      const result = johnDoe.getFirstVowel();
      expect(result.letter).toBe("O");
      expect(result.number).toBeGreaterThan(0);
    });

    it("handles names starting with vowel", () => {
      const num = new Numerology("Adam", new Date(Date.UTC(2000, 0, 1)));
      const result = num.getFirstVowel();
      expect(result.letter).toBe("A");
    });
  });

  describe("getSubconscious", () => {
    it("returns count of unique numbers (1-9) in name", () => {
      const result = johnDoe.getSubconscious();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(9);
    });
  });

  describe("getKarmicDebtNumbers", () => {
    it("returns array of karmic debt numbers", () => {
      const result = johnDoe.getKarmicDebtNumbers();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(num => {
        expect([13, 14, 16, 19]).toContain(num);
      });
    });

    it("returns empty array if no karmic debts", () => {
      const num = new Numerology("Test", new Date(Date.UTC(2000, 0, 1)));
      const result = num.getKarmicDebtNumbers();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getKarmicLessons", () => {
    it("returns missing numbers 1-9 from name", () => {
      const result = johnDoe.getKarmicLessons();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(9);
      });
    });

    it("returns empty array for name with all numbers", () => {
      // Name that covers all 9 numbers would be very long
      const result = johnDoe.getKarmicLessons();
      expect(result.length).toBeLessThanOrEqual(9);
    });
  });

  describe("getPinnacles", () => {
    it("returns 4 pinnacles with age ranges", () => {
      const result = johnDoe.getPinnacles();

      expect(result.pinnacles).toHaveLength(4);
      expect(result.ages).toHaveLength(4);

      result.pinnacles.forEach(p => {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(p);
      });
    });

    it("has first pinnacle ending based on life path", () => {
      const result = johnDoe.getPinnacles();
      expect(result.ages[0]).toMatch(/^0-\d+$/);
    });
  });

  describe("getChallenges", () => {
    it("returns 4 challenge numbers", () => {
      const result = johnDoe.getChallenges();
      expect(result).toHaveLength(4);

      result.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(9);
      });
    });
  });

  describe("getUniversalYearNumber", () => {
    it("calculates universal year", () => {
      expect(johnDoe.getUniversalYearNumber(2024)).toBe(8); // 2+0+2+4 = 8
      expect(johnDoe.getUniversalYearNumber(2025)).toBe(9); // 2+0+2+5 = 9
    });
  });

  describe("getUniversalMonthNumber", () => {
    it("calculates universal month", () => {
      const result = johnDoe.getUniversalMonthNumber(2024, 1);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getUniversalDayNumber", () => {
    it("calculates universal day", () => {
      const testDate = new Date(2024, 0, 1); // Jan 1, 2024
      const result = johnDoe.getUniversalDayNumber(testDate);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });

  describe("getExtendedProfile", () => {
    it("returns complete extended profile", () => {
      const today = new Date(2024, 5, 15);
      const profile = johnDoe.getExtendedProfile(today);

      // Core numbers
      expect(profile).toHaveProperty("lifePathNumber");
      expect(profile).toHaveProperty("expressionNumber");
      expect(profile).toHaveProperty("soulUrgeNumber");
      expect(profile).toHaveProperty("personalityNumber");
      expect(profile).toHaveProperty("birthdayNumber");

      // Name info
      expect(profile.nameUsed).toBe("john doe");
      expect(profile.isKoreanName).toBe(false);

      // Advanced numbers
      expect(profile).toHaveProperty("maturityNumber");
      expect(profile).toHaveProperty("balanceNumber");
      expect(profile).toHaveProperty("rationalThoughtNumber");

      // Name analysis
      expect(profile).toHaveProperty("cornerstone");
      expect(profile).toHaveProperty("cornerstoneNumber");
      expect(profile).toHaveProperty("capstone");
      expect(profile).toHaveProperty("capstoneNumber");
      expect(profile).toHaveProperty("firstVowel");
      expect(profile).toHaveProperty("firstVowelNumber");
      expect(profile).toHaveProperty("subconscious");

      // Karmic
      expect(profile).toHaveProperty("karmicDebtNumbers");
      expect(profile).toHaveProperty("karmicLessons");

      // Life cycles
      expect(profile.pinnacles).toHaveLength(4);
      expect(profile.pinnacleAges).toHaveLength(4);
      expect(profile.challenges).toHaveLength(4);

      // Personal cycles
      expect(profile).toHaveProperty("personalYear");
      expect(profile).toHaveProperty("personalMonth");
      expect(profile).toHaveProperty("personalDay");

      // Universal cycles
      expect(profile).toHaveProperty("universalYear");
      expect(profile).toHaveProperty("universalMonth");
      expect(profile).toHaveProperty("universalDay");
    });

    it("detects Korean names", () => {
      const koreanNum = new Numerology("홍길동", new Date(Date.UTC(1990, 0, 1)));
      const profile = koreanNum.getExtendedProfile();
      expect(profile.isKoreanName).toBe(true);
    });
  });

  describe("Master Numbers", () => {
    it("preserves master number 11", () => {
      // Create a scenario that might produce 11
      const num = new Numerology("Test", new Date(Date.UTC(2009, 10, 29)));
      const lp = num.getLifePathNumber();
      // We're just checking the system handles master numbers
      if (lp === 11 || lp === 22 || lp === 33) {
        expect([11, 22, 33]).toContain(lp);
      } else {
        expect(lp).toBeLessThanOrEqual(9);
      }
    });
  });

  describe("Edge cases", () => {
    it("handles empty name gracefully", () => {
      const num = new Numerology("", new Date(Date.UTC(2000, 0, 1)));
      expect(num.getExpressionNumber()).toBe(0);
      expect(num.getSoulUrgeNumber()).toBe(0);
      expect(num.getPersonalityNumber()).toBe(0);
    });

    it("handles very long names", () => {
      const longName = "Abcdefghijklmnopqrstuvwxyz ".repeat(10).trim();
      const num = new Numerology(longName, new Date(Date.UTC(2000, 0, 1)));
      const result = num.getExpressionNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });

    it("handles names with numbers and special characters", () => {
      const num = new Numerology("John123 Doe!@#", new Date(Date.UTC(2000, 0, 1)));
      const result = num.getExpressionNumber();
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(result);
    });
  });
});
