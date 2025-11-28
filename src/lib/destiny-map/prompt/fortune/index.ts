//src/lib/destiny-map/prompt/fortune/index.ts

import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

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

/**
 * 🔮 운세 테마별 프롬프트 매핑
 * - theme에 따라 해당 생성 함수를 매칭.
 */
export const themePromptMap: Record<
  string,
  (lang: string, data: CombinedResult) => string
> = {
  love: buildLovePrompt,
  career: buildCareerPrompt,
  life: buildLifePrompt,
  health: buildHealthPrompt,
  family: buildFamilyPrompt,
  newyear: buildNewyearPrompt,
  month: buildMonthPrompt,
  today: buildTodayPrompt,
  year: buildThisYearPrompt, // ✅ 일치 수정
};

/**
 * ✨ 통합 빌더
 * theme 문자열(key)에 맞게 해당 프롬프트 호출
 */
export function buildPromptByTheme(
  theme: string,
  lang: string,
  data: CombinedResult
): string {
  const fn = themePromptMap[theme];
  if (!fn) {
    return `⚠️ Unknown theme: ${theme}`;
  }
  return fn(lang, data);
}