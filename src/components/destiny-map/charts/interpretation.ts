// One combined plain-language read for the destiny chart header — sourced from
// the report engine (일주 archetype dictionary + planet-in-sign lines), woven
// into a single natural paragraph (동양 + 서양 together).

import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import {
  getPlanetSignInterpretation,
  type ZodiacName,
  type AstroPlanetName,
} from '@/lib/astrology/interpretations'

type AnyObj = Record<string, unknown>

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

// 받침 유무로 을/를 골라 자연스러운 조사를 붙인다
function hasJong(s: string): boolean {
  const ch = s.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
const eulReul = (s: string) => `${s}${hasJong(s) ? '을' : '를'}`

const ZODIAC: ZodiacName[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
function signFromLon(lon?: number): ZodiacName | null {
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  return ZODIAC[Math.floor((((lon % 360) + 360) % 360) / 30)] ?? null
}

/** 동양(일주 archetype) + 서양(태양·달 사인) woven into one natural sentence. */
export function chartInterpretation(saju: unknown, astro: unknown, isKo: boolean): string {
  // ── 동양: 일주 archetype ──
  let sajuPart = ''
  if (saju && typeof saju === 'object') {
    const s = saju as AnyObj
    const dp = (s.dayPillar ?? (s.pillars as AnyObj | undefined)?.day) as
      | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
      | undefined
    const stem = dp?.heavenlyStem?.name
    const branch = dp?.earthlyBranch?.name
    const arch = stem && branch ? getIljuArchetype(stem, branch) : null
    if (arch) sajuPart = isKo ? `타고난 본질은 ${arch.character}.` : `At the core, ${lower(arch.character_en)}`
  }

  // ── 서양: 태양·달 sign lines ──
  let astroPart = ''
  if (astro && typeof astro === 'object') {
    const a = astro as AnyObj
    const planets = Array.isArray(a.planets) ? (a.planets as Array<{ name?: string; longitude?: number }>) : []
    const lonOf = (n: string) => planets.find((p) => p.name === n)?.longitude
    const lang = isKo ? 'ko' : 'en'
    const sigLine = (planet: AstroPlanetName, lon?: number) => {
      const sign = signFromLon(lon)
      return sign ? getPlanetSignInterpretation(planet, sign, lang) : ''
    }
    const sun = sigLine('Sun', lonOf('Sun'))
    const moon = sigLine('Moon', lonOf('Moon'))
    if (isKo) {
      if (sun && moon) astroPart = `겉으로는 ${eulReul(sun)} 드러내고, 속으로는 ${eulReul(moon)} 품고 있어요.`
      else if (sun) astroPart = `겉으로는 ${eulReul(sun)} 드러내요.`
      else if (moon) astroPart = `속으로는 ${eulReul(moon)} 품고 있어요.`
    } else {
      if (sun && moon) astroPart = `Outwardly ${lower(sun)}; inwardly ${lower(moon)}.`
      else if (sun || moon) astroPart = `${sun || moon}.`
    }
  }

  return [sajuPart, astroPart].filter(Boolean).join(' ')
}
