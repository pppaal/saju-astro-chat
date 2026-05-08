import { buildAllDataPrompt } from "../base";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/counselor/astrology";

// 빠른 분석용 최소 데이터 (토큰 절약)
function buildQuickData(data: CombinedResult): string {
  const { astrology = {}, saju } = data ?? {};
  const { planets = [], ascendant } = astrology as { planets?: unknown[]; ascendant?: unknown };
  const { pillars, dayMaster, unse } = saju ?? {} as { pillars?: unknown; dayMaster?: unknown; unse?: unknown };

  const sun = planets.find((p: unknown) => (p as { name?: string }).name === "Sun");
  const moon = planets.find((p: unknown) => (p as { name?: string }).name === "Moon");

  const formatPillar = (p: unknown) => {
    if (!p) {return "-";}
    const pillar = p as { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } };
    const stem = pillar.heavenlyStem?.name || "";
    const branch = pillar.earthlyBranch?.name || "";
    return stem && branch ? `${stem}${branch}` : "-";
  };

  // 대운 정보 추출 (배열 또는 객체 형태 모두 처리)
  interface DaeunEntry { isCurrent?: boolean; ganji?: string }
  const unseObj = unse as { daeun?: DaeunEntry[] | { current?: { ganji?: string } }; annual?: Array<{ ganji?: string }> } | undefined;
  const currentDaeun = Array.isArray(unseObj?.daeun)
    ? (unseObj.daeun as DaeunEntry[]).find((d) => d.isCurrent)?.ganji
    : (unseObj?.daeun as { current?: { ganji?: string } })?.current?.ganji;

  const dayMasterObj = dayMaster as { name?: string; element?: string } | undefined;
  const pillarsObj = pillars as { year?: unknown; month?: unknown; day?: unknown; time?: unknown } | undefined;
  const sunObj = sun as { sign?: string; house?: number } | undefined;
  const moonObj = moon as { sign?: string; house?: number } | undefined;
  const ascendantObj = ascendant as { sign?: string } | undefined;

  return [
    "=== CORE DATA (요약) ===",
    `Day Master: ${dayMasterObj?.name || "-"} (${dayMasterObj?.element || "-"})`,
    `Four Pillars: ${formatPillar(pillarsObj?.year)} / ${formatPillar(pillarsObj?.month)} / ${formatPillar(pillarsObj?.day)} / ${formatPillar(pillarsObj?.time)}`,
    `현재 장기 흐름: ${currentDaeun || "-"}`,
    `올해 연간 흐름: ${unseObj?.annual?.[0]?.ganji || "-"}`,
    `Sun: ${sunObj?.sign || "-"} House${sunObj?.house || "?"}`,
    `Moon: ${moonObj?.sign || "-"} House${moonObj?.house || "?"}`,
    `Asc: ${ascendantObj?.sign || "-"}`,
  ].join("\n");
}

// Life path prompt (동양+서양 교차 전용, 섹션 고정)
export function buildLifePrompt(lang: string, data: CombinedResult, useStructured = true) {
  // Use structured JSON prompt for comprehensive cross-analysis
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "life", data);
  }

  // 빠른 분석 모드 - 최소 데이터만 사용
  const quickData = buildQuickData(data);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
    `Lang: ${lang}`,
    "",
    "⚠️ CRITICAL: Output ONLY plain markdown. NO JSON. Keep under 200 words.",
    "",
    quickData,
    "",
    "=== TASK ===",
    "위 데이터로 간단한 인생 리딩 작성. 마크다운 형식:",
    "",
    "## 🌟 핵심 정체성 (2줄)",
    "## 📍 현재 흐름 (2줄)",
    "## 💪 강점 & 기회 (불릿 3개)",
    "## ⚠️ 주의점 (불릿 2개)",
    "## 💡 실행 조언 (불릿 2개)",
    "",
    `응답: ${lang}. 마크다운만. JSON 금지.`,
  ].join("\n");
}
