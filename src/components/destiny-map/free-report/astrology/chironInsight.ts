import { createSignInsight } from './utils';
import { chironMessages } from './data';
import {
  getChironSignInterpretation,
  getChironHouseInterpretation,
} from '@/lib/astrology/extraPointInterpretations';
import type { ZodiacName } from '@/lib/astrology/interpretations';
import type { AstroData } from '../types';

function toZodiacName(raw: unknown): ZodiacName | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  const valid = new Set([
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ])
  return valid.has(normalized) ? (normalized as ZodiacName) : null
}

export function getChironInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string } | null {
  const chiron = astro?.extraPoints?.chiron as { sign?: string; house?: number } | undefined;
  if (!chiron?.sign) return null

  const isKo = lang === 'ko'
  const langCode = isKo ? 'ko' : 'en'
  const zodiac = toZodiacName(chiron.sign)
  const houseRaw = chiron.house
  const houseNum =
    typeof houseRaw === 'number' && houseRaw >= 1 && houseRaw <= 12
      ? (houseRaw as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)
      : null

  // Prefer the canonical interpretation DB (extraPointInterpretations.ts,
  // 12 signs × 12 houses for Chiron) — it carries the detailed text the
  // short chironMessages table can't fit. Fall back to the simple data
  // table when the sign isn't a recognized western zodiac.
  if (zodiac) {
    const signText = getChironSignInterpretation(zodiac, langCode)
    const houseText = houseNum ? getChironHouseInterpretation(houseNum, langCode) : null
    const message = houseText ? `${signText}. ${houseText}.` : `${signText}.`
    return {
      title: isKo ? '치유 포인트 (Chiron)' : 'Healing Point (Chiron)',
      message,
      emoji: '💫',
    }
  }

  return createSignInsight(
    chiron.sign,
    chironMessages,
    '치유 포인트 (Chiron)',
    'Healing Point (Chiron)',
    '💫',
    lang,
  );
}
