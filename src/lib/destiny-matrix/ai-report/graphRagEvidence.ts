import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { ReportPeriod, ReportTheme } from './types'

export interface GraphRAGEvidenceAnchor {
  id: string
  section: string
  sajuEvidence: string
  astrologyEvidence: string
  crossConclusion: string
}

export interface GraphRAGEvidenceBundle {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  period?: ReportPeriod
  anchors: GraphRAGEvidenceAnchor[]
}

type BuildOptions = {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  period?: ReportPeriod
  focusDomain?: InsightDomain
}

function topSibsin(input: MatrixCalculationInput): string {
  const entries = Object.entries(input.sibsinDistribution || {})
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([key, value]) => `${key}(${value})`)
  return entries.join(', ') || 'No dominant sibsin'
}

function astroSnapshot(input: MatrixCalculationInput): string {
  const planetBits = Object.entries(input.planetHouses || {})
    .slice(0, 4)
    .map(([planet, house]) => `${planet}->H${house}`)
  const aspectBits = (input.aspects || [])
    .slice(0, 3)
    .map((a) => `${a.planet1}-${a.type}-${a.planet2}`)
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
  const base = ['deepAnalysis', 'patterns', 'timing']
  if (theme === 'love') return [...base, 'compatibility', 'recommendations', 'actionPlan']
  if (theme === 'health') return [...base, 'prevention', 'recommendations', 'actionPlan']
  if (theme === 'family') return [...base, 'dynamics', 'recommendations', 'actionPlan']
  return [...base, 'strategy', 'recommendations', 'actionPlan']
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

  const anchors = sections.map((section, idx) => {
    const id = `E${idx + 1}`
    return {
      id,
      section,
      sajuEvidence: `dayMaster=${dayMaster}, geokguk=${geokguk}, yongsin=${yongsin}, sibsin=${sibsin}, ${daeun}, ${saeun}`,
      astrologyEvidence: astro,
      crossConclusion: `Use ${matrix} as deterministic anchor, then synthesize Saju+Astrology specifically for "${section}".`,
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
    lines.push('아래 GraphRAG 근거를 섹션별로 반드시 반영하세요.')
    lines.push(
      '각 섹션은 반드시 "사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장"을 포함하세요.'
    )
  } else {
    lines.push('Apply the GraphRAG anchors below section-by-section.')
    lines.push(
      'Each section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.'
    )
  }

  for (const anchor of evidence.anchors) {
    lines.push(`[${anchor.id}] section=${anchor.section}`)
    lines.push(`- saju: ${anchor.sajuEvidence}`)
    lines.push(`- astro: ${anchor.astrologyEvidence}`)
    lines.push(`- cross: ${anchor.crossConclusion}`)
  }
  return lines.join('\n')
}
