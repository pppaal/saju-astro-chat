// src/lib/destiny-map/prompt/fortune/base/toneStyle.ts
// Short, English-only tone guidance to reduce token usage and avoid conflicts.

export function buildTonePrompt(lang: string, theme: string) {
  // Common narrative tone: imagery, concise, no medical/legal/financial claims.
  const common = `
- Write as a flowing narrative, not a report or list.
- Show through imagery and sensory detail; avoid bullet lists.
- Keep paragraphs short; vary rhythm; no fortune-teller clichés.
- No medical/legal/financial advice; self-help/entertainment tone only.
- Keep it under ~800 characters unless otherwise requested.`;

  const themeTone: Record<string, string> = {
    love: "Theme: love/relationships. Warm, sincere, with healthy boundaries and timing.",
    career: "Theme: career. Pragmatic, timing-aware, collaboration-minded.",
    family: "Theme: family. Supportive, communicative, steady.",
    health: "Theme: wellbeing. Moderation, rest, seek professionals for medical needs.",
    year: "Theme: yearly arc. Big-picture, pacing, gentle cautions.",
    month: "Theme: monthly. Key themes/dates, concise outlook.",
    today: "Theme: daily. Short, actionable feel.",
    newyear: "Theme: new year. Fresh start, intentions, pacing.",
  };

  const t = themeTone[theme] ?? "";
  return `${t}\n${common}`.trim();
}
