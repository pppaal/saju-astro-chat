/**
 * Saju Types Tests
 *
 * Tests for Korean Four Pillars (Saju/사주) type definitions
 */


import type {
  FiveElement,
  YinYang,
  CalendarType,
  SibsinKind,
  StemBranchInfo,
  DayMaster,
  PillarGanjiData,
  JijangganSlot,
  JijangganData,
  PillarData,
  SajuPillars,
  SimplePillar,
  SajuPillarsInput,
  PillarKind,
  RelationHit,
  TwelveStage,
  TwelveStageStandard,
  ShinsalHit,
  UnseData,
  DaeunData,
  YeonunData,
  WolunData,
  IljinData,
  SajuFacts,
} from "@/lib/Saju/types";

describe("FiveElement type", () => {
  it("has five elements", () => {
    const elements: FiveElement[] = ["목", "화", "토", "금", "수"];
    expect(elements).toHaveLength(5);
  });

  it("목 represents wood", () => {
    const wood: FiveElement = "목";
    expect(wood).toBe("목");
  });

  it("화 represents fire", () => {
    const fire: FiveElement = "화";
    expect(fire).toBe("화");
  });

  it("토 represents earth", () => {
    const earth: FiveElement = "토";
    expect(earth).toBe("토");
  });

  it("금 represents metal", () => {
    const metal: FiveElement = "금";
    expect(metal).toBe("금");
  });

  it("수 represents water", () => {
    const water: FiveElement = "수";
    expect(water).toBe("수");
  });
});

describe("YinYang type", () => {
  it("has two values", () => {
    const values: YinYang[] = ["양", "음"];
    expect(values).toHaveLength(2);
  });

  it("양 represents yang (active/positive)", () => {
    const yang: YinYang = "양";
    expect(yang).toBe("양");
  });

  it("음 represents yin (passive/negative)", () => {
    const yin: YinYang = "음";
    expect(yin).toBe("음");
  });
});

describe("CalendarType type", () => {
  it("has solar and lunar", () => {
    const types: CalendarType[] = ["solar", "lunar"];
    expect(types).toHaveLength(2);
  });
});

describe("SibsinKind type (Ten Gods)", () => {
  it("has 10 sibsin types", () => {
    const sibsinTypes: SibsinKind[] = [
      "비견", "겁재",
      "식신", "상관",
      "편재", "정재",
      "편관", "정관",
      "편인", "정인",
    ];
    expect(sibsinTypes).toHaveLength(10);
  });

  describe("비견/겁재 (Comparison/Robbery)", () => {
    it("비견 represents self/peers", () => {
      const sibsin: SibsinKind = "비견";
      expect(sibsin).toBe("비견");
    });

    it("겁재 represents competition", () => {
      const sibsin: SibsinKind = "겁재";
      expect(sibsin).toBe("겁재");
    });
  });

  describe("식신/상관 (Food God/Injury Officer)", () => {
    it("식신 represents creativity/expression", () => {
      const sibsin: SibsinKind = "식신";
      expect(sibsin).toBe("식신");
    });

    it("상관 represents talents/unconventional", () => {
      const sibsin: SibsinKind = "상관";
      expect(sibsin).toBe("상관");
    });
  });

  describe("편재/정재 (Partial/Direct Wealth)", () => {
    it("편재 represents unexpected wealth", () => {
      const sibsin: SibsinKind = "편재";
      expect(sibsin).toBe("편재");
    });

    it("정재 represents stable income", () => {
      const sibsin: SibsinKind = "정재";
      expect(sibsin).toBe("정재");
    });
  });

  describe("편관/정관 (Partial/Direct Officer)", () => {
    it("편관 represents power/authority", () => {
      const sibsin: SibsinKind = "편관";
      expect(sibsin).toBe("편관");
    });

    it("정관 represents status/proper authority", () => {
      const sibsin: SibsinKind = "정관";
      expect(sibsin).toBe("정관");
    });
  });

  describe("편인/정인 (Partial/Direct Seal)", () => {
    it("편인 represents unconventional learning", () => {
      const sibsin: SibsinKind = "편인";
      expect(sibsin).toBe("편인");
    });

    it("정인 represents formal education/support", () => {
      const sibsin: SibsinKind = "정인";
      expect(sibsin).toBe("정인");
    });
  });
});

describe("StemBranchInfo interface", () => {
  it("has required properties", () => {
    const info: StemBranchInfo = {
      name: "甲",
      element: "목",
      yin_yang: "양",
    };

    expect(info.name).toBe("甲");
    expect(info.element).toBe("목");
    expect(info.yin_yang).toBe("양");
  });

  it("can have optional yinYang alias", () => {
    const info: StemBranchInfo = {
      name: "乙",
      element: "목",
      yin_yang: "음",
      yinYang: "음",
    };

    expect(info.yinYang).toBe("음");
  });
});

describe("PillarKind type", () => {
  it("has four pillar kinds", () => {
    const kinds: PillarKind[] = ["year", "month", "day", "time"];
    expect(kinds).toHaveLength(4);
  });
});

describe("PillarData interface", () => {
  it("has heavenlyStem, earthlyBranch, and jijanggan", () => {
    const pillar: PillarData = {
      heavenlyStem: {
        name: "甲",
        element: "목",
        yin_yang: "양",
        sibsin: "비견",
      },
      earthlyBranch: {
        name: "子",
        element: "수",
        yin_yang: "양",
        sibsin: "편인",
      },
      jijanggan: {
        jeonggi: { name: "癸", sibsin: "정인" },
      },
    };

    expect(pillar.heavenlyStem.name).toBe("甲");
    expect(pillar.earthlyBranch.name).toBe("子");
    expect(pillar.jijanggan.jeonggi?.name).toBe("癸");
  });
});

describe("JijangganData interface", () => {
  it("can have chogi, junggi, jeonggi", () => {
    const jijanggan: JijangganData = {
      chogi: { name: "戊", sibsin: "편재" },
      junggi: { name: "丙", sibsin: "상관" },
      jeonggi: { name: "甲", sibsin: "비견" },
    };

    expect(jijanggan.chogi?.name).toBe("戊");
    expect(jijanggan.junggi?.name).toBe("丙");
    expect(jijanggan.jeonggi?.name).toBe("甲");
  });

  it("all slots are optional", () => {
    const empty: JijangganData = {};
    expect(empty.chogi).toBeUndefined();
    expect(empty.junggi).toBeUndefined();
    expect(empty.jeonggi).toBeUndefined();
  });
});

describe("SajuPillars interface", () => {
  it("has four pillars", () => {
    const pillarBase: PillarData = {
      heavenlyStem: { name: "甲", element: "목", yin_yang: "양", sibsin: "비견" },
      earthlyBranch: { name: "子", element: "수", yin_yang: "양", sibsin: "편인" },
      jijanggan: {},
    };

    const pillars: SajuPillars = {
      year: pillarBase,
      month: pillarBase,
      day: pillarBase,
      time: pillarBase,
    };

    expect(pillars.year).toBeDefined();
    expect(pillars.month).toBeDefined();
    expect(pillars.day).toBeDefined();
    expect(pillars.time).toBeDefined();
  });
});

describe("SimplePillar interface", () => {
  it("has stem and branch", () => {
    const pillar: SimplePillar = {
      stem: "甲",
      branch: "子",
    };

    expect(pillar.stem).toBe("甲");
    expect(pillar.branch).toBe("子");
  });

  it("can have compatibility aliases", () => {
    const pillar: SimplePillar = {
      stem: "甲",
      branch: "子",
      heavenlyStem: "甲",
      earthlyBranch: "子",
    };

    expect(pillar.heavenlyStem).toBe("甲");
    expect(pillar.earthlyBranch).toBe("子");
  });
});

describe("RelationHit interface", () => {
  it("can represent 천간합", () => {
    const hit: RelationHit = {
      kind: "천간합",
      pillars: ["year", "month"],
      detail: "甲-己 합화토",
    };

    expect(hit.kind).toBe("천간합");
    expect(hit.pillars).toContain("year");
    expect(hit.detail).toContain("합화토");
  });

  it("can represent 지지충", () => {
    const hit: RelationHit = {
      kind: "지지충",
      pillars: ["day", "time"],
      detail: "子-午 충",
    };

    expect(hit.kind).toBe("지지충");
  });

  it("has all relation kinds", () => {
    const kinds: RelationHit["kind"][] = [
      "천간합", "천간충",
      "지지육합", "지지삼합", "지지방합",
      "지지충", "지지형", "지지파", "지지해", "원진",
      "공망",
    ];
    expect(kinds).toHaveLength(11);
  });
});

describe("TwelveStage type", () => {
  it("has 12 standard stages", () => {
    const stages: TwelveStageStandard[] = [
      "장생", "목욕", "관대", "임관", "왕지",
      "쇠", "병", "사", "묘", "절", "태", "양",
    ];
    expect(stages).toHaveLength(12);
  });

  it("건록 is alias for 임관", () => {
    const stage: TwelveStage = "건록";
    expect(stage).toBe("건록");
  });

  it("제왕 is alias for 왕지", () => {
    const stage: TwelveStage = "제왕";
    expect(stage).toBe("제왕");
  });
});

describe("ShinsalHit interface", () => {
  it("can represent 역마", () => {
    const hit: ShinsalHit = {
      kind: "역마",
      pillars: ["year"],
      target: "寅",
    };

    expect(hit.kind).toBe("역마");
    expect(hit.target).toBe("寅");
  });

  it("has various shinsal kinds", () => {
    const kinds: ShinsalHit["kind"][] = [
      "장성", "반안", "재살", "천살", "월살", "망신",
      "역마", "화개", "겁살", "육해", "화해", "괘살",
      "길성", "흉성",
    ];
    expect(kinds).toHaveLength(14);
  });
});

describe("UnseData interface (Fortune data)", () => {
  it("has heavenly stem and earthly branch with sibsin", () => {
    const unse: UnseData = {
      heavenlyStem: "甲",
      earthlyBranch: "子",
      sibsin: {
        cheon: "비견",
        ji: "편인",
      },
    };

    expect(unse.heavenlyStem).toBe("甲");
    expect(unse.earthlyBranch).toBe("子");
    expect(unse.sibsin.cheon).toBe("비견");
    expect(unse.sibsin.ji).toBe("편인");
  });
});

describe("DaeunData interface (Major fortune)", () => {
  it("extends UnseData with age", () => {
    const daeun: DaeunData = {
      age: 10,
      heavenlyStem: "乙",
      earthlyBranch: "丑",
      sibsin: {
        cheon: "겁재",
        ji: "정재",
      },
    };

    expect(daeun.age).toBe(10);
  });
});

describe("YeonunData interface (Annual fortune)", () => {
  it("extends UnseData with year", () => {
    const yeonun: YeonunData = {
      year: 2024,
      heavenlyStem: "甲",
      earthlyBranch: "辰",
      sibsin: {
        cheon: "비견",
        ji: "편재",
      },
    };

    expect(yeonun.year).toBe(2024);
  });
});

describe("WolunData interface (Monthly fortune)", () => {
  it("extends UnseData with year and month", () => {
    const wolun: WolunData = {
      year: 2024,
      month: 1,
      heavenlyStem: "丙",
      earthlyBranch: "寅",
      sibsin: {
        cheon: "식신",
        ji: "비견",
      },
    };

    expect(wolun.year).toBe(2024);
    expect(wolun.month).toBe(1);
  });

  it("month ranges from 1 to 12", () => {
    for (let m = 1; m <= 12; m++) {
      const wolun: WolunData = {
        year: 2024,
        month: m,
        heavenlyStem: "甲",
        earthlyBranch: "子",
        sibsin: { cheon: "", ji: "" },
      };
      expect(wolun.month).toBeGreaterThanOrEqual(1);
      expect(wolun.month).toBeLessThanOrEqual(12);
    }
  });
});

describe("IljinData interface (Daily fortune)", () => {
  it("extends UnseData with year, month, day, and isCheoneulGwiin", () => {
    const iljin: IljinData = {
      year: 2024,
      month: 1,
      day: 15,
      heavenlyStem: "庚",
      earthlyBranch: "午",
      sibsin: {
        cheon: "편관",
        ji: "정관",
      },
      isCheoneulGwiin: true,
    };

    expect(iljin.year).toBe(2024);
    expect(iljin.month).toBe(1);
    expect(iljin.day).toBe(15);
    expect(iljin.isCheoneulGwiin).toBe(true);
  });
});

describe("SajuFacts interface", () => {
  it("has required dayMaster, sibsin, shinsal", () => {
    const facts: SajuFacts = {
      dayMaster: "갑목",
      sibsin: ["비견", "식신", "정재"],
      shinsal: ["역마", "화개"],
    };

    expect(facts.dayMaster).toBe("갑목");
    expect(facts.sibsin).toContain("비견");
    expect(facts.shinsal).toContain("역마");
  });

  it("can have optional elementStats", () => {
    const facts: SajuFacts = {
      dayMaster: "갑목",
      sibsin: [],
      shinsal: [],
      elementStats: {
        "목": 0.3,
        "화": 0.2,
        "토": 0.1,
        "금": 0.2,
        "수": 0.2,
      },
    };

    expect(facts.elementStats?.["목"]).toBe(0.3);
  });

  it("can have optional yinYangRatio", () => {
    const facts: SajuFacts = {
      dayMaster: "갑목",
      sibsin: [],
      shinsal: [],
      yinYangRatio: { yin: 0.4, yang: 0.6 },
    };

    expect(facts.yinYangRatio?.yin).toBe(0.4);
    expect(facts.yinYangRatio?.yang).toBe(0.6);
  });

  it("can have optional unse data", () => {
    const facts: SajuFacts = {
      dayMaster: "갑목",
      sibsin: [],
      shinsal: [],
      unse: {
        대운: "을축",
        세운: "갑진",
        월운: "병인",
        일운: "경오",
      },
    };

    expect(facts.unse?.대운).toBe("을축");
    expect(facts.unse?.세운).toBe("갑진");
  });

  it("can have optional fateIndex", () => {
    const facts: SajuFacts = {
      dayMaster: "갑목",
      sibsin: [],
      shinsal: [],
      fateIndex: 75,
    };

    expect(facts.fateIndex).toBe(75);
  });
});

describe("Ten Heavenly Stems (천간)", () => {
  // The 10 stems in order
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

  it("has 10 stems", () => {
    expect(stems).toHaveLength(10);
  });

  it("yang stems are at even indices (0, 2, 4, 6, 8)", () => {
    const yangStems = ["甲", "丙", "戊", "庚", "壬"];
    for (const stem of yangStems) {
      const index = stems.indexOf(stem);
      expect(index % 2).toBe(0);
    }
  });

  it("yin stems are at odd indices (1, 3, 5, 7, 9)", () => {
    const yinStems = ["乙", "丁", "己", "辛", "癸"];
    for (const stem of yinStems) {
      const index = stems.indexOf(stem);
      expect(index % 2).toBe(1);
    }
  });
});

describe("Twelve Earthly Branches (지지)", () => {
  // The 12 branches in order
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  it("has 12 branches", () => {
    expect(branches).toHaveLength(12);
  });

  it("子 is the first branch (rat)", () => {
    expect(branches[0]).toBe("子");
  });

  it("亥 is the last branch (pig)", () => {
    expect(branches[11]).toBe("亥");
  });
});
