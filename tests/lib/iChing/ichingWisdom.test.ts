
import {
  HEXAGRAM_WISDOM,
  YAO_POSITION_MEANINGS,
  getHexagramWisdom,
  generateSituationalAdvice,
  generateWisdomPrompt,
  interpretChangingLines,
  generateDailyWisdom,
  analyzeHexagramRelationshipWisdom,
  generatePeriodicWisdom,
  deepWisdomAnalysis,
  type HexagramWisdomData,
  type WisdomPromptContext,
} from "@/lib/iChing/ichingWisdom";

describe("ichingWisdom", () => {
  describe("HEXAGRAM_WISDOM", () => {
    it("contains data for key hexagrams", () => {
      expect(HEXAGRAM_WISDOM[1]).toBeDefined(); // 건
      expect(HEXAGRAM_WISDOM[2]).toBeDefined(); // 곤
      expect(HEXAGRAM_WISDOM[11]).toBeDefined(); // 태
      expect(HEXAGRAM_WISDOM[12]).toBeDefined(); // 비
      expect(HEXAGRAM_WISDOM[63]).toBeDefined(); // 기제
      expect(HEXAGRAM_WISDOM[64]).toBeDefined(); // 미제
    });

    it("hexagram 1 (건) has complete wisdom data", () => {
      const qian = HEXAGRAM_WISDOM[1];

      expect(qian.name).toBe("건");
      expect(qian.chinese).toBe("乾");
      expect(qian.keyword).toBe("창조");
      expect(qian.gwaeSa).toContain("元亨利貞");
      expect(qian.coreWisdom).toBeDefined();
      expect(qian.situationAdvice.career).toBeDefined();
      expect(qian.yaoWisdom).toHaveLength(6);
      expect(qian.warnings.length).toBeGreaterThan(0);
      expect(qian.opportunities.length).toBeGreaterThan(0);
    });

    it("yao wisdom has position, text, and meaning", () => {
      const qian = HEXAGRAM_WISDOM[1];

      qian.yaoWisdom.forEach(yao => {
        expect(yao.position).toBeGreaterThanOrEqual(1);
        expect(yao.position).toBeLessThanOrEqual(6);
        expect(yao.text).toBeDefined();
        expect(yao.meaning).toBeDefined();
      });
    });
  });

  describe("YAO_POSITION_MEANINGS", () => {
    it("has meanings for all 6 positions", () => {
      for (let i = 1; i <= 6; i++) {
        expect(YAO_POSITION_MEANINGS[i]).toBeDefined();
        expect(YAO_POSITION_MEANINGS[i].general).toBeDefined();
        expect(YAO_POSITION_MEANINGS[i].timing).toBeDefined();
      }
    });

    it("position 1 represents beginning", () => {
      expect(YAO_POSITION_MEANINGS[1].general).toContain("시작");
    });

    it("position 5 represents peak/achievement", () => {
      expect(YAO_POSITION_MEANINGS[5].general).toContain("최고");
    });

    it("position 6 represents ending", () => {
      expect(YAO_POSITION_MEANINGS[6].general).toContain("끝");
    });
  });

  describe("getHexagramWisdom", () => {
    it("returns wisdom for valid hexagram number", () => {
      const wisdom = getHexagramWisdom(1);

      expect(wisdom).not.toBeNull();
      expect(wisdom?.name).toBe("건");
    });

    it("returns null for invalid hexagram numbers", () => {
      expect(getHexagramWisdom(0)).toBeNull();
      expect(getHexagramWisdom(65)).toBeNull();
      expect(getHexagramWisdom(-1)).toBeNull();
    });

    it("returns default wisdom for hexagrams without detailed data", () => {
      // Assuming not all 64 hexagrams have detailed data
      const wisdom = getHexagramWisdom(30);

      expect(wisdom).not.toBeNull();
      expect(wisdom?.situationAdvice).toBeDefined();
    });
  });

  describe("generateSituationalAdvice", () => {
    it("returns career advice for hexagram 1", () => {
      const advice = generateSituationalAdvice(1, "career");

      expect(advice).toBeDefined();
      expect(advice.length).toBeGreaterThan(0);
    });

    it("returns advice for all situation types", () => {
      const situations = ["career", "relationship", "health", "wealth", "spiritual"] as const;

      situations.forEach(situation => {
        const advice = generateSituationalAdvice(1, situation);
        expect(advice.length).toBeGreaterThan(0);
      });
    });

    it("includes changing line interpretation when provided", () => {
      const advice = generateSituationalAdvice(1, "career", [3, 5]);

      expect(advice).toContain("변효");
    });

    it("handles invalid hexagram gracefully", () => {
      const advice = generateSituationalAdvice(0, "career");

      expect(advice).toBeDefined();
    });
  });

  describe("generateWisdomPrompt", () => {
    it("generates prompt with basic context", () => {
      const context: WisdomPromptContext = {
        hexagramNumber: 1,
      };

      const prompt = generateWisdomPrompt(context);

      expect(prompt).toContain("건");
      expect(prompt).toContain("乾");
      expect(prompt).toContain("괘사");
    });

    it("includes changing lines when provided", () => {
      const context: WisdomPromptContext = {
        hexagramNumber: 1,
        changingLines: [3, 5],
      };

      const prompt = generateWisdomPrompt(context);

      expect(prompt).toContain("변효");
      expect(prompt).toContain("3");
      expect(prompt).toContain("5");
    });

    it("includes target hexagram when provided", () => {
      const context: WisdomPromptContext = {
        hexagramNumber: 1,
        targetHexagram: 2,
      };

      const prompt = generateWisdomPrompt(context);

      expect(prompt).toContain("지괘");
      expect(prompt).toContain("곤");
    });

    it("includes user question when provided", () => {
      const context: WisdomPromptContext = {
        hexagramNumber: 1,
        userQuestion: "사업을 시작해도 될까요?",
      };

      const prompt = generateWisdomPrompt(context);

      expect(prompt).toContain("사업을 시작해도 될까요?");
    });

    it("includes consultation type specific advice", () => {
      const context: WisdomPromptContext = {
        hexagramNumber: 1,
        consultationType: "career",
      };

      const prompt = generateWisdomPrompt(context);

      expect(prompt).toContain("career");
    });
  });

  describe("interpretChangingLines", () => {
    it("interprets no changing lines (불변괘)", () => {
      const interpretation = interpretChangingLines(1, 1, []);

      expect(interpretation).toContain("불변괘");
      expect(interpretation).toContain("괘사");
    });

    it("interprets single changing line", () => {
      const interpretation = interpretChangingLines(1, 2, [1]);

      expect(interpretation).toContain("단변");
      expect(interpretation).toContain("1효");
    });

    it("interprets two changing lines (focuses on upper line)", () => {
      const interpretation = interpretChangingLines(1, 2, [2, 5]);

      expect(interpretation).toContain("이변");
      expect(interpretation).toContain("5효"); // Upper line
    });

    it("interprets three changing lines (focuses on 본괘 괘사)", () => {
      const interpretation = interpretChangingLines(1, 2, [1, 3, 5]);

      expect(interpretation).toContain("삼변");
      expect(interpretation).toContain("본괘");
    });

    it("interprets four changing lines (focuses on lower unchanged line of 지괘)", () => {
      const interpretation = interpretChangingLines(1, 2, [1, 2, 3, 4]);

      expect(interpretation).toContain("사변");
      expect(interpretation).toContain("불변");
    });

    it("interprets five changing lines", () => {
      const interpretation = interpretChangingLines(1, 2, [1, 2, 3, 4, 5]);

      expect(interpretation).toContain("오변");
      expect(interpretation).toContain("불변효");
    });

    it("interprets all six changing lines (전효변)", () => {
      const interpretation = interpretChangingLines(1, 2, [1, 2, 3, 4, 5, 6]);

      expect(interpretation).toContain("전효변");
    });

    it("handles special case 건→곤 with 용구", () => {
      const interpretation = interpretChangingLines(1, 2, [1, 2, 3, 4, 5, 6]);

      expect(interpretation).toContain("용구");
      expect(interpretation).toContain("見群龍無首");
    });

    it("handles special case 곤→건 with 용육", () => {
      const interpretation = interpretChangingLines(2, 1, [1, 2, 3, 4, 5, 6]);

      expect(interpretation).toContain("용육");
      expect(interpretation).toContain("利永貞");
    });
  });

  describe("generateDailyWisdom", () => {
    it("generates daily wisdom message", () => {
      const wisdom = generateDailyWisdom(1, new Date());

      expect(wisdom).toContain("오늘의 주역 지혜");
      expect(wisdom).toContain("건괘");
      expect(wisdom).toContain("핵심");
      expect(wisdom).toContain("조언");
    });

    it("includes day-specific theme", () => {
      const monday = new Date(2024, 0, 1); // Monday
      const wisdom = generateDailyWisdom(1, monday);

      expect(wisdom).toContain("월요일");
    });

    it("returns empty for invalid hexagram", () => {
      const wisdom = generateDailyWisdom(0, new Date());

      expect(wisdom).toBe("");
    });
  });

  describe("analyzeHexagramRelationshipWisdom", () => {
    it("returns relationship analysis between two hexagrams", () => {
      const result = analyzeHexagramRelationshipWisdom(1, 2);

      expect(result.compatibility).toBeDefined();
      expect(result.advice).toBeDefined();
      expect(result.synergy).toBeInstanceOf(Array);
    });

    it("identifies 천-지 complementary relationship", () => {
      const result = analyzeHexagramRelationshipWisdom(1, 2);

      expect(result.compatibility).toContain("상보");
    });

    it("returns synergy points", () => {
      const result = analyzeHexagramRelationshipWisdom(1, 2);

      expect(result.synergy.length).toBeGreaterThan(0);
    });

    it("handles invalid hexagram", () => {
      const result = analyzeHexagramRelationshipWisdom(0, 2);

      expect(result.compatibility).toBe("분석 불가");
    });
  });

  describe("generatePeriodicWisdom", () => {
    it("generates yearly wisdom", () => {
      const wisdom = generatePeriodicWisdom(1, "yearly", 2024);

      expect(wisdom).toContain("2024년 운세");
      expect(wisdom).toContain("건괘");
    });

    it("generates monthly wisdom", () => {
      const wisdom = generatePeriodicWisdom(1, "monthly", 5);

      expect(wisdom).toContain("5월 운세");
    });

    it("generates weekly wisdom", () => {
      const wisdom = generatePeriodicWisdom(1, "weekly", 10);

      expect(wisdom).toContain("제10주 운세");
    });

    it("includes opportunities and warnings", () => {
      const wisdom = generatePeriodicWisdom(1, "monthly", 1);

      expect(wisdom).toContain("기회");
      expect(wisdom).toContain("주의");
    });

    it("returns empty for invalid hexagram", () => {
      const wisdom = generatePeriodicWisdom(0, "yearly", 2024);

      expect(wisdom).toBe("");
    });
  });

  describe("deepWisdomAnalysis", () => {
    it("returns deep analysis with action plan", () => {
      const result = deepWisdomAnalysis(1);

      expect(result.personalizedAdvice).toBeDefined();
      expect(result.lifeLessson).toBeDefined();
      expect(result.actionPlan.length).toBeGreaterThan(0);
    });

    it("personalizes advice for male user", () => {
      const result = deepWisdomAnalysis(1, { gender: "M" });

      expect(result.personalizedAdvice).toContain("군자");
    });

    it("personalizes advice for female user", () => {
      const result = deepWisdomAnalysis(1, { gender: "F" });

      expect(result.personalizedAdvice).toContain("곤덕");
    });

    it("adds birth year advice when provided", () => {
      const result = deepWisdomAnalysis(1, { birthYear: 1990 });

      expect(result.personalizedAdvice).toContain("년생");
    });

    it("handles invalid hexagram", () => {
      const result = deepWisdomAnalysis(0);

      expect(result.personalizedAdvice).toContain("찾을 수 없습니다");
    });

    it("action plan has multiple steps", () => {
      const result = deepWisdomAnalysis(1);

      expect(result.actionPlan.length).toBeGreaterThanOrEqual(3);
      expect(result.actionPlan[0]).toContain("1단계");
    });
  });
});
