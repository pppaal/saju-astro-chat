import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Love/Relationship prompt (사주+점성 교차 전용, 섹션 고정)
export function buildLovePrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "love";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 사주+점성 교차 근거만으로 사랑/관계 리딩 작성. 각 조언에 근거 1줄(사주/점성) 포함, 섹션 누락 금지.",
    "[Sections - 모두 포함]",
    "- 한줄요약: 현재 분위기 + 핵심 기회/주의 2~3줄",
    "- 타이밍: 좋은 시간/요일 1~2개, 피할 타이밍 1~2개 (근거 1줄씩)",
    "- 소통/경계 팁: 2~3개 (칭찬/경청/경계 등)",
    "- 행동 가이드: 오늘·이번주 할 일 3개",
    "- 리스크: 최대 2개 (오해 트리거/갈등 요인) + 근거",
    "- 기회: 최대 2개 (가까워질 순간/회복 타이밍) + 근거",
    "- 교차 하이라이트: 사주+점성 교차 포인트 최소 3개 (예: 일주 오행↔행성/사인 엘리먼트, 대운/연운↔주요 트랜짓, 십신↔하우스 역할). signals/cross_summary 활용",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 180~220단어 내. 과도한 약속/운명론 금지.",
    "근거 소스: 사주(오행/십신/대운/신살) + 점성(금성/달/화성, 5/7/8하우스, 트랜짓) 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
