import { logger } from '@/lib/logger'
import {
  calculateSajuData,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/saju/saju'
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
import type { FiveElement } from '@/lib/saju/types'
import {
  interpretCompatibilityScore,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'
import type { ExtendedAstrologyProfile } from '@/lib/compatibility/astrology/comprehensive'
import type { ExtendedSajuCompatibility } from '@/lib/compatibility/saju/types'
import type { ExtendedAstrologyCompatibility } from '@/lib/compatibility/astrology/comprehensive'
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

/**
 * raw 사주/점성 컨텍스트에서 LLM 응답에 거의 인용되지 않는 저신호 필드를
 * 제거한다. 위쪽 ==사주/점성 심화 분석== 블록에 핵심 가공 데이터가 이미
 * 들어가므로 raw는 보조 역할이고, 노이즈를 줄여 prompt cache 안정성과
 * attention 집중도를 끌어올린다.
 *
 * 제거 대상(깊이 무관):
 *  - napum / napeum / 납음   : 60갑자 납음(예: "산두화") — 응답 빈도 거의 0
 *  - chineseChar / hanja      : 한자 표기 — 한국어 이름 옆에 따로 안 씀
 *  - icon / emoji / colorHex  : UI 메타데이터
 */
const PROMPT_PRUNE_KEYS = new Set([
  'napum',
  'napeum',
  '납음',
  'chineseChar',
  'hanja',
  'icon',
  'emoji',
  'colorHex',
  // Debug metadata — useful in server logs, useless to the LLM.
  'autoComputedMeta',
  // `unse` re-serializes annual/monthly/iljin alongside the top-level
  // yeonun/wolun/iljin keys, so the same arrays appeared twice in every
  // prompt. Drop the duplicate; keep the top-level keys.
  'unse',
  // The saju lib spreads its raw pillar object two ways: under top-level
  // `yearPillar`/`monthPillar`/`dayPillar`/`timePillar`, *and* under a
  // grouped `pillars: { year, month, day, time }`. Same payload, twice.
  // Keep the top-level form; drop the grouped duplicate.
  'pillars',
  // `daeWoon` is the raw 대운 object straight from the saju lib.
  // buildAutoSajuContext aliases it to `daeun` (which we then trim to
  // prev/current/next) and also forwards `currentDaeun`. The original
  // `daeWoon` was being spread in untouched on top — full 10-stage list
  // again. Drop it; the trimmed `daeun` carries the same info.
  'daeWoon',
  // `currentDaeun` duplicates `daeun.current` byte-for-byte.
  'currentDaeun',
  // UI-only render identifiers (`GAN_을`, `EL_목`, `BR_해`, `GAN_을해`).
  // The model already sees the human-readable `name` next to each;
  // these IDs only mattered for client-side iconography.
  'graphId',
  'elementGraphId',
  'ganjiGraphId',
  // 천을귀인 boolean — almost always false; true is too minor to act on.
  'isCheoneulGwiin',
])

// Keys whose array values get *trimmed around "today"* instead of dropped.
// Without trimming, one couple's prompt drops ~40k chars of almanac-style
// data the model never references. The trim is on-prompt only — internal
// saju calculation still keeps the full lists.
const PROMPT_TRIM_WINDOWS: Record<
  string,
  { around: 'day' | 'month' | 'year'; before: number; after: number }
> = {
  iljin: { around: 'day', before: 3, after: 3 }, // 31 → 7
  wolun: { around: 'month', before: 1, after: 1 }, // 12 → 3
  yeonun: { around: 'year', before: 1, after: 1 }, // 10 → 3
}

function trimSajuTimeWindow(key: string, arr: unknown[]): unknown[] {
  const cfg = PROMPT_TRIM_WINDOWS[key]
  if (!cfg) return arr
  const today = new Date()
  const yearNow = today.getFullYear()
  const monthNow = today.getMonth() + 1
  const dayNow = today.getDate()
  const pickIdx = arr.findIndex((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const e = entry as Record<string, unknown>
    if (cfg.around === 'year') return Number(e.year) === yearNow
    if (cfg.around === 'month')
      return Number(e.year) === yearNow && Number(e.month) === monthNow
    return (
      Number(e.year) === yearNow &&
      Number(e.month) === monthNow &&
      Number(e.day) === dayNow
    )
  })
  const center = pickIdx >= 0 ? pickIdx : 0
  const start = Math.max(0, center - cfg.before)
  const end = Math.min(arr.length, center + cfg.after + 1)
  return arr.slice(start, end)
}

// `daeun` is the 10-stage life cycle. Keep prev / current / next so the
// model can still talk about the transition; drop the other seven.
function trimDaeunList(daeun: Record<string, unknown>): Record<string, unknown> {
  const list = Array.isArray(daeun.list) ? (daeun.list as Record<string, unknown>[]) : null
  const current = daeun.current as Record<string, unknown> | undefined
  if (!list || !current) return daeun
  const currentAge = Number(current.age)
  const idx = list.findIndex((d) => Number(d.age) === currentAge)
  if (idx < 0) return daeun
  return {
    ...daeun,
    list: list.slice(Math.max(0, idx - 1), Math.min(list.length, idx + 2)),
  }
}

function prunePromptContext(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    const trimmed =
      parentKey && PROMPT_TRIM_WINDOWS[parentKey]
        ? trimSajuTimeWindow(parentKey, value)
        : value
    return trimmed.map((v) => prunePromptContext(v))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PROMPT_PRUNE_KEYS.has(k)) continue
      if (k === 'daeun' && v && typeof v === 'object') {
        out[k] = trimDaeunList(v as Record<string, unknown>)
        continue
      }
      out[k] = prunePromptContext(v, k)
    }
    return out
  }
  return value
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
  const includeShortTerm = true

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

  const wolunCurrent = includeShortTerm
    ? pickCurrentCycle(monthlyList, (item) => {
        const year = toNumber(item.year)
        const month = toNumber(item.month)
        return year === targetYear && month === targetMonth
      })
    : null

  const ilunCurrent = includeShortTerm
    ? pickCurrentCycle(iljinList, (item) => {
        const year = toNumber(item.year)
        const month = toNumber(item.month)
        const day = toNumber(item.day)
        return year === targetYear && month === targetMonth && day === targetDay
      })
    : null

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
      wolun: includeShortTerm ? monthlyList.length : 0,
      ilun: includeShortTerm ? iljinList.length : 0,
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

/**
 * Bucket a raw score into a qualitative label. The LLM is forbidden
 * from quoting raw numbers in the response (system rule), so we also
 * relabel them at source. Bare numerics in the prompt invite drift —
 * presenting "강세 (내부 78/100)" makes the bucket primary and the
 * raw value advisory.
 *
 * Scale assumes 0–100 unless `max` is provided (use 1 for 0–1 ratios).
 */
function scoreLabel(value: number, lang: 'ko' | 'en', max = 100): string {
  if (!Number.isFinite(value)) return ''
  const pct = max === 1 ? value * 100 : (value / max) * 100
  const ko = ['미약', '약함', '중', '중상', '강함', '매우 강함']
  const en = ['minimal', 'soft', 'moderate', 'fairly steady', 'strong', 'very strong']
  let idx = 0
  if (pct >= 90) idx = 5
  else if (pct >= 75) idx = 4
  else if (pct >= 60) idx = 3
  else if (pct >= 45) idx = 2
  else if (pct >= 25) idx = 1
  else idx = 0
  return lang === 'ko' ? ko[idx] : en[idx]
}

/** Format a score as "label (raw)" — bucket primary, raw advisory. */
function scoreWithLabel(
  value: number,
  lang: 'ko' | 'en',
  max = 100
): string {
  if (!Number.isFinite(value)) return ''
  const label = scoreLabel(value, lang, max)
  const raw = max === 1 ? value.toFixed(2) : String(Math.round(value))
  const tail = max === 1 ? '' : `/${max}`
  return `${label} (${raw}${tail})`
}

/**
 * Convert ExtendedSajuCompatibility (11 categories) from a verbose JSON
 * dump into compact prose using the same `▷ 라벨` convention as the
 * matrix and Fusion blocks. Skips empty arrays and dropped fields to
 * cut noise. This is the largest JSON block in the prompt; converting
 * to prose removes ~40% of its bytes and eliminates the JSON-key echo
 * risk in responses.
 */
function formatExtendedSajuForPrompt(
  s: ExtendedSajuCompatibility,
  lang: 'ko' | 'en'
): string {
  const isKo = lang === 'ko'
  const header = isKo ? '== 사주 심화 분석 ==' : '== Extended Saju Analysis =='
  const out: string[] = [header]

  out.push(
    `${isKo ? '종합' : 'Overall'}: ${s.grade} · ${scoreWithLabel(s.overallScore, lang)} — ${s.summary}`
  )

  // 1. Ten Gods
  out.push('')
  out.push(`▷ ${isKo ? '십성 관계' : 'Ten Gods'}`)
  out.push(
    `A: ${s.tenGods.person1Primary.join('·') || '-'} / B: ${s.tenGods.person2Primary.join('·') || '-'} (${isKo ? '균형' : 'balance'} ${scoreLabel(s.tenGods.interaction.balance, lang)})`
  )
  if (s.tenGods.interaction.supports.length > 0)
    out.push(`${isKo ? '보완' : 'supports'}: ${s.tenGods.interaction.supports.join(' / ')}`)
  if (s.tenGods.interaction.conflicts.length > 0)
    out.push(`${isKo ? '갈등' : 'conflicts'}: ${s.tenGods.interaction.conflicts.join(' / ')}`)
  out.push(`${isKo ? '역학' : 'dynamics'}: ${s.tenGods.relationshipDynamics}`)

  // 2. Shinsals
  if (s.shinsals.person1Shinsals.length + s.shinsals.person2Shinsals.length > 0) {
    out.push('')
    out.push(`▷ ${isKo ? '신살' : 'Shinsals'} (${s.shinsals.overallImpact})`)
    out.push(
      `A: ${s.shinsals.person1Shinsals.join('·') || '-'} / B: ${s.shinsals.person2Shinsals.join('·') || '-'}`
    )
    if (s.shinsals.luckyInteractions.length > 0)
      out.push(`+ ${s.shinsals.luckyInteractions.join(' / ')}`)
    if (s.shinsals.unluckyInteractions.length > 0)
      out.push(`- ${s.shinsals.unluckyInteractions.join(' / ')}`)
  }

  // 3. Harmonies (합)
  const h = s.harmonies
  if (h.yukhap.length + h.samhap.length + h.banghap.length > 0) {
    out.push('')
    out.push(
      `▷ ${isKo ? '합' : 'Harmonies'} (${scoreWithLabel(h.score, lang)}): ${h.description}`
    )
    if (h.yukhap.length > 0) out.push(`${isKo ? '육합' : 'yukhap'}: ${h.yukhap.join(' / ')}`)
    if (h.samhap.length > 0) out.push(`${isKo ? '삼합' : 'samhap'}: ${h.samhap.join(' / ')}`)
    if (h.banghap.length > 0) out.push(`${isKo ? '방합' : 'banghap'}: ${h.banghap.join(' / ')}`)
  }

  // 4. Conflicts (충형파해)
  const c = s.conflicts
  if (c.totalConflicts > 0) {
    out.push('')
    out.push(
      `▷ ${isKo ? '충·형·파·해' : 'Conflicts'}: ${c.totalConflicts}건 (${c.severity})`
    )
    if (c.chung.length > 0) out.push(`충: ${c.chung.join(' / ')}`)
    if (c.hyeong.length > 0) out.push(`형: ${c.hyeong.join(' / ')}`)
    if (c.pa.length > 0) out.push(`파: ${c.pa.join(' / ')}`)
    if (c.hae.length > 0) out.push(`해: ${c.hae.join(' / ')}`)
    if (c.mitigationAdvice.length > 0)
      out.push(`${isKo ? '완화' : 'mitigation'}: ${c.mitigationAdvice.join(' / ')}`)
  }

  // 5. Yongsin
  const y = s.yongsin
  out.push('')
  out.push(`▷ ${isKo ? '용신' : 'Yongsin'} (${scoreWithLabel(y.compatibility, lang)})`)
  out.push(
    `A: ${y.person1Yongsin}/${y.person1Huisin} · B: ${y.person2Yongsin}/${y.person2Huisin}` +
      ` · ${isKo ? '상호 지원' : 'mutual support'}: ${y.mutualSupport ? 'yes' : 'no'}`
  )
  if (y.interpretation.length > 0) out.push(y.interpretation.join(' · '))

  // 6. Daeun
  const d = s.daeun
  out.push('')
  out.push(`▷ ${isKo ? '대운 동조' : 'Daeun sync'} (${scoreWithLabel(d.currentSynergy, lang, 1)})`)
  out.push(
    `A: ${d.person1CurrentDaeun.stem}${d.person1CurrentDaeun.branch} ${d.person1CurrentDaeun.element} (${d.person1CurrentDaeun.startAge}-${d.person1CurrentDaeun.endAge}) — ${d.person1CurrentDaeun.theme}`
  )
  out.push(
    `B: ${d.person2CurrentDaeun.stem}${d.person2CurrentDaeun.branch} ${d.person2CurrentDaeun.element} (${d.person2CurrentDaeun.startAge}-${d.person2CurrentDaeun.endAge}) — ${d.person2CurrentDaeun.theme}`
  )
  if (d.harmonicPeriods.length > 0) out.push(`+ ${d.harmonicPeriods.join(' / ')}`)
  if (d.challengingPeriods.length > 0) out.push(`- ${d.challengingPeriods.join(' / ')}`)
  if (d.futureOutlook) out.push(d.futureOutlook)

  // 7. Seun
  const se = s.seun
  out.push('')
  out.push(
    `▷ ${isKo ? '세운' : 'Seun'} ${se.year} (${se.yearStem}${se.yearBranch} ${se.yearElement})`
  )
  out.push(`A: ${se.person1Impact} · B: ${se.person2Impact}`)
  if (se.combinedOutlook) out.push(se.combinedOutlook)
  if (se.advice.length > 0) out.push(`${isKo ? '조언' : 'advice'}: ${se.advice.join(' / ')}`)

  // 8. Gongmang
  const g = s.gongmang
  if (g.person1InP2Gongmang || g.person2InP1Gongmang || g.interpretation.length > 0) {
    out.push('')
    out.push(`▷ ${isKo ? '공망' : 'Gongmang'} (${g.impact})`)
    out.push(
      `A 공망: ${g.person1Gongmang.join('·') || '-'} · B 공망: ${g.person2Gongmang.join('·') || '-'}`
    )
    out.push(
      `A→B 공망 진입: ${g.person1InP2Gongmang ? 'yes' : 'no'} · B→A: ${g.person2InP1Gongmang ? 'yes' : 'no'}`
    )
    if (g.interpretation.length > 0) out.push(g.interpretation.join(' · '))
  }

  // 9. GanHap
  const gh = s.ganHap
  if (gh.combinations.length > 0) {
    out.push('')
    out.push(
      `▷ ${isKo ? '천간합' : 'Stem combos'} (${scoreWithLabel(gh.totalHarmony, lang, 1)}): ${gh.significance}`
    )
    gh.combinations.forEach((c) => {
      out.push(
        `- ${c.stem1}${c.stem2}합 (${c.pillar1}-${c.pillar2}) → ${c.resultElement}: ${c.description}`
      )
    })
  }

  // 10. Gyeokguk
  const gk = s.gyeokguk
  out.push('')
  out.push(`▷ ${isKo ? '격국' : 'Gyeokguk'} (${gk.compatibility})`)
  out.push(`A: ${gk.person1Gyeokguk} · B: ${gk.person2Gyeokguk} — ${gk.dynamics}`)
  if (gk.strengths.length > 0) out.push(`+ ${gk.strengths.join(' / ')}`)
  if (gk.challenges.length > 0) out.push(`- ${gk.challenges.join(' / ')}`)

  // 11. Twelve states
  const ts = s.twelveStates
  out.push('')
  out.push(
    `▷ ${isKo ? '12운성' : '12 states'} (${scoreWithLabel(ts.energyCompatibility, lang)})`
  )
  out.push(
    'A: ' + ts.person1States.map((p) => `${p.pillar}=${p.state}`).join('·')
  )
  out.push(
    'B: ' + ts.person2States.map((p) => `${p.pillar}=${p.state}`).join('·')
  )
  if (ts.interpretation.length > 0) out.push(ts.interpretation.join(' · '))

  if (s.detailedInsights.length > 0) {
    out.push('')
    out.push(`▷ ${isKo ? '핵심 인사이트' : 'Key insights'}`)
    s.detailedInsights.forEach((i) => out.push(`- ${i}`))
  }

  return out.join('\n')
}

/**
 * Convert ExtendedAstrologyCompatibility (up to 13 categories) into
 * compact prose. Same rationale as formatExtendedSajuForPrompt.
 * Optional `*Analysis` blocks are skipped when absent.
 */
function formatExtendedAstroForPrompt(
  a: ExtendedAstrologyCompatibility,
  lang: 'ko' | 'en'
): string {
  const isKo = lang === 'ko'
  const header = isKo ? '== 점성 심화 분석 ==' : '== Extended Astrology Analysis =='
  const out: string[] = [header]

  out.push(
    `${isKo ? '종합' : 'Overall'}: ${a.extendedGrade} · ${scoreWithLabel(a.extendedScore, lang)} — ${a.extendedSummary}`
  )

  // Aspects
  out.push('')
  out.push(
    `▷ ${isKo ? '어스펙트' : 'Aspects'} (${scoreWithLabel(a.aspects.overallHarmony, lang)})`
  )
  if (a.aspects.keyInsights.length > 0)
    a.aspects.keyInsights.forEach((k) => out.push(`- ${k}`))

  // Synastry
  const sy = a.synastry
  out.push('')
  out.push(`▷ ${isKo ? '시너스트리' : 'Synastry'} (${scoreWithLabel(sy.compatibilityIndex, lang)})`)
  if (sy.strengths.length > 0) out.push(`+ ${sy.strengths.join(' / ')}`)
  if (sy.challenges.length > 0) out.push(`- ${sy.challenges.join(' / ')}`)

  // Composite chart (from composite-house.CompositeChartAnalysis)
  const cc = a.compositeChart
  out.push('')
  out.push(`▷ ${isKo ? '컴포지트' : 'Composite'}`)
  out.push(
    `${cc.coreTheme} — ${cc.relationshipPurpose} (${isKo ? '장기성' : 'longevity'} ${scoreWithLabel(cc.longevityPotential, lang)})`
  )
  if (cc.strengths.length > 0) out.push(`+ ${cc.strengths.join(' / ')}`)
  if (cc.growthAreas.length > 0) out.push(`▸ ${cc.growthAreas.join(' / ')}`)

  if (a.degreeBasedAspects) {
    const dba = a.degreeBasedAspects
    out.push('')
    out.push(`▷ ${isKo ? '도수 기반 어스펙트' : 'Degree aspects'}`)
    out.push(
      `${isKo ? '긴장' : 'tension'} ${scoreLabel(dba.tensionScore, lang)} · ${isKo ? '조화' : 'harmony'} ${scoreLabel(dba.harmonyScore, lang)} · ${isKo ? '균형' : 'balance'} ${scoreLabel(dba.overallBalance, lang)}`
    )
    if (dba.tightestAspect) {
      const t = dba.tightestAspect
      out.push(
        `tightest: ${t.planet1} ${t.aspectType || '-'} ${t.planet2} (orb ${t.orb.toFixed(1)}°)`
      )
    }
    if (dba.majorAspects.length > 0) {
      const top = dba.majorAspects
        .slice(0, 3)
        .map((d) => `${d.planet1} ${d.aspectType || '-'} ${d.planet2} (orb ${d.orb.toFixed(1)}°)`)
        .join(' / ')
      out.push(`major: ${top}`)
    }
  }

  if (a.mercuryAnalysis) {
    const m = a.mercuryAnalysis
    out.push('')
    out.push(`▷ Mercury (${scoreWithLabel(m.mercuryCompatibility, lang)}) — ${m.communicationStyle}`)
    if (m.intellectualSynergy)
      out.push(`${isKo ? '지적 시너지' : 'intellectual synergy'}: ${m.intellectualSynergy}`)
    if (m.strengths.length > 0) out.push(`+ ${m.strengths.join(' / ')}`)
    if (m.potentialMiscommunications.length > 0)
      out.push(`- ${m.potentialMiscommunications.join(' / ')}`)
  }

  if (a.jupiterAnalysis) {
    const j = a.jupiterAnalysis
    out.push('')
    out.push(`▷ Jupiter (${scoreWithLabel(j.expansionCompatibility, lang)}) — ${j.sharedBeliefs}`)
    if (j.blessingAreas.length > 0)
      out.push(`+ ${isKo ? '축복' : 'blessing'}: ${j.blessingAreas.join(' / ')}`)
    if (j.growthAreas.length > 0)
      out.push(`▸ ${isKo ? '성장' : 'growth'}: ${j.growthAreas.join(' / ')}`)
    if (j.potentialConflicts.length > 0)
      out.push(`- ${j.potentialConflicts.join(' / ')}`)
  }

  if (a.saturnAnalysis) {
    const sa = a.saturnAnalysis
    out.push('')
    out.push(
      `▷ Saturn — ${sa.structureInRelationship} (${isKo ? '안정' : 'stability'} ${scoreLabel(sa.stabilityCompatibility, lang)} · ${isKo ? '장기' : 'long-term'} ${scoreLabel(sa.longTermPotential, lang)})`
    )
    if (sa.karmicLesson) out.push(`${isKo ? '카르마 교훈' : 'karmic'}: ${sa.karmicLesson}`)
    if (sa.maturityAreas.length > 0)
      out.push(`▸ ${isKo ? '성숙' : 'maturity'}: ${sa.maturityAreas.join(' / ')}`)
    if (sa.challenges.length > 0) out.push(`- ${sa.challenges.join(' / ')}`)
  }

  if (a.outerPlanetsAnalysis) {
    const op = a.outerPlanetsAnalysis
    out.push('')
    out.push(`▷ Outer planets (${scoreWithLabel(op.overallTranscendentScore, lang)})`)
    out.push(
      `Uranus ${scoreLabel(op.uranusInfluence.changeCompatibility, lang)} (${op.uranusInfluence.revolutionaryEnergy})` +
        ` · Neptune ${scoreLabel(op.neptuneInfluence.spiritualConnection, lang)} (${op.neptuneInfluence.dreamyQualities})` +
        ` · Pluto ${scoreLabel(op.plutoInfluence.transformationPotential, lang)} (${op.plutoInfluence.powerDynamics})`
    )
    if (op.generationalThemes.length > 0)
      out.push(`${isKo ? '세대 테마' : 'generation'}: ${op.generationalThemes.join(' / ')}`)
  }

  if (a.nodeAnalysis) {
    const n = a.nodeAnalysis
    out.push('')
    out.push(`▷ Nodes (${n.karmicRelationshipType}) — ${n.evolutionaryPurpose}`)
    out.push(
      `${isKo ? '북교점' : 'north node'}: ${scoreLabel(n.northNodeConnection.compatibility, lang)} — ${n.northNodeConnection.growthDirection}`
    )
    if (n.lifeLessons.length > 0)
      out.push(`${isKo ? '인생 교훈' : 'lessons'}: ${n.lifeLessons.join(' / ')}`)
  }

  if (a.lilithAnalysis) {
    const li = a.lilithAnalysis
    out.push('')
    out.push(
      `▷ Lilith (${scoreWithLabel(li.lilithCompatibility, lang)}) — ${li.shadowDynamics}`
    )
    out.push(
      `${isKo ? '자성 매력' : 'magnetic attraction'}: ${scoreLabel(li.magneticAttraction, lang)}`
    )
    if (li.repressedDesires.length > 0)
      out.push(`${isKo ? '억압된 욕망' : 'repressed'}: ${li.repressedDesires.join(' / ')}`)
    if (li.potentialChallenges.length > 0)
      out.push(`- ${li.potentialChallenges.join(' / ')}`)
  }

  if (a.davisonChart) {
    const dv = a.davisonChart
    out.push('')
    out.push(`▷ Davison — ${dv.relationshipIdentity}`)
    out.push(
      `Sun ${dv.relationshipSun.sign} · Moon ${dv.relationshipMoon.sign} · Asc ${dv.relationshipAscendant.sign}`
    )
    if (dv.emotionalFoundation)
      out.push(`${isKo ? '감정 기반' : 'emotional foundation'}: ${dv.emotionalFoundation}`)
    if (dv.coreStrengths.length > 0) out.push(`+ ${dv.coreStrengths.join(' / ')}`)
    if (dv.relationshipPurpose) out.push(`${isKo ? '목적' : 'purpose'}: ${dv.relationshipPurpose}`)
  }

  if (a.progressedChart) {
    const pg = a.progressedChart
    out.push('')
    out.push(`▷ Progressed — ${pg.currentRelationshipTheme}`)
    out.push(
      `Sun phase: ${pg.progressedSunPhase} · Moon phase: ${pg.progressedMoonPhase}`
    )
    if (pg.upcomingTrends.length > 0)
      out.push(`${isKo ? '예정 흐름' : 'upcoming'}: ${pg.upcomingTrends.join(' / ')}`)
    if (pg.timedInfluences.length > 0)
      out.push(`${isKo ? '시기 영향' : 'timed'}: ${pg.timedInfluences.join(' / ')}`)
  }

  if (a.extendedInsights.length > 0) {
    out.push('')
    out.push(`▷ ${isKo ? '핵심 인사이트' : 'Key insights'}`)
    a.extendedInsights.forEach((i) => out.push(`- ${i}`))
  }

  return out.join('\n')
}

/**
 * Convert timing details (daeun/seun/wolun/ilun for both partners)
 * from JSON to prose. Skips short-term cycles when theme filter set
 * them to null. Drops the `hasX` flags — the presence of an entry
 * already implies the flag.
 *
 * Now also surfaces astrology timing (current transits, solar/lunar
 * returns) per-person from the astro context. Previously these were
 * computed by buildAutoAstroContext but only buried in the raw JSON
 * dump — saju timing came through as clean prose while astro timing
 * was an 80-aspect array the LLM had to dig out. Surfacing both
 * here gives the two systems symmetric "what season are we in"
 * signals.
 */
function formatTimingForPrompt(
  timing: { person1: Record<string, unknown>; person2: Record<string, unknown> },
  astro: { person1?: Record<string, unknown> | null; person2?: Record<string, unknown> | null },
  lang: 'ko' | 'en'
): string {
  const isKo = lang === 'ko'
  const header = isKo
    ? '== 시기 흐름 (사주 대운/세운 + 점성 트랜짓·리턴) =='
    : '== Timing (Saju cycles + Astro transits/returns) =='
  const out: string[] = [header]

  /**
   * Pick top transit aspects: smallest orb first (tightest aspects
   * matter most), then prefer slow-moving outer planets (Jupiter,
   * Saturn, Uranus, Neptune, Pluto, Chiron) since their transits
   * define multi-month seasons rather than day-scale flickers.
   */
  const SLOW = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])
  type Aspect = {
    from?: { name?: string; sign?: string }
    to?: { name?: string; sign?: string }
    type?: string
    orb?: number
    applying?: boolean
  }
  const pickTopTransits = (aspects: unknown, limit = 5): string[] => {
    if (!Array.isArray(aspects)) return []
    const list = (aspects as Aspect[]).filter(
      (a) => a && a.from?.name && a.to?.name && a.type && typeof a.orb === 'number'
    )
    list.sort((a, b) => {
      const aSlow = SLOW.has(String(a.from?.name)) ? 0 : 1
      const bSlow = SLOW.has(String(b.from?.name)) ? 0 : 1
      if (aSlow !== bSlow) return aSlow - bSlow
      return (a.orb ?? 99) - (b.orb ?? 99)
    })
    return list.slice(0, limit).map((a) => {
      const arrow = a.applying ? '↗' : '↘'
      const fromName = String(a.from?.name)
      const toName = String(a.to?.name)
      const toSign = a.to?.sign ? ` ${a.to.sign}` : ''
      return `${fromName} ${a.type} ${toName}${toSign} (orb ${(a.orb ?? 0).toFixed(1)}° ${arrow})`
    })
  }

  const renderSide = (label: string, side: Record<string, unknown>, sideAstro?: Record<string, unknown> | null) => {
    const lines: string[] = []
    void side
    // Saju daeun/saeun/wolun/ilun used to be printed here, but they're
    // already in the cached saju table (see sajuTableFormatter) with
    // the ← 현재 / ← 올해 / ← 이번달 / ← 오늘 markers. Re-emitting them
    // here was duplicating ~250 chars per turn and the old build was
    // also dropping `(undefined-undefined)` placeholders because the
    // startAge/endAge fields aren't on side.daeunCurrent. Astro
    // transits / returns below are kept — they aren't in the table.

    // Astro side — surface currentTransits + returns from already-computed
    // buildAutoAstroContext output. No new calculation, just exposure.
    if (sideAstro) {
      const ct = sideAstro.currentTransits as Record<string, unknown> | undefined
      if (ct) {
        const asOf = ct.asOfIso ? String(ct.asOfIso).slice(0, 10) : ''
        // Astro timing — trimmed to top 5 transits per side, same
        // "around now" policy as 대운/세운/월운/일운 on the saju side.
        // findMajorTransits already ranks slow-mover outer planets
        // first (defining multi-month seasons) and ties on tight orb.
        // The fallback to transit aspects covers the case where no
        // major transit is in effect right now.
        const major = pickTopTransits(ct.majorTransits, 5)
        const fallback = major.length > 0 ? major : pickTopTransits(ct.aspects, 5)
        if (fallback.length > 0) {
          lines.push(
            `${isKo ? '점성 트랜짓' : 'astro transits'}${asOf ? ` (${asOf})` : ''}:`
          )
          fallback.forEach((line) => lines.push(`  - ${line}`))
        }
      }
      const returns = sideAstro.returns as Record<string, unknown> | undefined
      const sr = returns?.solarReturn as Record<string, unknown> | undefined
      if (sr) {
        const asc = (sr.ascendant as Record<string, unknown> | undefined)?.sign
        const planets = sr.planets as Array<Record<string, unknown>> | undefined
        const sun = planets?.find((p) => String(p.name).toLowerCase() === 'sun')
        const moon = planets?.find((p) => String(p.name).toLowerCase() === 'moon')
        const yr = sr.returnYear || ''
        const tag = `Asc ${asc || '-'}, Sun ${sun?.sign || '-'} h${sun?.house || '-'}, Moon ${moon?.sign || '-'} h${moon?.house || '-'}`
        lines.push(
          `${isKo ? '점성 솔라 리턴' : 'astro solar return'} ${yr}: ${tag}`
        )
      }
      const lr = returns?.lunarReturn as Record<string, unknown> | undefined
      if (lr) {
        const asc = (lr.ascendant as Record<string, unknown> | undefined)?.sign
        const planets = lr.planets as Array<Record<string, unknown>> | undefined
        const moon = planets?.find((p) => String(p.name).toLowerCase() === 'moon')
        const yr = lr.returnYear || ''
        const mo = lr.returnMonth || ''
        const tag = `Asc ${asc || '-'}, Moon ${moon?.sign || '-'} h${moon?.house || '-'}`
        lines.push(
          `${isKo ? '점성 루나 리턴' : 'astro lunar return'} ${yr}-${mo}: ${tag}`
        )
      }
    }

    if (lines.length === 0) return ''
    return [`▷ ${label}`, ...lines].join('\n')
  }

  const aBlock = renderSide('A', timing.person1, astro.person1)
  const bBlock = renderSide('B', timing.person2, astro.person2)

  // If neither side produced any astro timing content, the saju side is
  // already in the cached table — skip the whole section instead of
  // emitting a lonely "== 시기 흐름 ==" header.
  if (!aBlock && !bBlock) return ''

  if (aBlock) {
    out.push('')
    out.push(aBlock)
  }
  if (bBlock) {
    out.push('')
    out.push(bBlock)
  }
  return out.join('\n')
}

// Format fusion result for AI prompt
/**
 * Format Fusion compatibility data for the prompt.
 *
 * Output uses the same prose+`▷ 라벨` convention as the couple-matrix
 * block, instead of the previous markdown (`###` headers, `**bold**`,
 * `- ` bullets). The system prompt forbids the LLM from echoing
 * markdown back at the user, but mixing markdown into the source
 * made the LLM lean toward listy/headered output anyway. Stripping
 * markdown at the source aligns the input shape with the desired
 * output shape (prose).
 */
function formatFusionForPrompt(fusion: FusionCompatibilityResult, lang: string): string {
  const isKo = lang === 'ko'
  const langKey: 'ko' | 'en' = isKo ? 'ko' : 'en'
  const scoreInfo = interpretCompatibilityScore(fusion.overallScore)

  const header = isKo ? '== 종합 궁합 분석 ==' : '== Comprehensive Compatibility =='
  const lines: string[] = [
    header,
    `${isKo ? '등급' : 'Grade'}: ${scoreInfo.grade} ${scoreInfo.title} · ${scoreWithLabel(fusion.overallScore, langKey)}`,
    '',
    `▷ ${isKo ? 'AI 심층 분석' : 'AI Deep Analysis'}`,
    fusion.aiInsights.deepAnalysis,
  ]

  const joinBullets = (label: string, items: string[]) => {
    if (items.length === 0) return
    lines.push('')
    lines.push(`▷ ${label}`)
    items.forEach((s) => lines.push(`- ${s}`))
  }

  joinBullets(
    isKo ? '숨겨진 패턴' : 'Hidden Patterns',
    fusion.aiInsights.hiddenPatterns
  )
  joinBullets(
    isKo ? '시너지 요인' : 'Synergy Sources',
    fusion.aiInsights.synergySources
  )
  joinBullets(
    isKo ? '성장 기회' : 'Growth Opportunities',
    fusion.aiInsights.growthOpportunities
  )

  const dyn = fusion.relationshipDynamics
  lines.push('')
  lines.push(`▷ ${isKo ? '관계 역학' : 'Relationship Dynamics'}`)
  lines.push(
    `- ${isKo ? '감정적 강도' : 'Emotional Intensity'}: ${scoreLabel(dyn.emotionalIntensity, langKey)}`
  )
  lines.push(
    `- ${isKo ? '지적 조화' : 'Intellectual Alignment'}: ${scoreLabel(dyn.intellectualAlignment, langKey)}`
  )
  lines.push(
    `- ${isKo ? '영적 연결' : 'Spiritual Connection'}: ${scoreLabel(dyn.spiritualConnection, langKey)}`
  )
  lines.push(
    `- ${isKo ? '갈등 해결 스타일' : 'Conflict Resolution Style'}: ${dyn.conflictResolutionStyle}`
  )

  const fg = fusion.futureGuidance
  lines.push('')
  lines.push(`▷ ${isKo ? '미래 가이던스' : 'Future Guidance'}`)
  lines.push(`- ${isKo ? '단기 (1-6개월)' : 'Short-term (1-6mo)'}: ${fg.shortTerm}`)
  lines.push(`- ${isKo ? '중기 (6개월-2년)' : 'Medium-term (6mo-2yr)'}: ${fg.mediumTerm}`)
  lines.push(`- ${isKo ? '장기 (2년+)' : 'Long-term (2yr+)'}: ${fg.longTerm}`)

  if (fusion.recommendedActions.length > 0) {
    lines.push('')
    lines.push(`▷ ${isKo ? '추천 행동 (내부 참조 — 응답에선 prose 한 줄로)' : 'Recommended Actions (internal — fold into prose)'}`)
    fusion.recommendedActions.forEach((action) => {
      const priority =
        action.priority === 'high' ? '↑' : action.priority === 'medium' ? '·' : '↓'
      lines.push(
        `${priority} [${action.category}] ${action.action} — ${isKo ? '이유' : 'why'}: ${action.reasoning}`
      )
    })
  }

  return lines.join('\n')
}

export {
  clampMessages,
  stringifyForPrompt,
  prunePromptContext,
  scoreLabel,
  scoreWithLabel,
  formatExtendedSajuForPrompt,
  formatExtendedAstroForPrompt,
  formatTimingForPrompt,
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
