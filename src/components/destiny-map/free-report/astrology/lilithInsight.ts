import { createSignInsight } from './utils';
import { lilithMessages } from './data';
import {
  getLilithSignInterpretation,
  getLilithHouseInterpretation,
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

export function getLilithInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string } | null {
  const lilith = astro?.extraPoints?.lilith as { sign?: string; house?: number } | undefined;
  if (!lilith?.sign) return null

  const isKo = lang === 'ko'
  const langCode = isKo ? 'ko' : 'en'
  const zodiac = toZodiacName(lilith.sign)
  const houseRaw = lilith.house
  const houseNum =
    typeof houseRaw === 'number' && houseRaw >= 1 && houseRaw <= 12
      ? (houseRaw as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)
      : null

  if (zodiac) {
    const signText = getLilithSignInterpretation(zodiac, langCode)
    const houseText = houseNum ? getLilithHouseInterpretation(houseNum, langCode) : null
    const message = houseText ? `${signText}. ${houseText}.` : `${signText}.`
    return {
      title: isKo ? '숨겨진 욕망 (Lilith)' : 'Hidden Desires (Lilith)',
      message,
      emoji: '🌒',
    }
  }

  return createSignInsight(
    lilith.sign,
    lilithMessages,
    '숨겨진 욕망 (Lilith)',
    'Hidden Desires (Lilith)',
    '🌒',
    lang,
  );
}
