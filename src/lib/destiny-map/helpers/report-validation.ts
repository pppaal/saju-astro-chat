/**
 * Report Validation Utilities
 * 리포트 검증 유틸리티
 *
 * This module validates fortune-telling reports to ensure they contain
 * all required sections and proper cross-references between Eastern (Saju)
 * and Western (Astrology) systems.
 */

import { isJsonResponse } from './text-sanitization';
import { logger } from '@/lib/logger';


/**
 * Required sections for each fortune theme
 *
 * Each theme has specific sections that must be present in the generated report.
 * This ensures consistent, high-quality fortune-telling content.
 *
 * **Theme Descriptions:**
 * - **today**: Daily fortune (오늘 운세)
 * - **career**: Career guidance (직업/커리어)
 * - **love**: Love and relationships (연애/결혼)
 * - **health**: Health guidance (건강)
 * - **life**: Comprehensive life analysis (인생 종합)
 * - **family**: Family and relationships (가족/인간관계)
 * - **month**: Monthly fortune (월간 운세)
 * - **year**: Annual fortune (연간 운세)
 * - **newyear**: New year special (새해 특별 운세)
 */
export const REQUIRED_SECTIONS: Record<string, string[]> = {
  today: ["오늘 한줄요약", "좋은 시간대", "행동 가이드", "교차 하이라이트", "리마인더"],
  career: ["한줄요약", "타이밍", "액션", "교차 하이라이트", "포커스"],
  love: ["한줄요약", "타이밍", "소통", "행동 가이드", "교차 하이라이트", "리마인더"],
  health: ["한줄요약", "루틴", "피로", "회복", "교차 하이라이트", "리마인더"],
  life: ["핵심 정체성", "현재 흐름", "향후", "강점", "도전", "교차 하이라이트", "다음 스텝", "리마인더"],
  family: ["한줄요약", "소통", "협력", "리스크", "교차 하이라이트", "리마인더"],
  month: ["월간 한줄테마", "핵심 주", "영역 카드", "교차 하이라이트", "리마인더"],
  year: ["연간 한줄테마", "분기", "전환", "영역 포커스", "교차 하이라이트", "리마인더"],
  newyear: ["새해 한줄테마", "분기", "준비", "기회", "리스크", "교차 하이라이트", "리마인더"],
};

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: 'missing_section' | 'missing_json_key' | 'json_parse_error' | 'missing_cross_reference';
  message: string;
  detail?: string;
}

/**
 * Validate JSON response structure
 *
 * @param theme - Fortune theme
 * @param text - JSON text to validate
 * @returns Array of validation warnings
 */
function validateJsonResponse(theme: string, text: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  try {
    const parsed = JSON.parse(text);

    // Helper to check for required keys
    const ensureKeys = (obj: Record<string, unknown>, keys: string[]) => {
      for (const k of keys) {
        if (!(k in obj)) {
          warnings.push({
            type: 'missing_json_key',
            message: `JSON 키 누락: ${k}`,
            detail: `Theme "${theme}" requires key "${k}"`,
          });
        }
      }
    };

    // Theme-specific validation
    if (theme === "life" || theme === "focus_overall") {
      ensureKeys(parsed, ["lifeTimeline", "categoryAnalysis", "keyInsights"]);
    }
    if (theme === "today" || theme === "fortune_today") {
      ensureKeys(parsed, ["daySummary", "timing", "advice"]);
    }
  } catch (err) {
    warnings.push({
      type: 'json_parse_error',
      message: "JSON 파싱 실패",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return warnings;
}

/**
 * Validate text/markdown response structure
 *
 * @param theme - Fortune theme
 * @param text - Text to validate
 * @returns Array of validation warnings
 */
function validateTextResponse(theme: string, text: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check required sections
  const required = REQUIRED_SECTIONS[theme] || [];
  for (const marker of required) {
    if (!text.includes(marker)) {
      warnings.push({
        type: 'missing_section',
        message: `섹션 누락: ${marker}`,
        detail: `Theme "${theme}" requires section "${marker}"`,
      });
    }
  }

  return warnings;
}

/**
 * Validate cross-references between Saju and Astrology
 *
 * A high-quality fortune report should reference both Eastern (Saju) and
 * Western (Astrology) systems to provide comprehensive insights.
 *
 * @param text - Text to validate
 * @returns Array of validation warnings
 */
function validateCrossReferences(text: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for Saju references (Eastern system)
  const hasSaju = /사주|오행|십신|대운/.test(text);

  // Check for Astrology references (Western system)
  const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);

  if (!hasSaju || !hasAstro) {
    warnings.push({
      type: 'missing_cross_reference',
      message: "교차 근거 부족: 사주/점성 언급을 모두 포함해야 함",
      detail: `Saju: ${hasSaju}, Astrology: ${hasAstro}`,
    });
  }

  return warnings;
}

/**
 * Validate required sections in report text
 *
 * This function performs comprehensive validation of fortune-telling reports:
 * 1. Detects response type (JSON vs text/markdown)
 * 2. Validates theme-specific required sections
 * 3. Checks for cross-references between Saju and Astrology
 *
 * @param theme - Fortune theme (today, career, love, health, life, etc.)
 * @param text - Report text to validate
 * @returns Array of validation warning messages (empty if valid)
 *
 * @example
 * ```typescript
 * const warnings = validateSections('today', reportText);
 * if (warnings.length > 0) {
 *   logger.warn('Report validation issues:', warnings);
 * }
 * ```
 */
export function validateSections(theme: string, text: string): string[] {
  const warnings: ValidationWarning[] = [];

  // 1) Validate based on response type (JSON vs text)
  if (isJsonResponse(text)) {
    warnings.push(...validateJsonResponse(theme, text));
  } else {
    warnings.push(...validateTextResponse(theme, text));
  }

  // 2) Validate cross-references (applies to all response types)
  warnings.push(...validateCrossReferences(text));

  // Return simple string messages for backward compatibility
  return warnings.map(w => w.message);
}

/**
 * Validate sections with detailed warnings (new API)
 *
 * @param theme - Fortune theme
 * @param text - Report text to validate
 * @returns Array of detailed validation warnings
 */
export function validateSectionsDetailed(theme: string, text: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (isJsonResponse(text)) {
    warnings.push(...validateJsonResponse(theme, text));
  } else {
    warnings.push(...validateTextResponse(theme, text));
  }

  warnings.push(...validateCrossReferences(text));

  return warnings;
}
