import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildTodayPrompt(lang: string, data: CombinedResult, useStructured = true) {
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "today", data);
  }

  // Legacy format fallback
  const theme = "today";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : '';

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "Task: Write a short daily reading using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 2 paragraphs max (mood/tone, micro-action).",
    "- Mention any same-day cues from monthly/annual data if relevant.",
    "- Include one actionable tip that is safe and simple (one sentence).",
    "- Keep under 120 words; light and supportive.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
