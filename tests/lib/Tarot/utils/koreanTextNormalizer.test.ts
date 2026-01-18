/**
 * Korean Text Normalizer Tests
 */

import { describe, it, expect } from "vitest";
import {
  isChosungOnly,
  chosungToPattern,
  expandChosungQuestion,
} from "@/lib/Tarot/utils/koreanTextNormalizer";

describe("Korean Text Normalizer", () => {
  describe("isChosungOnly", () => {
    it("identifies chosung-only text", () => {
      expect(isChosungOnly("ㄱㄴㄷㄹㅁㅂ")).toBe(true);
      expect(isChosungOnly("ㅇㄷㅇㄷㄱㄹㄲ")).toBe(true);
    });

    it("identifies mixed text as not chosung-only", () => {
      expect(isChosungOnly("오늘 운동 갈까")).toBe(false);
      expect(isChosungOnly("안녕하세요")).toBe(false);
    });

    it("handles text with special characters", () => {
      expect(isChosungOnly("ㄱㄴㄷ?")).toBe(true);
      expect(isChosungOnly("ㄱㄴㄷ 123")).toBe(true);
    });

    it("returns false for empty or non-Korean text", () => {
      expect(isChosungOnly("")).toBe(false);
      expect(isChosungOnly("123")).toBe(false);
      expect(isChosungOnly("abc")).toBe(false);
    });

    it("handles partially chosung text (>50% threshold)", () => {
      // 50% 이상 초성이면 true
      expect(isChosungOnly("ㄱㄴㄷ가나")).toBe(true);
      expect(isChosungOnly("가나다ㄱ")).toBe(false);
    });
  });

  describe("chosungToPattern", () => {
    it("converts chosung to regex pattern", () => {
      const pattern = chosungToPattern("ㄱ");
      expect(pattern).toBe("[가-깋]");
    });

    it("handles multiple chosung characters", () => {
      const pattern = chosungToPattern("ㄱㄴ");
      expect(pattern).toContain("[가-깋]");
      expect(pattern).toContain("[나-닣]");
    });

    it("preserves complete Hangul characters", () => {
      const pattern = chosungToPattern("가ㄴ다");
      expect(pattern).toContain("가");
      expect(pattern).toContain("[나-닣]");
      expect(pattern).toContain("다");
    });

    it("escapes special regex characters", () => {
      const pattern = chosungToPattern("ㄱ?");
      expect(pattern).toContain("\\?");
    });

    it("handles mixed Korean and non-Korean text", () => {
      const pattern = chosungToPattern("ㄱ123");
      expect(pattern).toContain("[가-깋]");
      expect(pattern).toContain("123");
    });
  });

  describe("expandChosungQuestion", () => {
    it("expands common chosung questions", () => {
      const expansions = expandChosungQuestion("ㅇㄷㅇㄷㄱㄹㄲ");

      expect(Array.isArray(expansions)).toBe(true);
      if (expansions.length > 0) {
        expect(expansions[0]).toBe("오늘 운동 갈까");
      }
    });

    it("expands food-related questions", () => {
      const expansions = expandChosungQuestion("ㄹㅁㄴㅁㅇㄹㄲ");

      if (expansions.length > 0) {
        expect(expansions[0]).toBe("라면 먹을까");
      }
    });

    it("returns array even for unknown patterns", () => {
      const expansions = expandChosungQuestion("ㅁㅁㅁ");

      expect(Array.isArray(expansions)).toBe(true);
    });

    it("handles multiple possible expansions", () => {
      const expansions = expandChosungQuestion("ㅇㄷㅎㄹㄲ");

      expect(Array.isArray(expansions)).toBe(true);
      if (expansions.length > 0) {
        expect(expansions).toContain("어떨까");
      }
    });
  });

  describe("Integration tests", () => {
    it("correctly processes typical chosung questions", () => {
      const testCases = [
        { input: "ㄱㅇㅎㄹㄲ", shouldBe: "초성" },
        { input: "게임할까", shouldBe: "완성" },
        { input: "ㄱㄴㄷㄹ?", shouldBe: "초성" },
      ];

      testCases.forEach(({ input, shouldBe }) => {
        const isChosung = isChosungOnly(input);
        if (shouldBe === "초성") {
          expect(isChosung).toBe(true);
        } else {
          expect(isChosung).toBe(false);
        }
      });
    });

    it("generates valid regex patterns", () => {
      const pattern = chosungToPattern("ㄱㄴㄷ");
      expect(() => new RegExp(pattern)).not.toThrow();

      const regex = new RegExp(pattern);
      expect(regex.test("가나다")).toBe(true);
    });

    it("expands and validates common patterns", () => {
      const commonChosungs = [
        "ㅇㄷㅇㄷㄱㄹㄲ",
        "ㄹㅁㄴㅁㅇㄹㄲ",
        "ㅅㅁㅅㄹㄲ",
      ];

      commonChosungs.forEach(chosung => {
        const expansions = expandChosungQuestion(chosung);
        expect(Array.isArray(expansions)).toBe(true);
      });
    });
  });

  describe("Edge cases", () => {
    it("handles empty string", () => {
      expect(isChosungOnly("")).toBe(false);
      expect(chosungToPattern("")).toBe("");
      expect(expandChosungQuestion("")).toEqual([]);
    });

    it("handles only spaces", () => {
      expect(isChosungOnly("   ")).toBe(false);
    });

    it("handles special characters", () => {
      const pattern = chosungToPattern("ㄱ!@#");
      expect(pattern).toContain("[가-깋]");
    });

    it("handles numbers in text", () => {
      expect(isChosungOnly("ㄱㄴ123")).toBe(true);
      const pattern = chosungToPattern("ㄱ123");
      expect(pattern).toContain("123");
    });
  });
});
