import { logger } from '@/lib/logger'
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
import {
  interpretCompatibilityScore,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'
import type { ExtendedAstrologyProfile } from '@/lib/compatibility/astrology/comprehensive'
import type { ChatMessage } from '@/lib/api'
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
    '갑'
  const dayMasterElement = ((saju?.dayMaster as Record<string, unknown>)?.element as string) || '목'
  const dayMasterYinYang =
    ((saju?.dayMaster as Record<string, unknown>)?.yin_yang as string) || '양'

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
        stem: pillars?.year?.heavenlyStem || '甲',
        branch: pillars?.year?.earthlyBranch || '子',
      },
      month: {
        stem: pillars?.month?.heavenlyStem || '甲',
        branch: pillars?.month?.earthlyBranch || '子',
      },
      day: {
        stem: pillars?.day?.heavenlyStem || '甲',
        branch: pillars?.day?.earthlyBranch || '子',
      },
      time: {
        stem: pillars?.time?.heavenlyStem || '甲',
        branch: pillars?.time?.earthlyBranch || '子',
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
    `## ${isKo ? '종합 궁합 분석' : 'Comprehensive Compatibility Analysis'}`,
    `${isKo ? '등급' : 'Grade'}: ${scoreInfo.grade} ${scoreInfo.emoji} - ${scoreInfo.title}`,
    `${isKo ? '점수' : 'Score'}: ${fusion.overallScore}/100`,
    ``,
    `### ${isKo ? 'AI 심층 분석' : 'AI Deep Analysis'}`,
    fusion.aiInsights.deepAnalysis,
    ``,
  ]

  if (fusion.aiInsights.hiddenPatterns.length > 0) {
    lines.push(`### ${isKo ? '숨겨진 패턴' : 'Hidden Patterns'}`)
    fusion.aiInsights.hiddenPatterns.forEach((p) => lines.push(`- ${p}`))
    lines.push(``)
  }

  if (fusion.aiInsights.synergySources.length > 0) {
    lines.push(`### ${isKo ? '시너지 요인' : 'Synergy Sources'}`)
    fusion.aiInsights.synergySources.forEach((s) => lines.push(`- ${s}`))
    lines.push(``)
  }

  if (fusion.aiInsights.growthOpportunities.length > 0) {
    lines.push(`### ${isKo ? '성장 기회' : 'Growth Opportunities'}`)
    fusion.aiInsights.growthOpportunities.forEach((g) => lines.push(`- ${g}`))
    lines.push(``)
  }

  // Relationship Dynamics
  lines.push(`### ${isKo ? '관계 역학' : 'Relationship Dynamics'}`)
  lines.push(
    `- ${isKo ? '감정적 강도' : 'Emotional Intensity'}: ${fusion.relationshipDynamics.emotionalIntensity}%`
  )
  lines.push(
    `- ${isKo ? '지적 조화' : 'Intellectual Alignment'}: ${fusion.relationshipDynamics.intellectualAlignment}%`
  )
  lines.push(
    `- ${isKo ? '영적 연결' : 'Spiritual Connection'}: ${fusion.relationshipDynamics.spiritualConnection}%`
  )
  lines.push(
    `- ${isKo ? '갈등 해결 스타일' : 'Conflict Style'}: ${fusion.relationshipDynamics.conflictResolutionStyle}`
  )
  lines.push(``)

  // Future Guidance
  lines.push(`### ${isKo ? '미래 가이던스' : 'Future Guidance'}`)
  lines.push(`**${isKo ? '단기(1-6개월)' : 'Short-term'}**: ${fusion.futureGuidance.shortTerm}`)
  lines.push(`**${isKo ? '중기(6개월-2년)' : 'Medium-term'}**: ${fusion.futureGuidance.mediumTerm}`)
  lines.push(`**${isKo ? '장기(2년+)' : 'Long-term'}**: ${fusion.futureGuidance.longTerm}`)
  lines.push(``)

  // Recommended Actions
  if (fusion.recommendedActions.length > 0) {
    lines.push(`### ${isKo ? '추천 행동' : 'Recommended Actions'}`)
    fusion.recommendedActions.forEach((action) => {
      const priority =
        action.priority === 'high' ? 'HIGH' : action.priority === 'medium' ? 'MEDIUM' : 'LOW'
      lines.push(`${priority} [${action.category}] ${action.action}`)
      lines.push(`   ${isKo ? '이유' : 'Why'}: ${action.reasoning}`)
    })
  }

  return lines.join('\n')
}

export {
  clampMessages,
  stringifyForPrompt,
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
  formatFusionForPrompt,
}
