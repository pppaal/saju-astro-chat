import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { ReportPeriod, ReportTheme } from './types'
import { getThemedSectionKeys } from './themeSchema'

export type GraphRAGDomain = InsightDomain | 'move'

const ASPECT_ANGLE_MAP: Record<string, number> = {
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

const ASPECT_BASE_ORB_BY_TYPE: Record<string, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 6,
  sextile: 5,
  quincunx: 3,
  semisextile: 2,
  quintile: 2,
  biquintile: 2,
}

const DOMAIN_ORB_MULTIPLIER: Record<GraphRAGDomain, number> = {
  personality: 1.05,
  career: 0.9,
  relationship: 1.0,
  wealth: 0.85,
  health: 0.8,
  spirituality: 1.1,
  timing: 0.75,
  move: 0.82,
}

const PLANET_PAIR_ORB_MULTIPLIER: Partial<Record<string, number>> = {
  'Sun-Moon': 1.15,
  'Sun-Saturn': 0.9,
  'Moon-Saturn': 0.85,
  'Sun-Mars': 0.95,
  'Venus-Mars': 1.05,
  'Venus-Moon': 1.1,
  'Mercury-Moon': 1.05,
  'Mercury-Saturn': 0.9,
  'Jupiter-Saturn': 0.85,
  'Sun-Jupiter': 1.05,
  'Mars-Pluto': 0.8,
  'Sun-Pluto': 0.85,
}

const DOMAIN_ASPECT_ORB_MULTIPLIER: Partial<Record<string, number>> = {
  'career|conjunction': 0.95,
  'career|square': 0.9,
  'career|opposition': 0.9,
  'career|trine': 1.0,
  'wealth|square': 0.88,
  'wealth|opposition': 0.9,
  'wealth|trine': 1.02,
  'health|square': 0.82,
  'health|opposition': 0.82,
  'health|quincunx': 0.8,
  'timing|square': 0.8,
  'timing|opposition': 0.8,
  'timing|quincunx': 0.78,
  'relationship|conjunction': 1.03,
  'relationship|trine': 1.05,
  'relationship|square': 0.92,
  'personality|trine': 1.05,
  'personality|sextile': 1.04,
}

const PAIR_ASPECT_ORB_MULTIPLIER: Partial<Record<string, number>> = {
  'Sun-Moon|conjunction': 1.2,
  'Sun-Moon|opposition': 1.08,
  'Sun-Saturn|square': 0.82,
  'Moon-Saturn|square': 0.8,
  'Sun-Mars|opposition': 0.9,
  'Venus-Mars|square': 0.9,
  'Venus-Mars|trine': 1.08,
  'Mercury-Saturn|square': 0.86,
  'Jupiter-Saturn|square': 0.78,
  'Mars-Pluto|square': 0.72,
  'Sun-Pluto|square': 0.75,
}

const SECTION_DOMAIN_MAP: Record<string, GraphRAGDomain[]> = {
  introduction: ['personality'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing', 'move'],
  conclusion: ['personality'],
  overview: ['timing', 'personality'],
  energy: ['timing', 'health'],
  opportunities: ['career', 'wealth', 'relationship', 'move'],
  cautions: ['health', 'timing'],
  domains: ['career', 'relationship', 'wealth', 'health', 'move'],
  deepAnalysis: ['personality', 'career', 'relationship'],
  patterns: ['personality', 'timing'],
  timing: ['timing', 'move'],
  compatibility: ['relationship', 'personality'],
  spouseProfile: ['relationship', 'personality', 'wealth'],
  marriageTiming: ['timing', 'relationship', 'wealth', 'health'],
  recommendations: ['career', 'relationship', 'wealth', 'health'],
  prevention: ['health'],
  dynamics: ['relationship', 'wealth', 'health'],
  communication: ['relationship', 'personality', 'health'],
  legacy: ['relationship', 'wealth', 'health', 'personality'],
  strategy: ['career', 'wealth'],
  roleFit: ['career', 'personality'],
  turningPoints: ['timing', 'career'],
  incomeStreams: ['wealth', 'career'],
  riskManagement: ['wealth', 'health', 'timing'],
  riskWindows: ['health', 'timing'],
  recoveryPlan: ['health', 'personality'],
}

type BuildOptions = {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  period?: ReportPeriod
  focusDomain?: GraphRAGDomain
}

type ReportLang = 'ko' | 'en'

type AspectInput = MatrixCalculationInput['aspects'][number]

export interface GraphRAGCrossEvidenceSet {
  id: string
  matrixEvidence: string
  astrologyEvidence: string
  sajuEvidence: string
  overlapDomains: GraphRAGDomain[]
  overlapScore: number
  orbFitScore: number
  combinedConclusion: string
}

export interface GraphRAGEvidenceAnchor {
  id: string
  section: string
  sajuEvidence: string
  astrologyEvidence: string
  crossConclusion: string
  crossEvidenceSets: GraphRAGCrossEvidenceSet[]
}

export interface GraphRAGEvidenceBundle {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  period?: ReportPeriod
  anchors: GraphRAGEvidenceAnchor[]
}

export interface GraphRAGAnchorSummary {
  id: string
  section: string
  setCount: number
  sets: GraphRAGCrossEvidenceSet[]
  avgOverlapScore: number
  avgOrbFitScore: number
  lowTrustSetCount: number
}

export interface GraphRAGEvidenceSummary {
  mode: GraphRAGEvidenceBundle['mode']
  theme?: ReportTheme
  period?: ReportPeriod
  totalAnchors: number
  totalSets: number
  avgOverlapScore: number
  avgOrbFitScore: number
  highTrustSetCount: number
  lowTrustSetCount: number
  cautionSections: string[]
  anchors: GraphRAGAnchorSummary[]
}

export interface DestinyMatrixEvidenceSummaryItem {
  id: string
  domain: InsightDomain
  title: string
  score: number
  weightedScore: number
  sourceCount: number
  evidence: string[]
}

export interface DestinyMatrixEvidenceSummary {
  totalInsights: number
  totalSourceLinks: number
  domains: Partial<Record<InsightDomain, number>>
  layerCoverage: number[]
  items: DestinyMatrixEvidenceSummaryItem[]
}

function toFixed1(value: number): string {
  return Number(value.toFixed(1)).toString()
}

function normalizeAspectType(type: string | undefined): string {
  return (type || '').toLowerCase()
}

function resolveLang(input: MatrixCalculationInput, report?: FusionReport): ReportLang {
  if (input.lang === 'ko' || input.lang === 'en') return input.lang
  if (report?.lang === 'ko' || report?.lang === 'en') return report.lang
  return 'en'
}

function localizeFiveElement(value: string | undefined, lang: ReportLang): string {
  if (!value) return 'N/A'
  if (lang === 'ko') return value
  const map: Record<string, string> = {
    목: 'wood',
    화: 'fire',
    토: 'earth',
    금: 'metal',
    수: 'water',
  }
  return map[value] || value
}

function localizeSibsinName(value: string, lang: ReportLang): string {
  if (lang === 'ko') return value
  const map: Record<string, string> = {
    비견: 'bigeon',
    겁재: 'geopjae',
    식신: 'siksin',
    상관: 'sanggwan',
    편재: 'pyeonjae',
    정재: 'jeongjae',
    편관: 'pyeongwan',
    정관: 'jeonggwan',
    편인: 'pyeongin',
    정인: 'jeongin',
  }
  return map[value] || value
}

function localizeGeokguk(value: string | undefined, lang: ReportLang): string {
  if (!value) return 'N/A'
  if (lang === 'ko') return value
  const map: Record<string, string> = {
    정관격: 'jeonggwan',
    편관격: 'pyeongwan',
    정인격: 'jeongin',
    편인격: 'pyeongin',
    식신격: 'siksin',
    상관격: 'sanggwan',
    정재격: 'jeongjae',
    편재격: 'pyeonjae',
    양인격: 'yangin',
    건록격: 'geonrok',
  }
  return map[value] || value
}

function topSibsin(input: MatrixCalculationInput, lang: ReportLang): string {
  const entries = Object.entries(input.sibsinDistribution || {})
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([key, value]) => `${localizeSibsinName(key, lang)}(${value})`)
  return entries.join(', ') || (lang === 'ko' ? '우세 십성 없음' : 'No dominant sibsin')
}

function buildProfileContextSnippet(input: MatrixCalculationInput): string {
  const ctx = input.profileContext
  if (!ctx) return ''

  const parts: string[] = []
  if (ctx.birthDate) parts.push(`birthDate=${ctx.birthDate}`)
  if (ctx.birthTime) parts.push(`birthTime=${ctx.birthTime}`)
  if (ctx.birthCity) parts.push(`birthCity=${ctx.birthCity}`)
  if (ctx.timezone) parts.push(`tz=${ctx.timezone}`)
  if (typeof ctx.latitude === 'number' && typeof ctx.longitude === 'number') {
    parts.push(`coords=${ctx.latitude.toFixed(4)},${ctx.longitude.toFixed(4)}`)
  }
  if (ctx.houseSystem) parts.push(`houseSystem=${ctx.houseSystem}`)
  if (ctx.analysisAt) parts.push(`analysisAt=${ctx.analysisAt}`)
  return parts.join(' | ')
}

function getAspectAngle(aspect: AspectInput): number | undefined {
  if (typeof aspect.angle === 'number') return aspect.angle
  return ASPECT_ANGLE_MAP[normalizeAspectType(aspect.type)]
}

function getBaseAllowedOrb(aspectType: string): number {
  return ASPECT_BASE_ORB_BY_TYPE[normalizeAspectType(aspectType)] || 4
}

function getPairKey(aspect: AspectInput): string {
  return [aspect.planet1, aspect.planet2].sort().join('-')
}

function getPairOrbMultiplier(aspect: AspectInput): number {
  return PLANET_PAIR_ORB_MULTIPLIER[getPairKey(aspect)] || 1
}

function getDomainAspectOrbMultiplier(domain: GraphRAGDomain, aspectType: string): number {
  return DOMAIN_ASPECT_ORB_MULTIPLIER[`${domain}|${normalizeAspectType(aspectType)}`] || 1
}

function getPairAspectOrbMultiplier(aspect: AspectInput): number {
  const pair = getPairKey(aspect)
  const key = `${pair}|${normalizeAspectType(aspect.type)}`
  return PAIR_ASPECT_ORB_MULTIPLIER[key] || 1
}

function getAllowedOrb(aspect: AspectInput, domain: GraphRAGDomain): number {
  const base = getBaseAllowedOrb(aspect.type)
  const domainBase = DOMAIN_ORB_MULTIPLIER[domain]
  const domainAspect = getDomainAspectOrbMultiplier(domain, aspect.type)
  const pairBase = getPairOrbMultiplier(aspect)
  const pairAspect = getPairAspectOrbMultiplier(aspect)
  const raw = base * domainBase * domainAspect * pairBase * pairAspect
  return Math.max(0.8, raw)
}

function getOrbFitScore(aspect: AspectInput, domains: GraphRAGDomain[]): number {
  if (typeof aspect.orb !== 'number') return 0.55
  const orb = aspect.orb
  const scoped: GraphRAGDomain[] = domains.length > 0 ? domains : ['personality']
  const scores = scoped.map((domain) => {
    const allowed = getAllowedOrb(aspect, domain)
    return Math.max(0, 1 - orb / Math.max(allowed, 0.1))
  })
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function getAspectSortScore(aspect: AspectInput, domains: GraphRAGDomain[]): number {
  const orbFit = getOrbFitScore(aspect, domains)
  const orbScore = orbFit * 10
  const type = normalizeAspectType(aspect.type)
  const typeWeight =
    type === 'conjunction' || type === 'opposition'
      ? 5
      : type === 'trine' || type === 'square'
        ? 4
        : type === 'sextile'
          ? 3
          : 2
  return orbScore + typeWeight
}

function inferAspectDomains(aspect: AspectInput): GraphRAGDomain[] {
  const domains = new Set<GraphRAGDomain>()
  const pair = [aspect.planet1, aspect.planet2]

  if (pair.includes('Venus') || pair.includes('Moon')) domains.add('relationship')
  if (pair.includes('Jupiter') || pair.includes('Saturn') || pair.includes('Sun'))
    domains.add('career')
  if (pair.includes('Jupiter') || pair.includes('Venus')) domains.add('wealth')
  if (pair.includes('Mars') || pair.includes('Saturn') || pair.includes('Moon'))
    domains.add('health')
  if (
    pair.includes('Mercury') ||
    pair.includes('Uranus') ||
    pair.includes('Neptune') ||
    pair.includes('Pluto')
  ) {
    domains.add('move')
  }

  const type = normalizeAspectType(aspect.type)
  if (type === 'square' || type === 'opposition' || type === 'quincunx') domains.add('timing')
  if (type === 'trine' || type === 'sextile' || type === 'conjunction') domains.add('personality')

  if (domains.size === 0) domains.add('personality')
  return [...domains]
}

function inferSajuDomains(input: MatrixCalculationInput): GraphRAGDomain[] {
  const domains = new Set<GraphRAGDomain>()
  const geokguk = (input.geokguk || '').toString()

  if (geokguk.includes('gwan') || geokguk.includes('관')) domains.add('career')
  if (geokguk.includes('jae') || geokguk.includes('재')) domains.add('wealth')
  if (geokguk.includes('in') || geokguk.includes('인')) domains.add('spirituality')
  if (geokguk.includes('yangin') || geokguk.includes('살')) domains.add('health')

  for (const key of Object.keys(input.sibsinDistribution || {})) {
    if (key.includes('관')) domains.add('career')
    if (key.includes('재')) domains.add('wealth')
    if (key.includes('인')) domains.add('spirituality')
    if (key.includes('비') || key.includes('겁')) domains.add('relationship')
    if (key.includes('식') || key.includes('상')) domains.add('personality')
  }

  if (
    input.currentDaeunElement ||
    input.currentSaeunElement ||
    input.currentWolunElement ||
    input.currentIljinElement ||
    input.currentIljinDate
  ) {
    domains.add('timing')
  }
  if (
    (input.shinsalList || []).some((item) => /역마|travel|relocat|move/i.test(String(item))) ||
    (input.activeTransits || []).some((item) => /uranus|node|eclipse/i.test(String(item)))
  ) {
    domains.add('move')
  }
  if (domains.size === 0) domains.add('personality')
  return [...domains]
}

function buildTimingCycleSummary(input: MatrixCalculationInput, lang: ReportLang): string {
  const parts = [
    localizeFiveElement(input.currentDaeunElement, lang),
    localizeFiveElement(input.currentSaeunElement, lang),
    localizeFiveElement(input.currentWolunElement, lang),
    localizeFiveElement(input.currentIljinElement, lang),
  ]
  const base = parts.join('/')
  return input.currentIljinDate ? `${base}@${input.currentIljinDate}` : base
}

function formatAspectEvidence(aspect: AspectInput, domains: GraphRAGDomain[]): string {
  const angle = getAspectAngle(aspect)
  const angleText = typeof angle === 'number' ? `${toFixed1(angle)}deg` : 'n/a'
  const orbText = typeof aspect.orb === 'number' ? `${toFixed1(aspect.orb)}deg` : 'n/a'
  const scoped: GraphRAGDomain[] = domains.length > 0 ? domains : ['personality']
  const policy = scoped
    .slice(0, 2)
    .map((d) => `${d}<=${toFixed1(getAllowedOrb(aspect, d))}deg`)
    .join(', ')
  return `${aspect.planet1}-${aspect.type}-${aspect.planet2} (pair=${getPairKey(aspect)}, angle=${angleText}, orb=${orbText}, allowed=${policy})`
}

function buildCrossEvidenceSets(
  input: MatrixCalculationInput,
  report: FusionReport
): GraphRAGCrossEvidenceSet[] {
  const lang = resolveLang(input, report)
  const profileContext = buildProfileContextSnippet(input)
  const sajuEvidence = [
    `dayMaster=${localizeFiveElement(input.dayMasterElement, lang)}`,
    `geokguk=${localizeGeokguk(input.geokguk, lang)}`,
    `yongsin=${localizeFiveElement(input.yongsin, lang)}`,
    `topSibsin=${topSibsin(input, lang)}`,
    profileContext ? `profile=${profileContext}` : '',
    `timingCycle=${buildTimingCycleSummary(input, lang)}`,
  ]
    .filter(Boolean)
    .join(', ')

  const sajuDomains = inferSajuDomains(input)
  const rankedAspects = [...(input.aspects || [])].sort((a, b) => {
    const aDomains = inferAspectDomains(a)
    const bDomains = inferAspectDomains(b)
    return getAspectSortScore(b, bDomains) - getAspectSortScore(a, aDomains)
  })
  const maxAspectEvidence = Math.min(12, Math.max(6, Math.ceil(rankedAspects.length * 0.85)))
  const selectedAspects = rankedAspects.slice(0, maxAspectEvidence)
  const fallbackAspect: AspectInput = {
    planet1: 'Sun',
    planet2: 'Moon',
    type: 'conjunction' as AspectInput['type'],
  }
  const aspects = selectedAspects.length > 0 ? selectedAspects : [fallbackAspect]

  const aspectSets = aspects.map((aspect, idx) => {
    const aspectDomains = inferAspectDomains(aspect)
    const overlap = aspectDomains.filter((d) => sajuDomains.includes(d))
    const overlapDomains =
      overlap.length > 0 ? overlap : [...new Set([...aspectDomains, ...sajuDomains])].slice(0, 3)
    const orbFitScore = getOrbFitScore(aspect, overlapDomains)
    const overlapScore = Math.max(
      0.3,
      Math.min(0.99, overlapDomains.length / 4 + orbFitScore * 0.55 + 0.1)
    )
    const topInsight =
      report.topInsights[idx]?.title || report.topInsights[0]?.title || 'core trend'
    const topSource = report.topInsights[idx]?.sources?.[0]
    const matrixEvidence = topSource
      ? `L${topSource.layer}:${topSource.sajuFactor} + ${topSource.astroFactor} (contribution=${toFixed1(topSource.contribution * 100)}%)`
      : `matrixInsight=${topInsight}`
    return {
      id: `X${idx + 1}`,
      matrixEvidence,
      astrologyEvidence: formatAspectEvidence(aspect, overlapDomains),
      sajuEvidence,
      overlapDomains,
      overlapScore: Number(overlapScore.toFixed(2)),
      orbFitScore: Number(orbFitScore.toFixed(2)),
      combinedConclusion: `The overlap around "${topInsight}" is strongest in ${overlapDomains.join(', ')}. Treat this as the main evidence thread for the section, then turn it into one reversible move and one risk-control step.`,
    }
  })

  const transitSets: GraphRAGCrossEvidenceSet[] = (input.activeTransits || [])
    .slice(0, 4)
    .map((transit, idx) => {
      const transitDomains: GraphRAGDomain[] =
        transit.includes('Return') || transit.includes('Retrograde')
          ? ['timing', 'personality', 'move']
          : /uranus|node|eclipse/i.test(transit)
            ? ['timing', 'move']
            : ['timing']
      const overlapDomains = transitDomains.filter((domain) => sajuDomains.includes(domain))
      const scopedOverlap = overlapDomains.length > 0 ? overlapDomains : transitDomains
      return {
        id: `T${idx + 1}`,
        matrixEvidence: `timingLayer=${buildTimingCycleSummary(input, lang)}`,
        astrologyEvidence: `transit=${transit}${input.profileContext?.analysisAt ? ` @${input.profileContext.analysisAt}` : ''}`,
        sajuEvidence,
        overlapDomains: scopedOverlap,
        overlapScore: Number((0.45 + scopedOverlap.length * 0.12).toFixed(2)),
        orbFitScore: 0.5,
        combinedConclusion: `Read transit ${transit} together with the current Saju timing cycle (${buildTimingCycleSummary(input, lang)}). If the two do not line up, move in a verification-first sequence and delay irreversible commitments.`,
      }
    })

  const matrixSets: GraphRAGCrossEvidenceSet[] = report.topInsights
    .slice(0, 6)
    .map((insight, idx) => {
      const source = insight.sources?.[0]
      return {
        id: `M${idx + 1}`,
        matrixEvidence: source
          ? `L${source.layer}:${source.sajuFactor} + ${source.astroFactor} (contribution=${toFixed1(source.contribution * 100)}%)`
          : `matrixInsight=${insight.title}`,
        astrologyEvidence: source?.astroFactor || 'matrix-astro-factor=N/A',
        sajuEvidence: source?.sajuFactor || sajuEvidence,
        overlapDomains: [insight.domain],
        overlapScore: 0.6,
        orbFitScore: 0.5,
        combinedConclusion: `"${insight.title}" is the section's clearest matrix signal. Use it as the core claim only after confirming both the Saju basis and the astrology basis.`,
      }
    })

  return [...aspectSets, ...transitSets, ...matrixSets]
}

function selectEvidenceSetsForSection(
  section: string,
  sets: GraphRAGCrossEvidenceSet[],
  mode: BuildOptions['mode'],
  focusDomain?: GraphRAGDomain
): GraphRAGCrossEvidenceSet[] {
  const sectionDomains = SECTION_DOMAIN_MAP[section] || ['personality']
  const targetSetCount = mode === 'comprehensive' ? 2 : 4
  const rankedByOverlap = [...sets].sort((a, b) => b.overlapScore - a.overlapScore)
  const matchedDomain = rankedByOverlap.filter((set) =>
    set.overlapDomains.some((d) => sectionDomains.includes(d))
  )
  const pool = matchedDomain.length > 0 ? matchedDomain : rankedByOverlap
  const reranked = [...pool].sort((a, b) => {
    const aFocusBoost = focusDomain && a.overlapDomains.includes(focusDomain) ? 1 : 0
    const bFocusBoost = focusDomain && b.overlapDomains.includes(focusDomain) ? 1 : 0
    if (bFocusBoost !== aFocusBoost) return bFocusBoost - aFocusBoost

    const aSectionMatchCount = a.overlapDomains.filter((domain) =>
      sectionDomains.includes(domain)
    ).length
    const bSectionMatchCount = b.overlapDomains.filter((domain) =>
      sectionDomains.includes(domain)
    ).length
    if (bSectionMatchCount !== aSectionMatchCount) {
      return bSectionMatchCount - aSectionMatchCount
    }

    if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore
    return b.orbFitScore - a.orbFitScore
  })

  return reranked.slice(0, targetSetCount)
}

function astroSnapshot(input: MatrixCalculationInput): string {
  const planetBits = Object.entries(input.planetHouses || {})
    .slice(0, 4)
    .map(([planet, house]) => `${planet}->H${house}`)
  const aspectBits = (input.aspects || []).slice(0, 3).map((a) => {
    const angle = getAspectAngle(a)
    const orb = typeof a.orb === 'number' ? ` orb=${toFixed1(a.orb)}deg` : ''
    return `${a.planet1}-${a.type}-${a.planet2}${typeof angle === 'number' ? ` ${toFixed1(angle)}deg` : ''}${orb}`
  })
  const tokens = [
    input.dominantWesternElement ? `dominant=${input.dominantWesternElement}` : '',
    planetBits.length > 0 ? `houses=${planetBits.join(', ')}` : '',
    aspectBits.length > 0 ? `aspects=${aspectBits.join(', ')}` : '',
  ].filter(Boolean)
  return tokens.join(' | ') || 'Astrology snapshot unavailable'
}

function matrixSnapshot(report: FusionReport): string {
  const top = report.topInsights
    .slice(0, 2)
    .map((i) => `${i.title}(${Math.round(i.score)})`)
    .join(', ')
  return `overall=${report.overallScore.total} grade=${report.overallScore.grade}${top ? ` top=${top}` : ''}`
}

function comprehensiveSections(): string[] {
  return [
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
}

function timingSections(): string[] {
  return ['overview', 'energy', 'opportunities', 'cautions', 'domains', 'actionPlan']
}

function themedSections(theme: ReportTheme): string[] {
  return [...getThemedSectionKeys(theme)]
}

export function buildGraphRAGEvidence(
  input: MatrixCalculationInput,
  report: FusionReport,
  options: BuildOptions
): GraphRAGEvidenceBundle {
  const lang = resolveLang(input, report)
  const sections =
    options.mode === 'comprehensive'
      ? comprehensiveSections()
      : options.mode === 'timing'
        ? timingSections()
        : themedSections(options.theme || 'career')

  const dayMaster = localizeFiveElement(input.dayMasterElement, lang)
  const geokguk = localizeGeokguk(input.geokguk, lang)
  const yongsin = localizeFiveElement(input.yongsin, lang)
  const sibsin = topSibsin(input, lang)
  const astro = astroSnapshot(input)
  const matrix = matrixSnapshot(report)
  const daeun = input.currentDaeunElement
    ? `currentDaeun=${localizeFiveElement(input.currentDaeunElement, lang)}`
    : 'currentDaeun=N/A'
  const saeun = input.currentSaeunElement
    ? `currentSaeun=${localizeFiveElement(input.currentSaeunElement, lang)}`
    : 'currentSaeun=N/A'
  const wolun = input.currentWolunElement
    ? `currentWolun=${localizeFiveElement(input.currentWolunElement, lang)}`
    : 'currentWolun=N/A'
  const iljin = input.currentIljinElement
    ? `currentIljin=${localizeFiveElement(input.currentIljinElement, lang)}${input.currentIljinDate ? `@${input.currentIljinDate}` : ''}`
    : input.currentIljinDate
      ? `currentIljin=N/A@${input.currentIljinDate}`
      : 'currentIljin=N/A'
  const profileContext = buildProfileContextSnippet(input)
  const crossEvidenceSets = buildCrossEvidenceSets(input, report)

  const anchors = sections.map((section, idx) => {
    const id = `E${idx + 1}`
    const selectedSets = selectEvidenceSetsForSection(
      section,
      crossEvidenceSets,
      options.mode,
      options.focusDomain
    )
    return {
      id,
      section,
      sajuEvidence: `dayMaster=${dayMaster}, geokguk=${geokguk}, yongsin=${yongsin}, sibsin=${sibsin}, ${daeun}, ${saeun}, ${wolun}, ${iljin}${profileContext ? `, profile=${profileContext}` : ''}`,
      astrologyEvidence: astro,
      crossConclusion: `For "${section}", start from ${matrix} and use ${selectedSets.map((s) => s.id).join(', ')} as the main cross-check set. Keep the flow evidence -> interpretation -> action, and do not let action guidance contradict caution signals.`,
      crossEvidenceSets: selectedSets,
    }
  })

  return {
    mode: options.mode,
    theme: options.theme,
    period: options.period,
    anchors,
  }
}

export function formatGraphRAGEvidenceForPrompt(
  evidence: GraphRAGEvidenceBundle,
  lang: 'ko' | 'en'
): string {
  const lines: string[] = []
  if (lang === 'ko') {
    lines.push('GraphRAG 앵커를 섹션별 근거 정렬용으로 사용하세요.')
    lines.push('각 섹션은 사주 근거 1문장, 점성 근거 1문장, 두 근거를 묶는 교차 결론 1문장을 먼저 세우세요.')
    lines.push('각 섹션마다 최소 1개 이상의 paired evidence set([Xn]/[Tn]/[Mn])를 붙여 근거 흐름을 추적 가능하게 유지하세요.')
    lines.push('angle/orb/allowed 수치가 있으면 유지하되, 문장은 사용자 언어로 풀어쓰세요.')
    lines.push(
      'overlapScore<0.60 또는 orbFit<0.50인 set은 "재확인 필요"로 해석하고 확정/서명/즉시결정을 권하지 마세요.'
    )
    lines.push(
      '교차 근거가 낮으면 "같은 방향" 단정 문장을 금지하고, 검증 중심 행동으로 전환하세요.'
    )
  } else {
    lines.push('Use the GraphRAG anchors to organize evidence section by section.')
    lines.push(
      'For each section, start with one Saju basis sentence, one Astrology basis sentence, and one cross conclusion sentence.'
    )
    lines.push(
      'Each section should cite at least one paired evidence set: astrology evidence plus the matching Saju basis.'
    )
    lines.push('Keep set IDs inline (e.g., [X1], [T1]) so the evidence trail remains auditable.')
    lines.push(
      'If overlapScore<0.60 or orbFit<0.50, mark it as "recheck required" and avoid irreversible recommendations.'
    )
    lines.push(
      'Do not claim "same direction" when cross evidence quality is low; switch to verification-first guidance.'
    )
  }

  for (const anchor of evidence.anchors) {
    lines.push(`[${anchor.id}] section=${anchor.section}`)
    lines.push(`- saju: ${anchor.sajuEvidence}`)
    lines.push(`- astro: ${anchor.astrologyEvidence}`)
    lines.push(`- cross: ${anchor.crossConclusion}`)
    for (const set of anchor.crossEvidenceSets || []) {
      lines.push(
        `  - set ${set.id}: matrix=${set.matrixEvidence} | astro=${set.astrologyEvidence} | saju=${set.sajuEvidence} | overlap=${set.overlapDomains.join('/')}; score=${set.overlapScore}; orbFit=${set.orbFitScore}`
      )
      lines.push(`    conclusion: ${set.combinedConclusion}`)
    }
  }
  return lines.join('\n')
}

export function summarizeGraphRAGEvidence(
  evidence?: GraphRAGEvidenceBundle | null
): GraphRAGEvidenceSummary | null {
  if (!evidence || !Array.isArray(evidence.anchors) || evidence.anchors.length === 0) {
    return null
  }

  const anchors: GraphRAGAnchorSummary[] = evidence.anchors.map((anchor) => {
    const sets = anchor.crossEvidenceSets || []
    const avgOverlapScore =
      sets.length > 0
        ? Number((sets.reduce((sum, set) => sum + set.overlapScore, 0) / sets.length).toFixed(2))
        : 0
    const avgOrbFitScore =
      sets.length > 0
        ? Number((sets.reduce((sum, set) => sum + set.orbFitScore, 0) / sets.length).toFixed(2))
        : 0
    const lowTrustSetCount = sets.filter(
      (set) => set.overlapScore < 0.6 || set.orbFitScore < 0.5
    ).length
    return {
      id: anchor.id,
      section: anchor.section,
      setCount: sets.length,
      sets: sets.slice(0, 3),
      avgOverlapScore,
      avgOrbFitScore,
      lowTrustSetCount,
    }
  })
  const totalSets = anchors.reduce((sum, anchor) => sum + anchor.setCount, 0)
  const allSets = evidence.anchors.flatMap((anchor) => anchor.crossEvidenceSets || [])
  const avgOverlapScore =
    allSets.length > 0
      ? Number(
          (allSets.reduce((sum, set) => sum + set.overlapScore, 0) / allSets.length).toFixed(2)
        )
      : 0
  const avgOrbFitScore =
    allSets.length > 0
      ? Number((allSets.reduce((sum, set) => sum + set.orbFitScore, 0) / allSets.length).toFixed(2))
      : 0
  const highTrustSetCount = allSets.filter(
    (set) => set.overlapScore >= 0.75 && set.orbFitScore >= 0.65
  ).length
  const lowTrustSetCount = allSets.filter(
    (set) => set.overlapScore < 0.6 || set.orbFitScore < 0.5
  ).length
  const cautionSections = anchors
    .filter(
      (anchor) =>
        anchor.lowTrustSetCount > 0 || anchor.avgOverlapScore < 0.6 || anchor.avgOrbFitScore < 0.5
    )
    .map((anchor) => anchor.section)

  return {
    mode: evidence.mode,
    theme: evidence.theme,
    period: evidence.period,
    totalAnchors: anchors.length,
    totalSets,
    avgOverlapScore,
    avgOrbFitScore,
    highTrustSetCount,
    lowTrustSetCount,
    cautionSections,
    anchors,
  }
}

export function summarizeDestinyMatrixEvidence(report: FusionReport): DestinyMatrixEvidenceSummary {
  const domains: Partial<Record<InsightDomain, number>> = {}
  const layers = new Set<number>()
  let totalSourceLinks = 0

  const items: DestinyMatrixEvidenceSummaryItem[] = report.topInsights
    .slice(0, 8)
    .map((insight) => {
      domains[insight.domain] = (domains[insight.domain] || 0) + 1
      const evidence = (insight.sources || []).slice(0, 3).map((source) => {
        layers.add(source.layer)
        totalSourceLinks += 1
        return `L${source.layer}:${source.sajuFactor} + ${source.astroFactor} (${toFixed1(source.contribution * 100)}%)`
      })
      return {
        id: insight.id,
        domain: insight.domain,
        title: insight.title,
        score: insight.score,
        weightedScore: insight.weightedScore,
        sourceCount: insight.sources?.length || 0,
        evidence,
      }
    })

  return {
    totalInsights: report.topInsights.length,
    totalSourceLinks,
    domains,
    layerCoverage: [...layers].sort((a, b) => a - b),
    items,
  }
}
