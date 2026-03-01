import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { type ChatMessage } from '@/lib/api'
import {
  calculateFusionCompatibility,
  interpretCompatibilityScore,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import {
  performExtendedAstrologyAnalysis,
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/astrology/comprehensive'
import {
  calculateSajuData,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/Saju/saju'
import {
  calculateNatalChart,
  toChart,
  findNatalAspects,
  calculateTransitChart,
  findMajorTransits,
  findTransitAspects,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateLunarReturn,
} from '@/lib/astrology'
import type { FiveElement } from '@/lib/Saju/types'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildThemeDepthGuide, buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

function clampMessages(messages: ChatMessage[], max = 8) {
  return messages.slice(-max)
}

function stringifyForPrompt(value: unknown): string {
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(
      value,
      (_key, nested) => {
        if (nested && typeof nested === 'object') {
          if (seen.has(nested as object)) return '[Circular]'
          seen.add(nested as object)
        }
        return nested
      },
      2
    )
  } catch {
    return ''
  }
}

function countObjectKeys(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0
  return Object.keys(value as Record<string, unknown>).length
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function pickCurrentCycle(
  items: unknown[],
  matcher?: (item: Record<string, unknown>) => boolean
): Record<string, unknown> | null {
  for (const raw of items) {
    const item = asRecord(raw)
    if (!item) continue
    const isCurrent = item.current === true || item.isCurrent === true
    if (isCurrent) return item
  }
  if (matcher) {
    for (const raw of items) {
      const item = asRecord(raw)
      if (!item) continue
      if (matcher(item)) return item
    }
  }
  return asRecord(items[0])
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function extractTimingDetails(
  saju: Record<string, unknown> | null | undefined,
  age: number,
  targetDate: Date
): Record<string, unknown> {
  if (!saju) {
    return {
      hasDaeun: false,
      hasSaeun: false,
      hasWolun: false,
      hasIlun: false,
    }
  }

  const unse = asRecord(saju.unse)
  const daeWoon = asRecord(saju.daeWoon) || asRecord(saju.daeun)
  const annualList = asArray(unse?.annual).length > 0 ? asArray(unse?.annual) : asArray(saju.yeonun)
  const monthlyList =
    asArray(unse?.monthly).length > 0 ? asArray(unse?.monthly) : asArray(saju.wolun)
  const iljinList = asArray(unse?.iljin).length > 0 ? asArray(unse?.iljin) : asArray(saju.iljin)

  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth() + 1
  const targetDay = targetDate.getDate()

  const daeunCurrent =
    asRecord(saju.currentDaeun) ||
    asRecord(daeWoon?.current) ||
    pickCurrentCycle(asArray(daeWoon?.list), (item) => {
      const startAge = toNumber(item.startAge)
      const endAge = toNumber(item.endAge)
      return startAge !== null && endAge !== null && age >= startAge && age <= endAge
    }) ||
    pickCurrentCycle(asArray(daeWoon?.cycles), (item) => {
      const startAge = toNumber(item.startAge)
      const endAge = toNumber(item.endAge)
      return startAge !== null && endAge !== null && age >= startAge && age <= endAge
    })

  const saeunCurrent =
    asRecord(saju.currentSaeun) ||
    pickCurrentCycle(annualList, (item) => {
      const year = toNumber(item.year)
      return year === targetYear
    })

  const wolunCurrent = pickCurrentCycle(monthlyList, (item) => {
    const year = toNumber(item.year)
    const month = toNumber(item.month)
    return year === targetYear && month === targetMonth
  })

  const ilunCurrent = pickCurrentCycle(iljinList, (item) => {
    const year = toNumber(item.year)
    const month = toNumber(item.month)
    const day = toNumber(item.day)
    return year === targetYear && month === targetMonth && day === targetDay
  })

  return {
    hasDaeun: !!daeunCurrent,
    hasSaeun: !!saeunCurrent,
    hasWolun: !!wolunCurrent,
    hasIlun: !!ilunCurrent,
    daeunCurrent: daeunCurrent || null,
    saeunCurrent: saeunCurrent || null,
    wolunCurrent: wolunCurrent || null,
    ilunCurrent: ilunCurrent || null,
    counts: {
      daeun: asArray(daeWoon?.list).length || asArray(daeWoon?.cycles).length,
      saeun: annualList.length,
      wolun: monthlyList.length,
      ilun: iljinList.length,
    },
  }
}

type PersonSeed = {
  date: string
  time: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
  source: {
    usedDefaultLocation: boolean
    usedDefaultTimezone: boolean
    usedDefaultGender: boolean
  }
}

function parseDateString(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim().replace(/\./g, '-')
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseTimeString(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim()
  const m = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?/)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2] ?? '0')
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildPersonSeed(person: Record<string, unknown> | null | undefined): PersonSeed | null {
  if (!person) return null
  const date = parseDateString(person.birthDate ?? person.date)
  const time = parseTimeString(person.birthTime ?? person.time) || '12:00'
  if (!date) return null

  const latRaw = typeof person.latitude === 'number' ? person.latitude : null
  const lonRaw = typeof person.longitude === 'number' ? person.longitude : null
  const hasLocation = latRaw !== null && lonRaw !== null
  const latitude = hasLocation ? latRaw : 37.5665
  const longitude = hasLocation ? lonRaw : 126.978

  const tzRaw = typeof person.timeZone === 'string' ? person.timeZone.trim() : ''
  const timeZone = tzRaw.length > 0 ? tzRaw : 'Asia/Seoul'

  const genderRaw = typeof person.gender === 'string' ? person.gender.toLowerCase() : ''
  const gender = genderRaw === 'female' ? 'female' : 'male'

  return {
    date,
    time,
    gender,
    latitude,
    longitude,
    timeZone,
    source: {
      usedDefaultLocation: !hasLocation,
      usedDefaultTimezone: tzRaw.length === 0,
      usedDefaultGender: genderRaw !== 'male' && genderRaw !== 'female',
    },
  }
}

async function buildAutoSajuContext(
  seed: PersonSeed | null,
  now: Date
): Promise<Record<string, unknown> | null> {
  if (!seed || process.env.NODE_ENV === 'test') return null
  try {
    const saju = calculateSajuData(seed.date, seed.time, seed.gender, 'solar', seed.timeZone)
    const annual = getAnnualCycles(now.getFullYear(), 10, saju.dayMaster)
    const monthlyBase = getMonthlyCycles(now.getFullYear(), saju.dayMaster)
    const monthly = monthlyBase.map((m) => ({
      ...m,
      year: now.getFullYear(),
      ganji: `${String(m.heavenlyStem || '')}${String(m.earthlyBranch || '')}`,
    }))
    const iljin = getIljinCalendar(now.getFullYear(), now.getMonth() + 1, saju.dayMaster)
    const currentSaeun =
      annual.find((a) => Number(a.year) === now.getFullYear()) || asRecord(annual[0]) || null

    return {
      ...saju,
      yeonun: annual,
      wolun: monthly,
      iljin,
      daeun: saju.daeWoon,
      currentDaeun: saju.daeWoon?.current ?? null,
      currentSaeun,
      unse: {
        ...(asRecord(saju.unse) || {}),
        annual,
        monthly,
        iljin,
      },
      autoComputedMeta: {
        source: seed.source,
        computedAtIso: now.toISOString(),
      },
    }
  } catch (error) {
    logger.warn('[compatibility/counselor] auto saju enrichment failed', { error })
    return null
  }
}

async function buildAutoAstroContext(
  seed: PersonSeed | null,
  now: Date
): Promise<Record<string, unknown> | null> {
  if (!seed || process.env.NODE_ENV === 'test') return null
  try {
    const [y, m, d] = seed.date.split('-').map((v) => Number(v))
    const [hh, mm] = seed.time.split(':').map((v) => Number(v))
    if ([y, m, d, hh, mm].some((v) => !Number.isFinite(v))) return null

    const natal = await calculateNatalChart({
      year: y,
      month: m,
      date: d,
      hour: hh,
      minute: mm,
      latitude: seed.latitude,
      longitude: seed.longitude,
      timeZone: seed.timeZone,
    })
    const natalChart = toChart(natal)
    const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
    const nowIso = now.toISOString()
    const transitChart = await calculateTransitChart({
      iso: nowIso,
      latitude: seed.latitude,
      longitude: seed.longitude,
      timeZone: seed.timeZone,
    })
    const majorTransits = findMajorTransits(transitChart, natalChart, 1.0).slice(0, 40)
    const transitAspects = findTransitAspects(
      transitChart,
      natalChart,
      ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
      1.0
    ).slice(0, 80)

    const progressed = await calculateSecondaryProgressions({
      natal: {
        year: y,
        month: m,
        date: d,
        hour: hh,
        minute: mm,
        latitude: seed.latitude,
        longitude: seed.longitude,
        timeZone: seed.timeZone,
      },
      targetDate: nowIso.slice(0, 10),
    })

    const solarReturn = await calculateSolarReturn({
      natal: {
        year: y,
        month: m,
        date: d,
        hour: hh,
        minute: mm,
        latitude: seed.latitude,
        longitude: seed.longitude,
        timeZone: seed.timeZone,
      },
      year: now.getFullYear(),
    })

    const lunarReturn = await calculateLunarReturn({
      natal: {
        year: y,
        month: m,
        date: d,
        hour: hh,
        minute: mm,
        latitude: seed.latitude,
        longitude: seed.longitude,
        timeZone: seed.timeZone,
      },
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    })

    const toSimplePlanet = (name: string): Record<string, unknown> | null => {
      const p = natal.planets.find((it) => String(it.name).toLowerCase() === name.toLowerCase())
      if (!p) return null
      return {
        sign: p.sign,
        degree: p.degree,
        longitude: p.longitude,
        house: p.house,
        retrograde: p.retrograde,
      }
    }

    const sun = toSimplePlanet('Sun')
    const moon = toSimplePlanet('Moon')
    const venus = toSimplePlanet('Venus')
    const mars = toSimplePlanet('Mars')
    const mercury = toSimplePlanet('Mercury')
    const asc = {
      sign: natal.ascendant.sign,
      degree: natal.ascendant.degree,
      longitude: natal.ascendant.longitude,
      house: natal.ascendant.house,
    }

    return {
      sun,
      moon,
      venus,
      mars,
      mercury,
      ascendant: asc,
      planets: {
        sun,
        moon,
        venus,
        mars,
        mercury,
        ascendant: asc,
      },
      natalData: {
        ascendant: natal.ascendant,
        mc: natal.mc,
        houses: natal.houses,
        planets: natal.planets,
        aspects: natalAspects,
      },
      currentTransits: {
        asOfIso: nowIso,
        majorTransits,
        aspects: transitAspects,
      },
      progressions: progressed,
      returns: {
        solarReturn,
        lunarReturn,
      },
      autoComputedMeta: {
        source: seed.source,
        computedAtIso: nowIso,
      },
    }
  } catch (error) {
    logger.warn('[compatibility/counselor] auto astro enrichment failed', { error })
    return null
  }
}

function hasArrayData(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function isNonEmptyObject(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length > 0
  )
}

function collectMissingSajuKeys(label: string, saju: Record<string, unknown> | null): string[] {
  if (!saju) return [`${label}.saju`]
  const missing: string[] = []
  const unse = asRecord(saju.unse)
  const daeWoon = asRecord(saju.daeWoon) || asRecord(saju.daeun)

  if (!isNonEmptyObject(saju.dayMaster)) missing.push(`${label}.saju.dayMaster`)
  if (!isNonEmptyObject(saju.pillars)) missing.push(`${label}.saju.pillars`)
  if (!hasArrayData(unse?.annual) && !hasArrayData(saju.yeonun))
    missing.push(`${label}.saju.seun(annual)`)
  if (!hasArrayData(unse?.monthly) && !hasArrayData(saju.wolun))
    missing.push(`${label}.saju.wolun(monthly)`)
  if (!hasArrayData(unse?.iljin) && !hasArrayData(saju.iljin))
    missing.push(`${label}.saju.ilun(iljin)`)
  if (
    !isNonEmptyObject(daeWoon) ||
    (!hasArrayData(daeWoon?.list) && !hasArrayData(daeWoon?.cycles))
  )
    missing.push(`${label}.saju.daeun`)

  return missing
}

function collectMissingAstroKeys(label: string, astro: Record<string, unknown> | null): string[] {
  if (!astro) return [`${label}.astro`]
  const missing: string[] = []
  const planets = asRecord(astro.planets)
  const natalData = asRecord(astro.natalData)
  const currentTransits = asRecord(astro.currentTransits)
  const returns = asRecord(astro.returns)

  if (!isNonEmptyObject(planets?.sun) && !isNonEmptyObject(astro.sun))
    missing.push(`${label}.astro.sun`)
  if (!isNonEmptyObject(planets?.moon) && !isNonEmptyObject(astro.moon))
    missing.push(`${label}.astro.moon`)
  if (!isNonEmptyObject(planets?.venus) && !isNonEmptyObject(astro.venus))
    missing.push(`${label}.astro.venus`)
  if (!isNonEmptyObject(planets?.mars) && !isNonEmptyObject(astro.mars))
    missing.push(`${label}.astro.mars`)
  if (!isNonEmptyObject(planets?.ascendant) && !isNonEmptyObject(astro.ascendant))
    missing.push(`${label}.astro.ascendant`)
  if (!hasArrayData(natalData?.planets)) missing.push(`${label}.astro.natal.planets`)
  if (!hasArrayData(natalData?.aspects)) missing.push(`${label}.astro.natal.aspects`)
  if (!hasArrayData(currentTransits?.majorTransits)) missing.push(`${label}.astro.transits.major`)
  if (!hasArrayData(currentTransits?.aspects)) missing.push(`${label}.astro.transits.aspects`)
  if (!isNonEmptyObject(astro.progressions)) missing.push(`${label}.astro.progressions`)
  if (!isNonEmptyObject(returns?.solarReturn)) missing.push(`${label}.astro.returns.solar`)
  if (!isNonEmptyObject(returns?.lunarReturn)) missing.push(`${label}.astro.returns.lunar`)

  return missing
}

function mergeSajuContext(
  existing: Record<string, unknown> | null | undefined,
  auto: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!existing && !auto) return null
  if (!existing) return auto
  if (!auto) return existing

  const existingUnse = asRecord(existing.unse)
  const autoUnse = asRecord(auto.unse)
  return {
    ...auto,
    ...existing,
    daeWoon: asRecord(existing.daeWoon) || asRecord(existing.daeun) || asRecord(auto.daeWoon),
    daeun: asRecord(existing.daeun) || asRecord(existing.daeWoon) || asRecord(auto.daeun),
    yeonun: hasArrayData(existing.yeonun) ? existing.yeonun : auto.yeonun,
    wolun: hasArrayData(existing.wolun) ? existing.wolun : auto.wolun,
    iljin: hasArrayData(existing.iljin) ? existing.iljin : auto.iljin,
    unse: {
      ...(autoUnse || {}),
      ...(existingUnse || {}),
      daeun: hasArrayData(existingUnse?.daeun) ? existingUnse?.daeun : autoUnse?.daeun,
      annual: hasArrayData(existingUnse?.annual) ? existingUnse?.annual : autoUnse?.annual,
      monthly: hasArrayData(existingUnse?.monthly) ? existingUnse?.monthly : autoUnse?.monthly,
      iljin: hasArrayData(existingUnse?.iljin) ? existingUnse?.iljin : autoUnse?.iljin,
    },
    currentDaeun: asRecord(existing.currentDaeun) || asRecord(auto.currentDaeun) || null,
    currentSaeun: asRecord(existing.currentSaeun) || asRecord(auto.currentSaeun) || null,
  }
}

function mergeAstroContext(
  existing: Record<string, unknown> | null | undefined,
  auto: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!existing && !auto) return null
  if (!existing) return auto
  if (!auto) return existing

  const existingNatal = asRecord(existing.natalData)
  const autoNatal = asRecord(auto.natalData)
  const existingTransits = asRecord(existing.currentTransits)
  const autoTransits = asRecord(auto.currentTransits)

  return {
    ...auto,
    ...existing,
    planets: {
      ...(asRecord(auto.planets) || {}),
      ...(asRecord(existing.planets) || {}),
    },
    natalData: {
      ...(autoNatal || {}),
      ...(existingNatal || {}),
      planets: hasArrayData(existingNatal?.planets) ? existingNatal?.planets : autoNatal?.planets,
      houses: hasArrayData(existingNatal?.houses) ? existingNatal?.houses : autoNatal?.houses,
      aspects: hasArrayData(existingNatal?.aspects) ? existingNatal?.aspects : autoNatal?.aspects,
    },
    currentTransits: {
      ...(autoTransits || {}),
      ...(existingTransits || {}),
      majorTransits: hasArrayData(existingTransits?.majorTransits)
        ? existingTransits?.majorTransits
        : autoTransits?.majorTransits,
      aspects: hasArrayData(existingTransits?.aspects)
        ? existingTransits?.aspects
        : autoTransits?.aspects,
    },
    progressions: asRecord(existing.progressions) || asRecord(auto.progressions) || null,
    returns: asRecord(existing.returns) || asRecord(auto.returns) || null,
  }
}

// Build SajuProfile from raw saju data
function buildSajuProfile(saju: Record<string, unknown> | null | undefined): SajuProfile | null {
  if (!saju) {
    return null
  }

  const dayMasterName =
    ((saju?.dayMaster as Record<string, unknown>)?.name as string) ||
    ((saju?.dayMaster as Record<string, unknown>)?.heavenlyStem as string) ||
    'ê°‘'
  const dayMasterElement =
    ((saju?.dayMaster as Record<string, unknown>)?.element as string) || 'ëª©'
  const dayMasterYinYang =
    ((saju?.dayMaster as Record<string, unknown>)?.yin_yang as string) || 'ì–‘'

  const pillars = (saju?.pillars as Record<string, Record<string, string>>) || {}

  const elements = (saju?.fiveElements ||
    saju?.elements || {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    }) as SajuProfile['elements']

  return {
    dayMaster: {
      name: dayMasterName,
      element: dayMasterElement as FiveElement,
      yin_yang: (dayMasterYinYang === 'yin' ? 'yin' : 'yang') as 'yin' | 'yang',
    },
    pillars: {
      year: {
        stem: pillars?.year?.heavenlyStem || 'ç”²',
        branch: pillars?.year?.earthlyBranch || 'å­',
      },
      month: {
        stem: pillars?.month?.heavenlyStem || 'ç”²',
        branch: pillars?.month?.earthlyBranch || 'å­',
      },
      day: {
        stem: pillars?.day?.heavenlyStem || 'ç”²',
        branch: pillars?.day?.earthlyBranch || 'å­',
      },
      time: {
        stem: pillars?.time?.heavenlyStem || 'ç”²',
        branch: pillars?.time?.earthlyBranch || 'å­',
      },
    },
    elements,
  }
}

// Build AstrologyProfile from raw astro data
function buildAstroProfile(
  astro: Record<string, unknown> | null | undefined
): AstrologyProfile | null {
  if (!astro) {
    return null
  }

  const getElementFromSign = (sign: string): string => {
    const elementMap: Record<string, string> = {
      aries: 'fire',
      leo: 'fire',
      sagittarius: 'fire',
      taurus: 'earth',
      virgo: 'earth',
      capricorn: 'earth',
      gemini: 'air',
      libra: 'air',
      aquarius: 'air',
      cancer: 'water',
      scorpio: 'water',
      pisces: 'water',
    }
    return elementMap[sign.toLowerCase()] || 'fire'
  }

  const getSignData = (source: Record<string, unknown>, planetName: string) => {
    const planets = source?.planets as Record<string, Record<string, string>> | undefined
    if (planets?.[planetName]?.sign) {
      const sign = planets[planetName].sign.toLowerCase()
      return { sign, element: getElementFromSign(sign) }
    }
    const direct = source?.[planetName] as Record<string, string> | undefined
    if (direct?.sign) {
      const sign = direct.sign.toLowerCase()
      return { sign, element: getElementFromSign(sign) }
    }
    return { sign: 'aries', element: 'fire' }
  }

  return {
    sun: getSignData(astro, 'sun'),
    moon: getSignData(astro, 'moon'),
    venus: getSignData(astro, 'venus'),
    mars: getSignData(astro, 'mars'),
    ascendant: getSignData(astro, 'ascendant'),
  }
}

function normalizePlanetSign(sign: unknown): string | undefined {
  if (typeof sign !== 'string' || sign.trim().length === 0) return undefined
  const s = sign.trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function elementFromSign(sign?: string): string {
  if (!sign) return 'fire'
  const map: Record<string, string> = {
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
  return map[sign] || 'fire'
}

function readPlanetData(
  astro: Record<string, unknown>,
  key: string
): { sign?: string; degree?: number } {
  const lower = key.toLowerCase()
  const direct = astro[lower] as Record<string, unknown> | undefined
  if (direct && typeof direct === 'object') {
    const sign = normalizePlanetSign(direct.sign)
    const degree =
      typeof direct.degree === 'number'
        ? direct.degree
        : typeof direct.longitude === 'number'
          ? direct.longitude % 30
          : undefined
    if (sign) return { sign, degree }
  }

  const planetsObj = astro.planets as Record<string, Record<string, unknown>> | undefined
  const fromObj = planetsObj?.[lower] || planetsObj?.[key]
  if (fromObj && typeof fromObj === 'object') {
    const sign = normalizePlanetSign(fromObj.sign)
    const degree =
      typeof fromObj.degree === 'number'
        ? fromObj.degree
        : typeof fromObj.longitude === 'number'
          ? fromObj.longitude % 30
          : undefined
    if (sign) return { sign, degree }
  }

  const natalData = astro.natalData as Record<string, unknown> | undefined
  const natalPlanets = natalData?.planets as Array<Record<string, unknown>> | undefined
  const fromArray = Array.isArray(natalPlanets)
    ? natalPlanets.find((p) => String(p.name || '').toLowerCase() === lower)
    : undefined
  if (fromArray) {
    const sign = normalizePlanetSign(fromArray.sign)
    const degree =
      typeof fromArray.degree === 'number'
        ? fromArray.degree
        : typeof fromArray.longitude === 'number'
          ? fromArray.longitude % 30
          : undefined
    if (sign) return { sign, degree }
  }

  return {}
}

function buildExtendedAstroProfile(
  astro: Record<string, unknown> | null | undefined
): ExtendedAstrologyProfile | null {
  const base = buildAstroProfile(astro)
  if (!base || !astro) return null

  const mercury = readPlanetData(astro, 'mercury')
  const jupiter = readPlanetData(astro, 'jupiter')
  const saturn = readPlanetData(astro, 'saturn')
  const uranus = readPlanetData(astro, 'uranus')
  const neptune = readPlanetData(astro, 'neptune')
  const pluto = readPlanetData(astro, 'pluto')
  const northNode = readPlanetData(astro, 'northNode')
  const southNode = readPlanetData(astro, 'southNode')
  const lilith = readPlanetData(astro, 'lilith')

  return {
    ...base,
    mercury: mercury.sign
      ? { sign: mercury.sign, element: elementFromSign(mercury.sign) }
      : undefined,
    jupiter: jupiter.sign
      ? { sign: jupiter.sign, element: elementFromSign(jupiter.sign) }
      : undefined,
    saturn: saturn.sign ? { sign: saturn.sign, element: elementFromSign(saturn.sign) } : undefined,
    uranus: uranus.sign ? { sign: uranus.sign, element: elementFromSign(uranus.sign) } : undefined,
    neptune: neptune.sign
      ? { sign: neptune.sign, element: elementFromSign(neptune.sign) }
      : undefined,
    pluto: pluto.sign ? { sign: pluto.sign, element: elementFromSign(pluto.sign) } : undefined,
    northNode: northNode.sign
      ? { sign: northNode.sign, element: elementFromSign(northNode.sign) }
      : undefined,
    southNode: southNode.sign
      ? { sign: southNode.sign, element: elementFromSign(southNode.sign) }
      : undefined,
    lilith: lilith.sign ? { sign: lilith.sign, element: elementFromSign(lilith.sign) } : undefined,
  }
}

function getAgeFromBirthDate(date?: string): number {
  if (!date) return 30
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 30
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return Math.max(0, age)
}

// Format fusion result for AI prompt
function formatFusionForPrompt(fusion: FusionCompatibilityResult, lang: string): string {
  const isKo = lang === 'ko'
  const scoreInfo = interpretCompatibilityScore(fusion.overallScore)

  const lines = [
    `## ${isKo ? 'ì¢…í•© ê¶í•© ë¶„ì„' : 'Comprehensive Compatibility Analysis'}`,
    `${isKo ? 'ë“±ê¸‰' : 'Grade'}: ${scoreInfo.grade} ${scoreInfo.emoji} - ${scoreInfo.title}`,
    `${isKo ? 'ì ìˆ˜' : 'Score'}: ${fusion.overallScore}/100`,
    ``,
    `### ${isKo ? 'AI ì‹¬ì¸µ ë¶„ì„' : 'AI Deep Analysis'}`,
    fusion.aiInsights.deepAnalysis,
    ``,
  ]

  if (fusion.aiInsights.hiddenPatterns.length > 0) {
    lines.push(`### ${isKo ? 'ìˆ¨ê²¨ì§„ íŒ¨í„´' : 'Hidden Patterns'}`)
    fusion.aiInsights.hiddenPatterns.forEach((p) => lines.push(`- ${p}`))
    lines.push(``)
  }

  if (fusion.aiInsights.synergySources.length > 0) {
    lines.push(`### ${isKo ? 'ì‹œë„ˆì§€ ìš”ì†Œ' : 'Synergy Sources'}`)
    fusion.aiInsights.synergySources.forEach((s) => lines.push(`- ${s}`))
    lines.push(``)
  }

  if (fusion.aiInsights.growthOpportunities.length > 0) {
    lines.push(`### ${isKo ? 'ì„±ìž¥ ê¸°íšŒ' : 'Growth Opportunities'}`)
    fusion.aiInsights.growthOpportunities.forEach((g) => lines.push(`- ${g}`))
    lines.push(``)
  }

  // Relationship Dynamics
  lines.push(`### ${isKo ? 'ê´€ê³„ ì—­í•™' : 'Relationship Dynamics'}`)
  lines.push(
    `- ${isKo ? 'ê°ì •ì  ê°•ë„' : 'Emotional Intensity'}: ${fusion.relationshipDynamics.emotionalIntensity}%`
  )
  lines.push(
    `- ${isKo ? 'ì§€ì  ì¡°í™”' : 'Intellectual Alignment'}: ${fusion.relationshipDynamics.intellectualAlignment}%`
  )
  lines.push(
    `- ${isKo ? 'ì˜ì  ì—°ê²°' : 'Spiritual Connection'}: ${fusion.relationshipDynamics.spiritualConnection}%`
  )
  lines.push(
    `- ${isKo ? 'ê°ˆë“± í•´ê²° ìŠ¤íƒ€ì¼' : 'Conflict Style'}: ${fusion.relationshipDynamics.conflictResolutionStyle}`
  )
  lines.push(``)

  // Future Guidance
  lines.push(`### ${isKo ? 'ë¯¸ëž˜ ê°€ì´ë˜ìŠ¤' : 'Future Guidance'}`)
  lines.push(`**${isKo ? 'ë‹¨ê¸°(1-6ê°œì›”)' : 'Short-term'}**: ${fusion.futureGuidance.shortTerm}`)
  lines.push(
    `**${isKo ? 'ì¤‘ê¸°(6ê°œì›”-2ë…„)' : 'Medium-term'}**: ${fusion.futureGuidance.mediumTerm}`
  )
  lines.push(`**${isKo ? 'ìž¥ê¸°(2ë…„+)' : 'Long-term'}**: ${fusion.futureGuidance.longTerm}`)
  lines.push(``)

  // Recommended Actions
  if (fusion.recommendedActions.length > 0) {
    lines.push(`### ${isKo ? 'ì¶”ì²œ í–‰ë™' : 'Recommended Actions'}`)
    fusion.recommendedActions.forEach((action) => {
      const priority =
        action.priority === 'high' ? 'ðŸ”´' : action.priority === 'medium' ? 'ðŸŸ¡' : 'ðŸŸ¢'
      lines.push(`${priority} [${action.category}] ${action.action}`)
      lines.push(`   ${isKo ? 'ì´ìœ ' : 'Why'}: ${action.reasoning}`)
    })
  }

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'compatibility', // ê¶í•© ìƒë‹´ì€ compatibility íƒ€ìž… ì‚¬ìš©
      creditAmount: 1,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    const rawBody = await req.json()
    const validationResult = compatibilityCounselorRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[compatibility/counselor] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      persons,
      person1Saju = null,
      person2Saju = null,
      person1Astro = null,
      person2Astro = null,
      fullContext,
      useRag = true,
      lang = context.locale,
      messages = [],
      theme = 'general',
    } = validationResult.data

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      })
    }

    // Build profiles and run Fusion analysis
    let fusionResult: FusionCompatibilityResult | null = null
    let fusionContext = ''
    let extendedSajuCompatibility: ReturnType<typeof performExtendedSajuAnalysis> | null = null
    let extendedAstroCompatibility: ReturnType<typeof performExtendedAstrologyAnalysis> | null =
      null
    const person1Seed = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
    const person2Seed = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)
    const now = new Date()
    const autoPerson1Saju = await buildAutoSajuContext(person1Seed, now)
    const autoPerson2Saju = await buildAutoSajuContext(person2Seed, now)
    const autoPerson1Astro = await buildAutoAstroContext(person1Seed, now)
    const autoPerson2Astro = await buildAutoAstroContext(person2Seed, now)
    const effectivePerson1Saju = mergeSajuContext(person1Saju, autoPerson1Saju)
    const effectivePerson2Saju = mergeSajuContext(person2Saju, autoPerson2Saju)
    const effectivePerson1Astro = mergeAstroContext(person1Astro, autoPerson1Astro)
    const effectivePerson2Astro = mergeAstroContext(person2Astro, autoPerson2Astro)
    const strictCompleteness =
      process.env.NODE_ENV !== 'test' && process.env.COMPATIBILITY_COUNSELOR_STRICT === 'true'
    const completenessMissing = [
      ...collectMissingSajuKeys('person1', effectivePerson1Saju),
      ...collectMissingSajuKeys('person2', effectivePerson2Saju),
      ...collectMissingAstroKeys('person1', effectivePerson1Astro),
      ...collectMissingAstroKeys('person2', effectivePerson2Astro),
    ]
    if (strictCompleteness && completenessMissing.length > 0) {
      logger.error('[compatibility/counselor] strict completeness failed', {
        missing: completenessMissing,
      })
      return createFallbackSSEStream({
        content:
          lang === 'ko'
            ? `필수 데이터 누락으로 리포트 생성을 중단했습니다. 누락: ${completenessMissing.join(', ')}`
            : `Report generation stopped due to missing required data: ${completenessMissing.join(', ')}`,
        done: true,
      })
    }
    if (!strictCompleteness && completenessMissing.length > 0) {
      logger.warn('[compatibility/counselor] continuing with partial context', {
        missing: completenessMissing,
      })
    }
    const p1Age = getAgeFromBirthDate(persons?.[0]?.date)
    const p2Age = getAgeFromBirthDate(persons?.[1]?.date)
    const currentYear = now.getFullYear()
    const timingDetails = {
      person1: extractTimingDetails(effectivePerson1Saju, p1Age, now),
      person2: extractTimingDetails(effectivePerson2Saju, p2Age, now),
    }

    try {
      const p1Saju = buildSajuProfile(effectivePerson1Saju)
      const p2Saju = buildSajuProfile(effectivePerson2Saju)
      const p1Astro = buildAstroProfile(effectivePerson1Astro)
      const p2Astro = buildAstroProfile(effectivePerson2Astro)
      const p1ExtendedAstro = buildExtendedAstroProfile(effectivePerson1Astro)
      const p2ExtendedAstro = buildExtendedAstroProfile(effectivePerson2Astro)

      if (p1Saju && p2Saju && p1Astro && p2Astro) {
        fusionResult = calculateFusionCompatibility(p1Saju, p1Astro, p2Saju, p2Astro)
        fusionContext = formatFusionForPrompt(fusionResult, lang)
        extendedSajuCompatibility = performExtendedSajuAnalysis(
          p1Saju,
          p2Saju,
          p1Age,
          p2Age,
          currentYear
        )
      }

      if (p1ExtendedAstro && p2ExtendedAstro) {
        extendedAstroCompatibility = performExtendedAstrologyAnalysis(
          p1ExtendedAstro,
          p2ExtendedAstro,
          Math.abs(p1Age - p2Age)
        )
      }
    } catch (fusionError) {
      logger.error('[Compatibility Counselor] Fusion error:', { error: fusionError })
    }

    const resolvedFullContext =
      fullContext ||
      ({
        persons,
        person1Saju: effectivePerson1Saju,
        person2Saju: effectivePerson2Saju,
        person1Astro: effectivePerson1Astro,
        person2Astro: effectivePerson2Astro,
        autoEnrichment: {
          person1: {
            seed: person1Seed,
            hasAutoSaju: !!autoPerson1Saju,
            hasAutoAstro: !!autoPerson1Astro,
          },
          person2: {
            seed: person2Seed,
            hasAutoSaju: !!autoPerson2Saju,
            hasAutoAstro: !!autoPerson2Astro,
          },
        },
        fusionResult,
        extendedSajuCompatibility,
        extendedAstroCompatibility,
        timingDetails,
        theme,
      } as Record<string, unknown>)
    const fullContextText = stringifyForPrompt(resolvedFullContext)
    const contextTrace = {
      currentDateIso: new Date().toISOString().slice(0, 10),
      hasFusionResult: !!fusionResult,
      hasExtendedSajuCompatibility: !!extendedSajuCompatibility,
      hasExtendedAstroCompatibility: !!extendedAstroCompatibility,
      hasDaeun: Boolean(timingDetails.person1.hasDaeun) || Boolean(timingDetails.person2.hasDaeun),
      hasSaeun: Boolean(timingDetails.person1.hasSaeun) || Boolean(timingDetails.person2.hasSaeun),
      hasWolun: Boolean(timingDetails.person1.hasWolun) || Boolean(timingDetails.person2.hasWolun),
      hasIlun: Boolean(timingDetails.person1.hasIlun) || Boolean(timingDetails.person2.hasIlun),
      timingCoverage: {
        person1: (timingDetails.person1.counts as Record<string, number>) || {},
        person2: (timingDetails.person2.counts as Record<string, number>) || {},
      },
      autoEnrichment: {
        person1: {
          hasSeed: !!person1Seed,
          hasAutoSaju: !!autoPerson1Saju,
          hasAutoAstro: !!autoPerson1Astro,
        },
        person2: {
          hasSeed: !!person2Seed,
          hasAutoSaju: !!autoPerson2Saju,
          hasAutoAstro: !!autoPerson2Astro,
        },
      },
      person1SajuKeys: countObjectKeys(effectivePerson1Saju),
      person2SajuKeys: countObjectKeys(effectivePerson2Saju),
      person1AstroKeys: countObjectKeys(effectivePerson1Astro),
      person2AstroKeys: countObjectKeys(effectivePerson2Astro),
      fullContextKeys: countObjectKeys(resolvedFullContext),
      strictCompleteness,
      missingFields: completenessMissing,
    }

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 400)}`)
      .join('\n')
      .slice(0, 2000)

    const userQuestion = lastUser ? guardText(lastUser.content, 600) : ''

    // Format persons info
    const personsInfo = persons
      .map(
        (p: { name?: string; date?: string; time?: string; relation?: string }, i: number) =>
          `Person ${i + 1}: ${p.name || `Person ${i + 1}`} (${p.date} ${p.time})${i > 0 ? ` - ${p.relation || 'partner'}` : ''}`
      )
      .join('\n')

    // Theme-specific context
    const themeContextMap: Record<string, string> = {
      general: lang === 'ko' ? 'ì „ë°˜ì ì¸ ê¶í•© ìƒë‹´' : 'General compatibility counseling',
      love: lang === 'ko' ? 'ì—°ì• /ê²°í˜¼ ê¶í•© ì „ë¬¸ ìƒë‹´' : 'Romance/Marriage compatibility',
      business:
        lang === 'ko'
          ? 'ë¹„ì¦ˆë‹ˆìŠ¤ íŒŒíŠ¸ë„ˆì‹­ ê¶í•© ìƒë‹´'
          : 'Business partnership compatibility',
      family: lang === 'ko' ? 'ê°€ì¡± ê´€ê³„ ê¶í•© ìƒë‹´' : 'Family relationship compatibility',
    }
    const themeContext =
      themeContextMap[theme as string] ||
      (lang === 'ko' ? 'ê¶í•© ìƒë‹´' : 'Compatibility counseling')
    const normalizedLang = lang === 'ko' ? 'ko' : 'en'
    const themeDepthGuide = buildThemeDepthGuide(String(theme || 'general'), normalizedLang)
    const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

    // Build enhanced prompt for counselor
    const counselorPrompt = [
      `== í”„ë¦¬ë¯¸ì—„ ê¶í•© ìƒë‹´ì‚¬ ==`,
      `í…Œë§ˆ: ${themeContext}`,
      ``,
      `== ì°¸ì—¬ìž ì •ë³´ ==`,
      personsInfo,
      fusionContext ? `\n${fusionContext}` : '',
      extendedSajuCompatibility
        ? `\n== EXTENDED SAJU COMPATIBILITY ==\n${stringifyForPrompt(extendedSajuCompatibility)}`
        : '',
      extendedAstroCompatibility
        ? `\n== EXTENDED ASTROLOGY COMPATIBILITY ==\n${stringifyForPrompt(extendedAstroCompatibility)}`
        : '',
      `\n== TIMING DETAIL (DAEUN/SEUN/WOLUN/ILUN) ==\n${stringifyForPrompt(timingDetails)}`,
      `\n== DETERMINISTIC CONTEXT TRACE ==\n${stringifyForPrompt(contextTrace)}`,
      fullContextText ? `\n== FULL RAW CONTEXT (SAJU + ASTRO) ==\n${fullContextText}` : '',
      historyText ? `\n== ì´ì „ ëŒ€í™” ==\n${historyText}` : '',
      `\n== ì‚¬ìš©ìž ì§ˆë¬¸ ==\n${userQuestion}`,
      ``,
      `== INTERPRETATION QUALITY CONTRACT ==\n${themeDepthGuide}`,
      `\n== EVIDENCE GATE ==\n${evidenceGuide}`,
      ``,
      `== ìƒë‹´ì‚¬ ì§€ì¹¨ ==`,
      lang === 'ko'
        ? `ë‹¹ì‹ ì€ ì‚¬ì£¼ëª…ë¦¬í•™ê³¼ ì ì„±í•™ì„ ê²°í•©í•œ ì „ë¬¸ ê¶í•© ìƒë‹´ì‚¬ìž…ë‹ˆë‹¤.
ìœ„ì˜ ì‹¬ì¸µ ë¶„ì„ ë°ì´í„°ë¥¼ ë°”íƒ•ìœ¼ë¡œ ì¹œê·¼í•˜ì§€ë§Œ ì „ë¬¸ì ì¸ ì–´ì¡°ë¡œ ë‹µë³€í•˜ì„¸ìš”.
- êµ¬ì²´ì ì¸ ì¡°ì–¸ê³¼ ì‹¤ì²œ ê°€ëŠ¥í•œ íŒì„ ì œê³µí•˜ì„¸ìš”
- ìˆ¨ê²¨ì§„ íŒ¨í„´ê³¼ ì‹œë„ˆì§€ë¥¼ ì‰½ê²Œ ì„¤ëª…í•´ì£¼ì„¸ìš”
- ë¯¸ëž˜ ê°€ì´ë˜ìŠ¤ë¥¼ ì‹œê¸°ë³„ë¡œ ì•ˆë‚´í•˜ì„¸ìš”
- ê¸ì •ì ì´ë©´ì„œë„ í˜„ì‹¤ì ì¸ ì¡°ì–¸ì„ í•´ì£¼ì„¸ìš”`
        : `You are an expert compatibility counselor combining Saju and Astrology.
Based on the deep analysis above, provide friendly but professional guidance.
- Give specific, actionable advice
- Explain hidden patterns and synergies simply
- Provide time-based future guidance
- Be positive yet realistic`,
    ]
      .filter(Boolean)
      .join('\n')

    // Call backend AI (extended timeout for fusion analysis)
    try {
      const response = await apiClient.post<Record<string, unknown>>(
        '/api/compatibility/chat',
        {
          persons,
          prompt: counselorPrompt,
          question: userQuestion,
          history: trimmedHistory,
          locale: lang,
          compatibility_context: fusionContext,
          compatibility_saju_extended: extendedSajuCompatibility,
          compatibility_astrology_extended: extendedAstroCompatibility,
          compatibility_timing_detail: timingDetails,
          full_context: resolvedFullContext,
          full_context_text: fullContextText,
          use_rag: useRag,
          theme,
          is_premium: true,
        },
        { timeout: 80000 }
      )

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const aiData = response.data as Record<string, unknown>
      const answer = String(
        (aiData?.data as Record<string, unknown>)?.response ||
          aiData?.response ||
          aiData?.interpretation ||
          (lang === 'ko'
            ? '\uC8C4\uC1A1\uD569\uB2C8\uB2E4. \uC751\uB2F5\uC744 \uC0DD\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
            : "Sorry, couldn't generate response. Please try again.")
      )

      // Stream response in chunks for better UX
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            const chunks = answer.match(/.{1,60}/g) || [answer]
            chunks.forEach((chunk: string, index: number) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
                if (index === chunks.length - 1) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                }
              }, index * 15)
            })
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    } catch (fetchError) {
      logger.error('[Compatibility Counselor] Backend error:', { error: fetchError })

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
      })
    }
  } catch (error) {
    logger.error('[Compatibility Counselor] Error:', { error: error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
