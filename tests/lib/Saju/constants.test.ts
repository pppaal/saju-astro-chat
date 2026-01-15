import {
  STEMS,
  BRANCHES,
  STEM_NAMES,
  BRANCH_NAMES,
  JIJANGGAN,
  MONTH_STEM_LOOKUP,
  TIME_STEM_LOOKUP,
  FIVE_ELEMENT_RELATIONS,
  CHEONEUL_GWIIN_MAP,
  YUKHAP,
  CHUNG,
  SAMHAP,
  XING,
  HAI,
  PA,
} from "@/lib/Saju/constants";

describe("Saju Constants", () => {
  describe("STEMS (천간)", () => {
    it("has exactly 10 stems", () => {
      expect(STEMS).toHaveLength(10);
    });

    it("has unique stem names", () => {
      const names = STEMS.map(s => s.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);
    });

    it("has all required properties for each stem", () => {
      STEMS.forEach(stem => {
        expect(stem).toHaveProperty("name");
        expect(stem).toHaveProperty("element");
        expect(stem).toHaveProperty("yin_yang");
        expect(["목", "화", "토", "금", "수"]).toContain(stem.element);
        expect(["양", "음"]).toContain(stem.yin_yang);
      });
    });

    it("alternates between yang and yin", () => {
      for (let i = 0; i < STEMS.length; i++) {
        const expectedYinYang = i % 2 === 0 ? "양" : "음";
        expect(STEMS[i].yin_yang).toBe(expectedYinYang);
      }
    });

    it("follows 5 element cycle (2 stems per element)", () => {
      const elementOrder = ["목", "화", "토", "금", "수"];
      for (let i = 0; i < STEMS.length; i++) {
        const expectedElement = elementOrder[Math.floor(i / 2)];
        expect(STEMS[i].element).toBe(expectedElement);
      }
    });
  });

  describe("BRANCHES (지지)", () => {
    it("has exactly 12 branches", () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it("has unique branch names", () => {
      const names = BRANCHES.map(b => b.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(12);
    });

    it("has all required properties for each branch", () => {
      BRANCHES.forEach(branch => {
        expect(branch).toHaveProperty("name");
        expect(branch).toHaveProperty("element");
        expect(branch).toHaveProperty("yin_yang");
        expect(["목", "화", "토", "금", "수"]).toContain(branch.element);
        expect(["양", "음"]).toContain(branch.yin_yang);
      });
    });
  });

  describe("STEM_NAMES and BRANCH_NAMES", () => {
    it("STEM_NAMES matches STEMS array", () => {
      expect(STEM_NAMES).toHaveLength(10);
      STEM_NAMES.forEach((name, i) => {
        expect(name).toBe(STEMS[i].name);
      });
    });

    it("BRANCH_NAMES matches BRANCHES array", () => {
      expect(BRANCH_NAMES).toHaveLength(12);
      BRANCH_NAMES.forEach((name, i) => {
        expect(name).toBe(BRANCHES[i].name);
      });
    });
  });

  describe("JIJANGGAN (지장간)", () => {
    it("maps all 12 branches", () => {
      expect(Object.keys(JIJANGGAN)).toHaveLength(12);
    });

    it("has 정기 for all branches", () => {
      BRANCH_NAMES.forEach(branch => {
        expect(JIJANGGAN[branch]).toHaveProperty("정기");
      });
    });

    it("has correct number of entries per branch type", () => {
      // 子, 卯, 酉: 정기만 (1개)
      const singleOnly = ["子", "卯", "酉"];
      singleOnly.forEach(branch => {
        expect(Object.keys(JIJANGGAN[branch])).toHaveLength(1);
      });

      // 午, 亥: 여기 + 정기 (2개)
      const doubleOnly = ["午", "亥"];
      doubleOnly.forEach(branch => {
        expect(Object.keys(JIJANGGAN[branch])).toHaveLength(2);
      });

      // 나머지: 여기 + 중기 + 정기 (3개)
      const tripleOnly = ["丑", "寅", "辰", "巳", "未", "申", "戌"];
      tripleOnly.forEach(branch => {
        expect(Object.keys(JIJANGGAN[branch])).toHaveLength(3);
      });
    });

    it("contains only valid stem names", () => {
      Object.values(JIJANGGAN).forEach(jjg => {
        Object.values(jjg).forEach(stem => {
          expect(STEM_NAMES).toContain(stem);
        });
      });
    });
  });

  describe("MONTH_STEM_LOOKUP", () => {
    it("maps all 10 stems", () => {
      expect(Object.keys(MONTH_STEM_LOOKUP)).toHaveLength(10);
    });

    it("maps to valid stems", () => {
      Object.values(MONTH_STEM_LOOKUP).forEach(stem => {
        expect(STEM_NAMES).toContain(stem);
      });
    });
  });

  describe("TIME_STEM_LOOKUP", () => {
    it("maps all 10 stems", () => {
      expect(Object.keys(TIME_STEM_LOOKUP)).toHaveLength(10);
    });

    it("maps to valid stems", () => {
      Object.values(TIME_STEM_LOOKUP).forEach(stem => {
        expect(STEM_NAMES).toContain(stem);
      });
    });
  });

  describe("FIVE_ELEMENT_RELATIONS", () => {
    const elements = ["목", "화", "토", "금", "수"] as const;

    it("has all four relation types", () => {
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty("생하는관계");
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty("생받는관계");
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty("극하는관계");
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty("극받는관계");
    });

    it("maps all 5 elements for each relation", () => {
      Object.values(FIVE_ELEMENT_RELATIONS).forEach(relation => {
        expect(Object.keys(relation)).toHaveLength(5);
        elements.forEach(el => {
          expect(elements).toContain(relation[el]);
        });
      });
    });

    it("has correct 생 (generation) cycle: 목→화→토→금→수→목", () => {
      const gen = FIVE_ELEMENT_RELATIONS.생하는관계;
      expect(gen["목"]).toBe("화"); // Wood generates Fire
      expect(gen["화"]).toBe("토"); // Fire generates Earth
      expect(gen["토"]).toBe("금"); // Earth generates Metal
      expect(gen["금"]).toBe("수"); // Metal generates Water
      expect(gen["수"]).toBe("목"); // Water generates Wood
    });

    it("has correct 극 (overcoming) cycle: 목→토→수→화→금→목", () => {
      const over = FIVE_ELEMENT_RELATIONS.극하는관계;
      expect(over["목"]).toBe("토"); // Wood overcomes Earth
      expect(over["토"]).toBe("수"); // Earth overcomes Water
      expect(over["수"]).toBe("화"); // Water overcomes Fire
      expect(over["화"]).toBe("금"); // Fire overcomes Metal
      expect(over["금"]).toBe("목"); // Metal overcomes Wood
    });
  });

  describe("CHEONEUL_GWIIN_MAP (천을귀인)", () => {
    it("maps all 10 stems", () => {
      expect(Object.keys(CHEONEUL_GWIIN_MAP)).toHaveLength(10);
    });

    it("maps to arrays of valid branches", () => {
      Object.values(CHEONEUL_GWIIN_MAP).forEach(branches => {
        expect(Array.isArray(branches)).toBe(true);
        branches.forEach(branch => {
          expect(BRANCH_NAMES).toContain(branch);
        });
      });
    });
  });

  describe("YUKHAP (육합)", () => {
    it("maps all 12 branches", () => {
      expect(Object.keys(YUKHAP)).toHaveLength(12);
    });

    it("is bidirectional (symmetric)", () => {
      Object.entries(YUKHAP).forEach(([branch, partner]) => {
        expect(YUKHAP[partner]).toBe(branch);
      });
    });

    it("contains only valid branches", () => {
      Object.entries(YUKHAP).forEach(([branch, partner]) => {
        expect(BRANCH_NAMES).toContain(branch);
        expect(BRANCH_NAMES).toContain(partner);
      });
    });
  });

  describe("CHUNG (충)", () => {
    it("maps all 12 branches", () => {
      expect(Object.keys(CHUNG)).toHaveLength(12);
    });

    it("is bidirectional (symmetric)", () => {
      Object.entries(CHUNG).forEach(([branch, partner]) => {
        expect(CHUNG[partner]).toBe(branch);
      });
    });

    it("pairs branches that are 6 positions apart", () => {
      // In the 12 branches, 충 pairs are opposite (index difference = 6)
      const chungPairs = [
        ["子", "午"],
        ["丑", "未"],
        ["寅", "申"],
        ["卯", "酉"],
        ["辰", "戌"],
        ["巳", "亥"],
      ];

      chungPairs.forEach(([a, b]) => {
        expect(CHUNG[a]).toBe(b);
        expect(CHUNG[b]).toBe(a);
      });
    });
  });

  describe("SAMHAP (삼합)", () => {
    it("has 4 three-way combinations", () => {
      expect(Object.keys(SAMHAP)).toHaveLength(4);
    });

    it("maps to elements", () => {
      const elements = ["수", "목", "화", "금"];
      Object.keys(SAMHAP).forEach(element => {
        expect(elements).toContain(element);
      });
    });

    it("each combination has 3 branches", () => {
      Object.values(SAMHAP).forEach(branches => {
        expect(branches).toHaveLength(3);
      });
    });

    it("uses valid branch names", () => {
      Object.values(SAMHAP).forEach(branches => {
        branches.forEach(branch => {
          expect(BRANCH_NAMES).toContain(branch);
        });
      });
    });
  });

  describe("XING (형)", () => {
    it("includes key branch interactions", () => {
      // 무은지형: 寅巳申 interact with each other
      expect(XING["寅"]).toContain("巳");
      expect(XING["寅"]).toContain("申");

      // 자형: self-punishment branches
      expect(XING["辰"]).toContain("辰");
      expect(XING["午"]).toContain("午");
      expect(XING["酉"]).toContain("酉");
      expect(XING["亥"]).toContain("亥");

      // 무례지형: 子卯
      expect(XING["子"]).toContain("卯");
      expect(XING["卯"]).toContain("子");
    });

    it("uses valid branch names", () => {
      Object.entries(XING).forEach(([branch, targets]) => {
        expect(BRANCH_NAMES).toContain(branch);
        targets.forEach(target => {
          expect(BRANCH_NAMES).toContain(target);
        });
      });
    });
  });

  describe("HAI (해)", () => {
    it("has 12 branch mappings (6 pairs, bidirectional)", () => {
      expect(Object.keys(HAI)).toHaveLength(12);
    });

    it("is bidirectional", () => {
      Object.entries(HAI).forEach(([branch, partner]) => {
        expect(HAI[partner]).toBe(branch);
      });
    });
  });

  describe("PA (파)", () => {
    it("has 12 branch mappings (6 pairs, bidirectional)", () => {
      expect(Object.keys(PA)).toHaveLength(12);
    });

    it("is bidirectional", () => {
      Object.entries(PA).forEach(([branch, partner]) => {
        expect(PA[partner]).toBe(branch);
      });
    });
  });
});
