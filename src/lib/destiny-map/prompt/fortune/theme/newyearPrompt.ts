import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildNewyearPrompt(lang: string, data: CombinedResult) {
  const theme = "newyear";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
    `Locale: ${lang}`,
    "Task: Write a fresh-start / new-year style outlook using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 concise paragraphs (fresh energy, main focus, caution).",
    "- Reference daeun/annual/monthly timing if present to pace the year.",
    "- Include one intention-setting suggestion (one sentence).",
    "- Keep under 180 words; encouraging, not predictive.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
