// src/lib/destiny-map/report-helpers.ts
// Helper functions extracted from reportService.ts

// Re-export from centralized security module for backward compatibility
export { hashName, maskDisplayName, maskTextWithName } from "@/lib/security";

// ============================================================
// Text Cleansing
// ============================================================

/**
 * Basic cleansing to remove HTML/script/style directives
 * IMPORTANT: Preserves JSON structure (curly braces) for structured responses
 */
export function cleanseText(raw: string): string {
  if (!raw) {return "";}

  // Check if this is a JSON response
  const isJsonResponse =
    raw.trim().startsWith("{") ||
    raw.includes('"lifeTimeline"') ||
    raw.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    // For JSON responses, only clean dangerous content but preserve structure
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers like onclick="..."
      .replace(/on\w+\s*=\s*[^\s>]*/gi, "") // Remove event handlers without quotes
      .trim();
  }

  // For non-JSON (markdown/text) responses, do full cleansing
  // IMPORTANT: Remove script/style tags FIRST before removing other HTML tags
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "") // Remove scripts first
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")   // Remove styles first
    .replace(/<\/?[^>]+(>|$)/g, "")                       // Then remove other HTML tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")         // Remove event handlers like onclick="..."
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "")                 // Remove event handlers without quotes
    .replace(/@import.*?;/gi, "")
    .replace(
      /(html|body|svg|button|form|document\.write|font\-family|background)/gi,
      ""
    )
    .replace(/&nbsp;/g, " ")
    .replace(/[<>]/g, "") // Only remove angle brackets, NOT curly braces
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ============================================================
// Date/Time Helpers
// ============================================================

/**
 * Get current date in user's timezone (YYYY-MM-DD)
 */
export function getDateInTimezone(tz?: string): string {
  const now = new Date();
  if (!tz) {return now.toISOString().slice(0, 10);}
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

// ============================================================
// Five Elements Helpers
// ============================================================

/**
 * Extract reasonable five-element defaults when AI text is unavailable
 */
export function extractDefaultElements(_text: string): {
  fiveElements: Record<string, number>;
} {
  return {
    fiveElements: { wood: 25, fire: 25, earth: 20, metal: 20, water: 15 },
  };
}

// ============================================================
// Validation Helpers
// ============================================================

/** Required sections for each theme */
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
 * Validate required sections in report text
 */
export function validateSections(theme: string, text: string): string[] {
  const warnings: string[] = [];

  // 1) JSON 응답: 파싱 후 필수 키 확인
  const isJsonResponse =
    text.trim().startsWith("{") ||
    text.includes('"lifeTimeline"') ||
    text.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    try {
      const parsed = JSON.parse(text);
      const ensureKeys = (obj: Record<string, unknown>, keys: string[]) => {
        for (const k of keys) {
          if (!(k in obj)) {warnings.push(`JSON 키 누락: ${k}`);}
        }
      };

      if (theme === "life" || theme === "focus_overall") {
        ensureKeys(parsed, ["lifeTimeline", "categoryAnalysis", "keyInsights"]);
      }
      if (theme === "today" || theme === "fortune_today") {
        ensureKeys(parsed, ["daySummary", "timing", "advice"]);
      }
    } catch {
      warnings.push("JSON 파싱 실패");
    }
    return warnings;
  }

  // 2) 텍스트/마크다운 응답: 마커 기반
  const required = REQUIRED_SECTIONS[theme] || [];
  for (const marker of required) {
    if (!text.includes(marker)) {
      warnings.push(`섹션 누락: ${marker}`);
    }
  }

  // 교차 근거 체크: 사주/점성 언급이 거의 없으면 경고
  const hasSaju = /사주|오행|십신|대운/.test(text);
  const hasAstro = /점성|행성|하우스|트랜짓|별자리/.test(text);
  if (!hasSaju || !hasAstro) {
    warnings.push("교차 근거 부족: 사주/점성 언급을 모두 포함해야 함");
  }

  return warnings;
}
