/**
 * Saju Relations 테스트
 * - 천간합/충
 * - 지지 육합/삼합/충/형/파/해
 * - 공망
 */


import {
  analyzeRelations,
  normalizeBranchName,
  DEFAULT_RELATION_OPTIONS,
  type PillarInput,
  type AnalyzeRelationsOptions,
} from "@/lib/Saju/relations";

// 테스트 헬퍼
function createPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): PillarInput {
  return {
    year: { heavenlyStem: year[0], earthlyBranch: year[1] },
    month: { heavenlyStem: month[0], earthlyBranch: month[1] },
    day: { heavenlyStem: day[0], earthlyBranch: day[1] },
    time: { heavenlyStem: time[0], earthlyBranch: time[1] },
  };
}

describe("normalizeBranchName", () => {
  it("converts Korean to Chinese characters", () => {
    expect(normalizeBranchName("자")).toBe("子");
    expect(normalizeBranchName("축")).toBe("丑");
    expect(normalizeBranchName("인")).toBe("寅");
    expect(normalizeBranchName("묘")).toBe("卯");
    expect(normalizeBranchName("진")).toBe("辰");
    expect(normalizeBranchName("사")).toBe("巳");
    expect(normalizeBranchName("오")).toBe("午");
    expect(normalizeBranchName("미")).toBe("未");
    expect(normalizeBranchName("신")).toBe("申");
    expect(normalizeBranchName("유")).toBe("酉");
    expect(normalizeBranchName("술")).toBe("戌");
    expect(normalizeBranchName("해")).toBe("亥");
  });

  it("returns Chinese character unchanged", () => {
    expect(normalizeBranchName("子")).toBe("子");
    expect(normalizeBranchName("午")).toBe("午");
  });

  it("handles empty/whitespace", () => {
    expect(normalizeBranchName("")).toBe("");
    expect(normalizeBranchName("  자  ")).toBe("子");
  });
});

describe("DEFAULT_RELATION_OPTIONS", () => {
  it("has correct default values", () => {
    expect(DEFAULT_RELATION_OPTIONS.includeHeavenly).toBe(true);
    expect(DEFAULT_RELATION_OPTIONS.includeEarthly).toBe(true);
    expect(DEFAULT_RELATION_OPTIONS.includeGongmang).toBe(true);
    expect(DEFAULT_RELATION_OPTIONS.gongmangPolicy).toBe("dayPillar-60jiazi");
    expect(DEFAULT_RELATION_OPTIONS.heavenlyClashMode).toBe("5");
  });
});

describe("analyzeRelations: 천간합", () => {
  it("detects 甲己合", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["己", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const hapHits = hits.filter((h) => h.kind === "천간합");

    expect(hapHits.length).toBeGreaterThan(0);
    expect(hapHits.some((h) => h.detail?.includes("甲-己"))).toBe(true);
  });

  it("detects 乙庚合", () => {
    const pillars = createPillars(
      ["乙", "子"],
      ["庚", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const hapHits = hits.filter((h) => h.kind === "천간합");

    expect(hapHits.some((h) => h.detail?.includes("乙-庚") || h.detail?.includes("庚-乙"))).toBe(true);
  });

  it("includes transform element in detail when option enabled", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["己", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({
      pillars,
      options: { includeHeavenlyTransformNote: true },
    });
    const hapHits = hits.filter((h) => h.kind === "천간합");

    expect(hapHits.some((h) => h.detail?.includes("합화"))).toBe(true);
  });
});

describe("analyzeRelations: 천간충", () => {
  it("detects 甲庚충 in mode 4", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["庚", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({
      pillars,
      options: { heavenlyClashMode: "4" },
    });
    const chungHits = hits.filter((h) => h.kind === "천간충");

    expect(chungHits.length).toBeGreaterThan(0);
  });

  it("detects additional 戊甲충 in mode 5", () => {
    const pillars = createPillars(
      ["戊", "子"],
      ["甲", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({
      pillars,
      options: { heavenlyClashMode: "5" },
    });
    const chungHits = hits.filter((h) => h.kind === "천간충");

    expect(chungHits.length).toBeGreaterThan(0);
  });
});

describe("analyzeRelations: 지지육합", () => {
  it("detects 子丑合", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const yukhapHits = hits.filter((h) => h.kind === "지지육합");

    expect(yukhapHits.length).toBeGreaterThan(0);
    expect(yukhapHits.some((h) => h.detail?.includes("子-丑"))).toBe(true);
  });

  it("detects 寅亥合", () => {
    const pillars = createPillars(
      ["甲", "寅"],
      ["乙", "亥"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({ pillars });
    const yukhapHits = hits.filter((h) => h.kind === "지지육합");

    expect(yukhapHits.some((h) => h.detail?.includes("寅-亥") || h.detail?.includes("亥-寅"))).toBe(true);
  });
});

describe("analyzeRelations: 지지삼합", () => {
  it("detects 申子辰 삼합(수)", () => {
    const pillars = createPillars(
      ["甲", "申"],
      ["乙", "子"],
      ["丙", "辰"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const samhapHits = hits.filter((h) => h.kind === "지지삼합");

    expect(samhapHits.length).toBeGreaterThan(0);
    expect(samhapHits.some((h) => h.detail?.includes("수"))).toBe(true);
  });

  it("detects 寅午戌 삼합(화)", () => {
    const pillars = createPillars(
      ["甲", "寅"],
      ["乙", "午"],
      ["丙", "戌"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const samhapHits = hits.filter((h) => h.kind === "지지삼합");

    expect(samhapHits.some((h) => h.detail?.includes("화"))).toBe(true);
  });
});

describe("analyzeRelations: 지지충", () => {
  it("detects 子午충", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "午"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const chungHits = hits.filter((h) => h.kind === "지지충");

    expect(chungHits.length).toBeGreaterThan(0);
  });

  it("detects 寅申충", () => {
    const pillars = createPillars(
      ["甲", "寅"],
      ["乙", "申"],
      ["丙", "辰"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const chungHits = hits.filter((h) => h.kind === "지지충");

    expect(chungHits.length).toBeGreaterThan(0);
  });
});

describe("analyzeRelations: 지지형", () => {
  it("detects 寅巳申 삼형", () => {
    const pillars = createPillars(
      ["甲", "寅"],
      ["乙", "巳"],
      ["丙", "申"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });
    const hyungHits = hits.filter((h) => h.kind === "지지형");

    expect(hyungHits.length).toBeGreaterThan(0);
  });

  it("detects 子卯 무은형", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "卯"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({ pillars });
    const hyungHits = hits.filter((h) => h.kind === "지지형");

    expect(hyungHits.length).toBeGreaterThan(0);
  });

  it("detects self-punish when option enabled", () => {
    const pillars = createPillars(
      ["甲", "午"],
      ["乙", "午"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({
      pillars,
      options: { includeSelfPunish: true },
    });
    const hyungHits = hits.filter((h) => h.kind === "지지형");

    expect(hyungHits.some((h) => h.detail?.includes("午-午"))).toBe(true);
  });
});

describe("analyzeRelations: 지지파", () => {
  it("detects 子酉파", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "酉"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({ pillars });
    const paHits = hits.filter((h) => h.kind === "지지파");

    expect(paHits.length).toBeGreaterThan(0);
  });
});

describe("analyzeRelations: 지지해", () => {
  it("detects 子未해", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "未"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({ pillars });
    const haeHits = hits.filter((h) => h.kind === "지지해");

    expect(haeHits.length).toBeGreaterThan(0);
  });
});

describe("analyzeRelations: 원진", () => {
  it("detects 子未 원진", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "未"],
      ["丙", "辰"],
      ["丁", "巳"]
    );

    const hits = analyzeRelations({ pillars });
    const yuanjinHits = hits.filter((h) => h.kind === "원진");

    expect(yuanjinHits.length).toBeGreaterThan(0);
  });
});

describe("analyzeRelations: 공망", () => {
  it("detects gongmang with dayPillar-60jiazi policy", () => {
    // 甲子일주의 공망은 戌, 亥
    const pillars = createPillars(
      ["甲", "戌"], // 戌이 공망
      ["乙", "丑"],
      ["甲", "子"], // 일주
      ["丁", "卯"]
    );

    const hits = analyzeRelations({
      pillars,
      options: { gongmangPolicy: "dayPillar-60jiazi" },
    });
    const gongmangHits = hits.filter((h) => h.kind === "공망");

    expect(gongmangHits.length).toBeGreaterThan(0);
    expect(gongmangHits.some((h) => h.detail?.includes("戌"))).toBe(true);
  });

  it("respects includeGongmang option", () => {
    const pillars = createPillars(
      ["甲", "戌"],
      ["乙", "丑"],
      ["甲", "子"],
      ["丁", "卯"]
    );

    const hitsWithGongmang = analyzeRelations({
      pillars,
      options: { includeGongmang: true },
    });
    const hitsWithoutGongmang = analyzeRelations({
      pillars,
      options: { includeGongmang: false },
    });

    const withCount = hitsWithGongmang.filter((h) => h.kind === "공망").length;
    const withoutCount = hitsWithoutGongmang.filter((h) => h.kind === "공망").length;

    expect(withCount).toBeGreaterThan(withoutCount);
  });
});

describe("analyzeRelations: Options", () => {
  it("respects includeHeavenly option", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["己", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hitsWithHeavenly = analyzeRelations({
      pillars,
      options: { includeHeavenly: true },
    });
    const hitsWithoutHeavenly = analyzeRelations({
      pillars,
      options: { includeHeavenly: false },
    });

    const withHeavenlyCount = hitsWithHeavenly.filter(
      (h) => h.kind.startsWith("천간")
    ).length;
    const withoutHeavenlyCount = hitsWithoutHeavenly.filter(
      (h) => h.kind.startsWith("천간")
    ).length;

    expect(withHeavenlyCount).toBeGreaterThan(0);
    expect(withoutHeavenlyCount).toBe(0);
  });

  it("respects includeEarthly option", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["乙", "丑"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hitsWithEarthly = analyzeRelations({
      pillars,
      options: { includeEarthly: true },
    });
    const hitsWithoutEarthly = analyzeRelations({
      pillars,
      options: { includeEarthly: false },
    });

    const withEarthlyCount = hitsWithEarthly.filter(
      (h) => h.kind.startsWith("지지")
    ).length;
    const withoutEarthlyCount = hitsWithoutEarthly.filter(
      (h) => h.kind.startsWith("지지")
    ).length;

    expect(withEarthlyCount).toBeGreaterThan(0);
    expect(withoutEarthlyCount).toBe(0);
  });
});

describe("analyzeRelations: Sorting", () => {
  it("returns sorted results by kind", () => {
    const pillars = createPillars(
      ["甲", "子"],
      ["己", "午"],
      ["丙", "寅"],
      ["丁", "卯"]
    );

    const hits = analyzeRelations({ pillars });

    // Check that results are sorted
    for (let i = 0; i < hits.length - 1; i++) {
      const comparison = hits[i].kind.localeCompare(hits[i + 1].kind);
      expect(comparison).toBeLessThanOrEqual(0);
    }
  });
});
