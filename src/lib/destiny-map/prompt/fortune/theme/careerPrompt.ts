// Career prompt
import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildCareerPrompt(lang: string, data: CombinedResult, useStructured = true) {
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "career", data);
  }

  // Legacy format fallback
  const theme = "career";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : '';

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "Task: Write a concise career reading using the astrology + saju snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 short paragraphs max (identity/strengths, current momentum, next moves).",
    "- Use timing from daeun/annual/monthly if present (near-term and medium-term).",
    "- Include one actionable step (one sentence).",
    "- Keep under 180 words; no fluff; no medical/legal/financial advice.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
