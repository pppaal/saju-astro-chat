import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * Daily prompt (Destiny Map) - 동양+서양 교차 전용 포맷
 * 모든 섹션은 교차 근거를 1줄씩 포함해야 하며, 섹션 누락 금지.
 */
export function buildTodayPrompt(lang: string, data: CombinedResult) {
  const theme = "today";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 동양+서양 교차 기반으로 오늘 운세를 아래 섹션 형식 그대로 작성하세요. 모든 조언은 동양/점성 근거를 1줄씩 덧붙이세요.",
    "[Sections - 모두 포함]",
    "- 오늘 한줄요약: 핵심 메시지 2~3줄",
    "- 좋은 시간대 / 피할 시간대: 예) 좋은 시간 09–11, 19–21 / 피할 시간 13–15 (근거 1줄)",
    "- 오늘 행동 가이드: 해야 할 것 2개 / 피해야 할 것 2개 (불릿, 각 1줄)",
    "- 주요 영역 카드:",
    "  • 커리어: 한줄 + 액션(예: \"메일은 오전에, 미팅은 오후 짧게\")",
    "  • 관계/친구: 한줄 + 액션(\"점심 약속 OK, 저녁 감정 대화는 미룰\")",
    "  • 사랑: 한줄 + 액션(\"칭찬 먼저, 계획은 단순하게\")",
    "  • 건강/에너지: 한줄 + 액션(\"수분·가벼운 스트레칭, 야식 금지\")",
    "  • 재정: 한줄 + 액션(\"지출 기록, 신규 투자 보류\")",
    "- 교차 하이라이트: 동양+서양 교차 포인트 최소 3개 (예: 오행↔행성/사인 엘리먼트, 장기/연간 흐름↔주요 트랜짓, 에너지 분포↔하우스 역할). signals/cross_summary 근거 1줄씩",
    "- 위험/주의: 최대 2개 (트리거·피해야 할 상황, 근거 1줄)",
    "- 오늘의 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 섹션 헤더를 명확히 표기하고 불릿은 2~3개로 제한. 전체 250~300단어 이내.",
    "FOCUS: 오늘 당장 실천 가능한 행동과 시간대 중심 조언.",
    "[근거 소스] 동양 오행/에너지분포/장기흐름 + 점성 행성/하우스/트랜짓 교차만 사용. 타 출처 금지.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
