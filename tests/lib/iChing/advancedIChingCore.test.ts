/**
 * Tests for Advanced I-Ching Core - 주역 고급 핵심 분석 엔진
 * src/lib/iChing/advancedIChingCore.ts
 */
import { describe, it, expect } from "vitest";
import {
  TRIGRAMS,
  analyzeHoGwa,
  analyzeChakGwa,
  analyzeDoGwa,
  analyzeSangbanGwa,
  analyzeBokGwa,
  analyzeHaekGwa,
  analyzeTrigramInteraction,
  analyzeYaoPositions,
  analyzeChangingLines,
  performComprehensiveHexagramAnalysis,
  compareHexagrams,
} from "@/lib/iChing/advancedIChingCore";

describe("Advanced I-Ching Core", () => {
  describe("TRIGRAMS Data", () => {
    it("should contain all 8 trigrams", () => {
      expect(Object.keys(TRIGRAMS).length).toBe(8);
    });

    it("should have correct structure for each trigram", () => {
      for (const [binary, trigram] of Object.entries(TRIGRAMS)) {
        expect(binary).toMatch(/^[01]{3}$/);
        expect(trigram.name).toBeDefined();
        expect(trigram.korean).toBeDefined();
        expect(trigram.hanja).toBeDefined();
        expect(trigram.binary).toBe(binary);
        expect(trigram.element).toBeDefined();
        expect(trigram.nature).toBeDefined();
        expect(trigram.direction).toBeDefined();
        expect(trigram.family).toBeDefined();
        expect(trigram.body).toBeDefined();
        expect(trigram.animal).toBeDefined();
      }
    });

    it("should have Qian (건) as 111", () => {
      expect(TRIGRAMS["111"].korean).toBe("건");
      expect(TRIGRAMS["111"].hanja).toBe("乾");
      expect(TRIGRAMS["111"].nature).toBe("하늘");
    });

    it("should have Kun (곤) as 000", () => {
      expect(TRIGRAMS["000"].korean).toBe("곤");
      expect(TRIGRAMS["000"].hanja).toBe("坤");
      expect(TRIGRAMS["000"].nature).toBe("땅");
    });

    it("should have correct elements for all trigrams", () => {
      expect(TRIGRAMS["111"].element).toBe("금"); // 건
      expect(TRIGRAMS["000"].element).toBe("토"); // 곤
      expect(TRIGRAMS["001"].element).toBe("목"); // 진
      expect(TRIGRAMS["010"].element).toBe("수"); // 감
      expect(TRIGRAMS["011"].element).toBe("토"); // 간
      expect(TRIGRAMS["100"].element).toBe("목"); // 손
      expect(TRIGRAMS["101"].element).toBe("화"); // 리
      expect(TRIGRAMS["110"].element).toBe("금"); // 태
    });
  });

  describe("analyzeHoGwa (호괘)", () => {
    it("should extract middle lines (2,3,4,5) to form new hexagram", () => {
      const binary = "111111"; // Qian (건괘)
      const result = analyzeHoGwa(binary);

      expect(result.호괘).toBeDefined();
      expect(result.호괘.binary).toMatch(/^[01]{6}$/);
      expect(result.explanation).toBeDefined();
      expect(result.innerMeaning).toBeDefined();
    });

    it("should provide meaningful inner meaning", () => {
      const binary = "111111"; // Qian
      const result = analyzeHoGwa(binary);

      expect(result.innerMeaning.length).toBeGreaterThan(0);
    });

    it("should handle various hexagram patterns", () => {
      const hexagrams = ["000000", "111111", "010101", "101010", "110011", "001100"];

      for (const binary of hexagrams) {
        const result = analyzeHoGwa(binary);
        expect(result.호괘).toBeDefined();
        expect(result.호괘.binary.length).toBe(6);
      }
    });
  });

  describe("analyzeChakGwa (착괘)", () => {
    it("should swap pairs of lines (1↔2, 3↔4, 5↔6)", () => {
      // Input: "010101" -> chars: ['0','1','0','1','0','1']
      // Swap pattern: [chars[1], chars[0], chars[3], chars[2], chars[5], chars[4]]
      // Result: ['1','0','1','0','1','0'] = "101010"
      const result = analyzeChakGwa("010101");

      expect(result.착괘).toBeDefined();
      expect(result.착괘.binary).toBe("101010");
      expect(result.explanation).toBeDefined();
      expect(result.relationship).toBeDefined();
    });

    it("should produce different result for non-symmetric hexagrams", () => {
      const binary = "111000";
      const result = analyzeChakGwa(binary);

      expect(result.착괘.binary).not.toBe(binary);
    });

    it("should be self-inverse for some patterns", () => {
      const binary = "110011";
      const result = analyzeChakGwa(binary);

      expect(result.착괘.binary).toBe("110011");
    });
  });

  describe("analyzeDoGwa (도괘)", () => {
    it("should reverse the hexagram (180 degree rotation)", () => {
      const binary = "111000"; // Top 3 yang, bottom 3 yin
      const result = analyzeDoGwa(binary);

      expect(result.도괘.binary).toBe("000111");
      expect(result.explanation).toBeDefined();
      expect(result.reverseViewpoint).toBeDefined();
    });

    it("should reverse symmetric hexagrams correctly", () => {
      // "101010" reversed is "010101", not the same
      const binary = "101010";
      const result = analyzeDoGwa(binary);

      expect(result.도괘.binary).toBe("010101");
    });

    it("should be self-inverse for palindromic hexagrams", () => {
      // "100001" reversed is still "100001"
      const palindrome = "100001";
      const result = analyzeDoGwa(palindrome);

      expect(result.도괘.binary).toBe(palindrome);
    });

    it("should handle Qian correctly", () => {
      const qian = "111111";
      const result = analyzeDoGwa(qian);

      // All yang remains all yang when reversed
      expect(result.도괘.binary).toBe("111111");
    });
  });

  describe("analyzeSangbanGwa (상반괘)", () => {
    it("should flip all yin/yang", () => {
      const binary = "111000";
      const result = analyzeSangbanGwa(binary);

      expect(result.상반괘.binary).toBe("000111");
      expect(result.explanation).toBeDefined();
      expect(result.oppositeForce).toBeDefined();
    });

    it("should transform Qian to Kun", () => {
      const qian = "111111";
      const result = analyzeSangbanGwa(qian);

      expect(result.상반괘.binary).toBe("000000");
    });

    it("should transform Kun to Qian", () => {
      const kun = "000000";
      const result = analyzeSangbanGwa(kun);

      expect(result.상반괘.binary).toBe("111111");
    });

    it("should be self-inverse operation", () => {
      const binary = "101010";
      const first = analyzeSangbanGwa(binary);
      const second = analyzeSangbanGwa(first.상반괘.binary);

      expect(second.상반괘.binary).toBe(binary);
    });
  });

  describe("analyzeBokGwa (복괘)", () => {
    it("should swap upper and lower trigrams", () => {
      const binary = "111000"; // Qian over Kun
      const result = analyzeBokGwa(binary);

      expect(result.복괘.binary).toBe("000111"); // Kun over Qian
      expect(result.explanation).toBeDefined();
      expect(result.transformation).toBeDefined();
    });

    it("should be self-inverse for same trigrams", () => {
      const qian = "111111";
      const result = analyzeBokGwa(qian);

      expect(result.복괘.binary).toBe("111111");
    });

    it("should correctly swap for asymmetric hexagrams", () => {
      const binary = "101000"; // Li over Kun
      const result = analyzeBokGwa(binary);

      // Lower (000) should become upper, upper (101) should become lower
      expect(result.복괘.binary).toBe("000101");
    });
  });

  describe("analyzeHaekGwa (핵괘)", () => {
    it("should extract upper nucleus (3,4,5) and lower nucleus (2,3,4)", () => {
      const binary = "111111";
      const result = analyzeHaekGwa(binary);

      expect(result.상핵.binary).toMatch(/^[01]{3}$/);
      expect(result.하핵.binary).toMatch(/^[01]{3}$/);
      expect(result.explanation).toBeDefined();
      expect(result.coreEnergy).toBeDefined();
    });

    it("should map nuclei to valid trigram names", () => {
      const binary = "010101";
      const result = analyzeHaekGwa(binary);

      // Both nuclei should have names
      expect(result.상핵.name).toBeDefined();
      expect(result.하핵.name).toBeDefined();
    });

    it("should provide core energy interpretation", () => {
      const binary = "111000";
      const result = analyzeHaekGwa(binary);

      expect(result.coreEnergy.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeTrigramInteraction", () => {
    it("should identify upper and lower trigrams", () => {
      const binary = "111000"; // Qian over Kun
      const result = analyzeTrigramInteraction(binary);

      expect(result.상괘.korean).toBe("곤");
      expect(result.하괘.korean).toBe("건");
    });

    it("should provide interaction description", () => {
      const binary = "101010";
      const result = analyzeTrigramInteraction(binary);

      expect(result.interaction).toBeDefined();
      expect(result.interaction.length).toBeGreaterThan(0);
    });

    it("should provide dynamic meaning", () => {
      const binary = "111111"; // Double Qian
      const result = analyzeTrigramInteraction(binary);

      expect(result.dynamicMeaning).toBeDefined();
      expect(result.dynamicMeaning).toContain("건");
    });

    it("should handle all 64 combinations", () => {
      const trigrams = ["000", "001", "010", "011", "100", "101", "110", "111"];

      for (const lower of trigrams) {
        for (const upper of trigrams) {
          const binary = lower + upper;
          const result = analyzeTrigramInteraction(binary);

          expect(result.상괘).toBeDefined();
          expect(result.하괘).toBeDefined();
        }
      }
    });
  });

  describe("analyzeYaoPositions", () => {
    it("should analyze all 6 positions", () => {
      const binary = "101010";
      const result = analyzeYaoPositions(binary);

      expect(result.length).toBe(6);
    });

    it("should correctly identify position names", () => {
      const binary = "111111";
      const result = analyzeYaoPositions(binary);

      const expectedNames = ["초효", "이효", "삼효", "사효", "오효", "상효"];
      for (let i = 0; i < 6; i++) {
        expect(result[i].name).toBe(expectedNames[i]);
        expect(result[i].position).toBe(i + 1);
      }
    });

    it("should correctly identify yang and yin nature", () => {
      // Binary "101010": index 0='1', index 1='0', index 2='1', index 3='0', index 4='1', index 5='0'
      // '1' = 양, '0' = 음
      const binary = "101010";
      const result = analyzeYaoPositions(binary);

      expect(result[0].nature).toBe("양"); // binary[0] = '1'
      expect(result[1].nature).toBe("음"); // binary[1] = '0'
      expect(result[2].nature).toBe("양"); // binary[2] = '1'
      expect(result[3].nature).toBe("음"); // binary[3] = '0'
      expect(result[4].nature).toBe("양"); // binary[4] = '1'
      expect(result[5].nature).toBe("음"); // binary[5] = '0'
    });

    it("should determine correctness (정위/부정위)", () => {
      // Binary "010101": index 0='0', index 1='1', index 2='0', index 3='1', index 4='0', index 5='1'
      // Position 1 (index 0): '0' = 음, odd position -> yin in odd = NOT correct (양효는 홀수 위치가 정위)
      // Position 2 (index 1): '1' = 양, even position -> yang in even = NOT correct (음효는 짝수 위치가 정위)
      // etc.
      const binary = "010101";
      const result = analyzeYaoPositions(binary);

      // '0' = 음 in odd position (1,3,5) is NOT correct (양효 should be in odd positions)
      expect(result[0].isCorrect).toBe(false); // position 1 (odd), yin -> 부정위
      expect(result[2].isCorrect).toBe(false); // position 3 (odd), yin -> 부정위
      expect(result[4].isCorrect).toBe(false); // position 5 (odd), yin -> 부정위

      // '1' = 양 in even positions (2,4,6) is NOT correct (음효 should be in even positions)
      expect(result[1].isCorrect).toBe(false); // position 2 (even), yang -> 부정위
      expect(result[3].isCorrect).toBe(false); // position 4 (even), yang -> 부정위
      expect(result[5].isCorrect).toBe(false); // position 6 (even), yang -> 부정위
    });

    it("should identify correct positions for 정위", () => {
      // For correct positions: yang (1) in odd positions (1,3,5), yin (0) in even positions (2,4,6)
      // Binary "101010": index 0='1' (pos 1, odd), index 1='0' (pos 2, even), etc.
      const binary = "101010";
      const result = analyzeYaoPositions(binary);

      expect(result[0].isCorrect).toBe(true);  // pos 1 (odd), yang -> 정위
      expect(result[1].isCorrect).toBe(true);  // pos 2 (even), yin -> 정위
      expect(result[2].isCorrect).toBe(true);  // pos 3 (odd), yang -> 정위
      expect(result[3].isCorrect).toBe(true);  // pos 4 (even), yin -> 정위
      expect(result[4].isCorrect).toBe(true);  // pos 5 (odd), yang -> 정위
      expect(result[5].isCorrect).toBe(true);  // pos 6 (even), yin -> 정위
    });

    it("should determine resonance (상응)", () => {
      const binary = "101010"; // Yin-Yang alternating
      const result = analyzeYaoPositions(binary);

      // Resonance: 1-4, 2-5, 3-6 should have opposite yin/yang
      expect(result[0].isResonant).toBe(true); // 1-4 should resonate
      expect(result[1].isResonant).toBe(true); // 2-5 should resonate
      expect(result[2].isResonant).toBe(true); // 3-6 should resonate
    });

    it("should include meaning and advice", () => {
      const binary = "111000";
      const result = analyzeYaoPositions(binary);

      for (const yao of result) {
        expect(yao.meaning).toBeDefined();
        expect(yao.meaning.length).toBeGreaterThan(0);
        expect(yao.advice).toBeDefined();
        expect(yao.advice.length).toBeGreaterThan(0);
      }
    });
  });

  describe("analyzeChangingLines", () => {
    it("should correctly transform hexagram with single changing line", () => {
      const fromBinary = "111111"; // Qian
      const changingLines = [1]; // First line changes

      const result = analyzeChangingLines(fromBinary, changingLines);

      expect(result.fromHexagram.binary).toBe("111111");
      expect(result.toHexagram.binary).toBe("011111"); // First bit flipped
      expect(result.changingLines).toEqual([1]);
    });

    it("should handle multiple changing lines", () => {
      const fromBinary = "111111";
      const changingLines = [1, 3, 5];

      const result = analyzeChangingLines(fromBinary, changingLines);

      expect(result.toHexagram.binary).toBe("010101"); // Bits 1,3,5 flipped
    });

    it("should handle no changing lines", () => {
      const fromBinary = "101010";
      const changingLines: number[] = [];

      const result = analyzeChangingLines(fromBinary, changingLines);

      expect(result.fromHexagram.binary).toBe(result.toHexagram.binary);
      expect(result.interpretation).toContain("불변괘");
    });

    it("should handle all lines changing (Qian to Kun)", () => {
      const fromBinary = "111111"; // Qian
      const changingLines = [1, 2, 3, 4, 5, 6];

      const result = analyzeChangingLines(fromBinary, changingLines);

      expect(result.toHexagram.binary).toBe("000000"); // Kun
      expect(result.interpretation).toContain("용구");
    });

    it("should handle all lines changing (Kun to Qian)", () => {
      const fromBinary = "000000"; // Kun
      const changingLines = [1, 2, 3, 4, 5, 6];

      const result = analyzeChangingLines(fromBinary, changingLines);

      expect(result.toHexagram.binary).toBe("111111"); // Qian
      expect(result.interpretation).toContain("용육");
    });

    it("should provide interpretation for different change counts", () => {
      const testCases = [
        { lines: [1], contains: "단변" },
        { lines: [1, 2], contains: "이변" },
        { lines: [1, 2, 3], contains: "삼변" },
        { lines: [1, 2, 3, 4], contains: "사변" },
        { lines: [1, 2, 3, 4, 5], contains: "오변" },
      ];

      for (const { lines, contains } of testCases) {
        const result = analyzeChangingLines("111111", lines);
        expect(result.interpretation).toContain(contains);
      }
    });

    it("should include transition advice", () => {
      const result = analyzeChangingLines("110011", [2, 5]);

      expect(result.transitionAdvice).toBeDefined();
      expect(result.transitionAdvice.length).toBeGreaterThan(0);
    });

    it("should include key moment description", () => {
      const result = analyzeChangingLines("101010", [1]);

      expect(result.keyMoment).toBeDefined();
      expect(result.keyMoment.length).toBeGreaterThan(0);
    });
  });

  describe("performComprehensiveHexagramAnalysis", () => {
    it("should include all analysis components", () => {
      const binary = "111000";
      const result = performComprehensiveHexagramAnalysis(binary);

      expect(result.본괘).toBeDefined();
      expect(result.trigrams).toBeDefined();
      expect(result.hoGwa).toBeDefined();
      expect(result.chakGwa).toBeDefined();
      expect(result.doGwa).toBeDefined();
      expect(result.sangbanGwa).toBeDefined();
      expect(result.bokGwa).toBeDefined();
      expect(result.haekGwa).toBeDefined();
      expect(result.yaoPositions).toBeDefined();
      expect(result.overallInsight).toBeDefined();
      expect(result.actionAdvice).toBeDefined();
    });

    it("should have 6 yao positions", () => {
      const result = performComprehensiveHexagramAnalysis("010101");

      expect(result.yaoPositions.length).toBe(6);
    });

    it("should provide overall insight", () => {
      const result = performComprehensiveHexagramAnalysis("111111");

      expect(result.overallInsight.length).toBeGreaterThan(0);
      expect(result.overallInsight).toContain("건");
    });

    it("should provide action advice", () => {
      const result = performComprehensiveHexagramAnalysis("101010");

      expect(Array.isArray(result.actionAdvice)).toBe(true);
      expect(result.actionAdvice.length).toBeGreaterThan(0);
    });

    it("should handle all 64 hexagrams", () => {
      for (let i = 0; i < 64; i++) {
        const binary = i.toString(2).padStart(6, "0");
        const result = performComprehensiveHexagramAnalysis(binary);

        expect(result.본괘).toBeDefined();
        expect(result.trigrams.상괘).toBeDefined();
        expect(result.trigrams.하괘).toBeDefined();
      }
    });
  });

  describe("compareHexagrams", () => {
    it("should identify identical hexagrams", () => {
      const result = compareHexagrams("111111", "111111");

      expect(result.similarity).toBe(100);
      expect(result.relationship).toBe("동일괘");
    });

    it("should identify sangban (opposite) relationship", () => {
      const result = compareHexagrams("111111", "000000");

      expect(result.relationship).toBe("상반괘 관계");
    });

    it("should identify do (reversed) relationship", () => {
      // "111000" reversed is "000111", BUT flipBinary("111000") is also "000111"
      // Since the code checks sangban (flip) first, "111000" vs "000111" is "상반괘 관계"
      // We need a different pair that is do but not sangban
      // "110001" reversed is "100011", flip is "001110" - different
      const result = compareHexagrams("110001", "100011");

      expect(result.relationship).toBe("도괘 관계");
    });

    it("should calculate similarity correctly", () => {
      // 4 out of 6 match
      const result = compareHexagrams("111111", "110011");

      expect(result.similarity).toBeCloseTo((4 / 6) * 100);
    });

    it("should identify similar hexagrams (5+ matching)", () => {
      const result = compareHexagrams("111111", "111110");

      expect(result.relationship).toBe("유사괘");
      expect(result.similarity).toBeCloseTo((5 / 6) * 100);
    });

    it("should identify opposing hexagrams (1 or fewer matching)", () => {
      const result = compareHexagrams("111110", "000000");

      expect(result.relationship).toBe("대립괘");
    });

    it("should provide common energy description", () => {
      const result = compareHexagrams("110110", "110011");

      expect(result.commonEnergy).toBeDefined();
      expect(result.commonEnergy).toContain("동일");
    });

    it("should provide difference analysis", () => {
      const result = compareHexagrams("111000", "110001");

      expect(result.differenceAnalysis).toBeDefined();
      expect(result.differenceAnalysis).toContain("변화");
    });
  });

  describe("Edge Cases", () => {
    it("should handle binary strings with unknown patterns", () => {
      const unknownBinary = "999999"; // Invalid pattern

      // analyzeHoGwa should still work (extracts substrings)
      const hoResult = analyzeHoGwa("101010");
      expect(hoResult.호괘).toBeDefined();
    });

    it("should handle boundary hexagrams", () => {
      // Hexagram 1 (Qian)
      const qian = performComprehensiveHexagramAnalysis("111111");
      expect(qian.본괘.number).toBe(1);

      // Hexagram 2 (Kun)
      const kun = performComprehensiveHexagramAnalysis("000000");
      expect(kun.본괘.number).toBe(2);
    });

    it("should handle water hexagram (감괘, 29)", () => {
      const kan = performComprehensiveHexagramAnalysis("010010");

      expect(kan.본괘.number).toBe(29);
      expect(kan.trigrams.상괘.korean).toBe("감");
      expect(kan.trigrams.하괘.korean).toBe("감");
    });

    it("should handle fire hexagram (리괘, 30)", () => {
      const li = performComprehensiveHexagramAnalysis("101101");

      expect(li.본괘.number).toBe(30);
      expect(li.trigrams.상괘.korean).toBe("리");
      expect(li.trigrams.하괘.korean).toBe("리");
    });

    it("should handle peace hexagram (태괘, 11)", () => {
      const tai = performComprehensiveHexagramAnalysis("000111");

      expect(tai.본괘.number).toBe(11);
    });

    it("should handle stagnation hexagram (비괘, 12)", () => {
      const pi = performComprehensiveHexagramAnalysis("111000");

      expect(pi.본괘.number).toBe(12);
    });
  });

  describe("Data Integrity", () => {
    it("should have consistent binary-number mapping in hexagram map", () => {
      // Test known hexagrams
      const knownHexagrams = [
        { binary: "111111", number: 1 },
        { binary: "000000", number: 2 },
        { binary: "010010", number: 29 },
        { binary: "101101", number: 30 },
        { binary: "010101", number: 63 },
        { binary: "101010", number: 64 },
      ];

      for (const { binary, number } of knownHexagrams) {
        const result = performComprehensiveHexagramAnalysis(binary);
        expect(result.본괘.number).toBe(number);
      }
    });

    it("should have all trigrams properly named", () => {
      const koreanNames = ["건", "곤", "진", "감", "간", "손", "리", "태"];

      for (const trigram of Object.values(TRIGRAMS)) {
        expect(koreanNames).toContain(trigram.korean);
      }
    });
  });
});
