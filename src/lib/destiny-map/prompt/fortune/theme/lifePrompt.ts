import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import { buildStructuredFortunePrompt } from "../base/structuredPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildLifePrompt(lang: string, data: CombinedResult, useStructured = true) {
  if (useStructured) {
    return buildStructuredFortunePrompt(lang, "life", data);
  }

  // Legacy format fallback
  const theme = "life";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : '';

  return [
    `Date: ${dateText}${tzInfo}`,
    `Locale: ${lang}`,
    "Task: Write a holistic life path reading (identity, growth, direction) using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 paragraphs max (core identity, current arc, next focus).",
    "- Tie astrology + saju signals together; mention timing if daeun/annual/monthly exist.",
    "- Offer one gentle next step for alignment (one sentence).",
    "- Keep under 180 words; inspirational, not deterministic.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
