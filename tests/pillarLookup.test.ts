/**
 * Pillar Lookup 테스트
 * - 60갑자 조회
 * - 납음오행
 * - 일주론
 * - 공망 계산
 */


import {
  SIXTY_PILLARS,
  calculatePillarIndex,
  getPillarInfo,
  makePillar,
  getPillarByIndex,
  getPillarByKoreanName,
  getNaeum,
  getNaeumElement,
  getIljuInfo,
  getNextPillar,
  getPreviousPillar,
  getPillarDistance,
  getPillarAfter,
  getYearPillar,
  getAllPillars,
  getStemsByElement,
  getBranchesByElement,
  getIljuSummary,
  getGongmang,
  STEM_KOREAN,
  BRANCH_KOREAN,
} from "@/lib/Saju/pillarLookup";

describe("SIXTY_PILLARS constant", () => {
  it("has exactly 60 elements", () => {
    expect(SIXTY_PILLARS).toHaveLength(60);
  });

  it("starts with 甲子", () => {
    expect(SIXTY_PILLARS[0]).toBe("甲子");
  });

  it("ends with 癸亥", () => {
    expect(SIXTY_PILLARS[59]).toBe("癸亥");
  });

  it("has no duplicates", () => {
    const unique = new Set(SIXTY_PILLARS);
    expect(unique.size).toBe(60);
  });

  it("all elements are 2 characters", () => {
    SIXTY_PILLARS.forEach((pillar) => {
      expect(pillar).toHaveLength(2);
    });
  });
});

describe("calculatePillarIndex", () => {
  it("returns 1 for 甲子", () => {
    expect(calculatePillarIndex("甲", "子")).toBe(1);
  });

  it("returns 2 for 乙丑", () => {
    expect(calculatePillarIndex("乙", "丑")).toBe(2);
  });

  it("returns 60 for 癸亥", () => {
    expect(calculatePillarIndex("癸", "亥")).toBe(60);
  });

  it("returns -1 for invalid stem", () => {
    expect(calculatePillarIndex("X", "子")).toBe(-1);
  });

  it("returns -1 for invalid branch", () => {
    expect(calculatePillarIndex("甲", "X")).toBe(-1);
  });

  it("returns -1 for yin-yang mismatch", () => {
    // 甲 is yang, 丑 is yin - invalid combination
    expect(calculatePillarIndex("甲", "丑")).toBe(-1);
    // 乙 is yin, 子 is yang - invalid combination
    expect(calculatePillarIndex("乙", "子")).toBe(-1);
  });
});

describe("getPillarInfo", () => {
  it("returns info for valid pillar", () => {
    const info = getPillarInfo("甲子");

    expect(info).not.toBeNull();
    expect(info?.index).toBe(1);
    expect(info?.stem).toBe("甲");
    expect(info?.branch).toBe("子");
    expect(info?.stemKorean).toBe("갑");
    expect(info?.branchKorean).toBe("자");
    expect(info?.koreanName).toBe("갑자");
  });

  it("returns null for invalid pillar", () => {
    expect(getPillarInfo("XX")).toBeNull();
  });

  it("includes element info", () => {
    const info = getPillarInfo("甲子");
    expect(info?.stemElement).toBe("목");
    expect(info?.branchElement).toBe("수");
  });

  it("includes yin-yang info", () => {
    const info = getPillarInfo("甲子");
    expect(info?.stemYinYang).toBe("양");
  });

  it("includes naeum", () => {
    const info = getPillarInfo("甲子");
    expect(info?.naeum).toContain("해중금");
  });
});

describe("makePillar", () => {
  it("creates valid pillar", () => {
    expect(makePillar("甲", "子")).toBe("甲子");
    expect(makePillar("乙", "丑")).toBe("乙丑");
  });

  it("returns null for invalid stem", () => {
    expect(makePillar("X", "子")).toBeNull();
  });

  it("returns null for invalid branch", () => {
    expect(makePillar("甲", "X")).toBeNull();
  });

  it("returns null for yin-yang mismatch", () => {
    expect(makePillar("甲", "丑")).toBeNull(); // yang + yin
    expect(makePillar("乙", "子")).toBeNull(); // yin + yang
  });
});

describe("getPillarByIndex", () => {
  it("returns 甲子 for index 1", () => {
    expect(getPillarByIndex(1)).toBe("甲子");
  });

  it("returns 癸亥 for index 60", () => {
    expect(getPillarByIndex(60)).toBe("癸亥");
  });

  it("returns null for index 0", () => {
    expect(getPillarByIndex(0)).toBeNull();
  });

  it("returns null for index 61", () => {
    expect(getPillarByIndex(61)).toBeNull();
  });

  it("returns null for negative index", () => {
    expect(getPillarByIndex(-1)).toBeNull();
  });
});

describe("getPillarByKoreanName", () => {
  it("returns pillar for valid Korean name", () => {
    expect(getPillarByKoreanName("갑자")).toBe("甲子");
    expect(getPillarByKoreanName("을축")).toBe("乙丑");
  });

  it("returns null for invalid name", () => {
    expect(getPillarByKoreanName("갑축")).toBeNull(); // Invalid combination
    expect(getPillarByKoreanName("")).toBeNull();
    expect(getPillarByKoreanName("invalid")).toBeNull();
  });
});

describe("getNaeum / getNaeumElement", () => {
  it("returns naeum for valid pillar", () => {
    expect(getNaeum("甲子")).toContain("해중금");
    expect(getNaeum("丙寅")).toContain("노중화");
  });

  it("returns null for invalid pillar", () => {
    expect(getNaeum("XX")).toBeNull();
  });

  it("extracts element from naeum", () => {
    expect(getNaeumElement("甲子")).toBe("금"); // 해중금
    expect(getNaeumElement("丙寅")).toBe("화"); // 노중화
    expect(getNaeumElement("戊辰")).toBe("목"); // 대림목
  });

  it("returns null for invalid pillar", () => {
    expect(getNaeumElement("XX")).toBeNull();
  });
});

describe("getIljuInfo", () => {
  it("returns info for valid pillar", () => {
    const info = getIljuInfo("甲子");

    expect(info).not.toBeNull();
    expect(info?.pillar).toBe("甲子");
    expect(info?.personality).toBeTruthy();
    expect(info?.career).toBeTruthy();
    expect(info?.love).toBeTruthy();
    expect(info?.wealth).toBeTruthy();
    expect(info?.health).toBeTruthy();
  });

  it("returns null for invalid pillar", () => {
    expect(getIljuInfo("XX")).toBeNull();
  });

  it("includes famous people for some pillars", () => {
    const info = getIljuInfo("甲子");
    expect(info?.famousPeople).toBeTruthy();
  });
});

describe("getNextPillar / getPreviousPillar", () => {
  it("returns next pillar correctly", () => {
    expect(getNextPillar("甲子")).toBe("乙丑");
    expect(getNextPillar("癸亥")).toBe("甲子"); // Wraps around
  });

  it("returns previous pillar correctly", () => {
    expect(getPreviousPillar("乙丑")).toBe("甲子");
    expect(getPreviousPillar("甲子")).toBe("癸亥"); // Wraps around
  });

  it("returns null for invalid pillar", () => {
    expect(getNextPillar("XX")).toBeNull();
    expect(getPreviousPillar("XX")).toBeNull();
  });
});

describe("getPillarDistance", () => {
  it("calculates distance correctly", () => {
    expect(getPillarDistance("甲子", "乙丑")).toBe(1);
    expect(getPillarDistance("甲子", "甲子")).toBe(0);
    expect(getPillarDistance("甲子", "癸亥")).toBe(59);
  });

  it("returns -1 for invalid pillars", () => {
    expect(getPillarDistance("XX", "甲子")).toBe(-1);
    expect(getPillarDistance("甲子", "XX")).toBe(-1);
  });
});

describe("getPillarAfter", () => {
  it("returns pillar N positions after", () => {
    expect(getPillarAfter("甲子", 1)).toBe("乙丑");
    expect(getPillarAfter("甲子", 10)).toBe("甲戌");
    expect(getPillarAfter("甲子", 60)).toBe("甲子"); // Full cycle
  });

  it("handles negative N", () => {
    expect(getPillarAfter("乙丑", -1)).toBe("甲子");
  });

  it("returns null for invalid pillar", () => {
    expect(getPillarAfter("XX", 1)).toBeNull();
  });
});

describe("getYearPillar", () => {
  it("returns correct pillar for base year 1984 (甲子)", () => {
    expect(getYearPillar(1984)).toBe("甲子");
  });

  it("returns correct pillar for 1985 (乙丑)", () => {
    expect(getYearPillar(1985)).toBe("乙丑");
  });

  it("returns correct pillar for 2024", () => {
    // 2024 - 1984 = 40
    expect(getYearPillar(2024)).toBe("甲辰");
  });

  it("handles years before 1984", () => {
    expect(getYearPillar(1983)).toBe("癸亥");
    expect(getYearPillar(1924)).toBe("甲子"); // 60 years before 1984
  });
});

describe("getAllPillars", () => {
  it("returns 60 pillar info objects", () => {
    const all = getAllPillars();
    expect(all).toHaveLength(60);
  });

  it("each pillar has complete info", () => {
    const all = getAllPillars();
    all.forEach((info) => {
      expect(info.index).toBeGreaterThanOrEqual(1);
      expect(info.index).toBeLessThanOrEqual(60);
      expect(info.pillar).toHaveLength(2);
      expect(info.stemKorean).toBeTruthy();
      expect(info.branchKorean).toBeTruthy();
      expect(info.stemElement).toBeTruthy();
      expect(info.branchElement).toBeTruthy();
    });
  });
});

describe("getStemsByElement / getBranchesByElement", () => {
  it("returns correct stems for 목", () => {
    const stems = getStemsByElement("목");
    expect(stems).toContain("甲");
    expect(stems).toContain("乙");
    expect(stems).toHaveLength(2);
  });

  it("returns correct branches for 목", () => {
    const branches = getBranchesByElement("목");
    expect(branches).toContain("寅");
    expect(branches).toContain("卯");
  });

  it("returns stems for all five elements", () => {
    expect(getStemsByElement("목").length).toBeGreaterThan(0);
    expect(getStemsByElement("화").length).toBeGreaterThan(0);
    expect(getStemsByElement("토").length).toBeGreaterThan(0);
    expect(getStemsByElement("금").length).toBeGreaterThan(0);
    expect(getStemsByElement("수").length).toBeGreaterThan(0);
  });
});

describe("getIljuSummary", () => {
  it("returns summary for valid pillar with data", () => {
    const summary = getIljuSummary("甲子");
    expect(summary).toBeTruthy();
    expect(summary).toContain("甲子");
  });

  it("returns null for invalid pillar", () => {
    expect(getIljuSummary("XX")).toBeNull();
  });
});

describe("getGongmang", () => {
  it("returns two branches for valid pillar", () => {
    const gongmang = getGongmang("甲子");
    expect(gongmang).toHaveLength(2);
  });

  it("returns correct gongmang for 甲子~癸酉 group", () => {
    // First group uses 子~酉, so 戌, 亥 are gongmang
    const gongmang = getGongmang("甲子");
    expect(gongmang).toContain("戌");
    expect(gongmang).toContain("亥");
  });

  it("returns null for invalid pillar", () => {
    expect(getGongmang("XX")).toBeNull();
  });

  it("same group shares gongmang", () => {
    const g1 = getGongmang("甲子");
    const g2 = getGongmang("乙丑");
    expect(g1).toEqual(g2);
  });

  it("different groups have different gongmang", () => {
    const g1 = getGongmang("甲子"); // First group
    const g2 = getGongmang("甲戌"); // Second group
    expect(g1).not.toEqual(g2);
  });
});

describe("STEM_KOREAN / BRANCH_KOREAN", () => {
  it("has all 10 stems", () => {
    expect(Object.keys(STEM_KOREAN)).toHaveLength(10);
  });

  it("has all 12 branches", () => {
    expect(Object.keys(BRANCH_KOREAN)).toHaveLength(12);
  });

  it("maps correctly", () => {
    expect(STEM_KOREAN["甲"]).toBe("갑");
    expect(STEM_KOREAN["癸"]).toBe("계");
    expect(BRANCH_KOREAN["子"]).toBe("자");
    expect(BRANCH_KOREAN["亥"]).toBe("해");
  });
});
