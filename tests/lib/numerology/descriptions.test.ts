/**
 * Numerology Descriptions Tests
 *
 * Tests for human-readable texts for numerology readings
 */


import {
  describe as describeNum,
  describeLocale,
  getLuckyTag,
  getNumberTitle,
  luckyTag,
  type CoreKey,
} from "@/lib/numerology/descriptions";

describe("describe", () => {
  const coreKeys: CoreKey[] = [
    "lifePath",
    "expression",
    "soulUrge",
    "personality",
    "personalYear",
    "personalMonth",
    "personalDay",
  ];

  it("returns description for each core key", () => {
    for (const key of coreKeys) {
      const result = describeNum(key, 1);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("includes number title in lifePath description", () => {
    const result = describeNum("lifePath", 1);
    expect(result).toContain("Leader");
    expect(result).toContain("Pioneer");
  });

  it("includes aura in personality description", () => {
    const result = describeNum("personality", 2);
    expect(result).toContain("Cooperative");
  });

  it("handles master numbers", () => {
    const result11 = describeNum("lifePath", 11);
    expect(result11).toContain("Master 11");

    const result22 = describeNum("expression", 22);
    expect(result22).toContain("Master 22");

    const result33 = describeNum("soulUrge", 33);
    expect(result33).toContain("Master 33");
  });

  it("handles all single digit numbers", () => {
    for (let i = 1; i <= 9; i++) {
      const result = describeNum("lifePath", i);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("falls back to 1 for invalid numbers", () => {
    const result = describeNum("lifePath", 0);
    expect(result).toContain("Leader");
  });
});

describe("describeLocale", () => {
  it("returns English description by default", () => {
    const result = describeLocale("lifePath", 1);
    expect(result).toContain("life path");
    expect(result).toContain("Leader");
  });

  it("returns English description for 'en' locale", () => {
    const result = describeLocale("lifePath", 1, "en");
    expect(result).toContain("life path");
  });

  it("returns Korean description for 'ko' locale", () => {
    const result = describeLocale("lifePath", 1, "ko");
    expect(result).toContain("생명 경로");
    expect(result).toContain("리더");
  });

  it("handles extended core keys in English", () => {
    const keys = [
      "birthday",
      "maturity",
      "balance",
      "rationalThought",
      "cornerstone",
      "capstone",
      "firstVowel",
      "subconscious",
      "karmicDebt",
      "karmicLesson",
      "pinnacle",
      "challenge",
      "universalYear",
      "universalMonth",
      "universalDay",
    ];

    for (const key of keys) {
      const result = describeLocale(key, 5, "en");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("handles extended core keys in Korean", () => {
    const keys = [
      "birthday",
      "maturity",
      "balance",
      "pinnacle",
      "challenge",
      "universalYear",
    ];

    for (const key of keys) {
      const result = describeLocale(key, 5, "ko");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("falls back to tagline for unknown core key", () => {
    const result = describeLocale("unknownKey", 3, "en");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getLuckyTag", () => {
  it("returns English lucky tag by default", () => {
    const result = getLuckyTag(1);
    expect(result).toBe("Initiative, independence");
  });

  it("returns English lucky tag for 'en' locale", () => {
    const result = getLuckyTag(5, "en");
    expect(result).toBe("Change, versatility");
  });

  it("returns Korean lucky tag for 'ko' locale", () => {
    const result = getLuckyTag(1, "ko");
    expect(result).toBe("주도력, 독립성");
  });

  it("handles all single digit numbers", () => {
    for (let i = 1; i <= 9; i++) {
      const enResult = getLuckyTag(i, "en");
      const koResult = getLuckyTag(i, "ko");
      expect(enResult.length).toBeGreaterThan(0);
      expect(koResult.length).toBeGreaterThan(0);
    }
  });

  it("handles master numbers", () => {
    expect(getLuckyTag(11, "en")).toBe("Vision, inspiration");
    expect(getLuckyTag(22, "en")).toBe("Execution at scale");
    expect(getLuckyTag(33, "en")).toBe("Service, healing");

    expect(getLuckyTag(11, "ko")).toBe("비전, 영감");
    expect(getLuckyTag(22, "ko")).toBe("대규모 실행");
    expect(getLuckyTag(33, "ko")).toBe("봉사, 치유");
  });

  it("falls back to 1 for invalid numbers", () => {
    const result = getLuckyTag(0, "en");
    expect(result).toBe("Initiative, independence");
  });
});

describe("getNumberTitle", () => {
  it("returns English title by default", () => {
    const result = getNumberTitle(1);
    expect(result).toBe("Leader / Pioneer");
  });

  it("returns English title for 'en' locale", () => {
    const result = getNumberTitle(2, "en");
    expect(result).toBe("Mediator / Partner");
  });

  it("returns Korean title for 'ko' locale", () => {
    const result = getNumberTitle(1, "ko");
    expect(result).toBe("리더 / 개척자");
  });

  it("handles all single digit numbers", () => {
    const expectedTitles: Record<number, string> = {
      1: "Leader / Pioneer",
      2: "Mediator / Partner",
      3: "Communicator / Creator",
      4: "Builder / Steward",
      5: "Explorer / Catalyst",
      6: "Guardian / Nurturer",
      7: "Seeker / Analyst",
      8: "Executor / Strategist",
      9: "Humanitarian / Visionary",
    };

    for (let i = 1; i <= 9; i++) {
      expect(getNumberTitle(i, "en")).toBe(expectedTitles[i]);
    }
  });

  it("handles master numbers", () => {
    expect(getNumberTitle(11, "en")).toBe("Illuminator (Master 11)");
    expect(getNumberTitle(22, "en")).toBe("Master Builder (Master 22)");
    expect(getNumberTitle(33, "en")).toBe("Master Healer (Master 33)");

    expect(getNumberTitle(11, "ko")).toBe("계몽자 (마스터 11)");
    expect(getNumberTitle(22, "ko")).toBe("마스터 빌더 (마스터 22)");
    expect(getNumberTitle(33, "ko")).toBe("마스터 힐러 (마스터 33)");
  });

  it("falls back to 1 for invalid numbers", () => {
    const result = getNumberTitle(100, "en");
    expect(result).toBe("Leader / Pioneer");
  });
});

describe("luckyTag constant", () => {
  it("has entries for numbers 1-9", () => {
    for (let i = 1; i <= 9; i++) {
      expect(luckyTag[i]).toBeDefined();
    }
  });

  it("has entries for master numbers", () => {
    expect(luckyTag[11]).toBeDefined();
    expect(luckyTag[22]).toBeDefined();
    expect(luckyTag[33]).toBeDefined();
  });

  it("has 12 total entries", () => {
    expect(Object.keys(luckyTag)).toHaveLength(12);
  });
});

describe("describeLocale extended coverage", () => {
  describe("all extended core keys in Korean", () => {
    const extendedKeys = [
      "rationalThought",
      "cornerstone",
      "capstone",
      "firstVowel",
      "subconscious",
      "karmicDebt",
      "karmicLesson",
      "universalMonth",
      "universalDay",
    ];

    for (const key of extendedKeys) {
      it(`returns Korean description for ${key}`, () => {
        const result = describeLocale(key, 5, "ko");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    }
  });

  describe("handles two-digit numbers through reduction", () => {
    it("reduces 19 to 1 and returns description", () => {
      const result = describeLocale("lifePath", 19, "en");
      expect(result).toContain("Leader");
    });

    it("reduces 28 to 1 and returns description", () => {
      const result = describeLocale("expression", 28, "en");
      expect(result).toContain("Leader");
    });

    it("reduces 37 to 1 and returns description", () => {
      const result = describeLocale("personality", 37, "en");
      expect(result).toContain("Leader");
    });
  });

  describe("expression descriptions", () => {
    it("returns expression description in English", () => {
      const result = describeLocale("expression", 3, "en");
      expect(result).toContain("expression number");
      expect(result).toContain("Communicator");
    });

    it("returns expression description in Korean", () => {
      const result = describeLocale("expression", 3, "ko");
      expect(result).toContain("표현 숫자");
      expect(result).toContain("소통가");
    });
  });

  describe("soulUrge descriptions", () => {
    it("returns soulUrge description in English", () => {
      const result = describeLocale("soulUrge", 6, "en");
      expect(result).toContain("Heart's Desire");
      expect(result).toContain("Guardian");
    });

    it("returns soulUrge description in Korean", () => {
      const result = describeLocale("soulUrge", 6, "ko");
      expect(result).toContain("마음의 욕망");
      expect(result).toContain("수호자");
    });
  });

  describe("personality descriptions", () => {
    it("returns personality description in English", () => {
      const result = describeLocale("personality", 7, "en");
      expect(result).toContain("Outward personality");
      expect(result).toContain("Seeker");
    });

    it("returns personality description in Korean", () => {
      const result = describeLocale("personality", 7, "ko");
      expect(result).toContain("외향적 성격");
      expect(result).toContain("탐구자");
    });
  });

  describe("personalYear descriptions", () => {
    it("returns personalYear description in English", () => {
      const result = describeLocale("personalYear", 8, "en");
      expect(result).toContain("This year");
      expect(result).toContain("Executor");
    });

    it("returns personalYear description in Korean", () => {
      const result = describeLocale("personalYear", 8, "ko");
      expect(result).toContain("올해");
      expect(result).toContain("실행자");
    });
  });

  describe("personalMonth descriptions", () => {
    it("returns personalMonth description in English", () => {
      const result = describeLocale("personalMonth", 9, "en");
      expect(result).toContain("This month");
      expect(result).toContain("Humanitarian");
    });

    it("returns personalMonth description in Korean", () => {
      const result = describeLocale("personalMonth", 9, "ko");
      expect(result).toContain("이번 달");
      expect(result).toContain("인도주의자");
    });
  });

  describe("personalDay descriptions", () => {
    it("returns personalDay description in English", () => {
      const result = describeLocale("personalDay", 4, "en");
      expect(result).toContain("Today");
      expect(result).toContain("Builder");
    });

    it("returns personalDay description in Korean", () => {
      const result = describeLocale("personalDay", 4, "ko");
      expect(result).toContain("오늘");
      expect(result).toContain("건설자");
    });
  });
});

describe("number title fallback coverage", () => {
  it("returns reduced title for very large numbers", () => {
    // 999 reduces to 9+9+9 = 27, then 2+7 = 9
    const result = getNumberTitle(999, "en");
    expect(result).toBe("Humanitarian / Visionary");
  });

  it("returns fallback for negative numbers", () => {
    const result = getNumberTitle(-5, "en");
    expect(typeof result).toBe("string");
  });
});

describe("lucky tag fallback coverage", () => {
  it("returns reduced lucky tag for very large numbers in Korean", () => {
    // 999 reduces to 9+9+9 = 27, then 2+7 = 9
    const result = getLuckyTag(999, "ko");
    expect(result).toBe("자비, 유산");
  });
});
