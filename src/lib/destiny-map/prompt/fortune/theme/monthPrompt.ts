import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildMonthPrompt(lang: string, data: CombinedResult) {
  const theme = "month";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
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
