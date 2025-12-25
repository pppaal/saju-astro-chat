import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// 빠른 분석용 최소 데이터 (토큰 절약)
function buildQuickData(data: CombinedResult): string {
  const { astrology = {}, saju } = data ?? {};
  const { planets = [], ascendant } = astrology as any;
  const { pillars, dayMaster, unse } = saju ?? {} as any;

  const sun = planets.find((p: any) => p.name === "Sun");
  const moon = planets.find((p: any) => p.name === "Moon");

  const formatPillar = (p: any) => {
    if (!p) return "-";
    const stem = p.heavenlyStem?.name || "";
    const branch = p.earthlyBranch?.name || "";
    return stem && branch ? `${stem}${branch}` : "-";
  };

  // 대운 정보 추출 (배열 또는 객체 형태 모두 처리)
  const currentDaeun = Array.isArray(unse?.daeun)
    ? (unse.daeun as any[]).find((d: any) => d.isCurrent)?.ganji
    : (unse?.daeun as any)?.current?.ganji;

  return [
    "=== CORE DATA (요약) ===",
    `Day Master: ${dayMaster?.name || "-"} (${dayMaster?.element || "-"})`,
    `Four Pillars: ${formatPillar(pillars?.year)} / ${formatPillar(pillars?.month)} / ${formatPillar(pillars?.day)} / ${formatPillar(pillars?.time)}`,
    `현재 장기 흐름: ${currentDaeun || "-"}`,
    `올해 연간 흐름: ${(unse as any)?.annual?.[0]?.ganji || "-"}`,
    `Sun: ${sun?.sign || "-"} House${sun?.house || "?"}`,
    `Moon: ${moon?.sign || "-"} House${moon?.house || "?"}`,
    `Asc: ${ascendant?.sign || "-"}`,
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
