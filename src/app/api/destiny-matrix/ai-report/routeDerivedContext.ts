import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import type {
  AstrologySnapshot,
  CrossSnapshot,
  MatrixCalculationInput,
  SajuSnapshot,
} from '@/lib/destiny-matrix/types'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import { logger } from '@/lib/logger'
import {
  buildCrossEvidence,
  collectTopInsightHints,
  deriveCrossAgreement,
  deriveCrossAgreementMatrix,
  DERIVED_CROSS_DOMAINS,
  hasFullAdvancedAstroSignals,
  hasObjectKeys,
  normalizeDomainAnalysisScores,
  normalizeGenderForSaju,
  normalizeMatrixSummaryDomainScores,
  toOptionalNumber,
  toOptionalRecord,
  toOptionalString,
  type DerivedCrossDomain,
  type DerivedDomainScore,
} from './routeDerivedContext.support'
import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '@/lib/Saju/shinsal'
import { STEMS as SAJU_STEMS } from '@/lib/Saju/constants'
import type { FiveElement } from '@/lib/Saju/types'
import {
  calculateAllAsteroids,
  calculateExtraPoints,
  calculateLunarReturn,
  calculateMidpoints,
  calculateNatalChart,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateTransitChart,
  compareDraconicToNatal,
  findEclipseImpact,
  findFixedStarConjunctions,
  findMajorTransits,
  findMidpointActivations,
  findNatalAspects,
  generateHarmonicProfile,
  getUpcomingEclipses,
  toChart,
} from '@/lib/astrology'

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

const DERIVED_SAJU_KEY = '__derivedSajuData'
const STEM_ELEMENT_BY_NAME: Record<string, FiveElement> = SAJU_STEMS.reduce(
  (acc, item) => {
    acc[item.name] = item.element
    return acc
  },
  {} as Record<string, FiveElement>
)

const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const STEM_ELEMENTS: Record<string, string> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
}

const WESTERN_SIGN_ELEMENT_MAP: Record<string, MatrixCalculationInput['dominantWesternElement']> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
  양: 'fire',
  황소: 'earth',
  쌍둥이: 'air',
  게: 'water',
  사자: 'fire',
  처녀: 'earth',
  천칭: 'air',
  전갈: 'water',
  사수: 'fire',
  염소: 'earth',
  물병: 'air',
  물고기: 'water',
}

const SHINSAL_WHITELIST = new Set<string>([
  '천을귀인',
  '태극귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '학당귀인',
  '금여록',
  '천주귀인',
  '암록',
  '건록',
  '제왕',
  '도화',
  '홍염살',
  '양인',
  '백호',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '효신살',
  '상문살',
  '역마',
  '화개',
  '장성',
  '반안',
  '천라지망',
  '공망',
  '삼재',
  '원진',
])

function normalizeWesternSignName(raw: string): string {
  return raw.trim().toLowerCase()
}

export function deriveDominantWesternElementFromPlanetSigns(
  planetSigns?: Record<string, unknown>
): MatrixCalculationInput['dominantWesternElement'] | undefined {
  if (!planetSigns) return undefined
  const score: Record<'fire' | 'earth' | 'air' | 'water', number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  }
  const coreWeights: Record<string, number> = {
    sun: 3,
    moon: 3,
    mercury: 2,
    venus: 2,
    mars: 2,
    jupiter: 1,
    saturn: 1,
  }
  for (const [planet, signValue] of Object.entries(planetSigns)) {
    if (typeof signValue !== 'string') continue
    const sign = normalizeWesternSignName(signValue)
    const element = WESTERN_SIGN_ELEMENT_MAP[sign]
    if (!element) continue
    const weight = coreWeights[planet.trim().toLowerCase()] || 1
    score[element] += weight
  }
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1])
  if (!sorted[0] || sorted[0][1] <= 0) return undefined
  return sorted[0][0] as MatrixCalculationInput['dominantWesternElement']
}

function normalizeTwelveStageKey(stage: string): string {
  if (stage === '건록') return '임관'
  if (stage === '제왕') return '왕지'
  return stage
}

function deriveAdvancedSajuMatrixFields(
  sajuData: ReturnType<typeof calculateSajuData>
): Pick<MatrixCalculationInput, 'twelveStages' | 'relations' | 'shinsalList'> {
  const stagesByPillar = getTwelveStagesForPillars(sajuData.pillars)
  const stageCount: Record<string, number> = {}
  for (const stage of Object.values(stagesByPillar)) {
    const key = normalizeTwelveStageKey(stage)
    stageCount[key] = (stageCount[key] || 0) + 1
  }

  const relations = analyzeRelations(
    toAnalyzeInputFromSaju(sajuData.pillars, sajuData.dayMaster?.name)
  )

  const shinsalHits = getShinsalHits(sajuData.pillars, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
  })
  const shinsalList = [
    ...new Set(shinsalHits.map((hit) => hit.kind).filter((k) => SHINSAL_WHITELIST.has(k))),
  ]

  return {
    twelveStages: stageCount as MatrixCalculationInput['twelveStages'],
    relations,
    shinsalList: shinsalList as MatrixCalculationInput['shinsalList'],
  }
}

function deriveSibsinDistributionFromSaju(sajuData: ReturnType<typeof calculateSajuData>) {
  const distribution: Record<string, number> = {}
  const pillars = [
    sajuData.yearPillar,
    sajuData.monthPillar,
    sajuData.dayPillar,
    sajuData.timePillar,
  ]
  for (const pillar of pillars) {
    if (pillar?.heavenlyStem?.sibsin) {
      distribution[pillar.heavenlyStem.sibsin] = (distribution[pillar.heavenlyStem.sibsin] || 0) + 1
    }
    if (pillar?.earthlyBranch?.sibsin) {
      distribution[pillar.earthlyBranch.sibsin] =
        (distribution[pillar.earthlyBranch.sibsin] || 0) + 1
    }
  }
  return distribution
}

function getDerivedSajuData(
  requestBody: Record<string, unknown>
): ReturnType<typeof calculateSajuData> | undefined {
  const candidate = requestBody[DERIVED_SAJU_KEY]
  if (!candidate || typeof candidate !== 'object') return undefined
  return candidate as ReturnType<typeof calculateSajuData>
}

function parseYearFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined
  const year = Number(birthDate.slice(0, 4))
  return Number.isFinite(year) ? year : undefined
}

function buildDerivedSajuSnapshot(
  requestBody: Record<string, unknown>,
  sajuData: ReturnType<typeof calculateSajuData>
): SajuSnapshot {
  return {
    source: 'auto-derived-from-birth',
    birthDate: toOptionalString(requestBody.birthDate),
    birthTime: toOptionalString(requestBody.birthTime),
    timezone: toOptionalString(requestBody.timezone) || 'Asia/Seoul',
    dayMaster: sajuData.dayMaster,
    pillars: sajuData.pillars,
    fiveElements: sajuData.fiveElements,
    daeWoon: sajuData.daeWoon,
    unse: sajuData.unse,
    derivedAt: new Date().toISOString(),
  }
}

export function buildDerivedCrossSnapshot(
  requestBody: Record<string, unknown>,
  existing?: Partial<CrossSnapshot> | null
): CrossSnapshot {
  const relationCount = Array.isArray(requestBody.relations) ? requestBody.relations.length : 0
  const aspectCount = Array.isArray(requestBody.aspects) ? requestBody.aspects.length : 0
  const domainScoreMap =
    toOptionalRecord(requestBody.domainScores) || toOptionalRecord(requestBody.domainAnalysis)
  const domainScoreCount = domainScoreMap ? Object.keys(domainScoreMap).length : 0
  const currentDateIso =
    toOptionalString(requestBody.currentDateIso) ||
    toOptionalString(requestBody.targetDate) ||
    new Date().toISOString().slice(0, 10)
  const astroTimingIndex = buildAstroTimingIndex({
    activeTransits: Array.isArray(requestBody.activeTransits)
      ? (requestBody.activeTransits as MatrixCalculationInput['activeTransits'])
      : undefined,
    advancedAstroSignals: toOptionalRecord(
      requestBody.advancedAstroSignals
    ) as MatrixCalculationInput['advancedAstroSignals'],
  })
  const fromSummary = normalizeMatrixSummaryDomainScores(requestBody)
  const fromAnalysis = normalizeDomainAnalysisScores(requestBody)
  const fromInsights = collectTopInsightHints(requestBody)
  const mergedDomainScores: Partial<Record<DerivedCrossDomain, DerivedDomainScore>> = {}
  for (const domain of DERIVED_CROSS_DOMAINS) {
    const summaryScore = fromSummary[domain]
    const analysisScore = fromAnalysis[domain]
    const insightHints = fromInsights[domain]
    const base = summaryScore || analysisScore
    if (!base && !insightHints) continue
    mergedDomainScores[domain] = {
      domain,
      score: base?.score ?? 0.5,
      confidence: base?.confidence,
      overlapStrength: base?.overlapStrength,
      sajuComponentScore: base?.sajuComponentScore,
      astroComponentScore: base?.astroComponentScore,
      alignmentScore: base?.alignmentScore,
      peakMonth: base?.peakMonth,
      drivers: [...new Set([...(base?.drivers || []), ...(insightHints?.drivers || [])])].slice(0, 4),
      cautions: [...new Set([...(base?.cautions || []), ...(insightHints?.cautions || [])])].slice(0, 4),
    }
  }
  const crossAgreementMatrix = deriveCrossAgreementMatrix(
    mergedDomainScores,
    requestBody,
    astroTimingIndex,
    currentDateIso
  )
  const crossAgreement = deriveCrossAgreement(crossAgreementMatrix)
  const crossEvidence = buildCrossEvidence(
    mergedDomainScores,
    crossAgreementMatrix,
    toOptionalString(requestBody.lang) === 'en' ? 'en' : 'ko'
  )
  const existingAnchors = toOptionalRecord(existing?.anchors)
  const existingCoverage = toOptionalRecord(existing?.coverage)
  const existingDomainScores = toOptionalRecord(existing?.domainScores)
  const existingCrossEvidence = toOptionalRecord(existing?.crossEvidence)

  return {
    ...(existing || {}),
    source: toOptionalString(existing?.source) || 'auto-derived-from-input',
    theme: toOptionalString(existing?.theme) || toOptionalString(requestBody.theme) || null,
    category: toOptionalString(existing?.category) || toOptionalString(requestBody.category) || null,
    currentDateIso,
    anchors: {
      ...(existingAnchors || {}),
      dayMasterElement: toOptionalString(requestBody.dayMasterElement),
      geokguk: toOptionalString(requestBody.geokguk),
      yongsin: toOptionalString(requestBody.yongsin),
      currentDaeunElement: toOptionalString(requestBody.currentDaeunElement),
      currentSaeunElement: toOptionalString(requestBody.currentSaeunElement),
      currentWolunElement: toOptionalString(requestBody.currentWolunElement),
      currentIljinElement: toOptionalString(requestBody.currentIljinElement),
      currentIljinDate: toOptionalString(requestBody.currentIljinDate),
    },
    coverage: {
      ...(existingCoverage || {}),
      relationCount,
      aspectCount,
      domainScoreCount,
      hasAstrologySnapshot: !!toOptionalRecord(requestBody.astrologySnapshot),
      hasSajuSnapshot: !!toOptionalRecord(requestBody.sajuSnapshot),
    },
    astroTimingIndex: existing?.astroTimingIndex || astroTimingIndex,
    crossAgreement:
      typeof existing?.crossAgreement === 'number' && Number.isFinite(existing.crossAgreement)
        ? existing.crossAgreement
        : crossAgreement,
    crossAgreementMatrix:
      Array.isArray(existing?.crossAgreementMatrix) && existing.crossAgreementMatrix.length > 0
        ? existing.crossAgreementMatrix
        : crossAgreementMatrix,
    domainScores:
      existingDomainScores && Object.keys(existingDomainScores).length > 0
        ? existingDomainScores
        : Object.fromEntries(
            Object.entries(mergedDomainScores).map(([domain, score]) => [
              domain,
              {
                score: score?.score,
                confidence: score?.confidence,
                overlapStrength: score?.overlapStrength,
                sajuComponentScore: score?.sajuComponentScore,
                astroComponentScore: score?.astroComponentScore,
                alignmentScore: score?.alignmentScore,
                drivers: score?.drivers || [],
                cautions: score?.cautions || [],
                peakMonth: score?.peakMonth,
              },
            ])
          ),
    crossEvidence:
      existingCrossEvidence && Object.keys(existingCrossEvidence).length > 0
        ? existingCrossEvidence
        : crossEvidence,
    derivedAt: new Date().toISOString(),
  }
}

export function ensureDerivedSnapshots(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const hasSajuSnapshot =
    !!toOptionalRecord(requestBody.sajuSnapshot) || !!toOptionalRecord(requestBody.saju)
  const hasCrossSnapshot =
    !!toOptionalRecord(requestBody.crossSnapshot) ||
    !!toOptionalRecord(requestBody.graphRagEvidence) ||
    !!toOptionalRecord(requestBody.matrixSummary)

  const derivedSaju = getDerivedSajuData(requestBody)
  if (!hasSajuSnapshot && derivedSaju) {
    requestBody.sajuSnapshot = buildDerivedSajuSnapshot(requestBody, derivedSaju)
  }
  const existingCrossSnapshot = toOptionalRecord(requestBody.crossSnapshot)
  if (!hasCrossSnapshot) {
    requestBody.crossSnapshot = buildDerivedCrossSnapshot(requestBody)
  } else if (existingCrossSnapshot) {
    requestBody.crossSnapshot = buildDerivedCrossSnapshot(
      requestBody,
      existingCrossSnapshot as Partial<CrossSnapshot>
    )
  }
  return requestBody
}

export function buildAutoDaeunTiming(
  requestBody: Record<string, unknown>,
  targetDate?: string
): TimingData['daeun'] {
  const derivedSaju = getDerivedSajuData(requestBody)
  const target = targetDate ? new Date(targetDate) : new Date()
  const targetYear = target.getFullYear()
  const birthYear = parseYearFromBirthDate(toOptionalString(requestBody.birthDate))
  const age = birthYear ? Math.max(0, targetYear - birthYear) : 0
  const startAge = Math.floor(age / 10) * 10
  const fallbackCycleIdx = Math.floor(age / 10)
  const fallbackStem = HEAVENLY_STEMS[((fallbackCycleIdx % 10) + 10) % 10]
  const fallbackBranch = EARTHLY_BRANCHES[((fallbackCycleIdx % 12) + 12) % 12]

  const derivedCurrent = derivedSaju?.daeWoon?.current
  const heavenlyStem = toOptionalString(derivedCurrent?.heavenlyStem) || fallbackStem
  const earthlyBranch = toOptionalString(derivedCurrent?.earthlyBranch) || fallbackBranch
  const derivedStartAge = toOptionalNumber(derivedCurrent?.age)
  const resolvedStartAge =
    derivedStartAge !== undefined && Number.isFinite(derivedStartAge)
      ? Math.max(0, Math.floor(derivedStartAge))
      : startAge
  const element =
    STEM_ELEMENT_BY_NAME[heavenlyStem] ||
    (STEM_ELEMENTS[heavenlyStem] as string | undefined) ||
    toOptionalString(requestBody.currentDaeunElement) ||
    toOptionalString(requestBody.currentSaeunElement) ||
    '토'

  return {
    heavenlyStem,
    earthlyBranch,
    element,
    startAge: resolvedStartAge,
    endAge: resolvedStartAge + 9,
    isCurrent: true,
  }
}

export function enrichRequestWithDerivedSaju(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const birthDate = toOptionalString(requestBody.birthDate)
  if (!birthDate) {
    return requestBody
  }

  const birthTime = toOptionalString(requestBody.birthTime) || '12:00'
  const timezone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'
  const gender = normalizeGenderForSaju(requestBody.gender)

  try {
    const sajuData = calculateSajuData(birthDate, birthTime, gender, 'solar', timezone)
    requestBody[DERIVED_SAJU_KEY] = sajuData as unknown as Record<string, unknown>
    const dayElement = toOptionalString(sajuData.dayPillar?.heavenlyStem?.element)
    const derivedDayMaster = dayElement ? ELEMENT_MAP[dayElement] : undefined

    if (derivedDayMaster) {
      requestBody.dayMasterElement = derivedDayMaster
    }

    const hasSibsinDistribution =
      !!requestBody.sibsinDistribution &&
      typeof requestBody.sibsinDistribution === 'object' &&
      !Array.isArray(requestBody.sibsinDistribution) &&
      Object.keys(requestBody.sibsinDistribution as Record<string, unknown>).length > 0
    if (!hasSibsinDistribution) {
      requestBody.sibsinDistribution = deriveSibsinDistributionFromSaju(sajuData)
    }

    const hasRelations = Array.isArray(requestBody.relations) && requestBody.relations.length > 0
    const hasTwelveStages =
      !!requestBody.twelveStages &&
      typeof requestBody.twelveStages === 'object' &&
      !Array.isArray(requestBody.twelveStages) &&
      Object.keys(requestBody.twelveStages as Record<string, unknown>).length > 0
    const hasShinsalList =
      Array.isArray(requestBody.shinsalList) && requestBody.shinsalList.length > 0
    if (!hasRelations || !hasTwelveStages || !hasShinsalList) {
      const derivedAdvanced = deriveAdvancedSajuMatrixFields(sajuData)
      if (!hasRelations && derivedAdvanced.relations.length > 0) {
        requestBody.relations = derivedAdvanced.relations
      }
      if (!hasTwelveStages && Object.keys(derivedAdvanced.twelveStages || {}).length > 0) {
        requestBody.twelveStages = derivedAdvanced.twelveStages
      }
      if (!hasShinsalList && (derivedAdvanced.shinsalList || []).length > 0) {
        requestBody.shinsalList = derivedAdvanced.shinsalList
      }
    }

    const geokguk = toOptionalString(requestBody.geokguk)
    const yongsin = toOptionalString(requestBody.yongsin)
    if (!geokguk || !yongsin) {
      const advanced = analyzeAdvancedSaju(
        {
          name: sajuData.dayPillar.heavenlyStem.name,
          element: sajuData.dayPillar.heavenlyStem.element,
          yin_yang: sajuData.dayPillar.heavenlyStem.yin_yang || '양',
        },
        {
          yearPillar: sajuData.yearPillar,
          monthPillar: sajuData.monthPillar,
          dayPillar: sajuData.dayPillar,
          timePillar: sajuData.timePillar,
        }
      )
      if (!geokguk) {
        requestBody.geokguk = GEOKGUK_ALIASES[advanced.geokguk.type] || advanced.geokguk.type
      }
      if (!yongsin) {
        requestBody.yongsin = advanced.yongsin.primary
      }
    }

    const targetDateIsoForAnnual =
      toOptionalString(requestBody.targetDate) ||
      toOptionalString(requestBody.currentDateIso) ||
      new Date().toISOString().slice(0, 10)
    const targetForAnnual = new Date(targetDateIsoForAnnual)
    const annualCurrent = (sajuData.unse?.annual || []).find(
      (row) => row.year === targetForAnnual.getFullYear()
    )
    const annualFallback = (sajuData.unse?.annual || [])[0]
    const annualElement = toOptionalString((annualCurrent || annualFallback)?.element)
    if (!requestBody.currentSaeunElement && annualElement && ELEMENT_MAP[annualElement]) {
      requestBody.currentSaeunElement = ELEMENT_MAP[annualElement]
    }

    const currentDaeunStem = toOptionalString(sajuData.daeWoon?.current?.heavenlyStem)
    if (
      !requestBody.currentDaeunElement &&
      currentDaeunStem &&
      STEM_ELEMENT_BY_NAME[currentDaeunStem]
    ) {
      requestBody.currentDaeunElement = STEM_ELEMENT_BY_NAME[currentDaeunStem]
    }

    const targetDateIso =
      toOptionalString(requestBody.targetDate) ||
      toOptionalString(requestBody.currentDateIso) ||
      new Date().toISOString().slice(0, 10)
    const target = new Date(targetDateIso)
    const targetYear = target.getFullYear()
    const targetMonth = target.getMonth() + 1
    const monthlyCurrent = (sajuData.unse?.monthly || []).find(
      (row) => row.year === targetYear && row.month === targetMonth
    )
    const monthlyFallback = (sajuData.unse?.monthly || [])[0]
    const monthlyElement = toOptionalString((monthlyCurrent || monthlyFallback)?.element)
    if (!requestBody.currentWolunElement && monthlyElement && ELEMENT_MAP[monthlyElement]) {
      requestBody.currentWolunElement = ELEMENT_MAP[monthlyElement]
    }

    const autoShortTermTiming = buildTimingData(targetDateIso)
    const iljinElement = toOptionalString(autoShortTermTiming.iljin?.element)
    if (!requestBody.currentIljinElement && iljinElement && ELEMENT_MAP[iljinElement]) {
      requestBody.currentIljinElement = ELEMENT_MAP[iljinElement]
    }
    if (!requestBody.currentIljinDate && autoShortTermTiming.iljin?.date) {
      requestBody.currentIljinDate = autoShortTermTiming.iljin.date
    }

    if (!toOptionalRecord(requestBody.sajuSnapshot)) {
      requestBody.sajuSnapshot = buildDerivedSajuSnapshot(requestBody, sajuData)
    }
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive saju from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

export async function enrichRequestWithDerivedAstrology(
  requestBody: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const hasAstroSnapshot =
    !!requestBody.astrologySnapshot &&
    typeof requestBody.astrologySnapshot === 'object' &&
    !Array.isArray(requestBody.astrologySnapshot)
  const hasAdvancedCoverage =
    hasObjectKeys(requestBody.asteroidHouses) &&
    hasObjectKeys(requestBody.extraPointSigns) &&
    hasFullAdvancedAstroSignals(requestBody.advancedAstroSignals)
  if (hasAstroSnapshot && hasAdvancedCoverage) {
    return requestBody
  }

  const birthDate = toOptionalString(requestBody.birthDate)
  const birthTime = toOptionalString(requestBody.birthTime)
  if (!birthDate || !birthTime) return requestBody

  const [year, month, date] = birthDate.split('-').map((v) => Number(v))
  const [hour, minute] = birthTime.split(':').map((v) => Number(v))
  if ([year, month, date, hour, minute].some((v) => !Number.isFinite(v))) return requestBody

  const latitude = toOptionalNumber(requestBody.latitude) ?? 37.5665
  const longitude = toOptionalNumber(requestBody.longitude) ?? 126.978
  const timeZone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'

  try {
    const natal = await calculateNatalChart({
      year,
      month,
      date,
      hour,
      minute,
      latitude,
      longitude,
      timeZone,
    })
    const natalChart = toChart(natal)
    const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
    const nowIso = new Date().toISOString()
    const transit = await calculateTransitChart({
      iso: nowIso,
      latitude,
      longitude,
      timeZone,
    })
    const majorTransits = findMajorTransits(transit, natalChart, 1.0).slice(0, 40)

    const natalInput = { year, month, date, hour, minute, latitude, longitude, timeZone }
    const progressions = await calculateSecondaryProgressions({
      natal: natalInput,
      targetDate: nowIso.slice(0, 10),
    })
    const solarReturn = await calculateSolarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
    })
    const lunarReturn = await calculateLunarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    })

    const planetSigns: Record<string, string> = {}
    const planetHouses: Record<string, number> = {}
    for (const p of natal.planets) {
      if (typeof p.name === 'string' && typeof p.sign === 'string') {
        planetSigns[p.name] = p.sign
      }
      if (typeof p.name === 'string' && Number.isFinite(p.house)) {
        planetHouses[p.name] = p.house
      }
    }

    const houseCusps = Array.isArray(natal.houses) ? natal.houses.map((h) => h.cusp) : []
    const asteroidHouses: Record<string, number> = {}
    if (natal.meta?.jdUT && houseCusps.length > 0) {
      try {
        const asteroids = calculateAllAsteroids(natal.meta.jdUT, houseCusps)
        for (const key of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
          const house = asteroids[key]?.house
          if (typeof house === 'number' && house >= 1 && house <= 12) {
            asteroidHouses[key] = house
          }
        }
      } catch (error) {
        logger.warn('[destiny-matrix/ai-report] Failed to derive asteroid houses', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const extraPointSigns: Record<string, string> = {}
    if (natal.meta?.jdUT && houseCusps.length > 0) {
      const sun = natal.planets.find((p) => p.name === 'Sun')
      const moon = natal.planets.find((p) => p.name === 'Moon')
      if (sun && moon && natal.ascendant) {
        try {
          const extras = await calculateExtraPoints(
            natal.meta.jdUT,
            latitude,
            longitude,
            natal.ascendant.longitude,
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
          logger.warn('[destiny-matrix/ai-report] Failed to derive extra-point signs', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    const birthYear = Number(birthDate.slice(0, 4))
    const currentYear = new Date().getFullYear()
    const currentAge = Number.isFinite(birthYear) ? Math.max(0, currentYear - birthYear) : undefined
    const draconic = compareDraconicToNatal(natalChart)
    const harmonics = generateHarmonicProfile(natalChart, currentAge)
    const fixedStars = findFixedStarConjunctions(natalChart, currentYear, 1.0).slice(0, 20)
    const eclipseImpact = findEclipseImpact(natalChart).slice(0, 20)
    const upcomingEclipses = getUpcomingEclipses(new Date(nowIso), 6)
    const midpoints = calculateMidpoints(natalChart)
    const midpointActivations = findMidpointActivations(natalChart, 1.5).slice(0, 30)

    const existingAdvancedSignals = toOptionalRecord(requestBody.advancedAstroSignals) || {}
    const advancedAstroSignals = {
      ...existingAdvancedSignals,
      solarReturn: true,
      lunarReturn: true,
      progressions: true,
      draconic: true,
      harmonics: true,
      fixedStars: fixedStars.length > 0,
      eclipses: eclipseImpact.length > 0 || upcomingEclipses.length > 0,
      midpoints: midpoints.length > 0,
      asteroids: Object.keys(asteroidHouses).length > 0,
      extraPoints: Object.keys(extraPointSigns).length > 0,
    }

    requestBody.astrologySnapshot = {
      natalChart: natal,
      natalAspects,
      currentTransits: {
        asOfIso: nowIso,
        majorTransits,
      },
      progressions,
      returns: {
        solarReturn,
        lunarReturn,
      },
      advanced: {
        draconic,
        harmonics,
        fixedStars,
        eclipses: {
          impact: eclipseImpact,
          upcoming: upcomingEclipses,
        },
        midpoints: {
          all: midpoints,
          activations: midpointActivations,
        },
      },
    } satisfies AstrologySnapshot
    if (!requestBody.planetSigns || typeof requestBody.planetSigns !== 'object') {
      requestBody.planetSigns = planetSigns
    }
    if (!requestBody.planetHouses || typeof requestBody.planetHouses !== 'object') {
      requestBody.planetHouses = planetHouses
    }
    if (!requestBody.dominantWesternElement) {
      const derivedDominant = deriveDominantWesternElementFromPlanetSigns(
        (requestBody.planetSigns as Record<string, unknown>) || planetSigns
      )
      if (derivedDominant) {
        requestBody.dominantWesternElement = derivedDominant
      }
    }
    if (!Array.isArray(requestBody.aspects)) {
      requestBody.aspects = natalAspects.map((a) => ({
        planet1: a.from.name,
        planet2: a.to.name,
        type: a.type,
        orb: a.orb,
      }))
    }
    if (!hasObjectKeys(requestBody.asteroidHouses) && Object.keys(asteroidHouses).length > 0) {
      requestBody.asteroidHouses = asteroidHouses
    }
    if (!hasObjectKeys(requestBody.extraPointSigns) && Object.keys(extraPointSigns).length > 0) {
      requestBody.extraPointSigns = extraPointSigns
    }
    requestBody.advancedAstroSignals = advancedAstroSignals
    logger.debug('[destiny-matrix/ai-report] Derived advanced astrology coverage', {
      asteroidCount: Object.keys(asteroidHouses).length,
      extraPointCount: Object.keys(extraPointSigns).length,
      advancedSignals: advancedAstroSignals,
    })
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive astrology from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

export function ensureDerivedDominantWesternElement(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  if (requestBody.dominantWesternElement) return requestBody
  const derived = deriveDominantWesternElementFromPlanetSigns(
    toOptionalRecord(requestBody.planetSigns)
  )
  if (derived) {
    requestBody.dominantWesternElement = derived
  }
  return requestBody
}

export function buildTimingDataFromDerivedSaju(
  requestBody: Record<string, unknown>,
  targetDate?: string
): Partial<TimingData> {
  const derivedSaju = getDerivedSajuData(requestBody)
  if (!derivedSaju) return {}

  const target = targetDate ? new Date(targetDate) : new Date()
  const baseTiming = buildTimingData(targetDate)
  const targetYear = target.getFullYear()
  const targetMonth = target.getMonth() + 1

  const currentDaeun = derivedSaju.daeWoon?.current
  const annualCurrent = (derivedSaju.unse?.annual || []).find((row) => row.year === targetYear)
  const annualFallback = (derivedSaju.unse?.annual || [])[0]
  const monthlyCurrent = (derivedSaju.unse?.monthly || []).find(
    (row) => row.year === targetYear && row.month === targetMonth
  )
  const monthlyFallback = (derivedSaju.unse?.monthly || [])[0]

  const daeun =
    currentDaeun && currentDaeun.heavenlyStem && currentDaeun.earthlyBranch
      ? {
          heavenlyStem: currentDaeun.heavenlyStem,
          earthlyBranch: currentDaeun.earthlyBranch,
          element:
            STEM_ELEMENT_BY_NAME[currentDaeun.heavenlyStem] ||
            toOptionalString(requestBody.currentDaeunElement) ||
            '토',
          startAge: Math.max(0, Math.floor(currentDaeun.age || 0)),
          endAge: Math.max(9, Math.floor((currentDaeun.age || 0) + 9)),
          isCurrent: true,
        }
      : undefined

  const seunSource = annualCurrent || annualFallback
  const seun =
    seunSource && seunSource.year
      ? {
          year: seunSource.year,
          heavenlyStem: seunSource.heavenlyStem || '',
          earthlyBranch: seunSource.earthlyBranch || '',
          element: seunSource.element || '토',
        }
      : undefined

  const wolunSource = monthlyCurrent || monthlyFallback
  const wolun =
    wolunSource && wolunSource.month
      ? {
          month: wolunSource.month,
          heavenlyStem: wolunSource.heavenlyStem || '',
          earthlyBranch: wolunSource.earthlyBranch || '',
          element: wolunSource.element || '토',
        }
      : undefined

  return { daeun, seun, wolun, iljin: baseTiming.iljin }
}

export function buildTimingData(targetDate?: string): TimingData {
  const date = targetDate ? new Date(targetDate) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const yearStemIdx = (year - 4) % 10
  const yearBranchIdx = (year - 4) % 12
  const monthStemIdx = (((year - 4) % 5) * 2 + month + 1) % 10
  const monthBranchIdx = (month + 1) % 12

  const baseDate = new Date(1900, 0, 1)
  const dayDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayStemIdx = (dayDiff + 10) % 10
  const dayBranchIdx = dayDiff % 12

  return {
    seun: {
      year,
      heavenlyStem: HEAVENLY_STEMS[yearStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[yearBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[yearStemIdx]],
    },
    wolun: {
      month,
      heavenlyStem: HEAVENLY_STEMS[monthStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[monthBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[monthStemIdx]],
    },
    iljin: {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      heavenlyStem: HEAVENLY_STEMS[dayStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[dayBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[dayStemIdx]],
    },
  }
}
