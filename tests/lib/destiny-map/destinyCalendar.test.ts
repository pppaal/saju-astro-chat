/**
 * Tests for destiny-map/destinyCalendar.ts
 * Destiny calendar core calculation functions
 */


import {
  getYearGanzhi,
  getMonthGanzhi,
  getGanzhiForDate,
} from "@/lib/destiny-map/destinyCalendar";

describe("destinyCalendar", () => {
  describe("getYearGanzhi", () => {
    it("returns 甲子 (wood/water) for 1984", () => {
      const result = getYearGanzhi(1984);
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
      expect(result.stemElement).toBe("wood");
      expect(result.branchElement).toBe("water");
    });

    it("returns 乙丑 (wood/earth) for 1985", () => {
      const result = getYearGanzhi(1985);
      expect(result.stem).toBe("乙");
      expect(result.branch).toBe("丑");
      expect(result.stemElement).toBe("wood");
      expect(result.branchElement).toBe("earth");
    });

    it("returns 甲子 (wood/water) for 2044 (60 year cycle)", () => {
      const result = getYearGanzhi(2044);
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
    });

    it("returns correct ganzhi for 2024 (甲辰)", () => {
      const result = getYearGanzhi(2024);
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("辰");
      expect(result.stemElement).toBe("wood");
      expect(result.branchElement).toBe("earth");
    });

    it("returns correct ganzhi for 2025 (乙巳)", () => {
      const result = getYearGanzhi(2025);
      expect(result.stem).toBe("乙");
      expect(result.branch).toBe("巳");
      expect(result.stemElement).toBe("wood");
      expect(result.branchElement).toBe("fire");
    });

    it("returns correct ganzhi for 2000 (庚辰)", () => {
      const result = getYearGanzhi(2000);
      expect(result.stem).toBe("庚");
      expect(result.branch).toBe("辰");
      expect(result.stemElement).toBe("metal");
      expect(result.branchElement).toBe("earth");
    });

    it("returns correct ganzhi for 1990 (庚午)", () => {
      const result = getYearGanzhi(1990);
      expect(result.stem).toBe("庚");
      expect(result.branch).toBe("午");
      expect(result.stemElement).toBe("metal");
      expect(result.branchElement).toBe("fire");
    });

    it("handles years before 1984 correctly", () => {
      // 1983 should be 癸亥
      const result = getYearGanzhi(1983);
      expect(result.stem).toBe("癸");
      expect(result.branch).toBe("亥");
      expect(result.stemElement).toBe("water");
      expect(result.branchElement).toBe("water");
    });

    it("handles years far in the past", () => {
      // 1924 should also be 甲子 (60 years before 1984)
      const result = getYearGanzhi(1924);
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
    });

    it("cycles correctly over 60 years", () => {
      const baseResult = getYearGanzhi(1984);
      const cycleResult = getYearGanzhi(1984 + 60);
      expect(cycleResult.stem).toBe(baseResult.stem);
      expect(cycleResult.branch).toBe(baseResult.branch);
    });

    it("returns all 10 stems over 10 years", () => {
      const stems = new Set<string>();
      for (let i = 0; i < 10; i++) {
        stems.add(getYearGanzhi(1984 + i).stem);
      }
      expect(stems.size).toBe(10);
    });

    it("returns all 12 branches over 12 years", () => {
      const branches = new Set<string>();
      for (let i = 0; i < 12; i++) {
        branches.add(getYearGanzhi(1984 + i).branch);
      }
      expect(branches.size).toBe(12);
    });
  });

  describe("getMonthGanzhi", () => {
    // Note: In traditional Korean/Chinese calendar, month 1 starts with 寅 (Tiger)
    // Month mapping: 1->寅, 2->卯, 3->辰, 4->巳, 5->午, 6->未, 7->申, 8->酉, 9->戌, 10->亥, 11->子, 12->丑

    it("returns correct ganzhi for January (寅 month - 인월)", () => {
      const result = getMonthGanzhi(2024, 1);
      expect(result.branch).toBe("寅");
      expect(result.branchElement).toBe("wood");
    });

    it("returns correct ganzhi for February (卯 month - 묘월)", () => {
      const result = getMonthGanzhi(2024, 2);
      expect(result.branch).toBe("卯");
      expect(result.branchElement).toBe("wood");
    });

    it("returns correct ganzhi for March (辰 month - 진월)", () => {
      const result = getMonthGanzhi(2024, 3);
      expect(result.branch).toBe("辰");
      expect(result.branchElement).toBe("earth");
    });

    it("returns correct branch cycle for all months", () => {
      // Expected branches from month 1 to 12 (starting from 寅)
      // branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1] indexes into BRANCHES
      // BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
      const expectedBranches = [
        "寅", "卯", "辰", "巳", "午", "未",
        "申", "酉", "戌", "亥", "子", "丑"
      ];
      for (let month = 1; month <= 12; month++) {
        const result = getMonthGanzhi(2024, month);
        expect(result.branch).toBe(expectedBranches[month - 1]);
      }
    });

    it("changes month stem based on year stem", () => {
      // 甲年 and 己年 both start with 丙 for month stems
      const jia2024 = getMonthGanzhi(2024, 1); // 甲辰年 1월
      const ji2029 = getMonthGanzhi(2029, 1);  // 己酉年 1월
      expect(jia2024.stem).toBe(ji2029.stem);
    });

    it("returns fire element for 巳 month (month 4)", () => {
      const result = getMonthGanzhi(2024, 4);
      expect(result.branch).toBe("巳");
      expect(result.branchElement).toBe("fire");
    });

    it("returns water element for 子 month (month 11)", () => {
      const result = getMonthGanzhi(2024, 11);
      expect(result.branch).toBe("子");
      expect(result.branchElement).toBe("water");
    });

    it("returns metal element for 酉 month (month 8)", () => {
      const result = getMonthGanzhi(2024, 8);
      expect(result.branch).toBe("酉");
      expect(result.branchElement).toBe("metal");
    });
  });

  describe("getGanzhiForDate", () => {
    it("returns 甲子 for base date (1900-01-31)", () => {
      const result = getGanzhiForDate(new Date(Date.UTC(1900, 0, 31)));
      expect(result.stem).toBe("甲");
      expect(result.branch).toBe("子");
    });

    it("advances stem and branch by 1 each day", () => {
      const day1 = getGanzhiForDate(new Date(Date.UTC(1900, 0, 31)));
      const day2 = getGanzhiForDate(new Date(Date.UTC(1900, 1, 1)));

      // Stem should advance from 甲 to 乙
      const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
      const stemIdx1 = stems.indexOf(day1.stem);
      const stemIdx2 = stems.indexOf(day2.stem);
      expect((stemIdx2 - stemIdx1 + 10) % 10).toBe(1);

      // Branch should advance from 子 to 丑
      const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
      const branchIdx1 = branches.indexOf(day1.branch);
      const branchIdx2 = branches.indexOf(day2.branch);
      expect((branchIdx2 - branchIdx1 + 12) % 12).toBe(1);
    });

    it("cycles back to 甲子 after 60 days", () => {
      const baseDate = new Date(Date.UTC(1900, 0, 31));
      const after60Days = new Date(Date.UTC(1900, 3, 1)); // 60 days later

      const base = getGanzhiForDate(baseDate);
      const cycle = getGanzhiForDate(after60Days);

      expect(cycle.stem).toBe(base.stem);
      expect(cycle.branch).toBe(base.branch);
    });

    it("returns correct elements for stems", () => {
      // Check a date with 甲 (wood)
      const woodDate = getGanzhiForDate(new Date(Date.UTC(1900, 0, 31))); // 甲子
      expect(woodDate.stemElement).toBe("wood");

      // Check a date with 丙 (fire) - 2 days later
      const fireDate = getGanzhiForDate(new Date(Date.UTC(1900, 1, 2))); // 丙寅
      expect(fireDate.stemElement).toBe("fire");
    });

    it("returns correct elements for branches", () => {
      // 子 = water
      const waterBranch = getGanzhiForDate(new Date(Date.UTC(1900, 0, 31))); // 甲子
      expect(waterBranch.branchElement).toBe("water");

      // 寅 = wood (2 days later)
      const woodBranch = getGanzhiForDate(new Date(Date.UTC(1900, 1, 2))); // 丙寅
      expect(woodBranch.branchElement).toBe("wood");
    });

    it("handles dates in 2024 correctly", () => {
      // Test a known date
      const date = getGanzhiForDate(new Date(Date.UTC(2024, 0, 1))); // 2024-01-01
      expect(date.stem).toBeDefined();
      expect(date.branch).toBeDefined();
      expect(["wood", "fire", "earth", "metal", "water"]).toContain(date.stemElement);
      expect(["wood", "fire", "earth", "metal", "water"]).toContain(date.branchElement);
    });

    it("handles dates in the past correctly", () => {
      const date = getGanzhiForDate(new Date(Date.UTC(1950, 5, 15)));
      expect(date.stem).toBeDefined();
      expect(date.branch).toBeDefined();
    });

    it("handles dates in the future correctly", () => {
      const date = getGanzhiForDate(new Date(Date.UTC(2050, 11, 31)));
      expect(date.stem).toBeDefined();
      expect(date.branch).toBeDefined();
    });

    it("returns consistent results for same date", () => {
      const date = new Date(Date.UTC(2024, 5, 15));
      const result1 = getGanzhiForDate(date);
      const result2 = getGanzhiForDate(date);
      expect(result1.stem).toBe(result2.stem);
      expect(result1.branch).toBe(result2.branch);
      expect(result1.stemElement).toBe(result2.stemElement);
      expect(result1.branchElement).toBe(result2.branchElement);
    });

    it("produces all 10 stems over 10 consecutive days", () => {
      const stems = new Set<string>();
      const baseDate = new Date(Date.UTC(2024, 0, 1));
      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        stems.add(getGanzhiForDate(date).stem);
      }
      expect(stems.size).toBe(10);
    });

    it("produces all 12 branches over 12 consecutive days", () => {
      const branches = new Set<string>();
      const baseDate = new Date(Date.UTC(2024, 0, 1));
      for (let i = 0; i < 12; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        branches.add(getGanzhiForDate(date).branch);
      }
      expect(branches.size).toBe(12);
    });
  });

  describe("stem-element mapping consistency", () => {
    const stemToElement: Record<string, string> = {
      "甲": "wood", "乙": "wood",
      "丙": "fire", "丁": "fire",
      "戊": "earth", "己": "earth",
      "庚": "metal", "辛": "metal",
      "壬": "water", "癸": "water",
    };

    it("year ganzhi uses correct stem-element mapping", () => {
      for (let year = 1984; year < 1994; year++) {
        const result = getYearGanzhi(year);
        expect(result.stemElement).toBe(stemToElement[result.stem]);
      }
    });

    it("month ganzhi uses correct stem-element mapping", () => {
      for (let month = 1; month <= 12; month++) {
        const result = getMonthGanzhi(2024, month);
        expect(result.stemElement).toBe(stemToElement[result.stem]);
      }
    });

    it("daily ganzhi uses correct stem-element mapping", () => {
      const baseDate = new Date(Date.UTC(2024, 0, 1));
      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = getGanzhiForDate(date);
        expect(result.stemElement).toBe(stemToElement[result.stem]);
      }
    });
  });

  describe("branch-element mapping consistency", () => {
    const branchToElement: Record<string, string> = {
      "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
      "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
      "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
    };

    it("year ganzhi uses correct branch-element mapping", () => {
      for (let year = 1984; year < 1996; year++) {
        const result = getYearGanzhi(year);
        expect(result.branchElement).toBe(branchToElement[result.branch]);
      }
    });

    it("month ganzhi uses correct branch-element mapping", () => {
      for (let month = 1; month <= 12; month++) {
        const result = getMonthGanzhi(2024, month);
        expect(result.branchElement).toBe(branchToElement[result.branch]);
      }
    });

    it("daily ganzhi uses correct branch-element mapping", () => {
      const baseDate = new Date(Date.UTC(2024, 0, 1));
      for (let i = 0; i < 12; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = getGanzhiForDate(date);
        expect(result.branchElement).toBe(branchToElement[result.branch]);
      }
    });
  });

  describe("60-year cycle (sexagenary cycle)", () => {
    it("year cycle repeats every 60 years", () => {
      const startYear = 1984;
      for (let offset = 0; offset < 60; offset++) {
        const year1 = getYearGanzhi(startYear + offset);
        const year2 = getYearGanzhi(startYear + offset + 60);
        expect(year2.stem).toBe(year1.stem);
        expect(year2.branch).toBe(year1.branch);
      }
    });

    it("produces 60 unique combinations over 60 years", () => {
      const combinations = new Set<string>();
      for (let year = 1984; year < 2044; year++) {
        const { stem, branch } = getYearGanzhi(year);
        combinations.add(`${stem}${branch}`);
      }
      expect(combinations.size).toBe(60);
    });
  });

  describe("60-day cycle", () => {
    it("day cycle repeats every 60 days", () => {
      const baseDate = new Date(Date.UTC(2024, 0, 1));
      const sixtyDaysLater = new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000);

      const day1 = getGanzhiForDate(baseDate);
      const day2 = getGanzhiForDate(sixtyDaysLater);

      expect(day2.stem).toBe(day1.stem);
      expect(day2.branch).toBe(day1.branch);
    });

    it("produces 60 unique combinations over 60 days", () => {
      const combinations = new Set<string>();
      const baseDate = new Date(Date.UTC(2024, 0, 1));

      for (let i = 0; i < 60; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const { stem, branch } = getGanzhiForDate(date);
        combinations.add(`${stem}${branch}`);
      }
      expect(combinations.size).toBe(60);
    });
  });
});
