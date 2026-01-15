
import {
  analyzeInversionRelations,
  analyzeNuclearHexagram,
  analyzeSequencePosition,
  getXuguaPair,
  classifyByPalace,
  classifyByElement,
  getMonthlyHexagrams,
  getCurrentSeasonalHexagram,
  findOppositePairs,
  findHexagramsByPattern,
  getSpecialPatternHexagrams,
  analyzeHexagramRelationship,
  generateHexagramNetwork,
} from "@/lib/iChing/ichingPatterns";

describe("ichingPatterns", () => {
  describe("analyzeInversionRelations", () => {
    it("returns 착괘 and 종괘 for hexagram 1 (건)", () => {
      const result = analyzeInversionRelations(1);

      expect(result.착괘).toBeDefined();
      expect(result.종괘).toBeDefined();
      expect(result.설명).toContain("착괘");
      expect(result.설명).toContain("종괘");
    });

    it("착괘 of 건(111111) is 곤(000000)", () => {
      const result = analyzeInversionRelations(1);
      expect(result.착괘.number).toBe(2); // 곤
    });

    it("종괘 of 건(111111) is itself (symmetric)", () => {
      const result = analyzeInversionRelations(1);
      expect(result.종괘.number).toBe(1); // 건 reversed is still 건
    });

    it("handles asymmetric hexagrams", () => {
      const result = analyzeInversionRelations(3); // 둔
      expect(result.착괘.number).toBeGreaterThan(0);
      expect(result.종괘.number).toBeGreaterThan(0);
    });
  });

  describe("analyzeNuclearHexagram", () => {
    it("returns 호괘 with binary and meaning", () => {
      const result = analyzeNuclearHexagram(1);

      expect(result.호괘).toBeDefined();
      expect(result.호괘.number).toBeGreaterThan(0);
      expect(result.호괘.binary).toHaveLength(6);
      expect(result.내적의미).toContain("호괘");
    });

    it("calculates nuclear hexagram from inner lines", () => {
      const result = analyzeNuclearHexagram(11); // 태 (000111)
      // Nuclear: lines 2-4 for lower, 3-5 for upper
      expect(result.호괘.binary).toHaveLength(6);
    });
  });

  describe("analyzeSequencePosition", () => {
    it("returns sequence analysis for hexagram", () => {
      const result = analyzeSequencePosition(11);

      expect(result.position).toBe(11);
      expect(result.hexagram.number).toBe(11);
      expect(result.前괘).toBeDefined();
      expect(result.後괘).toBeDefined();
      expect(result.lifecycleStage).toBeDefined();
    });

    it("returns correct lifecycle stages", () => {
      expect(analyzeSequencePosition(5).lifecycleStage).toBe("시작과 기초");
      expect(analyzeSequencePosition(15).lifecycleStage).toBe("성장과 발전");
      expect(analyzeSequencePosition(25).lifecycleStage).toBe("완성과 전환");
      expect(analyzeSequencePosition(35).lifecycleStage).toBe("관계와 조화");
      expect(analyzeSequencePosition(45).lifecycleStage).toBe("변혁과 정립");
      expect(analyzeSequencePosition(55).lifecycleStage).toBe("성숙과 안정");
      expect(analyzeSequencePosition(63).lifecycleStage).toBe("완성과 새 시작");
    });

    it("handles edge cases (1 and 64)", () => {
      const first = analyzeSequencePosition(1);
      expect(first.前괘?.number).toBe(64); // wraps around

      const last = analyzeSequencePosition(64);
      expect(last.後괘?.number).toBe(1); // wraps around
    });
  });

  describe("getXuguaPair", () => {
    it("returns pair for hexagram in xugua order", () => {
      const result = getXuguaPair(1);

      expect(result).not.toBeNull();
      expect(result?.hex1.number).toBe(1);
      expect(result?.hex2.number).toBe(2);
      expect(result?.relationship).toBe("선후");
    });

    it("returns pair when querying second hexagram of pair", () => {
      const result = getXuguaPair(2);

      expect(result).not.toBeNull();
      expect(result?.hex1.number).toBe(1);
      expect(result?.hex2.number).toBe(2);
    });

    it("includes meaning in result", () => {
      const result = getXuguaPair(11);

      expect(result?.meaning).toBeDefined();
      expect(result?.meaning.length).toBeGreaterThan(0);
    });
  });

  describe("classifyByPalace", () => {
    it("classifies hexagram 1 as 건궁 본궁", () => {
      const result = classifyByPalace(1);

      expect(result.palace).toBe("건궁");
      expect(result.position).toBe(1);
      expect(result.meaning).toContain("본궁");
    });

    it("classifies hexagram 2 as 곤궁 본궁", () => {
      const result = classifyByPalace(2);

      expect(result.palace).toBe("곤궁");
      expect(result.position).toBe(1);
    });

    it("returns valid palace for all hexagrams 1-64", () => {
      for (let i = 1; i <= 64; i++) {
        const result = classifyByPalace(i);
        expect(result.palace).not.toBe("미상");
        expect(result.position).toBeGreaterThan(0);
      }
    });
  });

  describe("classifyByElement", () => {
    it("returns 5 elemental groups", () => {
      const groups = classifyByElement();

      expect(groups).toHaveLength(5);
      expect(groups.map(g => g.element)).toEqual(["목", "화", "토", "금", "수"]);
    });

    it("each group has hexagrams with roles", () => {
      const groups = classifyByElement();

      groups.forEach(group => {
        expect(group.hexagrams.length).toBeGreaterThan(0);
        group.hexagrams.forEach(hex => {
          expect(hex.number).toBeGreaterThan(0);
          expect(hex.name).toBeDefined();
          expect(hex.role).toBeDefined();
        });
      });
    });

    it("each group has characteristic", () => {
      const groups = classifyByElement();

      groups.forEach(group => {
        expect(group.groupCharacteristic.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getMonthlyHexagrams", () => {
    it("returns 12 monthly hexagrams", () => {
      const monthly = getMonthlyHexagrams();

      expect(monthly).toHaveLength(12);
    });

    it("covers all 4 seasons", () => {
      const monthly = getMonthlyHexagrams();
      const seasons = new Set(monthly.map(m => m.season));

      expect(seasons.has("춘")).toBe(true);
      expect(seasons.has("하")).toBe(true);
      expect(seasons.has("추")).toBe(true);
      expect(seasons.has("동")).toBe(true);
    });

    it("each month has hexagram with energy and advice", () => {
      const monthly = getMonthlyHexagrams();

      monthly.forEach(m => {
        expect(m.hexagram.number).toBeGreaterThan(0);
        expect(m.hexagram.binary).toHaveLength(6);
        expect(m.energy.length).toBeGreaterThan(0);
        expect(m.advice.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getCurrentSeasonalHexagram", () => {
    it("returns a seasonal hexagram for current date", () => {
      const result = getCurrentSeasonalHexagram();

      expect(result.season).toBeDefined();
      expect(result.hexagram).toBeDefined();
      expect(result.energy).toBeDefined();
    });

    it("returns different hexagrams for different months", () => {
      const jan = getCurrentSeasonalHexagram(new Date(2024, 0, 15));
      const jul = getCurrentSeasonalHexagram(new Date(2024, 6, 15));

      // Different months should generally have different hexagrams
      expect(jan.month !== jul.month || jan.hexagram.number !== jul.hexagram.number).toBe(true);
    });
  });

  describe("findOppositePairs", () => {
    it("returns complementary, conflicting, and transforming pairs", () => {
      const result = findOppositePairs();

      expect(result.complementary).toBeInstanceOf(Array);
      expect(result.conflicting).toBeInstanceOf(Array);
      expect(result.transforming).toBeInstanceOf(Array);
    });

    it("complementary pairs have 상반 relationship", () => {
      const result = findOppositePairs();

      result.complementary.forEach(pair => {
        expect(pair.relationship).toBe("상반");
      });
    });

    it("includes the fundamental 건-곤 pair", () => {
      const result = findOppositePairs();

      const hasQianKun = result.complementary.some(
        pair => (pair.hex1.number === 1 && pair.hex2.number === 2) ||
                (pair.hex1.number === 2 && pair.hex2.number === 1)
      );
      expect(hasQianKun).toBe(true);
    });
  });

  describe("findHexagramsByPattern", () => {
    it("finds hexagram 1 for pattern 111111", () => {
      const result = findHexagramsByPattern("111111");

      expect(result.matchedHexagrams).toContain(1);
      expect(result.rarity).toBe("very_rare");
    });

    it("finds hexagram 2 for pattern 000000", () => {
      const result = findHexagramsByPattern("000000");

      expect(result.matchedHexagrams).toContain(2);
    });

    it("supports wildcard ? in pattern", () => {
      const result = findHexagramsByPattern("1????1");

      expect(result.matchedHexagrams.length).toBeGreaterThan(0);
    });

    it("returns significance based on yin/yang balance", () => {
      const yang = findHexagramsByPattern("111111");
      const yin = findHexagramsByPattern("000000");

      expect(yang.significance).toContain("순양");
      expect(yin.significance).toContain("순음");
    });
  });

  describe("getSpecialPatternHexagrams", () => {
    it("returns special patterns including 순양 and 순음", () => {
      const patterns = getSpecialPatternHexagrams();

      expect(patterns["순양"]).toBeDefined();
      expect(patterns["순음"]).toBeDefined();
      expect(patterns["순양"].matchedHexagrams).toContain(1);
      expect(patterns["순음"].matchedHexagrams).toContain(2);
    });

    it("includes 기제 and 미제 patterns", () => {
      const patterns = getSpecialPatternHexagrams();

      expect(patterns["교제"]).toBeDefined();
      expect(patterns["미제"]).toBeDefined();
    });
  });

  describe("analyzeHexagramRelationship", () => {
    it("returns relationship analysis between two hexagrams", () => {
      const result = analyzeHexagramRelationship(1, 2);

      expect(result.relationship).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(100);
      expect(["excellent", "good", "neutral", "challenging"]).toContain(result.compatibility);
    });

    it("identifies same hexagram as 동일괘", () => {
      const result = analyzeHexagramRelationship(1, 1);

      expect(result.relationship).toBe("동일괘");
      expect(result.compatibility).toBe("excellent");
      expect(result.similarity).toBe(100);
    });

    it("identifies 건 and 곤 as 상반괘", () => {
      const result = analyzeHexagramRelationship(1, 2);

      expect(result.relationship).toBe("상반괘 (음양 반전)");
      expect(result.compatibility).toBe("challenging");
    });

    it("includes advice in result", () => {
      const result = analyzeHexagramRelationship(11, 12);

      expect(result.advice).toBeDefined();
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });

  describe("generateHexagramNetwork", () => {
    it("generates 64 nodes", () => {
      const network = generateHexagramNetwork();

      expect(network.nodes).toHaveLength(64);
    });

    it("each node has id, name, and group", () => {
      const network = generateHexagramNetwork();

      network.nodes.forEach(node => {
        expect(node.id).toBeGreaterThan(0);
        expect(node.id).toBeLessThanOrEqual(64);
        expect(node.name).toBeDefined();
        expect(node.group).toBeDefined();
      });
    });

    it("generates sequence and opposite edges", () => {
      const network = generateHexagramNetwork();

      const sequenceEdges = network.edges.filter(e => e.type === "sequence");
      const oppositeEdges = network.edges.filter(e => e.type === "opposite");

      expect(sequenceEdges.length).toBe(63); // 1->2, 2->3, ..., 63->64
      expect(oppositeEdges.length).toBeGreaterThan(0);
    });
  });
});
