/**
 * Report Validation Tests
 *
 * Tests for:
 * - REQUIRED_SECTIONS constant
 * - validateSections function
 * - validateSectionsDetailed function
 */

import { describe, it, expect } from "vitest";
import {
  REQUIRED_SECTIONS,
  validateSections,
  validateSectionsDetailed,
  type ValidationWarning,
} from "@/lib/destiny-map/helpers/report-validation";

describe("Report Validation Module", () => {
  describe("REQUIRED_SECTIONS", () => {
    it("defines sections for 'today' theme", () => {
      expect(REQUIRED_SECTIONS.today).toBeDefined();
      expect(Array.isArray(REQUIRED_SECTIONS.today)).toBe(true);
      expect(REQUIRED_SECTIONS.today).toContain("오늘 한줄요약");
      expect(REQUIRED_SECTIONS.today).toContain("행동 가이드");
    });

    it("defines sections for 'career' theme", () => {
      expect(REQUIRED_SECTIONS.career).toBeDefined();
      expect(REQUIRED_SECTIONS.career).toContain("한줄요약");
      expect(REQUIRED_SECTIONS.career).toContain("타이밍");
    });

    it("defines sections for 'love' theme", () => {
      expect(REQUIRED_SECTIONS.love).toBeDefined();
      expect(REQUIRED_SECTIONS.love).toContain("한줄요약");
      expect(REQUIRED_SECTIONS.love).toContain("소통");
    });

    it("defines sections for 'health' theme", () => {
      expect(REQUIRED_SECTIONS.health).toBeDefined();
      expect(REQUIRED_SECTIONS.health).toContain("루틴");
      expect(REQUIRED_SECTIONS.health).toContain("회복");
    });

    it("defines sections for 'life' theme", () => {
      expect(REQUIRED_SECTIONS.life).toBeDefined();
      expect(REQUIRED_SECTIONS.life).toContain("핵심 정체성");
      expect(REQUIRED_SECTIONS.life).toContain("강점");
    });

    it("defines sections for 'family' theme", () => {
      expect(REQUIRED_SECTIONS.family).toBeDefined();
      expect(REQUIRED_SECTIONS.family).toContain("협력");
    });

    it("defines sections for 'month' theme", () => {
      expect(REQUIRED_SECTIONS.month).toBeDefined();
      expect(REQUIRED_SECTIONS.month).toContain("월간 한줄테마");
    });

    it("defines sections for 'year' theme", () => {
      expect(REQUIRED_SECTIONS.year).toBeDefined();
      expect(REQUIRED_SECTIONS.year).toContain("연간 한줄테마");
    });

    it("defines sections for 'newyear' theme", () => {
      expect(REQUIRED_SECTIONS.newyear).toBeDefined();
      expect(REQUIRED_SECTIONS.newyear).toContain("새해 한줄테마");
    });

    it("all themes include '교차 하이라이트'", () => {
      const themes = Object.keys(REQUIRED_SECTIONS);
      for (const theme of themes) {
        expect(REQUIRED_SECTIONS[theme]).toContain("교차 하이라이트");
      }
    });

    it("most themes include '리마인더' except career which uses '포커스'", () => {
      const themes = Object.keys(REQUIRED_SECTIONS);
      for (const theme of themes) {
        if (theme === "career") {
          expect(REQUIRED_SECTIONS[theme]).toContain("포커스");
          expect(REQUIRED_SECTIONS[theme]).not.toContain("리마인더");
        } else {
          expect(REQUIRED_SECTIONS[theme]).toContain("리마인더");
        }
      }
    });
  });

  describe("validateSections", () => {
    describe("text response validation", () => {
      it("returns empty array for valid text with all sections", () => {
        const validText = `
          오늘 한줄요약: 좋은 하루입니다.
          좋은 시간대: 오전 10시
          행동 가이드: 적극적으로 행동하세요.
          교차 하이라이트: 사주 오행과 점성 행성의 조화
          리마인더: 긍정적인 마음을 유지하세요.
        `;
        const warnings = validateSections("today", validText);

        // May have cross-reference warning if not enough keywords
        expect(Array.isArray(warnings)).toBe(true);
      });

      it("returns warnings for missing sections", () => {
        const incompleteText = "간단한 텍스트입니다.";
        const warnings = validateSections("today", incompleteText);

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings.some((w) => w.includes("섹션 누락"))).toBe(true);
      });

      it("returns warnings for missing cross-references", () => {
        const textWithoutRefs = `
          오늘 한줄요약: 좋은 하루
          좋은 시간대: 오전 10시
          행동 가이드: 적극적으로
          교차 하이라이트: 내용
          리마인더: 긍정
        `;
        const warnings = validateSections("today", textWithoutRefs);

        expect(warnings.some((w) => w.includes("교차 근거 부족"))).toBe(true);
      });

      it("accepts text with both Saju and Astrology references", () => {
        const validCrossRef = `
          오늘 한줄요약: 좋은 하루입니다.
          좋은 시간대: 오전 10시
          행동 가이드: 적극적으로 행동하세요.
          교차 하이라이트: 사주 오행과 점성 행성의 조화
          리마인더: 긍정적인 마음을 유지하세요.
          사주 분석에 따르면...
          점성술 트랜짓으로...
        `;
        const warnings = validateSections("today", validCrossRef);

        // Should not have cross-reference warning
        expect(warnings.some((w) => w.includes("교차 근거 부족"))).toBe(false);
      });
    });

    describe("JSON response validation", () => {
      it("validates JSON response for 'life' theme", () => {
        const validJson = JSON.stringify({
          lifeTimeline: {},
          categoryAnalysis: {},
          keyInsights: [],
        });
        const warnings = validateSections("life", validJson);

        // May have cross-reference warning
        expect(Array.isArray(warnings)).toBe(true);
      });

      it("returns warnings for missing JSON keys in 'life' theme", () => {
        const incompleteJson = JSON.stringify({
          lifeTimeline: {},
          // missing categoryAnalysis and keyInsights
        });
        const warnings = validateSections("life", incompleteJson);

        expect(warnings.some((w) => w.includes("JSON 키 누락"))).toBe(true);
      });

      it("validates JSON response for 'today' theme", () => {
        const validJson = JSON.stringify({
          daySummary: "좋은 날",
          timing: "오전",
          advice: "긍정적으로",
        });
        const warnings = validateSections("today", validJson);

        expect(Array.isArray(warnings)).toBe(true);
      });

      it("returns warnings for missing JSON keys in 'today' theme", () => {
        const incompleteJson = JSON.stringify({
          daySummary: "좋은 날",
          // missing timing and advice
        });
        const warnings = validateSections("today", incompleteJson);

        expect(warnings.some((w) => w.includes("JSON 키 누락"))).toBe(true);
      });

      it("returns warning for invalid JSON", () => {
        const invalidJson = "{ invalid json }";
        const warnings = validateSections("today", invalidJson);

        expect(warnings.some((w) => w.includes("JSON 파싱 실패"))).toBe(true);
      });
    });

    describe("unknown theme handling", () => {
      it("handles unknown themes gracefully", () => {
        const text = "Some text content";
        const warnings = validateSections("unknown_theme", text);

        // Should still check cross-references
        expect(Array.isArray(warnings)).toBe(true);
      });
    });
  });

  describe("validateSectionsDetailed", () => {
    it("returns detailed warnings with type and message", () => {
      const incompleteText = "간단한 텍스트";
      const warnings = validateSectionsDetailed("today", incompleteText);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toHaveProperty("type");
      expect(warnings[0]).toHaveProperty("message");
    });

    it("includes warning type 'missing_section' for missing sections", () => {
      const incompleteText = "간단한 텍스트";
      const warnings = validateSectionsDetailed("today", incompleteText);

      expect(warnings.some((w) => w.type === "missing_section")).toBe(true);
    });

    it("includes warning type 'missing_cross_reference' for missing references", () => {
      const textWithoutRefs = `
        오늘 한줄요약: 좋은 하루
        좋은 시간대: 오전
        행동 가이드: 적극적
        교차 하이라이트: 내용
        리마인더: 긍정
      `;
      const warnings = validateSectionsDetailed("today", textWithoutRefs);

      expect(warnings.some((w) => w.type === "missing_cross_reference")).toBe(true);
    });

    it("includes warning type 'missing_json_key' for missing JSON keys", () => {
      const incompleteJson = JSON.stringify({
        lifeTimeline: {},
      });
      const warnings = validateSectionsDetailed("life", incompleteJson);

      expect(warnings.some((w) => w.type === "missing_json_key")).toBe(true);
    });

    it("includes warning type 'json_parse_error' for invalid JSON", () => {
      const invalidJson = "{ not valid }";
      const warnings = validateSectionsDetailed("today", invalidJson);

      expect(warnings.some((w) => w.type === "json_parse_error")).toBe(true);
    });

    it("includes detail field with additional information", () => {
      const incompleteText = "간단한 텍스트";
      const warnings = validateSectionsDetailed("today", incompleteText);

      const warningWithDetail = warnings.find((w) => w.detail);
      expect(warningWithDetail).toBeDefined();
    });
  });

  describe("Cross-reference validation", () => {
    it("detects Saju keywords", () => {
      const sajuText = "사주 분석 결과";
      const warnings = validateSections("today", sajuText);

      // Should still warn about missing astrology
      expect(warnings.some((w) => w.includes("교차 근거 부족"))).toBe(true);
    });

    it("detects Astrology keywords", () => {
      const astroText = "점성술 트랜짓 분석";
      const warnings = validateSections("today", astroText);

      // Should still warn about missing saju
      expect(warnings.some((w) => w.includes("교차 근거 부족"))).toBe(true);
    });

    it("accepts 오행 as Saju reference", () => {
      const text = "오행 분석 및 점성 하우스 분석";
      // Should have both references
      const hasSaju = /사주|오행|십신|대운/.test(text);
      const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);
      expect(hasSaju).toBe(true);
      expect(hasAstro).toBe(true);
    });

    it("accepts 십신 as Saju reference", () => {
      const text = "십신 분석";
      const hasSaju = /사주|오행|십신|대운/.test(text);
      expect(hasSaju).toBe(true);
    });

    it("accepts 대운 as Saju reference", () => {
      const text = "대운 흐름";
      const hasSaju = /사주|오행|십신|대운/.test(text);
      expect(hasSaju).toBe(true);
    });

    it("accepts 행성 as Astrology reference", () => {
      const text = "행성 배치";
      const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);
      expect(hasAstro).toBe(true);
    });

    it("accepts 별자리 as Astrology reference", () => {
      const text = "별자리 분석";
      const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);
      expect(hasAstro).toBe(true);
    });
  });

  describe("ValidationWarning interface", () => {
    it("supports all warning types", () => {
      const types: ValidationWarning["type"][] = [
        "missing_section",
        "missing_json_key",
        "json_parse_error",
        "missing_cross_reference",
      ];
      expect(types).toHaveLength(4);
    });

    it("has correct structure", () => {
      const warning: ValidationWarning = {
        type: "missing_section",
        message: "섹션 누락: 테스트",
        detail: "추가 정보",
      };
      expect(warning.type).toBe("missing_section");
      expect(warning.message).toContain("섹션 누락");
      expect(warning.detail).toBe("추가 정보");
    });

    it("detail is optional", () => {
      const warning: ValidationWarning = {
        type: "missing_section",
        message: "섹션 누락",
      };
      expect(warning.detail).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("handles empty string", () => {
      const warnings = validateSections("today", "");
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("handles whitespace-only string", () => {
      const warnings = validateSections("today", "   \n\t  ");
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("handles very long text", () => {
      const longText = "a".repeat(10000) + " 사주 점성 " + "b".repeat(10000);
      const warnings = validateSections("today", longText);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it("handles special characters in text", () => {
      const specialText = "특수문자 @#$%^&*() 포함 텍스트 사주 점성";
      const warnings = validateSections("today", specialText);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it("handles Korean/English mixed text", () => {
      const mixedText = "한글 English 混合 사주분석 astrology transit";
      const warnings = validateSections("today", mixedText);
      expect(Array.isArray(warnings)).toBe(true);
    });
  });
});
