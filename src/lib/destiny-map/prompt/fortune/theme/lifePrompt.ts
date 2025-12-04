import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildLifePrompt(lang: string, data: CombinedResult) {
  const theme = "life";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
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
