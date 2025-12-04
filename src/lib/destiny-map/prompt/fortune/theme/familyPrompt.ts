import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

export function buildFamilyPrompt(lang: string, data: CombinedResult) {
  const theme = "family";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return [
    `Date: ${dateText}`,
    `Locale: ${lang}`,
    "Task: Write a concise family/home reading using the snapshot below. Respond in the target locale.",
    "Guidelines:",
    "- 3 short paragraphs (home atmosphere, roles/communication, practical support).",
    "- Use houses/asc/MC plus saju pillars/unse timing if present.",
    "- Include one actionable suggestion to improve harmony (one sentence).",
    "- Keep under 170 words; sensitive, non-judgmental; no medical/legal advice.",
    tone,
    info,
    `Respond in ${lang}.`,
  ].join("\n");
}
