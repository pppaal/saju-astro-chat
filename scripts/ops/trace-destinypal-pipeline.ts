import { calculateSajuData } from '../../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../../src/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '../../src/lib/Saju/shinsal'
import { computeDestinyMap } from '../../src/lib/destiny-map/astrology'
import { getRetrogradePlanetsForDate } from '../../src/lib/destiny-map/calendar/astrology/retrograde'
import { calculateDestinyMatrix } from '../../src/lib/destiny-matrix/engine'
import type {
  MatrixCalculationInput,
  PlanetName,
  TransitCycle,
  GeokgukType,
  MatrixHighlight,
} from '../../src/lib/destiny-matrix/types'
import { reportGenerator } from '../../src/lib/destiny-matrix/interpreter'
import { runDestinyCore } from '../../src/lib/destiny-matrix/core/runDestinyCore'
import {
  buildGraphRAGEvidence,
  summarizeGraphRAGEvidence,
} from '../../src/lib/destiny-matrix/ai-report/graphRagEvidence'
import { buildUnifiedEnvelope } from '../../src/lib/destiny-matrix/ai-report/unifiedReport'
import type {
  ReportEvidenceRef,
  SectionEvidenceRefs,
} from '../../src/lib/destiny-matrix/ai-report/evidenceRefs'
import { buildCounselorEvidencePacket } from '../../src/lib/destiny-matrix/counselorEvidence'
import { validateEvidenceBinding } from '../../src/lib/destiny-matrix/ai-report/rewriteGuards'

type Lang = 'ko' | 'en'
type Mode = 'comprehensive' | 'calendar' | 'themed'

interface TraceInput {
  birthDate: string
  birthTime: string
  birthCity: string
  timezone: string
  latitude: number
  longitude: number
  gender?: 'male' | 'female'
  targetDate: string
  theme: string
  mode: Mode
  lang: Lang
}

const GEOKGUK_ALIASES: Partial<Record<string, GeokgukType>> = {
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

const WESTERN_SIGN_ELEMENT: Record<string, MatrixCalculationInput['dominantWesternElement']> = {
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

const MAJOR_PLANETS: PlanetName[] = [
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
]

const SECTION_DOMAIN_MAP: Record<string, string[]> = {
  introduction: ['personality', 'timing'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality', 'timing'],
}

const REQUIRED_ADVANCED_SIGNAL_KEYS = [
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
  'asteroids',
  'extraPoints',
] as const

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function toDateParts(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = date.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toAge(birthDate: string, targetDate: string): number {
  const b = toDateParts(birthDate)
  const t = toDateParts(targetDate)
  let age = t.year - b.year
  if (t.month < b.month || (t.month === b.month && t.day < b.day)) age -= 1
  return Math.max(0, age)
}

function inferLifecycleTransits(age: number): TransitCycle[] {
  const out = new Set<TransitCycle>()
  const near = (v: number, target: number) => Math.abs(v - target) <= 1
  for (let trigger = 12; trigger <= 96; trigger += 12) {
    if (near(age, trigger)) {
      out.add('jupiterReturn')
      break
    }
  }
  for (const trigger of [29, 58, 87]) {
    if (near(age, trigger)) {
      out.add('saturnReturn')
      break
    }
  }
  for (const trigger of [21, 42, 63]) {
    if (near(age, trigger)) {
      out.add('uranusSquare')
      break
    }
  }
  for (const trigger of [41, 82]) {
    if (near(age, trigger)) {
      out.add('neptuneSquare')
      break
    }
  }
  for (const trigger of [18, 37, 56, 74]) {
    if (near(age, trigger)) {
      out.add('nodeReturn')
      break
    }
  }
  if (age >= 36 && age <= 44) out.add('plutoTransit')
  return [...out]
}

function inferRetrogradeTransits(targetDate: string): TransitCycle[] {
  const map: Record<string, TransitCycle> = {
    mercury: 'mercuryRetrograde',
    venus: 'venusRetrograde',
    mars: 'marsRetrograde',
    jupiter: 'jupiterRetrograde',
    saturn: 'saturnRetrograde',
  }
  const retro = getRetrogradePlanetsForDate(new Date(targetDate))
  return retro.map((p) => map[p]).filter((v): v is TransitCycle => Boolean(v))
}

function dominantWesternElementFromSunSign(
  sunSign?: string
): MatrixCalculationInput['dominantWesternElement'] | undefined {
  if (!sunSign) return undefined
  return WESTERN_SIGN_ELEMENT[sunSign.toLowerCase()]
}

function classifyIrreversible(text: string): boolean {
  const re =
    /(계약|서명|확정|예약|결혼식|청첩장|이직\s*확정|창업\s*확정|런칭|큰\s*결정|즉시\s*결정|sign|finalize|confirm|book|wedding|invitation|big decision|launch|commit now)/i
  return re.test(text)
}

function looksLikeMojibake(text: string): boolean {
  if (!text) return false
  if (text.includes('\uFFFD')) return true
  if (/\?{3,}/.test(text)) return true
  return /(?:\u00c3.|\u00c2.|\u00ec.|\u00ed.|\u00eb.|\u00ea.){2,}/u.test(text)
}

function buildEvidenceRefs(
  sectionPaths: string[],
  selectedSignals: Array<{
    id: string
    layer: number
    rowKey: string
    colKey: string
    domainHints: string[]
    keyword: string
    sajuBasis?: string
    astroBasis?: string
    score: number
  }>
): SectionEvidenceRefs {
  const refs: SectionEvidenceRefs = {}
  for (const path of sectionPaths) {
    const domains = SECTION_DOMAIN_MAP[path] || ['personality']
    const picked = selectedSignals
      .filter((s) => s.domainHints.some((d) => domains.includes(d)))
      .slice(0, 4)
    refs[path] = picked.map(
      (s): ReportEvidenceRef => ({
        id: s.id,
        domain: s.domainHints[0] || 'personality',
        layer: s.layer,
        rowKey: s.rowKey,
        colKey: s.colKey,
        keyword: s.keyword,
        sajuBasis: s.sajuBasis,
        astroBasis: s.astroBasis,
        score: s.score,
      })
    )
  }
  return refs
}

function buildDeterministicSectionsFromBlocks(
  blocksBySection: Record<string, Array<{ heading: string; bullets: string[] }>>
) {
  const out: Record<string, string> = {}
  for (const [section, blocks] of Object.entries(blocksBySection)) {
    out[section] = blocks
      .map((b) => `${b.heading}\n${(b.bullets || []).map((line) => `- ${line}`).join('\n')}`)
      .join('\n\n')
  }
  return out
}

function buildSectionEvidenceRefsFromUnifiedPara(params: {
  sectionPaths: string[]
  evidenceRefsByPara: Record<
    string,
    {
      claimIds?: string[]
      signalIds?: string[]
      anchorIds?: string[]
    }
  >
  selectedSignals: Array<{
    id: string
    domainHints: string[]
    layer: number
    rowKey: string
    colKey: string
    keyword: string
    sajuBasis?: string
    astroBasis?: string
    score: number
  }>
  fallbackEvidenceRefs: SectionEvidenceRefs
}): SectionEvidenceRefs {
  const signalById = new Map(params.selectedSignals.map((signal) => [signal.id, signal]))
  const out: SectionEvidenceRefs = {}
  for (const path of params.sectionPaths) {
    const paraKeys = [`${path}.p1`, `${path}.p2`, `${path}.p3`]
    const signalIds = uniq(
      paraKeys.flatMap((key) => (params.evidenceRefsByPara[key]?.signalIds || []).filter(Boolean))
    )
    const refs: ReportEvidenceRef[] = signalIds
      .map((id) => {
        const signal = signalById.get(id)
        if (!signal) return null
        return {
          id: signal.id,
          domain: signal.domainHints[0] || 'personality',
          layer: signal.layer,
          rowKey: signal.rowKey,
          colKey: signal.colKey,
          keyword: signal.keyword,
          sajuBasis: signal.sajuBasis,
          astroBasis: signal.astroBasis,
          score: signal.score,
        } satisfies ReportEvidenceRef
      })
      .filter((ref): ref is ReportEvidenceRef => Boolean(ref))
    out[path] = refs.length > 0 ? refs : params.fallbackEvidenceRefs[path] || []
  }
  return out
}

async function main() {
  const startedAt = Date.now()
  const mark = (label: string) => {
    const sec = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.error(`[trace] +${sec}s ${label}`)
  }
  mark('start')

  const input: TraceInput = {
    birthDate: '1995-02-09',
    birthTime: '06:40',
    birthCity: 'Seoul',
    timezone: 'Asia/Seoul',
    latitude: 37.5665,
    longitude: 126.978,
    gender: 'male',
    targetDate: '2026-02-25',
    theme: 'life',
    mode: 'comprehensive',
    lang: 'ko',
  }

  const target = new Date(`${input.targetDate}T00:00:00+09:00`)
  const age = toAge(input.birthDate, input.targetDate)
  const lifecycleTransits = inferLifecycleTransits(age)
  const retroTransits = inferRetrogradeTransits(input.targetDate)
  mark('pre-computeDestinyMap')

  const combined = await computeDestinyMap({
    name: 'Trace User',
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    latitude: input.latitude,
    longitude: input.longitude,
    gender: input.gender,
    tz: input.timezone,
    userTimezone: input.timezone,
    theme: input.theme,
  })
  mark('post-computeDestinyMap')

  const saju = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender || 'male',
    'solar',
    input.timezone
  )
  mark('post-calculateSajuData')
  const advancedSaju = analyzeAdvancedSaju(
    {
      name: saju.dayPillar.heavenlyStem.name,
      element: saju.dayPillar.heavenlyStem.element,
      yin_yang: saju.dayPillar.heavenlyStem.yin_yang || '양',
    },
    {
      yearPillar: saju.yearPillar,
      monthPillar: saju.monthPillar,
      dayPillar: saju.dayPillar,
      timePillar: saju.timePillar,
    }
  )
  mark('post-analyzeAdvancedSaju')

  const relations = analyzeRelations(
    toAnalyzeInputFromSaju(
      {
        year: saju.pillars.year,
        month: saju.pillars.month,
        day: saju.pillars.day,
        time: saju.pillars.time,
      },
      saju.dayMaster?.name
    )
  )
  const stagesByPillar = getTwelveStagesForPillars(saju.pillars)
  const twelveStages = Object.values(stagesByPillar).reduce<Record<string, number>>(
    (acc, stage) => {
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    },
    {}
  )
  const shinsalHits = getShinsalHits(saju.pillars, {
    includeLuckyDetails: true,
    includeGeneralShinsal: true,
    includeTwelveAll: true,
    ruleSet: 'standard',
  })
  mark('post-relations-and-shinsal')

  const sibsinDistribution: Record<string, number> = {}
  for (const pillar of [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.timePillar]) {
    const cheon = pillar?.heavenlyStem?.sibsin
    const ji = pillar?.earthlyBranch?.sibsin
    if (cheon) sibsinDistribution[cheon] = (sibsinDistribution[cheon] || 0) + 1
    if (ji) sibsinDistribution[ji] = (sibsinDistribution[ji] || 0) + 1
  }

  const pillarElements = [
    saju.yearPillar?.heavenlyStem?.element,
    saju.yearPillar?.earthlyBranch?.element,
    saju.monthPillar?.heavenlyStem?.element,
    saju.monthPillar?.earthlyBranch?.element,
    saju.dayPillar?.heavenlyStem?.element,
    saju.dayPillar?.earthlyBranch?.element,
    saju.timePillar?.heavenlyStem?.element,
    saju.timePillar?.earthlyBranch?.element,
  ].filter((v): v is string => Boolean(v))

  const planets = Array.isArray((combined as any).astrology?.planets)
    ? (combined as any).astrology.planets
    : []
  const aspectsRaw = Array.isArray((combined as any).astrology?.aspects)
    ? (combined as any).astrology.aspects
    : []

  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  for (const p of planets) {
    if (!MAJOR_PLANETS.includes(p.name)) continue
    if (typeof p.sign === 'string') planetSigns[p.name] = p.sign
    if (typeof p.house === 'number' && p.house >= 1 && p.house <= 12) planetHouses[p.name] = p.house
  }

  const aspects = aspectsRaw
    .filter((a: any) => MAJOR_PLANETS.includes(a.from?.name) && MAJOR_PLANETS.includes(a.to?.name))
    .slice(0, 80)
    .map((a: any) => ({
      planet1: a.from.name,
      planet2: a.to.name,
      type: a.type,
      orb: typeof a.orb === 'number' ? a.orb : Number(a.orb),
      angle: undefined as number | undefined,
    }))
    .filter((a: any) => Number.isFinite(a.orb))

  const activeTransits = uniq(
    [
      ...lifecycleTransits,
      ...retroTransits,
      (combined as any).eclipses?.impact ? ('eclipse' as TransitCycle) : null,
    ].filter((v): v is TransitCycle => Boolean(v))
  )

  const asteroidHouses: Record<string, number> = {}
  const asteroids = (combined as any).asteroids || {}
  for (const key of ['ceres', 'pallas', 'juno', 'vesta']) {
    const item = asteroids[key]
    if (item && typeof item.house === 'number') {
      const canon = key.charAt(0).toUpperCase() + key.slice(1)
      asteroidHouses[canon] = item.house
    }
  }

  const extraPointSigns: Record<string, string> = {}
  const extra = (combined as any).extraPoints || {}
  if (extra.chiron?.sign) extraPointSigns.Chiron = extra.chiron.sign
  if (extra.lilith?.sign) extraPointSigns.Lilith = extra.lilith.sign
  if (extra.partOfFortune?.sign) extraPointSigns.PartOfFortune = extra.partOfFortune.sign
  if (extra.vertex?.sign) extraPointSigns.Vertex = extra.vertex.sign

  const advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']> = {
    solarReturn: Boolean((combined as any).solarReturn),
    lunarReturn: Boolean((combined as any).lunarReturn),
    progressions: Boolean((combined as any).progressions),
    draconic: Boolean((combined as any).draconic),
    harmonics: Boolean((combined as any).harmonics),
    fixedStars: Boolean((combined as any).fixedStars),
    eclipses: Boolean((combined as any).eclipses),
    midpoints: Boolean((combined as any).midpoints),
    asteroids: Boolean((combined as any).asteroids),
    extraPoints: Boolean((combined as any).extraPoints),
  }

  const matrixInput: MatrixCalculationInput = {
    dayMasterElement: (saju.dayPillar?.heavenlyStem?.element || '목') as any,
    pillarElements: pillarElements as any,
    sibsinDistribution: sibsinDistribution as any,
    twelveStages: twelveStages as any,
    relations: relations as any,
    geokguk: (GEOKGUK_ALIASES[advancedSaju.geokguk.type] || undefined) as any,
    yongsin: advancedSaju.yongsin.primary as any,
    currentDaeunElement: (saju.daeWoon?.current?.heavenlyStem
      ? (
          {
            甲: '목',
            乙: '목',
            丙: '화',
            丁: '화',
            戊: '토',
            己: '토',
            庚: '금',
            辛: '금',
            壬: '수',
            癸: '수',
          } as Record<string, string>
        )[saju.daeWoon.current.heavenlyStem]
      : undefined) as any,
    currentSaeunElement: (saju.unse?.annual?.[0]?.element || undefined) as any,
    shinsalList: uniq(shinsalHits.map((h) => h.kind)).slice(0, 40) as any,
    dominantWesternElement: dominantWesternElementFromSunSign(planetSigns.Sun),
    planetHouses: planetHouses as any,
    planetSigns: planetSigns as any,
    aspects: aspects as any,
    activeTransits,
    asteroidHouses: asteroidHouses as any,
    extraPointSigns: extraPointSigns as any,
    advancedAstroSignals,
    sajuSnapshot: combined.saju as any,
    astrologySnapshot: {
      astrology: (combined as any).astrology,
      extraPoints: (combined as any).extraPoints,
      solarReturn: (combined as any).solarReturn,
      lunarReturn: (combined as any).lunarReturn,
      progressions: (combined as any).progressions,
      draconic: (combined as any).draconic,
      harmonics: (combined as any).harmonics,
      fixedStars: (combined as any).fixedStars,
      eclipses: (combined as any).eclipses,
      midpoints: (combined as any).midpoints,
      asteroids: (combined as any).asteroids,
    },
    crossSnapshot: {
      source: 'trace-destinypal-pipeline',
      targetDate: input.targetDate,
      age,
    },
    currentDateIso: input.targetDate,
    profileContext: {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthCity: input.birthCity,
      timezone: input.timezone,
      latitude: input.latitude,
      longitude: input.longitude,
      analysisAt: target.toISOString(),
    },
    lang: input.lang,
    startYearMonth: `${toDateParts(input.targetDate).year}-01`,
  }

  const matrix = calculateDestinyMatrix(matrixInput)
  mark('post-calculateDestinyMatrix')
  const matrixReport = reportGenerator.generateReport(matrixInput, {
    layer1_elementCore: matrix.layer1_elementCore,
    layer2_sibsinPlanet: matrix.layer2_sibsinPlanet,
    layer3_sibsinHouse: matrix.layer3_sibsinHouse,
    layer4_timing: matrix.layer4_timing,
    layer5_relationAspect: matrix.layer5_relationAspect,
    layer6_stageHouse: matrix.layer6_stageHouse,
    layer7_advanced: matrix.layer7_advanced,
    layer8_shinsalPlanet: matrix.layer8_shinsalPlanet,
    layer9_asteroidHouse: matrix.layer9_asteroidHouse,
    layer10_extraPointElement: matrix.layer10_extraPointElement,
  })
  mark('post-reportGenerator.generateReport')

  const coreCalendar = runDestinyCore({
    mode: 'calendar',
    lang: input.lang,
    matrixInput,
    matrixReport,
    matrixSummary: matrix.summary,
  })
  mark('post-runDestinyCore-calendar')
  const coreComprehensive = runDestinyCore({
    mode: 'comprehensive',
    lang: input.lang,
    matrixInput,
    matrixReport,
    matrixSummary: matrix.summary,
  })
  mark('post-runDestinyCore-comprehensive')
  const coreThemed = runDestinyCore({
    mode: 'themed',
    lang: input.lang,
    matrixInput,
    matrixReport,
    matrixSummary: matrix.summary,
  })
  mark('post-runDestinyCore-themed')

  const sectionPaths = [
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ]
  const selectedSignals = coreComprehensive.signalSynthesis.selectedSignals
  const evidenceRefs = buildEvidenceRefs(sectionPaths, selectedSignals as any)
  const graphRagEvidence = buildGraphRAGEvidence(matrixInput, matrixReport, {
    mode: 'comprehensive',
    focusDomain: 'personality',
  })
  mark('post-buildGraphRAGEvidence')
  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang: input.lang,
    generatedAt: new Date().toISOString(),
    matrixInput,
    matrixReport,
    matrixSummary: matrix.summary,
    signalSynthesis: coreComprehensive.signalSynthesis,
    graphRagEvidence,
    birthDate: input.birthDate,
    sectionPaths,
    evidenceRefs,
  })
  mark('post-buildUnifiedEnvelope')
  const deterministicSections = buildDeterministicSectionsFromBlocks(unified.blocksBySection as any)
  const validationEvidenceRefs = buildSectionEvidenceRefsFromUnifiedPara({
    sectionPaths,
    evidenceRefsByPara: unified.evidenceRefsByPara as Record<
      string,
      { claimIds?: string[]; signalIds?: string[]; anchorIds?: string[] }
    >,
    selectedSignals: selectedSignals as any,
    fallbackEvidenceRefs: evidenceRefs,
  })
  const globalValidationRefs: ReportEvidenceRef[] = (selectedSignals as any[])
    .slice(0, 16)
    .map((signal) => ({
      id: signal.id,
      domain: signal.domainHints?.[0] || 'personality',
      layer: signal.layer,
      rowKey: signal.rowKey,
      colKey: signal.colKey,
      keyword: signal.keyword,
      sajuBasis: signal.sajuBasis,
      astroBasis: signal.astroBasis,
      score: signal.score,
    }))
  for (const path of sectionPaths) {
    validationEvidenceRefs[path] = uniq([
      ...(validationEvidenceRefs[path] || []).map((ref) => JSON.stringify(ref)),
      ...globalValidationRefs.map((ref) => JSON.stringify(ref)),
    ]).map((raw) => JSON.parse(raw) as ReportEvidenceRef)
  }
  const evidenceCheck = validateEvidenceBinding(
    deterministicSections,
    sectionPaths,
    validationEvidenceRefs
  )
  const graphSummary = summarizeGraphRAGEvidence(graphRagEvidence)

  const counselorPacket = buildCounselorEvidencePacket({
    theme: 'chat',
    lang: input.lang,
    matrixInput,
    matrixReport,
    matrixSummary: matrix.summary,
    signalSynthesis: coreComprehensive.signalSynthesis,
    strategyEngine: coreComprehensive.strategyEngine,
    birthDate: input.birthDate,
  })
  mark('post-buildCounselorEvidencePacket')

  const allHighlights: Array<MatrixHighlight & { polarity: 'strength' | 'balance' | 'caution' }> = [
    ...(matrix.summary.strengthPoints || []).map((p) => ({ ...p, polarity: 'strength' as const })),
    ...(matrix.summary.balancePoints || []).map((p) => ({ ...p, polarity: 'balance' as const })),
    ...(matrix.summary.cautionPoints || []).map((p) => ({ ...p, polarity: 'caution' as const })),
  ]

  const impactCells = allHighlights
    .sort((a, b) => Number(b.cell.interaction.score || 0) - Number(a.cell.interaction.score || 0))
    .slice(0, 10)
    .map((point) => {
      const id = `L${point.layer}:${point.rowKey}:${point.colKey}`
      const signal = coreComprehensive.signalSynthesis.signalsById[id]
      return {
        id,
        layer: point.layer,
        rowKey: point.rowKey,
        colKey: point.colKey,
        score: point.cell.interaction.score,
        domain: signal?.domainHints?.[0] || null,
        polarity: signal?.polarity || point.polarity,
        evidence: {
          sajuBasis: point.cell.sajuBasis || null,
          astroBasis: point.cell.astroBasis || null,
        },
      }
    })

  const selectedTop = coreComprehensive.signalSynthesis.selectedSignals
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5)
    .map((s, idx) => ({
      signalId: s.id,
      domain: s.domainHints[0] || null,
      score: s.score,
      polarity: s.polarity,
      evidenceRefs: [s.id, s.rowKey, s.colKey],
      whySelected:
        idx < 3
          ? 'top-rank in polarity quota (7-pick rule)'
          : 'domain diversity / required-domain coverage',
    }))

  const activatedPatterns = coreComprehensive.patterns
    .filter((p) => p.score >= 55)
    .slice(0, 8)
    .map((p) => ({
      patternId: p.id,
      patternName: p.label,
      supportingSignals: p.matchedSignalIds.slice(0, 6),
      conflictRulesApplied: /mixed-polarity|high_tension|guarded|risk|reset/.test(
        `${p.id} ${p.activationReason}`
      ),
      patternThesis: p.thesis,
    }))

  const topScenarios = coreComprehensive.scenarios.slice(0, 8).map((s) => ({
    scenarioId: s.id,
    scenarioType: s.branch,
    relatedPatternIds: [s.patternId],
    timingRelevance: s.window,
    confidence: s.confidence,
    reversible: !classifyIrreversible(`${s.title} ${s.actions.join(' ')} ${s.risk}`),
  }))

  const strengthScore = Number(
    (
      coreComprehensive.strategyEngine.domainStrategies.reduce(
        (sum, d) => sum + d.metrics.strengthScore,
        0
      ) / Math.max(1, coreComprehensive.strategyEngine.domainStrategies.length)
    ).toFixed(2)
  )
  const cautionScore = Number(
    (
      coreComprehensive.strategyEngine.domainStrategies.reduce(
        (sum, d) => sum + d.metrics.cautionScore,
        0
      ) / Math.max(1, coreComprehensive.strategyEngine.domainStrategies.length)
    ).toFixed(2)
  )
  const balanceScore = Number(
    (
      coreComprehensive.strategyEngine.domainStrategies.reduce(
        (sum, d) => sum + d.metrics.balanceScore,
        0
      ) / Math.max(1, coreComprehensive.strategyEngine.domainStrategies.length)
    ).toFixed(2)
  )

  const domainStrategies = coreComprehensive.strategyEngine.domainStrategies
    .slice(0, 6)
    .map((d) => ({
      domain: d.domain,
      phase: d.phase,
      attack: d.attackPercent,
      defense: d.defensePercent,
      vector: d.vector,
      evidenceIds: d.evidenceIds,
    }))

  const topCautions = coreComprehensive.signalSynthesis.selectedSignals
    .filter((s) => s.polarity === 'caution')
    .map((s) => s.id)
    .slice(0, 5)

  const riskControl =
    coreComprehensive.signalSynthesis.claims.map((c) => c.riskControl).find((v) => Boolean(v)) ||
    null

  const adapterCalendar = {
    coreHash: coreCalendar.coreHash,
    claimIds: coreCalendar.signalSynthesis.claims.map((c) => c.claimId).slice(0, 8),
    phase: coreCalendar.strategyEngine.overallPhase,
    caution: coreCalendar.signalSynthesis.selectedSignals
      .filter((s) => s.polarity === 'caution')
      .map((s) => s.id)
      .slice(0, 5),
    riskControl,
    topPatternIds: coreCalendar.patterns.slice(0, 5).map((p) => p.id),
  }
  const adapterReport = {
    coreHash: coreComprehensive.coreHash,
    claimIds: unified.claims.map((c) => c.id).slice(0, 8),
    phase: coreComprehensive.strategyEngine.overallPhase,
    caution: topCautions,
    riskControl,
    sectionCount: Object.keys(deterministicSections).length,
  }
  const adapterCounselor = {
    coreHash: coreComprehensive.coreHash,
    claimIds: (counselorPacket.topClaims || []).map((c) => c.id).slice(0, 8),
    phase: counselorPacket.strategyBrief.overallPhase,
    caution: (counselorPacket.selectedSignals || [])
      .filter((s) => s.polarity === 'caution')
      .map((s) => s.id)
      .slice(0, 5),
    riskControl,
    focusDomain: counselorPacket.focusDomain,
  }

  const consistencyTable = {
    coreHash: {
      calendar: adapterCalendar.coreHash,
      report: adapterReport.coreHash,
      counselor: adapterCounselor.coreHash,
      match:
        adapterCalendar.coreHash === adapterReport.coreHash &&
        adapterReport.coreHash === adapterCounselor.coreHash,
    },
    claimIds: {
      calendar: adapterCalendar.claimIds,
      report: adapterReport.claimIds,
      counselor: adapterCounselor.claimIds,
      match:
        adapterCalendar.claimIds.join('|') === adapterReport.claimIds.join('|') &&
        adapterReport.claimIds.join('|') === adapterCounselor.claimIds.join('|'),
    },
    phase: {
      calendar: adapterCalendar.phase,
      report: adapterReport.phase,
      counselor: adapterCounselor.phase,
      match:
        adapterCalendar.phase === adapterReport.phase &&
        adapterReport.phase === adapterCounselor.phase,
    },
    caution: {
      calendar: adapterCalendar.caution,
      report: adapterReport.caution,
      counselor: adapterCounselor.caution,
      match:
        adapterCalendar.caution.join('|') === adapterReport.caution.join('|') &&
        adapterReport.caution.join('|') === adapterCounselor.caution.join('|'),
    },
    riskControl: {
      calendar: adapterCalendar.riskControl,
      report: adapterReport.riskControl,
      counselor: adapterCounselor.riskControl,
      match:
        adapterCalendar.riskControl === adapterReport.riskControl &&
        adapterReport.riskControl === adapterCounselor.riskControl,
    },
  }

  const advancedFieldsMissing = {
    shinsalList: (coreComprehensive.normalizedInput.shinsalList || []).length === 0,
    activeTransits: (coreComprehensive.normalizedInput.activeTransits || []).length === 0,
    advancedAstroSignals: REQUIRED_ADVANCED_SIGNAL_KEYS.some(
      (k) => coreComprehensive.normalizedInput.advancedAstroSignals?.[k] !== true
    ),
  }

  const qa = {
    unsupportedDetail: evidenceCheck.needsRepair,
    contradiction:
      consistencyTable.phase.match === false ||
      consistencyTable.caution.match === false ||
      consistencyTable.riskControl.match === false,
    mojibake: Object.values(deterministicSections).some((text) => looksLikeMojibake(text)),
    missingAdvancedFields: advancedFieldsMissing,
    evidenceBindingViolations: evidenceCheck.violations,
    stageIssues: [
      ...(advancedFieldsMissing.shinsalList ? ['COSMIC->MATRIX: shinsalList empty'] : []),
      ...(advancedFieldsMissing.activeTransits ? ['COSMIC->MATRIX: activeTransits empty'] : []),
      ...(advancedFieldsMissing.advancedAstroSignals
        ? ['COSMIC->MATRIX: advancedAstroSignals incomplete']
        : []),
      ...(evidenceCheck.needsRepair ? ['REPORT ADAPTER: evidence binding violations'] : []),
    ],
  }

  const planetsForOutput = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].map((planet) => {
    const p = planets.find((x: any) => x.name === planet)
    return p
      ? {
          planet,
          sign: p.sign,
          house: p.house,
          longitude: typeof p.longitude === 'number' ? Number(p.longitude.toFixed(2)) : null,
        }
      : { planet, sign: null, house: null, longitude: null }
  })

  const majorAspects = aspectsRaw
    .filter((a: any) => MAJOR_PLANETS.includes(a.from?.name) && MAJOR_PLANETS.includes(a.to?.name))
    .sort((a: any, b: any) => Number(a.orb || 99) - Number(b.orb || 99))
    .slice(0, 10)
    .map((a: any) => ({
      from: a.from.name,
      to: a.to.name,
      type: a.type,
      orb: typeof a.orb === 'number' ? Number(a.orb.toFixed(2)) : null,
    }))

  const shinsalCounts = shinsalHits.reduce<Record<string, number>>((acc, hit) => {
    acc[hit.kind] = (acc[hit.kind] || 0) + 1
    return acc
  }, {})
  const shinsalTop = Object.entries(shinsalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kind, count]) => ({ kind, count }))

  const output = {
    step1_input: input,
    step2_cosmic_engine_output: {
      saju: {
        functionPath:
          'src/lib/Saju/saju.ts -> calculateSajuData + src/lib/Saju/astrologyengine.ts -> analyzeAdvancedSaju',
        dayMaster: saju.dayMaster,
        geokguk: advancedSaju.geokguk,
        yongsin: advancedSaju.yongsin,
        daeun: saju.daeWoon?.current || null,
        seun: saju.unse?.annual?.[0] || null,
        shinsalSummary: {
          hitCount: shinsalHits.length,
          top: shinsalTop,
        },
      },
      astrology: {
        functionPath: 'src/lib/destiny-map/astrology/engine-core.ts -> computeDestinyMapRefactored',
        asc: (combined as any).astrology?.ascendant?.sign || null,
        planets: planetsForOutput,
        majorAspects,
        activeTransits,
      },
    },
    step3_destiny_matrix_output: {
      functionPath: 'src/lib/destiny-matrix/engine.ts -> calculateDestinyMatrix',
      topImpactCells: impactCells,
    },
    step4_signal_synthesis: {
      functionPath:
        'src/lib/destiny-matrix/ai-report/signalSynthesizer.ts -> synthesizeMatrixSignals',
      strength: selectedTop.filter((s) => s.polarity === 'strength'),
      balance: selectedTop.filter((s) => s.polarity === 'balance'),
      caution: selectedTop.filter((s) => s.polarity === 'caution'),
    },
    step5_pattern_engine: {
      functionPath: 'src/lib/destiny-matrix/core/patternEngine.ts -> buildPatternEngine',
      activatedPatterns,
      fallbackPattern: activatedPatterns.length === 0 ? 'phase_stabilize' : null,
    },
    step6_scenario_engine: {
      functionPath: 'src/lib/destiny-matrix/core/scenarioEngine.ts -> buildScenarioEngine',
      scenarios: topScenarios,
    },
    step7_strategy_engine: {
      functionPath:
        'src/lib/destiny-matrix/ai-report/strategyEngine.ts -> buildPhaseStrategyEngine',
      overallPhase: coreComprehensive.strategyEngine.overallPhase,
      overallPhaseLabel: coreComprehensive.strategyEngine.overallPhaseLabel,
      attack: coreComprehensive.strategyEngine.attackPercent,
      defense: coreComprehensive.strategyEngine.defensePercent,
      riskControl,
      domainStrategies,
      whyChosen: coreComprehensive.strategyEngine.thesis,
      scoreBreakdown: {
        strength: strengthScore,
        caution: cautionScore,
        balance: balanceScore,
      },
    },
    step8_core_envelope: {
      functionPath:
        'src/lib/destiny-matrix/core/runDestinyCore.ts -> runDestinyCore + src/lib/destiny-matrix/ai-report/unifiedReport.ts -> buildUnifiedEnvelope',
      coreHash: coreComprehensive.coreHash,
      claimIds: unified.claims.map((c) => c.id),
      evidenceRefs: unified.evidenceRefsByPara,
      phase: coreComprehensive.strategyEngine.overallPhase,
      attackDefense: {
        attack: coreComprehensive.strategyEngine.attackPercent,
        defense: coreComprehensive.strategyEngine.defensePercent,
      },
      cautions: topCautions,
      confidence: matrix.summary.confidenceScore ?? null,
      crossAgreement: graphSummary
        ? {
            avgOverlapScore: graphSummary.avgOverlapScore,
            avgOrbFitScore: graphSummary.avgOrbFitScore,
            totalSets: graphSummary.totalSets,
          }
        : null,
    },
    step9_output_adapter_check: {
      calendar: adapterCalendar,
      report: adapterReport,
      counselor: adapterCounselor,
      consistency: consistencyTable,
    },
    step10_final_qa: qa,
    meta: {
      generatedAt: new Date().toISOString(),
      modeRunComparison: {
        calendar: {
          coreHash: coreCalendar.coreHash,
          phase: coreCalendar.strategyEngine.overallPhase,
          claimIds: coreCalendar.signalSynthesis.claims.map((c) => c.claimId),
        },
        comprehensive: {
          coreHash: coreComprehensive.coreHash,
          phase: coreComprehensive.strategyEngine.overallPhase,
          claimIds: coreComprehensive.signalSynthesis.claims.map((c) => c.claimId),
        },
        themed: {
          coreHash: coreThemed.coreHash,
          phase: coreThemed.strategyEngine.overallPhase,
          claimIds: coreThemed.signalSynthesis.claims.map((c) => c.claimId),
        },
      },
    },
  }

  process.stdout.write(JSON.stringify(output, null, 2))
  mark('done')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
