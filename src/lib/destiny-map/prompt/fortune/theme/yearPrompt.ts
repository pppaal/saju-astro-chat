import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Yearly prompt (사주+점성 교차 전용, 섹션 고정)
export function buildThisYearPrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "year";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 사주+점성 교차 근거로 연간 리딩 작성. 섹션 누락 금지, 각 조언에 근거 1줄.",
    "[Sections - 모두 포함]",
    "- 연간 한줄테마: 2~3줄",
    "- 분기/시즌 포인트: 3~4개 (좋은/주의 시기, 근거)",
    "- 전환/조심 시기: 최대 2개 + 근거",
    "- 기회 시기: 최대 2개 + 근거",
    "- 영역 포커스(각 1줄 + 액션): 커리어, 사랑/관계, 재정, 건강",
    "- 교차 하이라이트: 사주+점성 교차 포인트 최소 3개 (예: 일주 오행↔행성/사인 엘리먼트, 대운/연운↔주요 트랜짓, 십신↔하우스 역할). signals/cross_summary 활용",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 220~280단어 내. 단정/보장 금지.",
    "근거 소스: 사주(연운/대운/십신/신살) + 점성(연 트랜짓, 행성/하우스) 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
