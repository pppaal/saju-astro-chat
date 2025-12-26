import { harmonicTalents } from './data';
import type { AstroData, HarmonicsProfile } from '../types';

export function getHarmonicsInsight(astro: AstroData | undefined, lang: string): { title: string; talents: string[]; emoji: string } | null {
  const isKo = lang === "ko";
  const harmonics = astro?.harmonics?.profile;
  if (!harmonics || !Array.isArray(harmonics)) return null;

  const talents: string[] = [];

  harmonics.forEach((h: HarmonicsProfile) => {
    if (!h.harmonic || !h.emphasis) return;
    const talent = harmonicTalents[h.harmonic];
    if (talent) {
      talents.push(isKo ? talent.ko : talent.en);
    }
  });

  if (talents.length === 0) return null;

  return {
    title: isKo ? "숨겨진 재능" : "Hidden Talents",
    talents,
    emoji: "💎"
  };
}
