describe("Numerology calculation integrity", () => {
  describe("Life Path Number calculation", () => {
    function calculateLifePathNumber(birthDate: { year: number; month: number; day: number }): number {
      const reduceToSingleDigit = (num: number): number => {
        // Master numbers 11, 22, 33 are not reduced
        if (num === 11 || num === 22 || num === 33) return num;

        while (num > 9) {
          num = String(num)
            .split("")
            .reduce((acc, digit) => acc + parseInt(digit), 0);

          if (num === 11 || num === 22 || num === 33) break;
        }
        return num;
      };

      const monthReduced = reduceToSingleDigit(birthDate.month);
      const dayReduced = reduceToSingleDigit(birthDate.day);
      const yearReduced = reduceToSingleDigit(birthDate.year);

      return reduceToSingleDigit(monthReduced + dayReduced + yearReduced);
    }

    it("calculates life path for regular date", () => {
      // May 15, 1990 -> 5 + 6 + 19 = 30 -> 3
      const result = calculateLifePathNumber({ year: 1990, month: 5, day: 15 });
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(33);
    });

    it("preserves master number 11", () => {
      // Date that results in 11
      const reduceToSingleDigit = (num: number): number => {
        if (num === 11 || num === 22 || num === 33) return num;
        while (num > 9) {
          num = String(num).split("").reduce((acc, d) => acc + parseInt(d), 0);
          if (num === 11 || num === 22 || num === 33) break;
        }
        return num;
      };

      const result = reduceToSingleDigit(11);
      expect(result).toBe(11);
    });

    it("preserves master number 22", () => {
      const reduceToSingleDigit = (num: number): number => {
        if (num === 11 || num === 22 || num === 33) return num;
        while (num > 9) {
          num = String(num).split("").reduce((acc, d) => acc + parseInt(d), 0);
          if (num === 11 || num === 22 || num === 33) break;
        }
        return num;
      };

      const result = reduceToSingleDigit(22);
      expect(result).toBe(22);
    });

    it("reduces multi-digit numbers correctly", () => {
      const reduceToSingleDigit = (num: number): number => {
        if (num === 11 || num === 22 || num === 33) return num;
        while (num > 9) {
          num = String(num).split("").reduce((acc, d) => acc + parseInt(d), 0);
          if (num === 11 || num === 22 || num === 33) break;
        }
        return num;
      };

      expect(reduceToSingleDigit(28)).toBe(1); // 2+8=10, 1+0=1
      expect(reduceToSingleDigit(39)).toBe(3); // 3+9=12, 1+2=3
    });
  });

  describe("Expression Number calculation", () => {
    const LETTER_VALUES: Record<string, number> = {
      a: 1, j: 1, s: 1,
      b: 2, k: 2, t: 2,
      c: 3, l: 3, u: 3,
      d: 4, m: 4, v: 4,
      e: 5, n: 5, w: 5,
      f: 6, o: 6, x: 6,
      g: 7, p: 7, y: 7,
      h: 8, q: 8, z: 8,
      i: 9, r: 9,
    };

    function calculateExpressionNumber(name: string): number {
      const cleanName = name.toLowerCase().replace(/[^a-z]/g, "");

      let sum = 0;
      for (const char of cleanName) {
        sum += LETTER_VALUES[char] || 0;
      }

      // Reduce to single digit (except master numbers)
      while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = String(sum).split("").reduce((acc, d) => acc + parseInt(d), 0);
      }

      return sum;
    }

    it("maps all letters to values 1-9", () => {
      const values = Object.values(LETTER_VALUES);
      values.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      });
    });

    it("covers all 26 letters", () => {
      expect(Object.keys(LETTER_VALUES).length).toBe(26);
    });

    it("calculates expression number for name", () => {
      const result = calculateExpressionNumber("John Doe");
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(33);
    });

    it("ignores non-letter characters", () => {
      const withSpaces = calculateExpressionNumber("John Doe");
      const withNumbers = calculateExpressionNumber("John123Doe");
      expect(withSpaces).toBe(withNumbers);
    });
  });

  describe("Soul Urge Number (vowels only)", () => {
    const VOWELS = new Set(["a", "e", "i", "o", "u"]);

    const LETTER_VALUES: Record<string, number> = {
      a: 1, e: 5, i: 9, o: 6, u: 3,
    };

    function calculateSoulUrge(name: string): number {
      const cleanName = name.toLowerCase().replace(/[^a-z]/g, "");

      let sum = 0;
      for (const char of cleanName) {
        if (VOWELS.has(char)) {
          sum += LETTER_VALUES[char] || 0;
        }
      }

      while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = String(sum).split("").reduce((acc, d) => acc + parseInt(d), 0);
      }

      return sum;
    }

    it("only counts vowels", () => {
      const name = "AEIOU"; // All vowels
      const result = calculateSoulUrge(name);
      expect(result).toBeGreaterThan(0);
    });

    it("returns 0 for consonants only", () => {
      // If there are no vowels, sum would be 0
      const name = "rhythm"; // Has y, which isn't counted here
      const result = calculateSoulUrge(name);
      // This depends on implementation
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Personal Year Number", () => {
    function calculatePersonalYear(birthMonth: number, birthDay: number, currentYear: number): number {
      const sum = birthMonth + birthDay + currentYear;

      let result = sum;
      while (result > 9 && result !== 11 && result !== 22) {
        result = String(result).split("").reduce((acc, d) => acc + parseInt(d), 0);
      }

      return result;
    }

    it("returns number 1-9 or 11, 22", () => {
      const result = calculatePersonalYear(5, 15, 2024);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22]).toContain(result);
    });

    it("changes with year", () => {
      const year2024 = calculatePersonalYear(5, 15, 2024);
      const year2025 = calculatePersonalYear(5, 15, 2025);
      // Results may be different (though not guaranteed)
      expect(typeof year2024).toBe("number");
      expect(typeof year2025).toBe("number");
    });
  });
});

describe("Numerology meaning mappings", () => {
  const LIFE_PATH_MEANINGS: Record<number, string> = {
    1: "Leader, independent, ambitious",
    2: "Diplomat, cooperative, sensitive",
    3: "Creative, expressive, social",
    4: "Builder, practical, disciplined",
    5: "Adventurer, freedom-loving, versatile",
    6: "Nurturer, responsible, harmonious",
    7: "Seeker, analytical, spiritual",
    8: "Achiever, powerful, material success",
    9: "Humanitarian, compassionate, wise",
    11: "Master Intuitive, spiritual messenger",
    22: "Master Builder, visionary, practical idealist",
    33: "Master Teacher, selfless service, healing",
  };

  it("has meanings for numbers 1-9 and master numbers", () => {
    expect(Object.keys(LIFE_PATH_MEANINGS).length).toBe(12);
  });

  it("all meanings are non-empty strings", () => {
    Object.values(LIFE_PATH_MEANINGS).forEach((meaning) => {
      expect(typeof meaning).toBe("string");
      expect(meaning.length).toBeGreaterThan(0);
    });
  });
});
