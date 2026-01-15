// tests/lib/Saju/johuYongsin.test.ts

import {
  JOHU_YONGSIN_DB,
  MONTH_CLIMATE,
  getJohuYongsin,
  evaluateJohuNeed,
  harmonizeYongsin,
  type JohuYongsinInfo,
} from "../../../src/lib/Saju/johuYongsin";
import type { FiveElement } from "../../../src/lib/Saju/types";

// 일간 목록
const DAYMASTERS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 월지 목록
const MONTH_BRANCHES = [
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
  "子",
  "丑",
];

describe("johuYongsin - JOHU_YONGSIN_DB Structure", () => {
  it("has exactly 120 entries (10 daymasters x 12 months)", () => {
    expect(JOHU_YONGSIN_DB).toHaveLength(120);
  });

  it("covers all 10 daymasters", () => {
    const daymasters = new Set(JOHU_YONGSIN_DB.map((info) => info.daymaster));
    expect(daymasters.size).toBe(10);
    for (const dm of DAYMASTERS) {
      expect(daymasters.has(dm)).toBe(true);
    }
  });

  it("covers all 12 months for each daymaster", () => {
    for (const daymaster of DAYMASTERS) {
      const monthsForDaymaster = JOHU_YONGSIN_DB.filter(
        (info) => info.daymaster === daymaster
      ).map((info) => info.month);

      expect(monthsForDaymaster).toHaveLength(12);
      for (const month of MONTH_BRANCHES) {
        expect(monthsForDaymaster).toContain(month);
      }
    }
  });

  it("each entry has required properties", () => {
    for (const info of JOHU_YONGSIN_DB) {
      expect(info).toHaveProperty("daymaster");
      expect(info).toHaveProperty("month");
      expect(info).toHaveProperty("climate");
      expect(info).toHaveProperty("primaryYongsin");
      expect(info).toHaveProperty("reasoning");
      expect(info).toHaveProperty("rating");
    }
  });

  it("all climate values are valid", () => {
    const validClimates = ["한", "습", "조", "열", "온화"];
    for (const info of JOHU_YONGSIN_DB) {
      expect(validClimates).toContain(info.climate);
    }
  });

  it("all primaryYongsin values are valid FiveElement", () => {
    const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
    for (const info of JOHU_YONGSIN_DB) {
      expect(validElements).toContain(info.primaryYongsin);
    }
  });

  it("all secondaryYongsin values (when present) are valid FiveElement", () => {
    const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
    for (const info of JOHU_YONGSIN_DB) {
      if (info.secondaryYongsin) {
        expect(validElements).toContain(info.secondaryYongsin);
      }
    }
  });

  it("all rating values are between 1 and 5", () => {
    for (const info of JOHU_YONGSIN_DB) {
      expect(info.rating).toBeGreaterThanOrEqual(1);
      expect(info.rating).toBeLessThanOrEqual(5);
    }
  });

  it("all reasoning strings are non-empty", () => {
    for (const info of JOHU_YONGSIN_DB) {
      expect(info.reasoning.length).toBeGreaterThan(0);
    }
  });
});

describe("johuYongsin - MONTH_CLIMATE Mapping", () => {
  it("covers all 12 month branches", () => {
    for (const branch of MONTH_BRANCHES) {
      expect(MONTH_CLIMATE[branch]).toBeDefined();
    }
  });

  it("each entry has season, climate, and temperature", () => {
    for (const branch of MONTH_BRANCHES) {
      const info = MONTH_CLIMATE[branch];
      expect(info).toHaveProperty("season");
      expect(info).toHaveProperty("climate");
      expect(info).toHaveProperty("temperature");
    }
  });

  it("spring months have correct seasons", () => {
    expect(MONTH_CLIMATE["寅"].season).toContain("봄");
    expect(MONTH_CLIMATE["卯"].season).toContain("봄");
    expect(MONTH_CLIMATE["辰"].season).toContain("봄");
  });

  it("summer months have correct seasons", () => {
    expect(MONTH_CLIMATE["巳"].season).toContain("여름");
    expect(MONTH_CLIMATE["午"].season).toContain("여름");
    expect(MONTH_CLIMATE["未"].season).toContain("여름");
  });

  it("autumn months have correct seasons", () => {
    expect(MONTH_CLIMATE["申"].season).toContain("가을");
    expect(MONTH_CLIMATE["酉"].season).toContain("가을");
    expect(MONTH_CLIMATE["戌"].season).toContain("가을");
  });

  it("winter months have correct seasons", () => {
    expect(MONTH_CLIMATE["亥"].season).toContain("겨울");
    expect(MONTH_CLIMATE["子"].season).toContain("겨울");
    expect(MONTH_CLIMATE["丑"].season).toContain("겨울");
  });

  it("midsummer has hottest temperature", () => {
    expect(MONTH_CLIMATE["午"].temperature).toContain("가장");
    expect(MONTH_CLIMATE["午"].climate).toContain("열");
  });

  it("midwinter has coldest temperature", () => {
    expect(MONTH_CLIMATE["子"].temperature).toContain("가장");
    expect(MONTH_CLIMATE["子"].climate).toBe("한");
  });
});

describe("johuYongsin - getJohuYongsin Function", () => {
  it("returns correct info for 甲木 in 寅月", () => {
    const result = getJohuYongsin("甲", "寅");
    expect(result).not.toBeNull();
    expect(result!.daymaster).toBe("甲");
    expect(result!.month).toBe("寅");
    expect(result!.primaryYongsin).toBe("화");
  });

  it("returns correct info for 甲木 in 午月 (midsummer)", () => {
    const result = getJohuYongsin("甲", "午");
    expect(result).not.toBeNull();
    expect(result!.primaryYongsin).toBe("수"); // 한여름에 수가 필요
    expect(result!.rating).toBe(5); // 급함
  });

  it("returns correct info for 甲木 in 子月 (midwinter)", () => {
    const result = getJohuYongsin("甲", "子");
    expect(result).not.toBeNull();
    expect(result!.primaryYongsin).toBe("화"); // 한겨울에 화가 필요
    expect(result!.rating).toBe(5); // 급함
  });

  it("returns correct info for 丙火 in 午月", () => {
    const result = getJohuYongsin("丙", "午");
    expect(result).not.toBeNull();
    expect(result!.primaryYongsin).toBe("수"); // 화 극왕이니 수 필요
    expect(result!.rating).toBe(5);
  });

  it("returns correct info for 壬水 in 亥月", () => {
    const result = getJohuYongsin("壬", "亥");
    expect(result).not.toBeNull();
    expect(result!.primaryYongsin).toBe("화"); // 수 왕지이니 화 필요
    expect(result!.rating).toBe(5);
  });

  it("returns null for invalid daymaster", () => {
    const result = getJohuYongsin("X", "寅");
    expect(result).toBeNull();
  });

  it("returns null for invalid month", () => {
    const result = getJohuYongsin("甲", "X");
    expect(result).toBeNull();
  });

  it("returns null for both invalid", () => {
    const result = getJohuYongsin("X", "Y");
    expect(result).toBeNull();
  });

  it("covers all 120 combinations", () => {
    let count = 0;
    for (const daymaster of DAYMASTERS) {
      for (const month of MONTH_BRANCHES) {
        const result = getJohuYongsin(daymaster, month);
        if (result !== null) {
          count++;
        }
      }
    }
    expect(count).toBe(120);
  });
});

describe("johuYongsin - evaluateJohuNeed Function", () => {
  it("returns rating 5 for extreme cases", () => {
    // 甲木 in 午月 (한여름)
    const result1 = evaluateJohuNeed("甲", "午");
    expect(result1.rating).toBe(5);
    expect(result1.urgent).toBe(true);

    // 壬水 in 子月 (한겨울)
    const result2 = evaluateJohuNeed("壬", "子");
    expect(result2.rating).toBe(5);
    expect(result2.urgent).toBe(true);
  });

  it("returns rating 3 or lower for moderate cases", () => {
    // 甲木 in 卯月 (중봄, 온화)
    const result = evaluateJohuNeed("甲", "卯");
    expect(result.rating).toBeLessThanOrEqual(3);
    expect(result.urgent).toBe(false);
  });

  it("returns urgent true for rating >= 4", () => {
    // 甲木 in 寅月
    const result = evaluateJohuNeed("甲", "寅");
    expect(result.rating).toBe(4);
    expect(result.urgent).toBe(true);
  });

  it("returns proper description for each rating", () => {
    // Rating 5
    const result5 = evaluateJohuNeed("甲", "午");
    expect(result5.description).toContain("급함");

    // Rating 4
    const result4 = evaluateJohuNeed("甲", "寅");
    expect(result4.description).toContain("높음");

    // Rating 3
    const result3 = evaluateJohuNeed("甲", "卯");
    expect(result3.description).toContain("중간");
  });

  it("returns rating 0 for invalid input", () => {
    const result = evaluateJohuNeed("X", "Y");
    expect(result.rating).toBe(0);
    expect(result.description).toBe("조후 정보 없음");
    expect(result.urgent).toBe(false);
  });

  it("returns proper result structure", () => {
    const result = evaluateJohuNeed("甲", "寅");
    expect(result).toHaveProperty("rating");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("urgent");
    expect(typeof result.rating).toBe("number");
    expect(typeof result.description).toBe("string");
    expect(typeof result.urgent).toBe("boolean");
  });
});

describe("johuYongsin - harmonizeYongsin Function", () => {
  it("returns excellent harmony when both yongsins match", () => {
    const result = harmonizeYongsin("화", "화", 4);
    expect(result.harmony).toBe("excellent");
    expect(result.primary).toBe("화");
    expect(result.secondary).toBe("화");
    expect(result.recommendation).toContain("일치");
  });

  it("prioritizes johu when rating is high (>= 4)", () => {
    const result = harmonizeYongsin("화", "수", 4);
    expect(result.primary).toBe("화"); // 조후용신
    expect(result.secondary).toBe("수"); // 억부용신
    expect(result.harmony).toBe("good");
    expect(result.recommendation).toContain("조후용신 우선");
  });

  it("prioritizes eokbu when rating is low (< 4)", () => {
    const result = harmonizeYongsin("화", "수", 3);
    expect(result.primary).toBe("수"); // 억부용신
    expect(result.secondary).toBe("화"); // 조후용신
    expect(result.harmony).toBe("good");
    expect(result.recommendation).toContain("억부용신 우선");
  });

  it("handles rating 5 correctly", () => {
    const result = harmonizeYongsin("수", "목", 5);
    expect(result.primary).toBe("수");
    expect(result.harmony).toBe("good");
  });

  it("handles rating 1 correctly", () => {
    const result = harmonizeYongsin("수", "목", 1);
    expect(result.primary).toBe("목"); // 억부 우선
    expect(result.secondary).toBe("수");
  });

  it("returns proper result structure", () => {
    const result = harmonizeYongsin("화", "수", 3);
    expect(result).toHaveProperty("primary");
    expect(result).toHaveProperty("secondary");
    expect(result).toHaveProperty("harmony");
    expect(result).toHaveProperty("recommendation");
  });

  it("all elements maintain valid FiveElement type", () => {
    const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];

    for (const johu of validElements) {
      for (const eokbu of validElements) {
        for (const rating of [1, 2, 3, 4, 5]) {
          const result = harmonizeYongsin(johu, eokbu, rating);
          expect(validElements).toContain(result.primary);
          expect(validElements).toContain(result.secondary);
        }
      }
    }
  });
});

describe("johuYongsin - Seasonal Patterns", () => {
  describe("Winter months (亥, 子, 丑) - Cold season", () => {
    it("木 daymasters need 화 in winter", () => {
      for (const month of ["亥", "子", "丑"]) {
        const jiaResult = getJohuYongsin("甲", month);
        const yiResult = getJohuYongsin("乙", month);
        expect(jiaResult!.primaryYongsin).toBe("화");
        expect(yiResult!.primaryYongsin).toBe("화");
      }
    });

    it("土 daymasters need 화 in winter", () => {
      for (const month of ["亥", "子", "丑"]) {
        const wuResult = getJohuYongsin("戊", month);
        const jiResult = getJohuYongsin("己", month);
        expect(wuResult!.primaryYongsin).toBe("화");
        expect(jiResult!.primaryYongsin).toBe("화");
      }
    });

    it("水 daymasters need 화 in winter", () => {
      for (const month of ["亥", "子", "丑"]) {
        const renResult = getJohuYongsin("壬", month);
        const guiResult = getJohuYongsin("癸", month);
        expect(renResult!.primaryYongsin).toBe("화");
        expect(guiResult!.primaryYongsin).toBe("화");
      }
    });
  });

  describe("Summer months (巳, 午, 未) - Hot season", () => {
    it("木 daymasters need 수 in summer", () => {
      for (const month of ["巳", "午", "未"]) {
        const jiaResult = getJohuYongsin("甲", month);
        const yiResult = getJohuYongsin("乙", month);
        expect(jiaResult!.primaryYongsin).toBe("수");
        expect(yiResult!.primaryYongsin).toBe("수");
      }
    });

    it("火 daymasters need 수 in summer", () => {
      for (const month of ["巳", "午", "未"]) {
        const bingResult = getJohuYongsin("丙", month);
        expect(bingResult!.primaryYongsin).toBe("수");
      }
    });

    it("金 daymasters need 수 in summer", () => {
      for (const month of ["巳", "午", "未"]) {
        const gengResult = getJohuYongsin("庚", month);
        const xinResult = getJohuYongsin("辛", month);
        expect(gengResult!.primaryYongsin).toBe("수");
        expect(xinResult!.primaryYongsin).toBe("수");
      }
    });
  });

  describe("Spring month 卯 - Warm season", () => {
    it("ratings are generally lower in warm spring", () => {
      const ratings: number[] = [];
      for (const daymaster of DAYMASTERS) {
        const result = getJohuYongsin(daymaster, "卯");
        if (result) {
          ratings.push(result.rating);
        }
      }
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      expect(avgRating).toBeLessThan(4); // 평균 4 미만
    });
  });
});

describe("johuYongsin - Daymaster Specific Patterns", () => {
  describe("甲木 daymaster", () => {
    it("has 12 complete entries", () => {
      const entries = JOHU_YONGSIN_DB.filter((i) => i.daymaster === "甲");
      expect(entries).toHaveLength(12);
    });

    it("needs water (수) in hot months", () => {
      const hotMonths = ["巳", "午", "未"];
      for (const month of hotMonths) {
        const result = getJohuYongsin("甲", month);
        expect(result!.primaryYongsin).toBe("수");
      }
    });

    it("needs fire (화) in cold months", () => {
      const coldMonths = ["亥", "子", "丑"];
      for (const month of coldMonths) {
        const result = getJohuYongsin("甲", month);
        expect(result!.primaryYongsin).toBe("화");
      }
    });
  });

  describe("丙火 daymaster", () => {
    it("needs wood (목) for sustenance in most months", () => {
      const woodMonths = ["寅", "卯", "辰", "申", "酉", "戌", "亥", "子", "丑"];
      for (const month of woodMonths) {
        const result = getJohuYongsin("丙", month);
        expect(result!.primaryYongsin).toBe("목");
      }
    });

    it("needs water (수) in summer", () => {
      const summerMonths = ["巳", "午", "未"];
      for (const month of summerMonths) {
        const result = getJohuYongsin("丙", month);
        expect(result!.primaryYongsin).toBe("수");
      }
    });
  });

  describe("庚金 daymaster", () => {
    it("needs fire (화) for refinement in most months", () => {
      const fireMonths = ["寅", "卯", "辰", "申", "酉", "戌", "亥", "子", "丑"];
      for (const month of fireMonths) {
        const result = getJohuYongsin("庚", month);
        expect(result!.primaryYongsin).toBe("화");
      }
    });

    it("needs water (수) to cool in summer", () => {
      const summerMonths = ["巳", "午", "未"];
      for (const month of summerMonths) {
        const result = getJohuYongsin("庚", month);
        expect(result!.primaryYongsin).toBe("수");
      }
    });
  });

  describe("辛金 daymaster", () => {
    it("often needs water (수) for polishing", () => {
      const waterMonths = ["辰", "巳", "午", "未", "申", "酉", "戌"];
      for (const month of waterMonths) {
        const result = getJohuYongsin("辛", month);
        expect(result!.primaryYongsin).toBe("수");
      }
    });

    it("needs earth (토) for support in winter", () => {
      const winterMonths = ["亥", "子"];
      for (const month of winterMonths) {
        const result = getJohuYongsin("辛", month);
        expect(result!.primaryYongsin).toBe("토");
      }
    });
  });
});

describe("johuYongsin - Rating Distribution", () => {
  it("has entries with rating 5 (most urgent)", () => {
    const rating5 = JOHU_YONGSIN_DB.filter((i) => i.rating === 5);
    expect(rating5.length).toBeGreaterThan(0);
  });

  it("has entries with rating 1 or 2 (least urgent)", () => {
    const lowRating = JOHU_YONGSIN_DB.filter((i) => i.rating <= 2);
    expect(lowRating.length).toBeGreaterThan(0);
  });

  it("rating 5 cases are in extreme months", () => {
    const rating5 = JOHU_YONGSIN_DB.filter((i) => i.rating === 5);
    const extremeMonths = ["午", "子", "亥", "酉"]; // 한여름, 한겨울 등

    for (const entry of rating5) {
      expect(extremeMonths).toContain(entry.month);
    }
  });

  it("卯月 (온화) generally has lower ratings", () => {
    const maoMonthEntries = JOHU_YONGSIN_DB.filter((i) => i.month === "卯");
    for (const entry of maoMonthEntries) {
      expect(entry.rating).toBeLessThanOrEqual(3);
    }
  });
});

describe("johuYongsin - Climate Consistency", () => {
  it("cold months (子, 丑, 寅, 亥) have 한 or 한습 climate", () => {
    const coldMonths = ["子", "丑", "寅", "亥"];
    for (const month of coldMonths) {
      const entries = JOHU_YONGSIN_DB.filter((i) => i.month === month);
      for (const entry of entries) {
        expect(["한", "습"]).toContain(entry.climate);
      }
    }
  });

  it("hot months (巳, 午, 未) have 열 climate", () => {
    const hotMonths = ["巳", "午", "未"];
    for (const month of hotMonths) {
      const entries = JOHU_YONGSIN_DB.filter((i) => i.month === month);
      for (const entry of entries) {
        expect(entry.climate).toBe("열");
      }
    }
  });

  it("卯月 has 온화 climate", () => {
    const maoEntries = JOHU_YONGSIN_DB.filter((i) => i.month === "卯");
    for (const entry of maoEntries) {
      expect(entry.climate).toBe("온화");
    }
  });

  it("autumn months (申, 酉, 戌) have 조 climate", () => {
    const autumnMonths = ["申", "酉", "戌"];
    for (const month of autumnMonths) {
      const entries = JOHU_YONGSIN_DB.filter((i) => i.month === month);
      for (const entry of entries) {
        expect(entry.climate).toBe("조");
      }
    }
  });
});

describe("johuYongsin - Type Definitions", () => {
  it("JohuYongsinInfo has correct structure", () => {
    const sample = JOHU_YONGSIN_DB[0];

    expect(typeof sample.daymaster).toBe("string");
    expect(typeof sample.month).toBe("string");
    expect(typeof sample.climate).toBe("string");
    expect(typeof sample.primaryYongsin).toBe("string");
    expect(typeof sample.reasoning).toBe("string");
    expect(typeof sample.rating).toBe("number");
  });

  it("climate is restricted to valid values", () => {
    const validClimates = ["한", "습", "조", "열", "온화"];
    for (const entry of JOHU_YONGSIN_DB) {
      expect(validClimates).toContain(entry.climate);
    }
  });

  it("rating is restricted to 1-5", () => {
    for (const entry of JOHU_YONGSIN_DB) {
      expect([1, 2, 3, 4, 5]).toContain(entry.rating);
    }
  });
});

describe("johuYongsin - Edge Cases", () => {
  it("handles all daymaster-month combinations without error", () => {
    for (const daymaster of DAYMASTERS) {
      for (const month of MONTH_BRANCHES) {
        expect(() => getJohuYongsin(daymaster, month)).not.toThrow();
        expect(() => evaluateJohuNeed(daymaster, month)).not.toThrow();
      }
    }
  });

  it("harmonizeYongsin handles same element for both", () => {
    for (const element of ["목", "화", "토", "금", "수"] as FiveElement[]) {
      const result = harmonizeYongsin(element, element, 3);
      expect(result.harmony).toBe("excellent");
    }
  });

  it("harmonizeYongsin handles extreme ratings", () => {
    expect(() => harmonizeYongsin("화", "수", 1)).not.toThrow();
    expect(() => harmonizeYongsin("화", "수", 5)).not.toThrow();
  });
});
