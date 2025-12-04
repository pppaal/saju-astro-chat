import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildHealthPrompt(lang: string, data: CombinedResult) {
  const theme = "health";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
    `Locale: ${lang}`,
    "Task: Write a wellbeing-oriented reading (not medical advice) using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 2–3 short paragraphs (energy pattern, stress/load, sustainable habits).",
    "- Use element balance, Moon/Venus/Mars cues, and timing if available.",
    "- Give one gentle lifestyle suggestion; remind to consult professionals for health issues.",
    "- Keep under 160 words; no diagnoses, no cures.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
