/**
 * Shinsal (신살) Tests
 *
 * Tests for Korean Saju special stars and fortune indicators
 */


import {
  DEFAULT_ANNOTATE_OPTIONS,
  type ShinsalHit,
  type ShinsalAnnot,
  type AnnotateOptions,
  type PillarBase,
  type SajuPillarsLike,
} from "@/lib/Saju/shinsal";
import type { PillarKind, TwelveStage } from "@/lib/Saju/types";

describe("DEFAULT_ANNOTATE_OPTIONS", () => {
  it("has twelveStageBasis set to day", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.twelveStageBasis).toBe("day");
  });

  it("has includeLucky set to false by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeLucky).toBe(false);
  });

  it("has includeUnlucky set to false by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeUnlucky).toBe(false);
  });

  it("has includeTwelveAll set to true by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeTwelveAll).toBe(true);
  });

  it("has includeHwaHae set to false by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeHwaHae).toBe(false);
  });

  it("has useMonthCompletion set to false by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.useMonthCompletion).toBe(false);
  });

  it("has includeGeneralShinsal set to true by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeGeneralShinsal).toBe(true);
  });

  it("has includeLuckyDetails set to true by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.includeLuckyDetails).toBe(true);
  });

  it("has ruleSet set to standard by default", () => {
    expect(DEFAULT_ANNOTATE_OPTIONS.ruleSet).toBe("standard");
  });
});

describe("ShinsalHit interface", () => {
  it("can represent a basic hit", () => {
    const hit: ShinsalHit = {
      kind: "역마",
      pillars: ["year"],
    };

    expect(hit.kind).toBe("역마");
    expect(hit.pillars).toContain("year");
  });

  it("can include target information", () => {
    const hit: ShinsalHit = {
      kind: "천을귀인",
      pillars: ["day"],
      target: "寅",
    };

    expect(hit.target).toBe("寅");
  });

  it("can include detail information", () => {
    const hit: ShinsalHit = {
      kind: "도화",
      pillars: ["time"],
      detail: "桃花殺 - romantic energy",
    };

    expect(hit.detail).toContain("桃花殺");
  });

  it("can have multiple pillars", () => {
    const hit: ShinsalHit = {
      kind: "화개",
      pillars: ["year", "month"],
    };

    expect(hit.pillars).toHaveLength(2);
    expect(hit.pillars).toContain("year");
    expect(hit.pillars).toContain("month");
  });
});

describe("ShinsalHit kinds", () => {
  const luckyShinsal: ShinsalHit["kind"][] = [
    "천을귀인",
    "태극귀인",
    "금여성",
    "천문성",
    "문창",
    "문곡",
    "천의성",
    "학당귀인",
    "천주귀인",
    "암록",
    "건록",
    "제왕",
    "천덕귀인",
    "월덕귀인",
  ];

  const unluckyShinsal: ShinsalHit["kind"][] = [
    "역마",
    "도화",
    "백호",
    "공망",
    "홍염살",
    "천라지망",
    "원진",
    "삼재",
    "겁살",
    "재살",
  ];

  it("includes lucky shinsal types", () => {
    for (const kind of luckyShinsal) {
      const hit: ShinsalHit = { kind, pillars: ["day"] };
      expect(hit.kind).toBe(kind);
    }
  });

  it("includes unlucky shinsal types", () => {
    for (const kind of unluckyShinsal) {
      const hit: ShinsalHit = { kind, pillars: ["day"] };
      expect(hit.kind).toBe(kind);
    }
  });
});

describe("ShinsalAnnot interface", () => {
  it("has twelveStage for each pillar", () => {
    const annot: ShinsalAnnot = {
      twelveStage: {
        year: "장생",
        month: "건록",
        day: "제왕",
        time: "쇠",
      },
      hits: [],
    };

    expect(annot.twelveStage.year).toBe("장생");
    expect(annot.twelveStage.month).toBe("건록");
    expect(annot.twelveStage.day).toBe("제왕");
    expect(annot.twelveStage.time).toBe("쇠");
  });

  it("can have empty hits array", () => {
    const annot: ShinsalAnnot = {
      twelveStage: {
        year: "장생",
        month: "목욕",
        day: "관대",
        time: "건록",
      },
      hits: [],
    };

    expect(annot.hits).toHaveLength(0);
  });

  it("can have multiple hits", () => {
    const annot: ShinsalAnnot = {
      twelveStage: {
        year: "장생",
        month: "목욕",
        day: "관대",
        time: "건록",
      },
      hits: [
        { kind: "역마", pillars: ["year"] },
        { kind: "천을귀인", pillars: ["day"] },
        { kind: "도화", pillars: ["month", "time"] },
      ],
    };

    expect(annot.hits).toHaveLength(3);
  });

  it("can have byPillar breakdown", () => {
    const annot: ShinsalAnnot = {
      twelveStage: {
        year: "장생",
        month: "건록",
        day: "제왕",
        time: "쇠",
      },
      hits: [],
      byPillar: {
        year: {
          twelveShinsal: ["장성"],
          generalShinsal: ["역마"],
          lucky: ["천을귀인"],
        },
        month: {
          twelveShinsal: ["반안"],
          generalShinsal: [],
          lucky: [],
        },
        day: {
          twelveShinsal: ["제왕"],
          generalShinsal: ["도화"],
          lucky: ["문창"],
        },
        time: {
          twelveShinsal: ["쇠"],
          generalShinsal: [],
          lucky: [],
        },
      },
    };

    expect(annot.byPillar).toBeDefined();
    expect(annot.byPillar?.year.twelveShinsal).toContain("장성");
    expect(annot.byPillar?.day.lucky).toContain("문창");
  });
});

describe("AnnotateOptions interface", () => {
  it("all options are optional", () => {
    const options: AnnotateOptions = {};
    expect(options).toEqual({});
  });

  it("can set twelveStageBasis to day", () => {
    const options: AnnotateOptions = {
      twelveStageBasis: "day",
    };
    expect(options.twelveStageBasis).toBe("day");
  });

  it("can enable lucky shinsal", () => {
    const options: AnnotateOptions = {
      includeLucky: true,
      includeLuckyDetails: true,
    };
    expect(options.includeLucky).toBe(true);
    expect(options.includeLuckyDetails).toBe(true);
  });

  it("can enable unlucky shinsal", () => {
    const options: AnnotateOptions = {
      includeUnlucky: true,
    };
    expect(options.includeUnlucky).toBe(true);
  });

  it("can change ruleSet", () => {
    const standardOptions: AnnotateOptions = { ruleSet: "standard" };
    const yourOptions: AnnotateOptions = { ruleSet: "your" };

    expect(standardOptions.ruleSet).toBe("standard");
    expect(yourOptions.ruleSet).toBe("your");
  });
});

describe("PillarBase interface", () => {
  it("has heavenlyStem with name and element", () => {
    const pillar: PillarBase = {
      heavenlyStem: { name: "甲", element: "목" },
      earthlyBranch: { name: "子", element: "수" },
    };

    expect(pillar.heavenlyStem.name).toBe("甲");
    expect(pillar.heavenlyStem.element).toBe("목");
  });

  it("can include yin_yang", () => {
    const pillar: PillarBase = {
      heavenlyStem: { name: "甲", element: "목", yin_yang: "양" },
      earthlyBranch: { name: "子", element: "수", yin_yang: "양" },
    };

    expect(pillar.heavenlyStem.yin_yang).toBe("양");
    expect(pillar.earthlyBranch.yin_yang).toBe("양");
  });
});

describe("SajuPillarsLike interface", () => {
  it("has all four pillars", () => {
    const pillars: SajuPillarsLike = {
      year: {
        heavenlyStem: { name: "甲", element: "목" },
        earthlyBranch: { name: "子", element: "수" },
      },
      month: {
        heavenlyStem: { name: "丙", element: "화" },
        earthlyBranch: { name: "寅", element: "목" },
      },
      day: {
        heavenlyStem: { name: "戊", element: "토" },
        earthlyBranch: { name: "辰", element: "토" },
      },
      time: {
        heavenlyStem: { name: "庚", element: "금" },
        earthlyBranch: { name: "午", element: "화" },
      },
    };

    expect(pillars.year).toBeDefined();
    expect(pillars.month).toBeDefined();
    expect(pillars.day).toBeDefined();
    expect(pillars.time).toBeDefined();
  });
});

describe("TwelveStage values", () => {
  const twelveStages: TwelveStage[] = [
    "장생", "목욕", "관대", "건록", "제왕", "쇠",
    "병", "사", "묘", "절", "태", "양",
  ];

  it("has exactly 12 stages", () => {
    expect(twelveStages).toHaveLength(12);
  });

  it("starts with 장생 (birth)", () => {
    expect(twelveStages[0]).toBe("장생");
  });

  it("includes 건록 (prosperity)", () => {
    expect(twelveStages).toContain("건록");
  });

  it("includes 제왕 (peak)", () => {
    expect(twelveStages).toContain("제왕");
  });

  it("includes 묘 (tomb)", () => {
    expect(twelveStages).toContain("묘");
  });
});

describe("PillarKind values", () => {
  it("includes all four pillar types", () => {
    const pillarKinds: PillarKind[] = ["year", "month", "day", "time"];
    expect(pillarKinds).toHaveLength(4);
  });

  it("year is a valid pillar kind", () => {
    const kind: PillarKind = "year";
    expect(kind).toBe("year");
  });

  it("month is a valid pillar kind", () => {
    const kind: PillarKind = "month";
    expect(kind).toBe("month");
  });

  it("day is a valid pillar kind", () => {
    const kind: PillarKind = "day";
    expect(kind).toBe("day");
  });

  it("time is a valid pillar kind", () => {
    const kind: PillarKind = "time";
    expect(kind).toBe("time");
  });
});
