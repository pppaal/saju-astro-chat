import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Monthly prompt (동양+서양 교차 전용, 섹션 고정)
export function buildMonthPrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "month";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 동양+서양 교차 근거로 월간 리딩 작성. 섹션 누락 금지, 각 조언에 근거 1줄.",
    "[Sections - 모두 포함]",
    "- 월간 한줄테마: 2~3줄",
    "- 핵심 주/날짜: 좋은 시기 2개, 주의 시기 2개 (근거: 장기/연간/월간 흐름/트랜짓)",
    "- 영역 카드 (각 1줄 + 액션): 커리어, 관계/사랑, 건강, 재정",
    "- 리스크: 최대 2개 + 근거",
    "- 기회: 최대 2개 + 근거",
    "- 교차 하이라이트: 동양+서양 교차 포인트 최소 3개 (예: 오행↔행성/사인 엘리먼트, 장기/연간 흐름↔주요 트랜짓, 에너지 분포↔하우스 역할). signals/cross_summary 활용",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 200~260단어 내. 의료/법률/투자 단정 금지.",
    "근거 소스: 동양(월간 흐름/장기 흐름/에너지분포/특수에너지) + 점성(월 트랜짓, 행성/하우스) 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
