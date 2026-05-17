import { createHouseInsight } from './utils';
import { vertexHouseMessages } from './data';
import { getVertexSignInterpretation } from '@/lib/astrology/pofVertexInterpretations';
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

export function getVertexInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const vertex = astro?.extraPoints?.vertex as { sign?: string; house?: number } | undefined;
  if (!vertex) return null

  const isKo = lang === 'ko'
  const zodiac = toZodiacName(vertex.sign)
  const houseNum =
    typeof vertex.house === 'number' && vertex.house >= 1 && vertex.house <= 12
      ? Math.trunc(vertex.house)
      : null

  // Pull the sign interpretation from the canonical DB
  // (pofVertexInterpretations). The DB only has signs for Vertex; house
  // text continues to come from the legacy vertexHouseMessages table so
  // a combined message stays readable.
  const houseFallback = createHouseInsight(
    vertex.house,
    vertexHouseMessages,
    '운명적 만남 포인트',
    'Fated Encounter Point',
    lang,
  )

  if (!zodiac) return houseFallback

  const signText = getVertexSignInterpretation(zodiac, isKo ? 'ko' : 'en')
  const houseText = houseFallback?.message ?? null
  return {
    title: isKo ? '운명적 만남 포인트' : 'Fated Encounter Point',
    message: houseText ? `${signText}. ${houseText}` : `${signText}.`,
    emoji: houseFallback?.emoji ?? '✨',
    house: houseNum ?? 0,
  }
}
