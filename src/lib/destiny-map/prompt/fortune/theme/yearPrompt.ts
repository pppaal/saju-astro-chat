import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildThisYearPrompt(lang: string, data: CombinedResult, useStructured = true) {
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "year", data);
  }

  // Legacy format fallback
  const theme = "year";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : '';

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "Task: Write a yearly outlook using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 concise paragraphs (overall arc, key opportunities, cautions).",
    "- Use daeun/annual/monthly timing to mark near-term vs later-in-year themes.",
    "- Include one strategic focus for the year (one sentence).",
    "- Keep under 190 words; balanced and pragmatic.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
