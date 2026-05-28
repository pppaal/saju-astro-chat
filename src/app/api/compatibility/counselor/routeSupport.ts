import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart } from '@/lib/astrology'
import { normalizeGender } from '@/lib/utils/gender'
import type { ChatMessage } from '@/lib/api'
function clampMessages(messages: ChatMessage[], max = 8) {
  return messages.slice(-max)
}

/**
 * 같은 데이터가 다른 객체 키 순서로 직렬화되지 않게 sort 한다 — JSON.stringify
 * 는 insertion order 를 따르므로, 객체를 어떻게 빌드했냐에 따라 같은 차트
 * 데이터가 다른 바이트로 나와서 Anthropic prompt-cache prefix 가 불일치할
 * 수 있다. 키를 알파벳순으로 정규화해 cache hit 안정.
 */
function sortObjectKeys(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value as object)) return '[Circular]'
  seen.add(value as object)
  if (Array.isArray(value)) return value.map((v) => sortObjectKeys(v, seen))
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortObjectKeys(obj[k], seen)
  }
  return out
}

function stringifyForPrompt(value: unknown): string {
  try {
    return JSON.stringify(sortObjectKeys(value, new WeakSet<object>()), null, 2)
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
    if (cfg.around === 'month') return Number(e.year) === yearNow && Number(e.month) === monthNow
    return Number(e.year) === yearNow && Number(e.month) === monthNow && Number(e.day) === dayNow
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
      parentKey && PROMPT_TRIM_WINDOWS[parentKey] ? trimSajuTimeWindow(parentKey, value) : value
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

  // 공용 normalizer — 'F' / 'Female' / 'female' / 'f' / 'M' / 'Male' 다 처리.
  // 이전 `lowercase === 'female'` 패턴은 'F' 가 'f' 로 떨어져 매칭 실패 →
  // 여자 사용자 'male' 로 잘못 분류 → 대운 순/역행 거꾸로.
  const genderInput = typeof person.gender === 'string' ? person.gender : undefined
  const normalized = normalizeGender(genderInput)
  const gender: 'male' | 'female' = normalized === 'female' ? 'female' : 'male'

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
      // normalizer 가 'male'/'female' 둘 다 확정 못 한 경우 = 입력이 빠지거나
      // 알 수 없는 포맷 → 'male' fallback 을 썼다는 의미.
      usedDefaultGender: normalized !== 'male' && normalized !== 'female',
    },
  }
}

async function buildAutoSajuContext(
  seed: PersonSeed | null,
  now: Date
): Promise<Record<string, unknown> | null> {
  if (!seed || process.env.NODE_ENV === 'test') return null
  try {
    // 궁합은 오로지 교차 → 개인 타임라인(세운 10년/월운/일진)은 프롬프트에
    // 안 들어가므로 계산도 안 한다. 관계 시기는 사주 synastry 안 세운/대운
    // cross가 담당. 여기선 교차에 쓰는 pillars·대운·개별 신살만 산출.
    const saju = calculateSajuData(seed.date, seed.time, seed.gender, 'solar', seed.timeZone)

    // 개별 신살(self)만 계산 — [개별 신살] 블록이 쓰는 유일한 enrichment.
    // 예전엔 격국·용신·12운성·natalRelations도 계산했지만(운명 상담사 미러용)
    // 지금 궁합 프롬프트엔 안 들어가므로 제거했다 (계산 비용만 들던 죽은 출력).
    let extras: Record<string, unknown> = {}
    try {
      const { getShinsalHits, toSajuPillarsLike } = await import('@/lib/saju/shinsal')
      const pillarsLike = toSajuPillarsLike(saju)
      const shinsal = getShinsalHits(pillarsLike, {
        includeGeneralShinsal: true,
        includeLuckyDetails: true,
      }) as unknown[]
      extras = { shinsal }
    } catch (err) {
      logger.warn('[compatibility/counselor] shinsal compute failed (non-fatal)', { err })
    }

    return {
      ...saju,
      daeun: saju.daeWoon,
      currentDaeun: saju.daeWoon?.current ?? null,
      extras,
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
    // 궁합=교차 → 개인 트랜짓/솔라·루나 리턴은 프롬프트에 안 들어가므로
    // 계산 안 함(가장 무거운 ephemeris 호출). 교차·완전성 체크에 쓰는
    // natal 행성만 추출.
    const nowIso = now.toISOString()

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
  const daeWoon = asRecord(saju.daeWoon) || asRecord(saju.daeun)

  // 궁합 교차에 실제 쓰는 것만 검증 — 개인 타임라인(세운/월운/일진)은
  // 더 이상 산출·사용하지 않으므로 완전성 체크에서도 제외.
  if (!isNonEmptyObject(saju.dayMaster)) missing.push(`${label}.saju.dayMaster`)
  if (!isNonEmptyObject(saju.pillars)) missing.push(`${label}.saju.pillars`)
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

  // 궁합 교차에 쓰는 natal 행성만 검증. 개인 트랜짓/리턴은 산출·사용 안 함.
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

export {
  clampMessages,
  stringifyForPrompt,
  prunePromptContext,
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  getAgeFromBirthDate,
}
