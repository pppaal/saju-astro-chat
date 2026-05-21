// One-line interpretation for the destiny chart header — sourced from the
// report engine (일주 archetype dictionary + planet-in-sign interpretations),
// not ad-hoc templates.

import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import {
  getPlanetSignInterpretation,
  type ZodiacName,
  type AstroPlanetName,
} from '@/lib/astrology/interpretations'

type AnyObj = Record<string, unknown>

/** 동양 — 일주(day-pillar) archetype one-liner from the engine dictionary. */
export function sajuInterpretation(saju: unknown, isKo: boolean): string {
  if (!saju || typeof saju !== 'object') return ''
  const s = saju as AnyObj
  const dayPillar = (s.dayPillar ?? (s.pillars as AnyObj | undefined)?.day) as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  const stem = dayPillar?.heavenlyStem?.name
  const branch = dayPillar?.earthlyBranch?.name
  if (!stem || !branch) return ''
  const arch = getIljuArchetype(stem, branch)
  if (!arch) return ''
  return isKo ? arch.character : arch.character_en
}

const ZODIAC: ZodiacName[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
function signFromLon(lon?: number): ZodiacName | null {
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  return ZODIAC[Math.floor((((lon % 360) + 360) % 360) / 30)] ?? null
}

/** 서양 — Sun + Moon (+ Ascendant) sign interpretations from the engine. */
export function astroInterpretation(astro: unknown, isKo: boolean): string {
  if (!astro || typeof astro !== 'object') return ''
  const a = astro as AnyObj
  const planets = Array.isArray(a.planets) ? (a.planets as Array<{ name?: string; longitude?: number }>) : []
  const lonOf = (name: string) => planets.find((p) => p.name === name)?.longitude
  const lang = isKo ? 'ko' : 'en'

  const line = (planet: AstroPlanetName, lon?: number, koLabel?: string, enLabel?: string) => {
    const sign = signFromLon(lon)
    if (!sign) return ''
    const body = getPlanetSignInterpretation(planet, sign, lang)
    const label = isKo ? koLabel : enLabel
    return label ? `${label} ${body}` : body
  }

  const parts = [
    line('Sun', lonOf('Sun'), '태양:', 'Sun:'),
    line('Moon', lonOf('Moon'), '달:', 'Moon:'),
  ].filter(Boolean)
  return parts.join(' · ')
}
