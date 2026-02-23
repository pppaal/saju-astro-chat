/**
 * Question Classifier Patterns Tests
 * Tests for Tarot question classification regular expressions
 */

import { describe, it, expect } from "vitest";
import {
  yesNoEndingPatterns,
  yesNoMidPatterns,
} from "@/lib/Tarot/data/questionClassifierPatterns";

describe("Question Classifier Patterns", () => {
  describe("yesNoEndingPatterns", () => {
    it("matches Korean yes/no ending questions", () => {
      const patterns = yesNoEndingPatterns;

      // These patterns end with 까 or similar endings
      expect(patterns.some(p => p.test("갈까"))).toBe(true);
      expect(patterns.some(p => p.test("할까"))).toBe(true);
      expect(patterns.some(p => p.test("될까"))).toBe(true);
      expect(patterns.some(p => p.test("볼까"))).toBe(true);
    });

    it("matches questions with question mark", () => {
      const patterns = yesNoEndingPatterns;

      expect(patterns.some(p => p.test("할까?"))).toBe(true);
      expect(patterns.some(p => p.test("갈까?"))).toBe(true);
    });

    it("matches polite form questions", () => {
      const patterns = yesNoEndingPatterns;

      expect(patterns.some(p => p.test("할까요"))).toBe(true);
      expect(patterns.some(p => p.test("갈까요"))).toBe(true);
    });

    it("matches action-specific patterns", () => {
      const patterns = yesNoEndingPatterns;

      expect(patterns.some(p => p.test("연락할까"))).toBe(true);
      expect(patterns.some(p => p.test("만날까"))).toBe(true);
      expect(patterns.some(p => p.test("고백할까"))).toBe(true);
      expect(patterns.some(p => p.test("시작할까"))).toBe(true);
    });

    it("does not match non-yes/no questions", () => {
      const patterns = yesNoEndingPatterns;

      // These don't have yes/no endings
      expect(patterns.some(p => p.test("어떻게"))).toBe(false);
      expect(patterns.some(p => p.test("왜"))).toBe(false);
      expect(patterns.some(p => p.test("언제"))).toBe(false);
    });

    it("is an array with multiple patterns", () => {
      expect(Array.isArray(yesNoEndingPatterns)).toBe(true);
      expect(yesNoEndingPatterns.length).toBeGreaterThan(50);
    });
  });

  describe("yesNoMidPatterns", () => {
    it("matches mid-sentence yes/no patterns", () => {
      const patterns = yesNoMidPatterns;

      expect(patterns.some(p => p.test("고백할까 말까 고민이에요"))).toBe(true);
      expect(patterns.some(p => p.test("이 일을 해야 하나요"))).toBe(true);
    });

    it("matches conditional patterns", () => {
      const patterns = yesNoMidPatterns;

      expect(patterns.some(p => p.test("연락해도 될까요"))).toBe(true);
      expect(patterns.some(p => p.test("이사하면 될까요"))).toBe(true);
    });

    it("matches obligation patterns", () => {
      const patterns = yesNoMidPatterns;

      expect(patterns.some(p => p.test("공부해야 하나"))).toBe(true);
      expect(patterns.some(p => p.test("가야 하나"))).toBe(true);
      expect(patterns.some(p => p.test("사야 하나"))).toBe(true);
    });

    it("matches suggestion patterns", () => {
      const patterns = yesNoMidPatterns;

      expect(patterns.some(p => p.test("하는 게 좋을까"))).toBe(true);
      expect(patterns.some(p => p.test("가는게 좋을까"))).toBe(true);
    });

    it("matches 맞나/맞냐 decision phrasing", () => {
      const patterns = yesNoMidPatterns;

      expect(patterns.some(p => p.test("거기로 가는 게 맞나?"))).toBe(true);
      expect(patterns.some(p => p.test("거기로 가는게 맞냐"))).toBe(true);
      expect(patterns.some(p => p.test("이 선택이 맞는지 궁금해"))).toBe(true);
    });

    it("is an array with multiple patterns", () => {
      expect(Array.isArray(yesNoMidPatterns)).toBe(true);
      expect(yesNoMidPatterns.length).toBeGreaterThan(20);
    });
  });

  describe("Pattern validation", () => {
    it("all patterns are valid RegExp objects", () => {
      [...yesNoEndingPatterns, ...yesNoMidPatterns].forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it("patterns have no syntax errors", () => {
      expect(() => {
        yesNoEndingPatterns.forEach(p => p.test("test"));
        yesNoMidPatterns.forEach(p => p.test("test"));
      }).not.toThrow();
    });
  });

  describe("Real-world question classification", () => {
    it("correctly identifies yes/no questions", () => {
      const testQuestions = [
        "오늘 고백할까요?",
        "이 직장 그만할까",
        "연애할까 말까 고민이에요",
        "이사가도 될까요?",
        "이거 해야 하나요",
      ];

      testQuestions.forEach(q => {
        const isYesNo =
          yesNoEndingPatterns.some(p => p.test(q)) ||
          yesNoMidPatterns.some(p => p.test(q));

        expect(isYesNo).toBe(true);
      });
    });

    it("correctly rejects pure wh-questions without yes/no patterns", () => {
      const testQuestions = [
        "어떻게 살아야 하지",
        "왜 이렇게 힘든거지",
        "뭐가 문제일까",
      ];

      testQuestions.forEach(q => {
        // Note: Some Korean questions ending with 나요/하나요 may match
        // ending patterns like /나\??$/ - this tests pure wh-questions only
        const isYesNo =
          yesNoEndingPatterns.some(p => p.test(q)) ||
          yesNoMidPatterns.some(p => p.test(q));

        expect(isYesNo).toBe(false);
      });
    });
  });
});
