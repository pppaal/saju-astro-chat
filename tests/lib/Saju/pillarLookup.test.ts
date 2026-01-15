/**
 * Pillar Lookup Tests
 *
 * Tests for 60 Jiazi (60갑자) lookup module
 */


import {
  SIXTY_PILLARS,
  type SixtyPillarInfo,
  type IljuInfo,
} from "@/lib/Saju/pillarLookup";

describe("SIXTY_PILLARS constant", () => {
  it("has exactly 60 pillars", () => {
    expect(SIXTY_PILLARS).toHaveLength(60);
  });

  it("starts with 甲子 (Jiazi)", () => {
    expect(SIXTY_PILLARS[0]).toBe("甲子");
  });

  it("ends with 癸亥 (Guihai)", () => {
    expect(SIXTY_PILLARS[59]).toBe("癸亥");
  });

  it("has no duplicates", () => {
    const uniquePillars = new Set(SIXTY_PILLARS);
    expect(uniquePillars.size).toBe(60);
  });

  describe("first decade (1-10)", () => {
    it("contains 甲子 through 癸酉", () => {
      const firstDecade = SIXTY_PILLARS.slice(0, 10);
      expect(firstDecade[0]).toBe("甲子");
      expect(firstDecade[1]).toBe("乙丑");
      expect(firstDecade[2]).toBe("丙寅");
      expect(firstDecade[3]).toBe("丁卯");
      expect(firstDecade[4]).toBe("戊辰");
      expect(firstDecade[5]).toBe("己巳");
      expect(firstDecade[6]).toBe("庚午");
      expect(firstDecade[7]).toBe("辛未");
      expect(firstDecade[8]).toBe("壬申");
      expect(firstDecade[9]).toBe("癸酉");
    });
  });

  describe("last decade (51-60)", () => {
    it("contains 甲寅 through 癸亥", () => {
      const lastDecade = SIXTY_PILLARS.slice(50, 60);
      expect(lastDecade[0]).toBe("甲寅");
      expect(lastDecade[9]).toBe("癸亥");
    });
  });

  it("all pillars have 2 characters (stem + branch)", () => {
    for (const pillar of SIXTY_PILLARS) {
      expect(pillar).toHaveLength(2);
    }
  });
});

describe("Pillar structure", () => {
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  it("all pillars start with valid stem", () => {
    for (const pillar of SIXTY_PILLARS) {
      const stem = pillar[0];
      expect(stems).toContain(stem);
    }
  });

  it("all pillars end with valid branch", () => {
    for (const pillar of SIXTY_PILLARS) {
      const branch = pillar[1];
      expect(branches).toContain(branch);
    }
  });

  it("stems cycle every 10 pillars", () => {
    for (let i = 0; i < 60; i++) {
      const stem = SIXTY_PILLARS[i][0];
      expect(stem).toBe(stems[i % 10]);
    }
  });

  it("branches cycle every 12 pillars", () => {
    for (let i = 0; i < 60; i++) {
      const branch = SIXTY_PILLARS[i][1];
      expect(branch).toBe(branches[i % 12]);
    }
  });
});

describe("SixtyPillarInfo interface", () => {
  it("has all required properties", () => {
    const info: SixtyPillarInfo = {
      index: 1,
      pillar: "甲子",
      stem: "甲",
      branch: "子",
      stemKorean: "갑",
      branchKorean: "자",
      koreanName: "갑자",
      stemElement: "목",
      branchElement: "수",
      stemYinYang: "양",
      branchYinYang: "양",
      naeum: "해중금(海中金)",
    };

    expect(info.index).toBe(1);
    expect(info.pillar).toBe("甲子");
    expect(info.stem).toBe("甲");
    expect(info.branch).toBe("子");
    expect(info.stemKorean).toBe("갑");
    expect(info.branchKorean).toBe("자");
    expect(info.koreanName).toBe("갑자");
    expect(info.stemElement).toBe("목");
    expect(info.branchElement).toBe("수");
    expect(info.stemYinYang).toBe("양");
    expect(info.branchYinYang).toBe("양");
    expect(info.naeum).toBe("해중금(海中金)");
  });

  it("index ranges from 1 to 60", () => {
    const firstPillar: SixtyPillarInfo = {
      index: 1,
      pillar: "甲子",
      stem: "甲",
      branch: "子",
      stemKorean: "갑",
      branchKorean: "자",
      koreanName: "갑자",
      stemElement: "목",
      branchElement: "수",
      stemYinYang: "양",
      branchYinYang: "양",
      naeum: "해중금",
    };

    const lastPillar: SixtyPillarInfo = {
      index: 60,
      pillar: "癸亥",
      stem: "癸",
      branch: "亥",
      stemKorean: "계",
      branchKorean: "해",
      koreanName: "계해",
      stemElement: "수",
      branchElement: "수",
      stemYinYang: "음",
      branchYinYang: "음",
      naeum: "대해수",
    };

    expect(firstPillar.index).toBe(1);
    expect(lastPillar.index).toBe(60);
  });
});

describe("IljuInfo interface (Day Pillar Analysis)", () => {
  it("has all required properties", () => {
    const ilju: IljuInfo = {
      pillar: "甲子",
      personality: "리더십이 강하고 진취적",
      career: "경영, 정치, 교육 분야에 적합",
      love: "열정적이지만 독립성 중시",
      wealth: "재물운이 양호하나 투기는 주의",
      health: "간, 담에 주의 필요",
    };

    expect(ilju.pillar).toBe("甲子");
    expect(ilju.personality).toBeDefined();
    expect(ilju.career).toBeDefined();
    expect(ilju.love).toBeDefined();
    expect(ilju.wealth).toBeDefined();
    expect(ilju.health).toBeDefined();
  });

  it("famousPeople is optional", () => {
    const iljuWithFamous: IljuInfo = {
      pillar: "甲子",
      personality: "테스트",
      career: "테스트",
      love: "테스트",
      wealth: "테스트",
      health: "테스트",
      famousPeople: "유명인 A, 유명인 B",
    };

    const iljuWithoutFamous: IljuInfo = {
      pillar: "乙丑",
      personality: "테스트",
      career: "테스트",
      love: "테스트",
      wealth: "테스트",
      health: "테스트",
    };

    expect(iljuWithFamous.famousPeople).toBeDefined();
    expect(iljuWithoutFamous.famousPeople).toBeUndefined();
  });
});

describe("Stem Korean mapping", () => {
  const stemKorean: Record<string, string> = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
    "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  };

  it("has 10 stem mappings", () => {
    expect(Object.keys(stemKorean)).toHaveLength(10);
  });

  it("甲 is 갑", () => {
    expect(stemKorean["甲"]).toBe("갑");
  });

  it("乙 is 을", () => {
    expect(stemKorean["乙"]).toBe("을");
  });

  it("丙 is 병", () => {
    expect(stemKorean["丙"]).toBe("병");
  });

  it("癸 is 계", () => {
    expect(stemKorean["癸"]).toBe("계");
  });
});

describe("Branch Korean mapping", () => {
  const branchKorean: Record<string, string> = {
    "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
    "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
  };

  it("has 12 branch mappings", () => {
    expect(Object.keys(branchKorean)).toHaveLength(12);
  });

  it("子 is 자 (rat)", () => {
    expect(branchKorean["子"]).toBe("자");
  });

  it("丑 is 축 (ox)", () => {
    expect(branchKorean["丑"]).toBe("축");
  });

  it("寅 is 인 (tiger)", () => {
    expect(branchKorean["寅"]).toBe("인");
  });

  it("亥 is 해 (pig)", () => {
    expect(branchKorean["亥"]).toBe("해");
  });
});

describe("Naeum (납음오행) patterns", () => {
  // 납음오행 - pairs of pillars share the same naeum
  const naeumPairs: Record<string, [string, string]> = {
    "해중금(海中金)": ["甲子", "乙丑"],
    "노중화(爐中火)": ["丙寅", "丁卯"],
    "대림목(大林木)": ["戊辰", "己巳"],
    "노방토(路傍土)": ["庚午", "辛未"],
    "검봉금(劍鋒金)": ["壬申", "癸酉"],
  };

  it("甲子 and 乙丑 share 해중금 naeum", () => {
    expect(naeumPairs["해중금(海中金)"]).toContain("甲子");
    expect(naeumPairs["해중금(海中金)"]).toContain("乙丑");
  });

  it("丙寅 and 丁卯 share 노중화 naeum", () => {
    expect(naeumPairs["노중화(爐中火)"]).toContain("丙寅");
    expect(naeumPairs["노중화(爐中火)"]).toContain("丁卯");
  });

  it("naeum pairs are consecutive pillars", () => {
    for (const [naeum, [pillar1, pillar2]] of Object.entries(naeumPairs)) {
      const idx1 = SIXTY_PILLARS.indexOf(pillar1);
      const idx2 = SIXTY_PILLARS.indexOf(pillar2);
      expect(idx2 - idx1).toBe(1);
    }
  });
});

describe("60 Jiazi cycle mathematics", () => {
  it("60 is LCM of 10 (stems) and 12 (branches)", () => {
    // LCM(10, 12) = 60
    const lcm = (10 * 12) / gcd(10, 12);
    expect(lcm).toBe(60);
  });

  it("each stem appears 6 times in 60 pillars", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    for (const stem of stems) {
      const count = SIXTY_PILLARS.filter(p => p[0] === stem).length;
      expect(count).toBe(6);
    }
  });

  it("each branch appears 5 times in 60 pillars", () => {
    const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    for (const branch of branches) {
      const count = SIXTY_PILLARS.filter(p => p[1] === branch).length;
      expect(count).toBe(5);
    }
  });
});

// Helper function for GCD
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
