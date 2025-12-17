// Career prompt
import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Career prompt (사주+점성 교차 전용, 섹션 고정)
export function buildCareerPrompt(lang: string, data: CombinedResult, _useStructured = true) {
  const theme = "career";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "[Task] 사주+점성 교차 근거만으로 커리어 리딩을 작성. 모든 섹션을 순서대로 채우고, 각 조언에 근거 1줄(사주/점성) 포함.",
    "[Sections - 모두 포함]",
    "- 한줄요약: 현재 흐름 + 핵심 기회/주의 2~3줄",
    "- 타이밍: 오늘/이번주/이번달에 좋은 시간·요일 1~2개, 피할 타이밍 1~2개 (근거 1줄씩)",
    "- 액션 3개: 업무/네트워킹/학습/협상 등 즉시 실행",
    "- 협업/관계: 잘 맞는 유형 1줄, 피해야 할 패턴 1줄",
    "- 리스크: 최대 2개 (지연/충돌/오버커밋 등) + 근거",
    "- 기회: 최대 2개 (런칭/협상/성과) + 근거",
    "- 교차 하이라이트: 사주+점성 교차 포인트 최소 3개 (예: 일주 오행↔행성/사인 엘리먼트, 대운/연운↔주요 트랜짓, 십신↔하우스 역할). signals/cross_summary 활용",
    "- 오늘·이번주 포커스: 가장 중요한 한 줄",
    "- 리마인더: 짧은 마무리 문장 1개",
    "FORMAT: 헤더 명시, 불릿 2~3개 제한, 200~250단어 이내. 금전/법률/의료 확정적 표현 금지.",
    "근거 소스: 사주(오행/십신/대운/신살) + 점성(행성/하우스/트랜짓) 교차만 사용.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
