import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildMonthPrompt(lang: string, data: CombinedResult, useStructured = true) {
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "month", data);
  }

  // Legacy format fallback
  const theme = "month";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : '';

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "Task: Write a monthly outlook using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 2–3 concise paragraphs (overall tone, key opportunities, caution).",
    "- Call out specific weeks/days if monthly/annual/daeun data suggests it.",
    "- Include one practical focus for this month (one sentence).",
    "- Keep under 150 words; no medical/legal/financial advice.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
