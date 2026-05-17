import { createHouseInsight } from './utils';
import { fortuneHouseMessages } from './data';
import {
  getPartOfFortuneSignInterpretation,
  getPartOfFortuneHouseInterpretation,
} from '@/lib/astrology/pofVertexInterpretations';
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

export function getPartOfFortuneInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const pof = astro?.extraPoints?.partOfFortune as { sign?: string; house?: number } | undefined;
  if (!pof) return null

  const isKo = lang === 'ko'
  const langCode = isKo ? 'ko' : 'en'
  const zodiac = toZodiacName(pof.sign)
  const houseNum =
    typeof pof.house === 'number' && pof.house >= 1 && pof.house <= 12
      ? Math.trunc(pof.house)
      : null

  // Prefer the canonical pofVertexInterpretations DB (sign 12 + house 12,
  // ko + en). Sign + house both available → combined message. Either alone
  // also works. Falls back to the legacy fortuneHouseMessages table when
  // the sign isn't a recognized western zodiac.
  if (zodiac || houseNum) {
    const signText = zodiac ? getPartOfFortuneSignInterpretation(zodiac, langCode) : null
    const houseText = houseNum ? getPartOfFortuneHouseInterpretation(houseNum, langCode) : null
    const parts = [signText, houseText].filter(Boolean) as string[]
    return {
      title: isKo ? '행운의 포인트' : 'Fortune Point',
      message: parts.join('. ') + (parts.length > 0 ? '.' : ''),
      emoji: '🍀',
      house: houseNum ?? 0,
    }
  }

  return createHouseInsight(
    pof.house,
    fortuneHouseMessages,
    '행운의 포인트',
    'Fortune Point',
    lang,
  );
}
