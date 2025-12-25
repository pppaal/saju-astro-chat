import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Health/Wellbeing prompt (동양+서양 교차 전용, 섹션 고정)
export function buildHealthPrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "health";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 동양+서양 교차 근거만으로 건강/에너지 리딩 작성. 의료 조언 금지, 전문가 상담 안내 포함.",
    "[Sections - 모두 포함]",
    "- 한줄요약: 에너지/컨디션 상태 2~3줄",
    "- 루틴: 수면/운동/식사/휴식 행동 3개 (근거 1줄씩)",
    "- 피로·스트레스 트리거: 최대 2개 + 근거",
    "- 회복/케어 팁: 최대 2개 + 근거",
    "- 안전 문구: '건강 문제는 전문 의료진 상담 권장' 1줄 포함",
    "- 교차 하이라이트: 동양+서양 교차 포인트 최소 3개 (예: 오행↔행성/사인 엘리먼트, 장기/연간 흐름↔주요 트랜짓, 에너지 분포↔하우스 역할). signals/cross_summary 활용",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 150~200단어 내. 진단/치료/약물 언급 금지.",
    "근거 소스: 동양 오행/에너지분포/장기흐름·특수에너지 + 점성 달/금성/화성, 1/6/12하우스, 트랜짓 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
