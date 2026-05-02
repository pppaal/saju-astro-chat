/**
 * Match Profile — pre-computed compatibility "fingerprint" for a user.
 *
 * Built once from BirthInfo (saju calc + natal chart), then matching
 * compares two profiles directly without re-computing astro charts.
 * ~1KB per profile, intended to be cached in DB or Redis.
 */

import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import type { Chart } from '@/lib/astrology/foundation/types'

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type YinYang = 'yang' | 'yin'

export interface BirthInfo {
  date: string // YYYY-MM-DD
  time?: string // HH:mm (defaults to 12:00 if missing)
  gender?: 'male' | 'female'
  latitude?: number
  longitude?: number
  timeZone?: string
}

export interface PlanetSummary {
  sign: string
  element: 'fire' | 'earth' | 'air' | 'water'
  longitude: number
}

export interface MatchProfile {
  /** Stable identity (DB pk or hash of birth info) */
  key: string

  /** Saju layer */
  saju: {
    dayMasterName: string
    dayMasterEl: Element
    yinYang: YinYang
    monthBranch: string
    elements: Record<Element, number>
  }

  /** Astrology layer */
  astro: {
    sun: PlanetSummary
    moon: PlanetSummary
    venus: PlanetSummary
    mars: PlanetSummary
    mercury: PlanetSummary | null
    ascendant: { sign: string; element: PlanetSummary['element'] } | null
  }

  /** Original birth info for traceability */
  birth: BirthInfo
  computedAt: string
  version: number
}

const PROFILE_VERSION = 1

const ZODIAC_TO_ELEMENT: Record<string, PlanetSummary['element']> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

function normalizeElement(el?: string): Element {
  if (!el) return 'earth'
  const lower = el.toLowerCase()
  if (lower === 'wood' || lower === 'fire' || lower === 'earth' || lower === 'metal' || lower === 'water') {
    return lower
  }
  // Korean fallback
  if (el === '목') return 'wood'
  if (el === '화') return 'fire'
  if (el === '토') return 'earth'
  if (el === '금') return 'metal'
  if (el === '수') return 'water'
  return 'earth'
}

function planetFromChart(chart: Chart, name: string): PlanetSummary | null {
  const p = chart.planets.find((x) => x.name === name)
  if (!p) return null
  return {
    sign: p.sign,
    element: ZODIAC_TO_ELEMENT[p.sign] || 'earth',
    longitude: p.longitude,
  }
}

function buildKey(birth: BirthInfo): string {
  return `${birth.date}|${birth.time || '12:00'}|${birth.gender || 'unknown'}`
}

/**
 * Build a complete MatchProfile from raw birth info.
 *
 * Heavy operation (~300-500ms first time, cached after) — call once
 * per user, store the result. All downstream tier scoring runs against
 * the cached profile, not raw birth info.
 */
export async function buildMatchProfile(birth: BirthInfo): Promise<MatchProfile> {
  const time = birth.time || '12:00'
  const tz = birth.timeZone || 'Asia/Seoul'
  const lat = birth.latitude ?? 37.5665
  const lon = birth.longitude ?? 126.978
  const gender = birth.gender || 'male'

  // Saju
  const saju = calculateSajuData(birth.date, time, gender, 'solar', tz)

  // Astrology
  const [year, month, day] = birth.date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const natal = await calculateNatalChart({
    year,
    month,
    date: day,
    hour: hour || 12,
    minute: minute || 0,
    latitude: lat,
    longitude: lon,
    timeZone: tz,
  })
  const chart = natal as unknown as Chart

  return {
    key: buildKey(birth),
    saju: {
      dayMasterName: saju.dayMaster.name,
      dayMasterEl: normalizeElement(saju.dayMaster.element),
      yinYang: saju.dayMaster.yin_yang === '양' ? 'yang' : 'yin',
      monthBranch: saju.monthPillar.earthlyBranch.name,
      elements: {
        wood: saju.fiveElements?.wood || 0,
        fire: saju.fiveElements?.fire || 0,
        earth: saju.fiveElements?.earth || 0,
        metal: saju.fiveElements?.metal || 0,
        water: saju.fiveElements?.water || 0,
      },
    },
    astro: {
      sun: planetFromChart(chart, 'Sun') || {
        sign: 'Aries',
        element: 'fire',
        longitude: 0,
      },
      moon: planetFromChart(chart, 'Moon') || {
        sign: 'Cancer',
        element: 'water',
        longitude: 0,
      },
      venus: planetFromChart(chart, 'Venus') || {
        sign: 'Taurus',
        element: 'earth',
        longitude: 0,
      },
      mars: planetFromChart(chart, 'Mars') || {
        sign: 'Aries',
        element: 'fire',
        longitude: 0,
      },
      mercury: planetFromChart(chart, 'Mercury'),
      ascendant: chart.ascendant
        ? {
            sign: chart.ascendant.sign,
            element: ZODIAC_TO_ELEMENT[chart.ascendant.sign] || 'earth',
          }
        : null,
    },
    birth,
    computedAt: new Date().toISOString(),
    version: PROFILE_VERSION,
  }
}

/** Fast version checker for cache invalidation */
export function isProfileFresh(profile: MatchProfile | null | undefined): boolean {
  return !!profile && profile.version === PROFILE_VERSION
}
