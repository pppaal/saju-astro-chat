import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { ReportPeriod, ReportTheme } from './types'
import { getThemedSectionKeys } from './themeSchema'

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

const DOMAIN_ORB_MULTIPLIER: Record<InsightDomain, number> = {
  personality: 1.05,
  career: 0.9,
  relationship: 1.0,
  wealth: 0.85,
  health: 0.8,
  spirituality: 1.1,
  timing: 0.75,
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

const SECTION_DOMAIN_MAP: Record<string, InsightDomain[]> = {
  introduction: ['personality'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality'],
  overview: ['timing', 'personality'],
  energy: ['timing', 'health'],
  opportunities: ['career', 'wealth', 'relationship'],
  cautions: ['health', 'timing'],
  domains: ['career', 'relationship', 'wealth', 'health'],
  deepAnalysis: ['personality', 'career', 'relationship'],
  patterns: ['personality', 'timing'],
  timing: ['timing'],
  compatibility: ['relationship'],
  recommendations: ['career', 'relationship', 'wealth', 'health'],
  prevention: ['health'],
  dynamics: ['relationship'],
  strategy: ['career', 'wealth'],
}

type BuildOptions = {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  period?: ReportPeriod
  focusDomain?: InsightDomain
}

type AspectInput = MatrixCalculationInput['aspects'][number]

export interface GraphRAGCrossEvidenceSet {
  id: string
  matrixEvidence: string
  astrologyEvidence: string
  sajuEvidence: string
  overlapDomains: InsightDomain[]
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
}

export interface GraphRAGEvidenceSummary {
  mode: GraphRAGEvidenceBundle['mode']
  theme?: ReportTheme
  period?: ReportPeriod
  totalAnchors: number
  totalSets: number
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

function topSibsin(input: MatrixCalculationInput): string {
  const entries = Object.entries(input.sibsinDistribution || {})
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([key, value]) => `${key}(${value})`)
  return entries.join(', ') || 'No dominant sibsin'
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

function getDomainAspectOrbMultiplier(domain: InsightDomain, aspectType: string): number {
  return DOMAIN_ASPECT_ORB_MULTIPLIER[`${domain}|${normalizeAspectType(aspectType)}`] || 1
}

function getPairAspectOrbMultiplier(aspect: AspectInput): number {
  const pair = getPairKey(aspect)
  const key = `${pair}|${normalizeAspectType(aspect.type)}`
  return PAIR_ASPECT_ORB_MULTIPLIER[key] || 1
}

function getAllowedOrb(aspect: AspectInput, domain: InsightDomain): number {
  const base = getBaseAllowedOrb(aspect.type)
  const domainBase = DOMAIN_ORB_MULTIPLIER[domain]
  const domainAspect = getDomainAspectOrbMultiplier(domain, aspect.type)
  const pairBase = getPairOrbMultiplier(aspect)
  const pairAspect = getPairAspectOrbMultiplier(aspect)
  const raw = base * domainBase * domainAspect * pairBase * pairAspect
  return Math.max(0.8, raw)
}

function getOrbFitScore(aspect: AspectInput, domains: InsightDomain[]): number {
  if (typeof aspect.orb !== 'number') return 0.55
  const orb = aspect.orb
  const scoped: InsightDomain[] = domains.length > 0 ? domains : ['personality']
  const scores = scoped.map((domain) => {
    const allowed = getAllowedOrb(aspect, domain)
    return Math.max(0, 1 - orb / Math.max(allowed, 0.1))
  })
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function getAspectSortScore(aspect: AspectInput, domains: InsightDomain[]): number {
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

function inferAspectDomains(aspect: AspectInput): InsightDomain[] {
  const domains = new Set<InsightDomain>()
  const pair = [aspect.planet1, aspect.planet2]

  if (pair.includes('Venus') || pair.includes('Moon')) domains.add('relationship')
  if (pair.includes('Jupiter') || pair.includes('Saturn') || pair.includes('Sun'))
    domains.add('career')
  if (pair.includes('Jupiter') || pair.includes('Venus')) domains.add('wealth')
  if (pair.includes('Mars') || pair.includes('Saturn') || pair.includes('Moon'))
    domains.add('health')

  const type = normalizeAspectType(aspect.type)
  if (type === 'square' || type === 'opposition' || type === 'quincunx') domains.add('timing')
  if (type === 'trine' || type === 'sextile' || type === 'conjunction') domains.add('personality')

  if (domains.size === 0) domains.add('personality')
  return [...domains]
}

function inferSajuDomains(input: MatrixCalculationInput): InsightDomain[] {
  const domains = new Set<InsightDomain>()
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

  if (input.currentDaeunElement || input.currentSaeunElement) domains.add('timing')
  if (domains.size === 0) domains.add('personality')
  return [...domains]
}

function formatAspectEvidence(aspect: AspectInput, domains: InsightDomain[]): string {
  const angle = getAspectAngle(aspect)
  const angleText = typeof angle === 'number' ? `${toFixed1(angle)}deg` : 'n/a'
  const orbText = typeof aspect.orb === 'number' ? `${toFixed1(aspect.orb)}deg` : 'n/a'
  const scoped: InsightDomain[] = domains.length > 0 ? domains : ['personality']
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
  const profileContext = buildProfileContextSnippet(input)
  const sajuEvidence = [
    `dayMaster=${input.dayMasterElement}`,
    `geokguk=${input.geokguk || 'N/A'}`,
    `yongsin=${input.yongsin || 'N/A'}`,
    `topSibsin=${topSibsin(input)}`,
    profileContext ? `profile=${profileContext}` : '',
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
      combinedConclusion: `This pair overlaps in ${overlapDomains.join(', ')} and should ground "${topInsight}".`,
    }
  })

  const transitSets: GraphRAGCrossEvidenceSet[] = (input.activeTransits || [])
    .slice(0, 4)
    .map((transit, idx) => {
      const transitDomains: InsightDomain[] =
        transit.includes('Return') || transit.includes('Retrograde')
          ? ['timing', 'personality']
          : ['timing']
      const overlapDomains = transitDomains.filter((domain) => sajuDomains.includes(domain))
      const scopedOverlap = overlapDomains.length > 0 ? overlapDomains : transitDomains
      return {
        id: `T${idx + 1}`,
        matrixEvidence: `timingLayer=${input.currentDaeunElement || 'N/A'}/${input.currentSaeunElement || 'N/A'}`,
        astrologyEvidence: `transit=${transit}${input.profileContext?.analysisAt ? ` @${input.profileContext.analysisAt}` : ''}`,
        sajuEvidence,
        overlapDomains: scopedOverlap,
        overlapScore: Number((0.45 + scopedOverlap.length * 0.12).toFixed(2)),
        orbFitScore: 0.5,
        combinedConclusion: `Transit ${transit} should be interpreted against current Saju timing cycle (${input.currentDaeunElement || 'N/A'}/${input.currentSaeunElement || 'N/A'}).`,
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
        combinedConclusion: `Matrix insight "${insight.title}" must stay consistent with section narrative.`,
      }
    })

  return [...aspectSets, ...transitSets, ...matrixSets]
}

function selectEvidenceSetsForSection(
  section: string,
  sets: GraphRAGCrossEvidenceSet[],
  mode: BuildOptions['mode']
): GraphRAGCrossEvidenceSet[] {
  const sectionDomains = SECTION_DOMAIN_MAP[section] || ['personality']
  const targetSetCount = mode === 'comprehensive' ? 6 : 4
  const ranked = [...sets].sort((a, b) => {
    const aHits = a.overlapDomains.filter((d) => sectionDomains.includes(d)).length
    const bHits = b.overlapDomains.filter((d) => sectionDomains.includes(d)).length
    if (bHits !== aHits) return bHits - aHits
    return b.overlapScore - a.overlapScore
  })
  const selected = ranked.slice(0, targetSetCount)
  if (ranked.length === 0) return selected
  while (selected.length < targetSetCount) {
    selected.push(ranked[selected.length % ranked.length])
  }
  return selected
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
  const sections =
    options.mode === 'comprehensive'
      ? comprehensiveSections()
      : options.mode === 'timing'
        ? timingSections()
        : themedSections(options.theme || 'career')

  const dayMaster = input.dayMasterElement
  const geokguk = input.geokguk || 'N/A'
  const yongsin = input.yongsin || 'N/A'
  const sibsin = topSibsin(input)
  const astro = astroSnapshot(input)
  const matrix = matrixSnapshot(report)
  const daeun = input.currentDaeunElement
    ? `currentDaeun=${input.currentDaeunElement}`
    : 'currentDaeun=N/A'
  const saeun = input.currentSaeunElement
    ? `currentSaeun=${input.currentSaeunElement}`
    : 'currentSaeun=N/A'
  const profileContext = buildProfileContextSnippet(input)
  const crossEvidenceSets = buildCrossEvidenceSets(input, report)

  const anchors = sections.map((section, idx) => {
    const id = `E${idx + 1}`
    const selectedSets = selectEvidenceSetsForSection(section, crossEvidenceSets, options.mode)
    return {
      id,
      section,
      sajuEvidence: `dayMaster=${dayMaster}, geokguk=${geokguk}, yongsin=${yongsin}, sibsin=${sibsin}, ${daeun}, ${saeun}${profileContext ? `, profile=${profileContext}` : ''}`,
      astrologyEvidence: astro,
      crossConclusion: `Use ${matrix} as deterministic anchor, then synthesize Saju+Astrology specifically for "${section}" using evidence sets: ${selectedSets.map((s) => s.id).join(', ')}.`,
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
    lines.push('Apply the GraphRAG anchors section-by-section.')
    lines.push(
      'Each section must include Saju basis + Astrology basis + cross conclusion, and cite at least one paired evidence set.'
    )
    lines.push('For every cited set, keep numeric angle/orb/allowed values if provided.')
  } else {
    lines.push('Apply the GraphRAG anchors section-by-section.')
    lines.push(
      'Each section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.'
    )
    lines.push(
      'Each section must cite at least one paired evidence set: Astrology (angle/orb) + matching Saju basis.'
    )
    lines.push('Cite set IDs inline (e.g., [X1], [T1]) so evidence traces are auditable.')
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

  const anchors: GraphRAGAnchorSummary[] = evidence.anchors.map((anchor) => ({
    id: anchor.id,
    section: anchor.section,
    setCount: anchor.crossEvidenceSets?.length || 0,
    sets: (anchor.crossEvidenceSets || []).slice(0, 3),
  }))
  const totalSets = anchors.reduce((sum, anchor) => sum + anchor.setCount, 0)

  return {
    mode: evidence.mode,
    theme: evidence.theme,
    period: evidence.period,
    totalAnchors: anchors.length,
    totalSets,
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
