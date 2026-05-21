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
  return isKo ? `당신은 ${arch.character}, 그런 사람이에요.` : `At the core, ${lower(arch.character_en)}`
}

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

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
  const signLine = (planet: AstroPlanetName, lon?: number) => {
    const sign = signFromLon(lon)
    return sign ? getPlanetSignInterpretation(planet, sign, lang) : ''
  }
  const sun = signLine('Sun', lonOf('Sun'))
  const moon = signLine('Moon', lonOf('Moon'))
  if (!sun && !moon) return ''

  if (isKo) {
    if (sun && moon) return `겉으로는 ${sun}, 속으로는 ${moon}, 그런 결이에요.`
    return `${sun || moon}, 그런 결이에요.`
  }
  if (sun && moon) return `Outwardly ${lower(sun)}; inwardly ${lower(moon)}.`
  return `${sun || moon}.`
}
