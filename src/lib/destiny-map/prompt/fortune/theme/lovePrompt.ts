import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildLovePrompt(lang: string, data: CombinedResult) {
  const theme = "love";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
    `Locale: ${lang}`,
    "Task: Write a concise love/relationship reading using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 short paragraphs (attraction style, current dynamic/timing, advice/boundaries).",
    "- Use Venus/Moon/Mars hints and daeun/annual/monthly timing if present.",
    "- Include one healthy communication or boundary tip (one sentence).",
    "- Keep under 170 words; no medical/legal/financial advice.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
