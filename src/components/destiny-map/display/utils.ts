// src/components/destiny-map/display/utils.ts

import type { StructuredFortune } from "./types";

// Try to parse JSON from interpretation text
export function tryParseStructured(text: string): StructuredFortune | null {
  if (!text) {return null;}

  let cleanText = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.lifeTimeline || parsed.categoryAnalysis || parsed.keyInsights) {
        return parsed as StructuredFortune;
      }
    }

    if (cleanText.includes('"lifeTimeline"') || cleanText.includes('"categoryAnalysis"')) {
      if (!cleanText.startsWith('{')) {
        cleanText = '{' + cleanText;
      }
      if (!cleanText.endsWith('}')) {
        cleanText = cleanText + '}';
      }

      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.lifeTimeline || parsed.categoryAnalysis || parsed.keyInsights) {
          return parsed as StructuredFortune;
        }
      } catch {
        // Continue to fallback
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Helper to find theme data with case-insensitive key matching
export const findThemeData = (themes: Record<string, unknown> | undefined, themeKey: string) => {
  if (!themes || !themeKey) {return undefined;}
  if (themes[themeKey]) {return { key: themeKey, data: themes[themeKey] };}
  const normalizedKey = themeKey.toLowerCase();
  const matchingKey = Object.keys(themes).find(k => k.toLowerCase() === normalizedKey);
  if (matchingKey) {return { key: matchingKey, data: themes[matchingKey] };}
  return undefined;
};
