//src/lib/destiny-map/prompt/fortune/index.ts

import type { CombinedResult } from "@/lib/destiny-map/astrology";

// ✅ 각 프롬프트 import
import { buildLovePrompt } from "@/lib/destiny-map/prompt/fortune/theme/lovePrompt";
import { buildCareerPrompt } from "@/lib/destiny-map/prompt/fortune/theme/careerPrompt";
import { buildLifePrompt } from "@/lib/destiny-map/prompt/fortune/theme/lifePrompt";
import { buildHealthPrompt } from "@/lib/destiny-map/prompt/fortune/theme/healthPrompt";
import { buildFamilyPrompt } from "@/lib/destiny-map/prompt/fortune/theme/familyPrompt";
import { buildNewyearPrompt } from "@/lib/destiny-map/prompt/fortune/theme/newyearPrompt";
import { buildMonthPrompt } from "@/lib/destiny-map/prompt/fortune/theme/monthPrompt";
import { buildTodayPrompt } from "@/lib/destiny-map/prompt/fortune/theme/todayPrompt";
import { buildThisYearPrompt } from "@/lib/destiny-map/prompt/fortune/theme/yearPrompt"; // ✅ 수정: 함수명 일치

// 프롬프트 함수 타입 (useStructured 옵션 지원)
type PromptBuilder = (lang: string, data: CombinedResult, useStructured?: boolean) => string;

/**
 * 🔮 운세 테마별 프롬프트 매핑
 * - theme에 따라 해당 생성 함수를 매칭.
 */
export const themePromptMap: Record<string, PromptBuilder> = {
  love: buildLovePrompt,
  focus_love: buildLovePrompt,
  career: buildCareerPrompt,
  focus_career: buildCareerPrompt,
  life: buildLifePrompt,
  focus_overall: buildLifePrompt, // 종합운세
  health: buildHealthPrompt,
  focus_health: buildHealthPrompt,
  family: buildFamilyPrompt,
  focus_family: buildFamilyPrompt,
  newyear: buildNewyearPrompt,
  fortune_new_year: buildNewyearPrompt,
  month: buildMonthPrompt,
  fortune_monthly: buildMonthPrompt,
  today: buildTodayPrompt,
  fortune_today: buildTodayPrompt,
  year: buildThisYearPrompt,
  fortune_next_year: buildThisYearPrompt,
};

/**
 * ✨ 통합 빌더
 * theme 문자열(key)에 맞게 해당 프롬프트 호출
 * @param quickMode - true이면 빠른 분석 (구조화 JSON 없이 간단한 텍스트)
 */
export function buildPromptByTheme(
  theme: string,
  lang: string,
  data: CombinedResult,
  quickMode = false
): string {
  const fn = themePromptMap[theme];
  if (!fn) {
    return `⚠️ Unknown theme: ${theme}`;
  }
  // quickMode면 useStructured=false (간단한 텍스트 프롬프트 사용)
  return fn(lang, data, !quickMode);
}