import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * Build a compact, language-agnostic data snapshot for the fortune prompts.
 * Kept intentionally short to reduce token usage while giving solid anchors.
 */
export function buildAllDataPrompt(lang: string, theme: string, data: CombinedResult) {
  const { astrology = {}, saju } = data ?? {};
  const {
    planets = [],
    houses = {},
    aspects = [],
    ascendant,
    mc,
    facts,
    meta,
    options,
  } = astrology as any;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = saju ?? {} as any;

  const planetLines = planets
    .slice(0, 8)
    .map((p: any) => `${p.name ?? "?"}: ${p.sign ?? "-"}${p.house ? ` (House ${p.house})` : ""}`)
    .join("; ");

  const houseLines = Object.entries(houses ?? {})
    .slice(0, 6)
    .map(([num, val]: any) => `House ${num}: ${val?.sign ?? "-"}`)
    .join("; ");

  const aspectLines = aspects
    .slice(0, 6)
    .map(
      (a: any) =>
        `${a.type ?? ""}: ${a.from?.name ?? "?"} -> ${a.to?.name ?? "?"} (${a.aspect ?? ""}, orb=${a.orb?.toFixed?.(2) ?? "?"})`
    )
    .join("; ");

  const elements = Object.entries(facts?.elementRatios ?? {})
    .map(([k, v]) => `${k}:${(v as number).toFixed?.(2) ?? v}`)
    .join(", ");

  // Pillars now have heavenlyStem/earthlyBranch format
  const formatPillar = (p: any) => {
    if (!p) return null;
    const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || '';
    const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || '';
    return stem && branch ? `${stem}${branch}` : null;
  };
  const pillarParts = [
    formatPillar(pillars?.year),
    formatPillar(pillars?.month),
    formatPillar(pillars?.day),
    formatPillar(pillars?.time),
  ].filter(Boolean);
  const pillarText = pillarParts.join(" / ") || "-";

  const daeun = (unse?.daeun ?? [])
    .slice(0, 4)
    .map((u: any) => `${u.startYear}-${u.endYear}:${u.name ?? "-"}`)
    .join("; ");

  const annual = (unse?.annual ?? [])
    .slice(0, 2)
    .map((u: any) => `${u.year}:${u.element ?? "-"}`)
    .join("; ");

  const monthly = (unse?.monthly ?? [])
    .slice(0, 2)
    .map((u: any) => `${u.year}-${String(u.month).padStart(2, "0")}:${u.element ?? "-"}`)
    .join("; ");

  const lucky = ((sinsal as any)?.luckyList ?? []).map((x: any) => x.name).join(", ");
  const unlucky = ((sinsal as any)?.unluckyList ?? []).map((x: any) => x.name).join(", ");

  return [
    `[DATA SNAPSHOT - ${theme}]`,
    `Locale: ${lang}`,
    `Asc: ${ascendant?.sign ?? "-"} | MC: ${mc?.sign ?? "-"}`,
    `Sun: ${planets.find((p: any) => p.name === "Sun")?.sign ?? "-"} | Moon: ${
      planets.find((p: any) => p.name === "Moon")?.sign ?? "-"
    } | Venus: ${planets.find((p: any) => p.name === "Venus")?.sign ?? "-"}`,
    `Elements: ${elements || "-"}`,
    `Planets: ${planetLines || "-"}`,
    `Houses: ${houseLines || "-"}`,
    `Aspects: ${aspectLines || "-"}`,
    `Day Master: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})`,
    `Pillars: ${pillarText}`,
    `Daeun: ${daeun || "-"}`,
    `Annual: ${annual || "-"}`,
    `Monthly: ${monthly || "-"}`,
    `Lucky: ${lucky || "-"}`,
    `Unlucky: ${unlucky || "-"}`,
    `Engine: ${meta?.engine ?? "-"} | Opts: ${JSON.stringify(options ?? {})}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const buildBasePrompt = buildAllDataPrompt;
