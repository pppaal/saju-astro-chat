import { buildAllDataPrompt } from "../base";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Family/Home prompt (동양+서양 교차 전용, 섹션 고정)
export function buildFamilyPrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "family";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 동양+서양 교차 근거로 가족/홈 리딩 작성. 각 조언에 근거 1줄 포함, 섹션 누락 금지.",
    "[Sections - 모두 포함]",
    "- 한줄요약: 가정/관계 분위기 2~3줄",
    "- 소통/역할: 기대/경계 2줄 (근거)",
    "- 협력 행동: 오늘·이번주 실천 3개",
    "- 리스크: 최대 2개 (갈등 트리거) + 근거",
    "- 기회: 최대 2개 (화합/도움 타이밍) + 근거",
    "- 교차 하이라이트: 동양+서양 교차 포인트 최소 3개 (예: 오행↔행성/사인 엘리먼트, 장기/연간 흐름↔주요 트랜짓, 에너지 분포↔하우스 역할). signals/cross_summary 활용",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 170~220단어 내. 비난/단정 금지.",
    "근거 소스: 동양(오행/에너지분포/장기흐름, 가족 특수에너지) + 점성(4/7/10하우스, 달/금성/토성, 트랜짓) 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
