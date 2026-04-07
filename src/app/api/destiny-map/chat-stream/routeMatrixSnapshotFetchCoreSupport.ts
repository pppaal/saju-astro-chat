import {
  toChart,
  findNatalAspects,
  calculateExtraPoints,
  calculateAllAsteroids,
  type NatalChartData,
} from '@/lib/astrology'
import {
  computeDestinyMap,
  type CombinedResult as DestinyMapCombinedResult,
} from '@/lib/destiny-map/astrology'
import { buildCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import { buildPreciseTimelineSummary } from '@/lib/destiny-matrix/monthlyTimelinePrecise'
import { applyRuntimeCalibration } from '@/lib/destiny-matrix/calibrationRuntime'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core/buildCoreEnvelope'
import { buildMatrixSemanticContract } from '@/lib/destiny-matrix/layerSemantics'
import { buildLayerThemeProfiles } from '@/lib/destiny-matrix/layerThemeProfiles'
import {
  buildServiceInputCrossAudit,
  ensureMatrixInputCrossCompleteness,
  listMissingCrossKeysForService,
} from '@/lib/destiny-matrix/inputCross'
import type { MatrixCalculationInput, TransitCycle } from '@/lib/destiny-matrix/types'
import { buildDerivedCrossSnapshot } from '@/app/api/destiny-matrix/ai-report/routeDerivedContext'
import { calculateSajuData } from '@/lib/Saju/saju'
import type { FiveElement, PillarData } from '@/lib/Saju/types'
import { STEMS } from '@/lib/Saju/constants'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/Saju/shinsal'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import { logger } from '@/lib/logger'
import type { SajuDataStructure, AstroDataStructure } from './lib/types'
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixSnapshot } from './routePromptSupport'
import { buildBirthTimeRectificationCandidates } from './lib/birthTimeRectification'
import { computeAstroData, computeSajuData } from './lib/chart-calculator'
import { collectCrossEvidenceHighlights } from './routeMatrixSnapshotUiSupport'
import {
  enrichBirthTimeCandidatesWithCoreDiff,
  shouldBuildPreciseTiming,
} from './routeMatrixSnapshotBirthTimeSupport'

type MatrixHighlight = { layer?: number; keyword?: string; score?: number }
type MatrixAspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'semisextile'
  | 'quincunx'
  | 'quintile'
  | 'biquintile'
type MatrixAspectInput = {
  planet1: string
  planet2: string
  type: MatrixAspectType
  angle?: number
  orb?: number
}

const MATRIX_PLANET_SET = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
])

const ASPECT_ANGLE_MAP: Record<MatrixAspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
}

const ELEMENT_MAP: Record<string, FiveElement> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const TRANSIT_CYCLE_SET = new Set<TransitCycle>([
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])

const GEOKGUK_ALIASES: Partial<Record<string, MatrixCalculationInput['geokguk']>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

function normalizeStringList(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, limit)
}

function mapElementToWestern(
  element: string | undefined
): 'fire' | 'earth' | 'air' | 'water' | undefined {
  if (!element) {
    return undefined
  }
  const e = element.toLowerCase()
  if (e.includes('fire') || e.includes('화')) return 'fire'
  if (e.includes('earth') || e.includes('토')) return 'earth'
  if (e.includes('air') || e.includes('금')) return 'air'
  if (e.includes('water') || e.includes('수')) return 'water'
  return undefined
}

function normalizePlanetName(name: string): string {
  const key = name.toLowerCase()
  const mapping: Record<string, string> = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
  }
  return mapping[key] || name
}

function collectPlanetData(astro: AstroDataStructure | undefined): {
  planetSigns: Record<string, string>
  planetHouses: Record<string, number>
} {
  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  if (!astro || typeof astro !== 'object') {
    return { planetSigns, planetHouses }
  }

  for (const key of [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]) {
    const item = (astro as Record<string, unknown>)[key] as Record<string, unknown> | undefined
    if (!item || typeof item !== 'object') continue
    const pName = normalizePlanetName(key)
    const sign = typeof item.sign === 'string' ? item.sign : undefined
    const house = typeof item.house === 'number' ? item.house : Number(item.house)
    if (sign) planetSigns[pName] = sign
    if (Number.isFinite(house) && house >= 1 && house <= 12) {
      planetHouses[pName] = house
    }
  }

  return { planetSigns, planetHouses }
}

function deriveAdvancedAstroSignals(
  advancedAstro?: Partial<CombinedResult>
): Record<string, boolean> {
  if (!advancedAstro || typeof advancedAstro !== 'object') return {}
  return {
    solarReturn: !!advancedAstro.solarReturn,
    lunarReturn: !!advancedAstro.lunarReturn,
    progressions: !!advancedAstro.progressions,
    draconic: !!advancedAstro.draconic,
    harmonics: !!advancedAstro.harmonics,
    fixedStars: !!advancedAstro.fixedStars,
    eclipses: !!advancedAstro.eclipses,
    midpoints: !!advancedAstro.midpoints,
    asteroids: !!advancedAstro.asteroids,
    extraPoints: !!advancedAstro.extraPoints,
  }
}

const ADVANCED_ASTRO_REQUIRED_KEYS: Array<keyof CombinedResult> = [
  'extraPoints',
  'asteroids',
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
]

function hasAdvancedAstroCoverage(advancedAstro?: Partial<CombinedResult>): boolean {
  if (!advancedAstro || typeof advancedAstro !== 'object') return false
  return ADVANCED_ASTRO_REQUIRED_KEYS.every((key) => Boolean(advancedAstro[key]))
}

function pickAdvancedAstroFields(
  value: Partial<CombinedResult> | DestinyMapCombinedResult | undefined
): Partial<CombinedResult> {
  if (!value || typeof value !== 'object') return {}
  return {
    extraPoints: value.extraPoints,
    asteroids: value.asteroids,
    solarReturn: value.solarReturn,
    lunarReturn: value.lunarReturn,
    progressions: value.progressions,
    draconic: value.draconic,
    harmonics: value.harmonics,
    fixedStars: value.fixedStars,
    eclipses: value.eclipses,
    electional: value.electional,
    midpoints: value.midpoints,
  }
}

export async function ensureAdvancedAstroData(input: {
  name?: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  theme: string
  advancedAstro?: Partial<CombinedResult>
}): Promise<Partial<CombinedResult> | undefined> {
  if (hasAdvancedAstroCoverage(input.advancedAstro)) {
    return input.advancedAstro
  }

  try {
    const computed = await computeDestinyMap({
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
      gender: input.gender,
      theme: input.theme,
    })

    const computedAdvanced = pickAdvancedAstroFields(computed)
    if (input.advancedAstro && typeof input.advancedAstro === 'object') {
      return {
        ...computedAdvanced,
        ...pickAdvancedAstroFields(input.advancedAstro),
      }
    }
    return computedAdvanced
  } catch (error) {
    logger.warn('[chat-stream] advanced astro auto-compute failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return input.advancedAstro
  }
}

async function deriveMatrixAstroInputs(natalChartData?: NatalChartData): Promise<{
  aspects: MatrixAspectInput[]
  asteroidHouses: Record<string, number>
  extraPointSigns: Record<string, string>
}> {
  const empty = {
    aspects: [] as MatrixAspectInput[],
    asteroidHouses: {} as Record<string, number>,
    extraPointSigns: {} as Record<string, string>,
  }
  if (!natalChartData) return empty

  try {
    const chart = toChart(natalChartData)
    const natalAspectsRaw = findNatalAspects(chart, { includeMinor: true, maxResults: 120 })
    const aspects: MatrixAspectInput[] = natalAspectsRaw
      .filter((a) => MATRIX_PLANET_SET.has(a.from.name) && MATRIX_PLANET_SET.has(a.to.name))
      .map((a) => {
        const t = a.type as MatrixAspectType
        return {
          planet1: a.from.name,
          planet2: a.to.name,
          type: t,
          angle: ASPECT_ANGLE_MAP[t],
          orb: typeof a.orb === 'number' ? a.orb : undefined,
        }
      })
      .slice(0, 60)

    const meta = natalChartData.meta
    if (
      !meta?.jdUT ||
      !Array.isArray(natalChartData.houses) ||
      natalChartData.houses.length === 0
    ) {
      return { ...empty, aspects }
    }

    const houseCusps = natalChartData.houses.map((h) => h.cusp)
    const asteroidHouses: Record<string, number> = {}
    try {
      const asteroids = calculateAllAsteroids(meta.jdUT, houseCusps)
      for (const key of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
        const house = asteroids[key]?.house
        if (typeof house === 'number' && house >= 1 && house <= 12) {
          asteroidHouses[key] = house
        }
      }
    } catch (error) {
      logger.warn('[chat-stream] asteroid derivation failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const sun = natalChartData.planets.find((p) => p.name === 'Sun')
    const moon = natalChartData.planets.find((p) => p.name === 'Moon')
    const extraPointSigns: Record<string, string> = {}

    if (
      meta.latitude != null &&
      meta.longitude != null &&
      sun &&
      moon &&
      natalChartData.ascendant &&
      houseCusps.length > 0
    ) {
      try {
        const extras = await calculateExtraPoints(
          meta.jdUT,
          meta.latitude,
          meta.longitude,
          natalChartData.ascendant.longitude,
          sun.longitude,
          moon.longitude,
          sun.house,
          houseCusps
        )
        extraPointSigns.Chiron = extras.chiron.sign
        extraPointSigns.Lilith = extras.lilith.sign
        extraPointSigns.PartOfFortune = extras.partOfFortune.sign
        extraPointSigns.Vertex = extras.vertex.sign
      } catch (error) {
        logger.warn('[chat-stream] extra-point derivation failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { aspects, asteroidHouses, extraPointSigns }
  } catch (error) {
    logger.warn('[chat-stream] matrix astro derivation failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return empty
  }
}

function normalizeElementToFiveElement(value: unknown): FiveElement | undefined {
  if (typeof value !== 'string') return undefined
  return ELEMENT_MAP[value.trim().toLowerCase()] || ELEMENT_MAP[value.trim()]
}

function inferElementFromStemName(stemName: string | undefined): FiveElement | undefined {
  if (!stemName) return undefined
  const stem = STEMS.find((item) => item.name === stemName)
  return normalizeElementToFiveElement(stem?.element)
}

function normalizeTransitCycles(value: unknown): MatrixCalculationInput['activeTransits'] {
  if (!Array.isArray(value)) return []

  const out: TransitCycle[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      if (TRANSIT_CYCLE_SET.has(item as TransitCycle)) out.push(item as TransitCycle)
      continue
    }
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const cycleCandidate =
      typeof record.cycle === 'string'
        ? record.cycle
        : typeof record.type === 'string'
          ? record.type
          : typeof record.id === 'string'
            ? record.id
            : undefined
    if (cycleCandidate && TRANSIT_CYCLE_SET.has(cycleCandidate as TransitCycle)) {
      out.push(cycleCandidate as TransitCycle)
    }
  }

  return Array.from(new Set(out))
}

function pickSajuPillars(raw: Record<string, unknown>): {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
} {
  const nested = raw.pillars as Record<string, unknown> | undefined
  return {
    yearPillar: (raw.yearPillar || nested?.year) as PillarData | undefined,
    monthPillar: (raw.monthPillar || nested?.month) as PillarData | undefined,
    dayPillar: (raw.dayPillar || nested?.day) as PillarData | undefined,
    timePillar: (raw.timePillar || nested?.time) as PillarData | undefined,
  }
}

function buildSibsinDistributionFromPillars(input: {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
}): MatrixCalculationInput['sibsinDistribution'] {
  const out: Record<string, number> = {}
  for (const pillar of [input.yearPillar, input.monthPillar, input.dayPillar, input.timePillar]) {
    const cheon = pillar?.heavenlyStem?.sibsin
    const ji = pillar?.earthlyBranch?.sibsin
    if (typeof cheon === 'string' && cheon.trim()) out[cheon] = (out[cheon] || 0) + 1
    if (typeof ji === 'string' && ji.trim()) out[ji] = (out[ji] || 0) + 1
  }
  return out as MatrixCalculationInput['sibsinDistribution']
}

function normalizeCalendarSignalLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (!item || typeof item !== 'object') return ''
          const signal = item as { level?: string; trigger?: string; score?: number }
          const trigger = signal.trigger || ''
          if (!trigger) return ''
          const score =
            typeof signal.score === 'number' && Number.isFinite(signal.score)
              ? ` (${signal.score.toFixed(1)})`
              : ''
          return signal.level ? `${signal.level}: ${trigger}${score}` : `${trigger}${score}`
        })
        .filter(Boolean)
    )
  ).slice(0, 6)
}

function normalizeOverlapTimelineLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (!item || typeof item !== 'object') return ''
          const point = item as { month?: string; overlapStrength?: number; peakLevel?: string }
          const month = typeof point.month === 'string' ? point.month : ''
          const overlap =
            typeof point.overlapStrength === 'number' && Number.isFinite(point.overlapStrength)
              ? point.overlapStrength.toFixed(2)
              : ''
          const peak = typeof point.peakLevel === 'string' ? point.peakLevel : ''
          return [month, overlap ? `overlap ${overlap}` : '', peak].filter(Boolean).join(' ')
        })
        .filter(Boolean)
    )
  ).slice(0, 6)
}

function normalizeDomainScoreMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw
      continue
    }
    if (!raw || typeof raw !== 'object') continue
    const candidate = raw as { finalScoreAdjusted?: number; baseFinalScore?: number }
    if (
      typeof candidate.finalScoreAdjusted === 'number' &&
      Number.isFinite(candidate.finalScoreAdjusted)
    ) {
      out[key] = candidate.finalScoreAdjusted
      continue
    }
    if (typeof candidate.baseFinalScore === 'number' && Number.isFinite(candidate.baseFinalScore)) {
      out[key] = candidate.baseFinalScore
    }
  }
  return out
}

function buildTopLayers(highlights: MatrixHighlight[]): Array<{ layer: number; score: number }> {
  const grouped = new Map<number, number[]>()
  for (const item of highlights) {
    const layer = Number(item.layer || 0)
    const score = Number(item.score || 0)
    if (!layer || !score) continue
    if (!grouped.has(layer)) grouped.set(layer, [])
    grouped.get(layer)!.push(score)
  }
  return Array.from(grouped.entries())
    .map(([layer, scores]) => ({
      layer,
      score: Number((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export async function fetchMatrixSnapshot(input: {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  lang: string
  saju?: SajuDataStructure
  astro: AstroDataStructure | undefined
  natalChartData?: NatalChartData
  advancedAstro?: Partial<CombinedResult>
  currentTransits?: unknown[]
  theme: string
  focusDomain?: InsightDomain
  needsPreciseTiming?: boolean
  skipBirthTimeRectification?: boolean
  skipPreciseTiming?: boolean
}): Promise<MatrixSnapshot | null> {
  try {
    const { planetSigns, planetHouses } = collectPlanetData(input.astro)
    const derived = await deriveMatrixAstroInputs(input.natalChartData)
    const advancedAstroSignals = deriveAdvancedAstroSignals(input.advancedAstro)
    const dominantWesternElement = mapElementToWestern(
      ((input.astro as Record<string, unknown> | undefined)?.dominantElement as
        | string
        | undefined) ||
        ((input.astro as Record<string, unknown> | undefined)?.dominantWesternElement as
          | string
          | undefined)
    )
    const matrixLang: 'ko' | 'en' = input.lang === 'ko' ? 'ko' : 'en'

    let rawSaju =
      input.saju && typeof input.saju === 'object' ? (input.saju as Record<string, unknown>) : null
    if (!rawSaju || typeof rawSaju !== 'object') {
      rawSaju = calculateSajuData(
        input.birthDate,
        input.birthTime,
        input.gender,
        'solar',
        'Asia/Seoul'
      ) as unknown as Record<string, unknown>
    }
    const { yearPillar, monthPillar, dayPillar, timePillar } = pickSajuPillars(rawSaju)

    const dayMasterElement =
      normalizeElementToFiveElement(dayPillar?.heavenlyStem?.element) ||
      normalizeElementToFiveElement(
        ((rawSaju.dayMaster as Record<string, unknown> | undefined)?.element as
          | string
          | undefined) ||
          ((rawSaju.dayMaster as Record<string, unknown> | undefined)?.heavenlyStem as
            | string
            | undefined)
      )
    if (!dayMasterElement) return null

    const pillarElements = [
      normalizeElementToFiveElement(yearPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(yearPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(monthPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(monthPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(dayPillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(dayPillar?.earthlyBranch?.element),
      normalizeElementToFiveElement(timePillar?.heavenlyStem?.element),
      normalizeElementToFiveElement(timePillar?.earthlyBranch?.element),
    ].filter((value): value is FiveElement => Boolean(value))

    const sibsinDistribution = buildSibsinDistributionFromPillars({
      yearPillar,
      monthPillar,
      dayPillar,
      timePillar,
    })

    const dayMasterStemName = dayPillar?.heavenlyStem?.name
    let twelveStages: MatrixCalculationInput['twelveStages'] = {}
    let relations: MatrixCalculationInput['relations'] = []
    let shinsalList: MatrixCalculationInput['shinsalList']
    let geokguk: MatrixCalculationInput['geokguk']
    let yongsin: MatrixCalculationInput['yongsin']

    if (yearPillar && monthPillar && dayPillar && timePillar && dayMasterStemName) {
      try {
        const sajuLike = toSajuPillarsLike({ yearPillar, monthPillar, dayPillar, timePillar })
        const byPillar = getTwelveStagesForPillars(sajuLike, 'day')
        const stageCounts: Record<string, number> = {}
        for (const stage of Object.values(byPillar)) {
          stageCounts[stage] = (stageCounts[stage] || 0) + 1
        }
        twelveStages = stageCounts as MatrixCalculationInput['twelveStages']
        relations = analyzeRelations(
          toAnalyzeInputFromSaju(
            { year: yearPillar, month: monthPillar, day: dayPillar, time: timePillar },
            dayMasterStemName
          )
        )
        const shinsalHits = getShinsalHits(sajuLike, {
          includeLuckyDetails: true,
          includeGeneralShinsal: true,
          includeTwelveAll: true,
          useMonthCompletion: true,
        })
        const normalizedShinsal = shinsalHits
          .map((hit) => {
            if (hit.kind === '금여성') return '금여록'
            if (hit.kind === '문창') return '문창귀인'
            return hit.kind
          })
          .filter((kind) => typeof kind === 'string' && kind.trim().length > 0)
        shinsalList = Array.from(
          new Set(normalizedShinsal)
        ) as MatrixCalculationInput['shinsalList']
      } catch (error) {
        logger.warn('[chat-stream] Failed to derive relation/stage/shinsal snapshot', {
          error: error instanceof Error ? error.message : String(error),
        })
      }

      try {
        const advanced = analyzeAdvancedSaju(
          {
            name: dayPillar.heavenlyStem.name,
            element: dayPillar.heavenlyStem.element,
            yin_yang: dayPillar.heavenlyStem.yin_yang || '양',
          },
          { yearPillar, monthPillar, dayPillar, timePillar }
        )
        const mappedGeokguk = GEOKGUK_ALIASES[advanced.geokguk.type]
        if (mappedGeokguk) geokguk = mappedGeokguk
        yongsin = normalizeElementToFiveElement(advanced.yongsin.primary)
      } catch (error) {
        logger.warn('[chat-stream] Failed to derive advanced saju snapshot', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const unse = rawSaju.unse as
      | {
          annual?: Array<{ year?: number; element?: FiveElement }>
          monthly?: Array<{ year?: number; month?: number; element?: FiveElement }>
        }
      | undefined
    const daeWoon = rawSaju.daeWoon as { current?: { heavenlyStem?: string } } | undefined
    const currentAnnual =
      unse?.annual?.find((item) => item?.year === currentYear) || unse?.annual?.[0]
    const currentMonthly =
      unse?.monthly?.find((item) => item?.year === currentYear && item?.month === currentMonth) ||
      unse?.monthly?.[0]

    const currentDaeunElement = inferElementFromStemName(daeWoon?.current?.heavenlyStem)
    const currentSaeunElement = normalizeElementToFiveElement(currentAnnual?.element)
    const currentWolunElement = normalizeElementToFiveElement(currentMonthly?.element)
    const currentIljinDate = new Date().toISOString().slice(0, 10)
    const fallbackIljinElement = currentWolunElement || currentSaeunElement || currentDaeunElement
    const activeTransits = normalizeTransitCycles(input.currentTransits)
    const astroTimingIndex = buildAstroTimingIndex({
      activeTransits,
      advancedAstroSignals,
    })
    let birthTimeRectification:
      | NonNullable<NonNullable<MatrixCalculationInput['profileContext']>['birthTimeRectification']>
      | undefined

    if (!input.skipBirthTimeRectification) {
      try {
        const rectificationCandidates = await buildBirthTimeRectificationCandidates({
          birthDate: input.birthDate,
          birthTime: input.birthTime,
          gender: input.gender,
          latitude: input.latitude,
          longitude: input.longitude,
          locale: matrixLang,
          timeZone: input.natalChartData?.meta?.timeZone || 'Asia/Seoul',
          focusDomain: input.focusDomain,
          currentSaju: rawSaju as unknown as SajuDataStructure,
          currentNatalChart: input.natalChartData,
        })
        if (rectificationCandidates.length) {
          birthTimeRectification = {
            currentBirthTime: input.birthTime,
            candidates: rectificationCandidates,
          }
        }
      } catch (rectificationError) {
        logger.warn('[chat-stream] Birth-time rectification candidate build failed', {
          error:
            rectificationError instanceof Error
              ? rectificationError.message
              : String(rectificationError),
        })
      }
    }

    const baseMatrixInput: MatrixCalculationInput = {
      dayMasterElement,
      pillarElements,
      sibsinDistribution,
      twelveStages,
      relations,
      geokguk,
      yongsin,
      currentDaeunElement,
      currentSaeunElement,
      currentWolunElement,
      currentIljinElement: fallbackIljinElement,
      currentIljinDate,
      shinsalList,
      dominantWesternElement,
      planetHouses: planetHouses as MatrixCalculationInput['planetHouses'],
      planetSigns: planetSigns as MatrixCalculationInput['planetSigns'],
      aspects: derived.aspects as MatrixCalculationInput['aspects'],
      activeTransits,
      astroTimingIndex,
      asteroidHouses: derived.asteroidHouses as MatrixCalculationInput['asteroidHouses'],
      extraPointSigns: derived.extraPointSigns as MatrixCalculationInput['extraPointSigns'],
      advancedAstroSignals,
      sajuSnapshot: rawSaju,
      astrologySnapshot: input.natalChartData
        ? ({ natalChart: input.natalChartData } as MatrixCalculationInput['astrologySnapshot'])
        : undefined,
      currentDateIso: new Date().toISOString().slice(0, 10),
      profileContext: {
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.natalChartData?.meta?.timeZone || 'Asia/Seoul',
        analysisAt: new Date().toISOString(),
        birthTimeRectification,
      },
      lang: matrixLang,
      startYearMonth: `${new Date().getFullYear()}-01`,
    }
    const matrixInput: MatrixCalculationInput = {
      ...baseMatrixInput,
      crossSnapshot: buildDerivedCrossSnapshot(
        baseMatrixInput as unknown as Record<string, unknown>,
        {
          source: 'chat-stream',
          theme: input.theme,
          category: input.theme,
        }
      ),
    }
    const crossCompleteInput = ensureMatrixInputCrossCompleteness(matrixInput)
    const crossAudit = buildServiceInputCrossAudit(crossCompleteInput, 'counselor')
    const crossMissingKeys = listMissingCrossKeysForService(crossAudit, 'counselor')
    const coreEnvelope = buildCoreEnvelope({
      mode: 'comprehensive',
      lang: matrixLang,
      matrixInput: crossCompleteInput,
      matrixCalculator: calculateDestinyMatrix,
    })
    const normalizedMatrixInput = coreEnvelope.normalizedInput
    const matrix = coreEnvelope.matrix
    const matrixReport = coreEnvelope.matrixReport
    const core = coreEnvelope.coreSeed
    let matrixSummaryForCounselor =
      matrix && typeof matrix === 'object' && 'summary' in matrix ? matrix.summary : undefined

    if (
      matrixSummaryForCounselor &&
      !input.skipPreciseTiming &&
      shouldBuildPreciseTiming(input.theme, input.needsPreciseTiming)
    ) {
      try {
        const preciseTimelineSummary = await buildPreciseTimelineSummary(
          normalizedMatrixInput,
          matrixSummaryForCounselor,
          (timelineInput) =>
            calculateDestinyMatrix(timelineInput, { skipTimelineRecompute: true }).summary
        )
        matrixSummaryForCounselor = { ...matrixSummaryForCounselor, ...preciseTimelineSummary }
        logger.info('[chat-stream] Applied precise monthly timing summary', {
          overlapTimelineCount: matrixSummaryForCounselor.overlapTimeline?.length || 0,
          reliabilityBand: matrixSummaryForCounselor.timingCalibration?.reliabilityBand || null,
        })
      } catch (preciseTimingError) {
        logger.warn('[chat-stream] Precise monthly timing summary failed; using base summary', {
          error:
            preciseTimingError instanceof Error
              ? preciseTimingError.message
              : String(preciseTimingError),
        })
      }
    }
    const baseCounselorPacket = buildCounselorEvidencePacket({
      theme: input.theme as Parameters<typeof buildCounselorEvidencePacket>[0]['theme'],
      lang: matrixLang,
      focusDomainOverride: input.focusDomain,
      matrixInput: normalizedMatrixInput,
      matrixReport,
      matrixSummary: matrixSummaryForCounselor || matrix.summary,
      signalSynthesis: core.signalSynthesis,
      strategyEngine: core.strategyEngine,
      birthDate: input.birthDate,
    })
    if (birthTimeRectification?.candidates?.length) {
      birthTimeRectification.candidates = await enrichBirthTimeCandidatesWithCoreDiff({
        candidates: birthTimeRectification.candidates,
        currentBirthTime: input.birthTime,
        currentSnapshot: {
          directAnswer: baseCounselorPacket.singleSubjectView?.directAnswer || '',
          actionDomain:
            baseCounselorPacket.singleSubjectView?.actionAxis.domain ||
            baseCounselorPacket.actionFocusDomain,
          riskDomain: baseCounselorPacket.singleSubjectView?.riskAxis.domain,
          bestWindow:
            baseCounselorPacket.singleSubjectView?.timingState.bestWindow ||
            baseCounselorPacket.topTimingWindow?.window,
          branchSummary: baseCounselorPacket.singleSubjectView?.branches[0]?.summary || '',
        },
        fetchCandidateSnapshot: async (candidateBirthTime) => {
          const candidateAstro = await computeAstroData(
            input.birthDate,
            candidateBirthTime,
            input.latitude,
            input.longitude,
            input.natalChartData?.meta?.timeZone || 'Asia/Seoul'
          )
          const candidateSaju = await computeSajuData(
            input.birthDate,
            candidateBirthTime,
            input.gender,
            input.natalChartData?.meta?.timeZone || 'Asia/Seoul'
          )
          if (!candidateAstro.astro) return null
          const candidateSnapshot = await fetchMatrixSnapshot({
            ...input,
            birthTime: candidateBirthTime,
            saju: candidateSaju,
            astro: candidateAstro.astro,
            natalChartData: candidateAstro.natalChartData,
            needsPreciseTiming: false,
            skipBirthTimeRectification: true,
            skipPreciseTiming: true,
          })
          const packet = candidateSnapshot?.core?.counselorEvidence as
            | ReturnType<typeof buildCounselorEvidencePacket>
            | undefined
          const singleSubject = packet?.singleSubjectView
          return {
            directAnswer: singleSubject?.directAnswer || '',
            actionDomain: singleSubject?.actionAxis.domain || packet?.actionFocusDomain,
            riskDomain: singleSubject?.riskAxis.domain,
            bestWindow: singleSubject?.timingState.bestWindow || packet?.topTimingWindow?.window,
            branchSummary: singleSubject?.branches?.[0]?.summary || '',
          }
        },
        locale: matrixLang,
      })
      if (normalizedMatrixInput.profileContext?.birthTimeRectification) {
        normalizedMatrixInput.profileContext.birthTimeRectification.candidates =
          birthTimeRectification.candidates
      }
    }
    if (matrixSummaryForCounselor?.timingCalibration) {
      const actionTimingWindow = core.canonical.domainTimingWindows.find(
        (item) => item.domain === core.canonical.actionFocusDomain
      )
      const calibratedTiming = await applyRuntimeCalibration(
        matrixSummaryForCounselor.timingCalibration,
        {
          service: 'counselor',
          actionFocusDomain: core.canonical.actionFocusDomain,
          timingWindow: actionTimingWindow?.window,
          timingGranularity: actionTimingWindow?.timingGranularity,
          overlapTimeline: matrixSummaryForCounselor.overlapTimeline,
          overlapTimelineByDomain: matrixSummaryForCounselor.overlapTimelineByDomain,
        }
      )
      if (calibratedTiming) {
        matrixSummaryForCounselor = {
          ...matrixSummaryForCounselor,
          timingCalibration: calibratedTiming,
        }
      }
    }

    const counselorEvidence = buildCounselorEvidencePacket({
      theme: input.theme as Parameters<typeof buildCounselorEvidencePacket>[0]['theme'],
      lang: matrixLang,
      focusDomainOverride: input.focusDomain,
      matrixInput: normalizedMatrixInput,
      matrixReport,
      matrixSummary: matrixSummaryForCounselor || matrix.summary,
      signalSynthesis: core.signalSynthesis,
      strategyEngine: core.strategyEngine,
      birthDate: input.birthDate,
    })
    const semantics = buildMatrixSemanticContract(matrix)
    const layerThemeProfiles = buildLayerThemeProfiles(matrix, normalizedMatrixInput)

    const strengths: MatrixHighlight[] = (
      (matrixSummaryForCounselor || matrix.summary).strengthPoints || []
    ).map((point) => ({
      layer: point.layer,
      keyword: point.cell?.interaction?.keyword || '',
      score: point.cell?.interaction?.score || 0,
    }))
    const cautions: MatrixHighlight[] = (
      (matrixSummaryForCounselor || matrix.summary).cautionPoints || []
    ).map((point) => ({
      layer: point.layer,
      keyword: point.cell?.interaction?.keyword || '',
      score: point.cell?.interaction?.score || 0,
    }))
    const merged = [...strengths, ...cautions]
    const themeDomainMap: Record<string, string> = {
      love: 'love',
      family: 'love',
      career: 'career',
      wealth: 'money',
      health: 'health',
      today: 'career',
      month: 'career',
      year: 'career',
      life: 'career',
      chat: 'general',
    }
    const themeDomain = input.focusDomain || themeDomainMap[input.theme] || 'career'
    const crossEvidenceHighlights = collectCrossEvidenceHighlights(
      normalizedMatrixInput.crossSnapshot,
      input.focusDomain || themeDomain
    )

    return {
      totalScore: Number((matrixSummaryForCounselor || matrix.summary).totalScore || 0),
      topLayers: buildTopLayers(merged),
      highlights: merged
        .map((item) => `${item.keyword || 'n/a'}(${Number(item.score || 0).toFixed(1)})`)
        .slice(0, 5),
      crossEvidenceHighlights,
      synergies: ((matrixSummaryForCounselor || matrix.summary).topSynergies || [])
        .map(
          (item) =>
            `${item.description || 'synergy'}${
              typeof item.score === 'number' ? `(${Number(item.score).toFixed(1)})` : ''
            }`
        )
        .slice(0, 3),
      drivers: normalizeStringList((matrixSummaryForCounselor || matrix.summary).drivers, 6),
      cautions: normalizeStringList((matrixSummaryForCounselor || matrix.summary).cautions, 6),
      calendarSignals: normalizeCalendarSignalLines(
        (matrixSummaryForCounselor || matrix.summary).calendarSignals
      ),
      overlapTimeline: normalizeOverlapTimelineLines(
        (matrixSummaryForCounselor || matrix.summary).overlapTimeline
      ),
      domainScores: normalizeDomainScoreMap(
        (matrixSummaryForCounselor || matrix.summary).domainScores
      ),
      confidenceScore:
        typeof (matrixSummaryForCounselor || matrix.summary).confidenceScore === 'number'
          ? (matrixSummaryForCounselor || matrix.summary).confidenceScore
          : undefined,
      finalScoreAdjusted:
        typeof (matrixSummaryForCounselor || matrix.summary).finalScoreAdjusted === 'number'
          ? (matrixSummaryForCounselor || matrix.summary).finalScoreAdjusted
          : undefined,
      semanticHints: (semantics.layers || [])
        .filter((layer) => layer.active)
        .slice(0, 6)
        .map((layer) => {
          const name = matrixLang === 'ko' ? layer.nameKo : layer.nameEn
          const meaning = matrixLang === 'ko' ? layer.meaningKo : layer.meaningEn
          return `${name || layer.id}[${layer.signalStrength}/${layer.matchedCells}] ${meaning || ''}`.trim()
        }),
      layerThemeBriefs: (layerThemeProfiles || [])
        .slice(0, 6)
        .map((layer) => {
          const insight = (layer.themeInsights || []).find((item) => item.domain === themeDomain)
          const summary = matrixLang === 'ko' ? insight?.summaryKo : insight?.summaryEn
          if (!summary) return ''
          return `${layer.layerNameKo || layer.layerId || 'layer'}: ${summary}`
        })
        .filter(Boolean),
      core: {
        coreHash: core.coreHash,
        overallPhase: core.strategyEngine.overallPhase,
        overallPhaseLabel: core.strategyEngine.overallPhaseLabel,
        attackPercent: core.strategyEngine.attackPercent,
        defensePercent: core.strategyEngine.defensePercent,
        topClaimIds: core.canonical.claimIds.slice(0, 8),
        topCautionSignalIds: core.canonical.cautions.slice(0, 8),
        counselorEvidence,
        quality: {
          score: core.quality.score,
          grade: core.quality.grade,
          warnings: core.quality.warnings.slice(0, 8),
          dataQuality: {
            missingFields: core.quality.dataQuality.missingFields.slice(0, 8),
            derivedFields: core.quality.dataQuality.derivedFields.slice(0, 8),
            conflictingFields: core.quality.dataQuality.conflictingFields.slice(0, 8),
            qualityPenalties: core.quality.dataQuality.qualityPenalties.slice(0, 10),
            confidenceReason: core.quality.dataQuality.confidenceReason,
          },
        },
      },
      globalConflictPolicy: semantics.globalConflictPolicy,
      lowConfidencePolicy: semantics.lowConfidencePolicy,
      inputCrossMissing: crossMissingKeys,
    }
  } catch (error) {
    logger.warn('[chat-stream] Matrix snapshot build failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
