import type { MatrixCell, MatrixSummary, MatrixCalculationInput } from '@/lib/destiny-matrix'
import type { TimingData } from './types'

export interface QualityAudit {
  completenessScore: number
  crossEvidenceScore: number
  orbEvidenceScore: number
  actionabilityScore: number
  clarityScore: number
  antiOverclaimScore: number
  foreignSystemIssueCount: number
  foreignSystemFindings: Array<{
    section: string
    sentence: string
    token: string
  }>
  overclaimIssueCount: number
  overclaimFindings: Array<{
    section: string
    sentence: string
    reason: 'absolute_without_evidence' | 'extreme_without_evidence'
  }>
  shouldBlock: boolean
  overallQualityScore: number
  issues: string[]
  strengths: string[]
  recommendations: string[]
}

export interface MatrixInputReadinessAudit {
  score: number
  ready: boolean
  blockers: string[]
  warnings: string[]
  metrics: {
    timingAnchorCount: number
    activeTransitCount: number
    aspectCount: number
    relationCount: number
    planetHouseCount: number
    hasAstroTimingIndex: boolean
    hasSnapshots: {
      saju: boolean
      astrology: boolean
      cross: boolean
    }
  }
}

export interface CalculationDetails {
  inputSnapshot: {
    profile?: Record<string, unknown>
    saju: Record<string, unknown>
    astrology: Record<string, unknown>
  }
  timingData: TimingData
  matrixSummary?: MatrixSummary
  layerResults: Record<string, Record<string, MatrixCell>>
  topInsightsWithSources: Array<{
    title?: string
    description?: string
    category?: string
    score?: number
    sources?: unknown[]
  }>
}

const REQUIRED_SECTION_KEYS = [
  'deepAnalysis',
  'patterns',
  'timing',
  'recommendations',
  'actionPlan',
]

const THEME_SPECIFIC_KEYS: Record<string, string[]> = {
  love: ['compatibility', 'spouseProfile', 'marriageTiming'],
  career: ['strategy', 'roleFit', 'turningPoints'],
  wealth: ['strategy', 'incomeStreams', 'riskManagement'],
  health: ['prevention', 'riskWindows', 'recoveryPlan'],
  family: ['dynamics', 'communication', 'legacy'],
}

const SAJU_REGEX = /사주|오행|십신|대운|세운|월운|일간|격국|용신|신살|saju|bazi|daeun|saeun|sibsin/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜싯|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac|progression/i
const ORB_ANGLE_REGEX = /angle\s*[:=]\s*\d+(?:\.\d+)?\s*(?:deg|°)/i
const ORB_ORB_REGEX = /\borb\s*[:=]\s*\d+(?:\.\d+)?\s*(?:deg|°)/i
const ORB_ALLOWED_REGEX = /(allowed|allow)\s*[:=]\s*\d+(?:\.\d+)?\s*(?:deg|°)/i
const PLACEHOLDER_REGEX = /(\?{3,}|todo|tbd|lorem ipsum)/i
const EVIDENCE_MARKER_REGEX = /(근거\s*:|evidence\s*:|source\s*:|sources\s*:)/i
const HEDGING_REGEX = /(가능|경향|추정|권장|유의|consider|may|might|likely|tend|could|appears?)/i
const ABSOLUTE_CLAIM_REGEX =
  /(절대|무조건|반드시\s.*(된다|성공|이긴다|맞다)|완벽|확정|100%|guaranteed|certainly|always|never)/i
const EXTREME_OUTCOME_REGEX =
  /(인생\s*(끝|망|파탄)|완전\s*(실패|붕괴)|반드시\s*(파국|대박)|destined to fail|ruined)/i
const FOREIGN_SYSTEM_REGEX =
  /(타로|tarot|수비학|numerology|휴먼\s*디자인|human\s*design|차크라|chakra|레이키|reiki|mbti|에니어그램|enneagram|혈액형|blood\s*type|풍수|feng\s*shui)/i

const clamp100 = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim()
  }
  return ''
}

function toSentenceCount(value: string): number {
  if (!value) return 0
  return value
    .split(/[.!?\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean).length
}

function splitSentences(value: string): string[] {
  if (!value) return []
  return value
    .split(/[.!?\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [yearRaw, monthRaw, dayRaw] = value.split('-').map((part) => Number(part))
  if (!Number.isFinite(yearRaw) || !Number.isFinite(monthRaw) || !Number.isFinite(dayRaw)) {
    return false
  }
  const year = yearRaw
  const month = monthRaw
  const day = dayRaw
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  )
}

function collectSectionTexts(
  sections: Record<string, unknown>
): Array<{ key: string; text: string }> {
  return Object.entries(sections || {})
    .map(([key, value]) => ({ key, text: toText(value) }))
    .filter((entry) => entry.text.length > 0)
}

export function evaluateThemedReportQuality(input: {
  sections: Record<string, unknown>
  keywords?: string[]
  theme?: string
  lang: 'ko' | 'en'
}): QualityAudit {
  const sections = input.sections || {}
  const sectionTexts = collectSectionTexts(sections)
  const sectionCount = sectionTexts.length

  const baseRequiredKeys = [...REQUIRED_SECTION_KEYS]
  const themeSpecific = input.theme ? THEME_SPECIFIC_KEYS[input.theme] : undefined
  const basePresent = baseRequiredKeys.filter((key) => toText(sections[key]).length > 0).length
  const baseCoverage = basePresent / Math.max(1, baseRequiredKeys.length)
  const themePresent = (themeSpecific || []).filter(
    (key) => toText(sections[key]).length > 0
  ).length
  const themeCoverage = themeSpecific?.length ? themePresent / themeSpecific.length : 1
  // Base sections are mandatory; theme sections are weighted to avoid over-penalizing deterministic drafts.
  const completenessScore = clamp100((baseCoverage * 0.8 + themeCoverage * 0.2) * 100)

  const crossMatchedCount = sectionTexts.filter(
    ({ text }) => SAJU_REGEX.test(text) && ASTRO_REGEX.test(text)
  ).length
  const crossEvidenceScore = clamp100(
    sectionCount > 0 ? (crossMatchedCount / sectionCount) * 100 : 0
  )

  const orbMatchedCount = sectionTexts.filter(({ text }) => {
    const hitCount = [ORB_ANGLE_REGEX, ORB_ORB_REGEX, ORB_ALLOWED_REGEX].filter((regex) =>
      regex.test(text)
    ).length
    return hitCount >= 2
  }).length
  const orbEvidenceScore = clamp100(sectionCount > 0 ? (orbMatchedCount / sectionCount) * 100 : 0)

  const actionPlanText = toText(sections.actionPlan)
  const recommendationsText = toText(sections.recommendations)
  const actionSentenceCount = toSentenceCount(actionPlanText) + toSentenceCount(recommendationsText)
  const actionabilityScore = clamp100(Math.min(1, actionSentenceCount / 8) * 100)

  const totalChars = sectionTexts.reduce((sum, section) => sum + section.text.length, 0)
  const avgChars = sectionCount > 0 ? totalChars / sectionCount : 0
  const hasPlaceholder = sectionTexts.some(({ text }) => PLACEHOLDER_REGEX.test(text))
  const clarityRaw = (avgChars >= 120 ? 1 : avgChars / 120) * (hasPlaceholder ? 0.65 : 1)
  const clarityScore = clamp100(clarityRaw * 100)

  // Overclaim / leap guard
  const overclaimFindings: QualityAudit['overclaimFindings'] = []
  const foreignSystemFindings: QualityAudit['foreignSystemFindings'] = []
  for (const { key, text } of sectionTexts) {
    const sentences = splitSentences(text)
    const hasSectionEvidence = EVIDENCE_MARKER_REGEX.test(text)
    for (const sentence of sentences) {
      const foreignMatch = sentence.match(FOREIGN_SYSTEM_REGEX)
      if (foreignMatch?.[0]) {
        foreignSystemFindings.push({
          section: key,
          sentence,
          token: foreignMatch[0],
        })
      }

      const hasAbsolute = ABSOLUTE_CLAIM_REGEX.test(sentence)
      const hasExtreme = EXTREME_OUTCOME_REGEX.test(sentence)
      if (!hasAbsolute && !hasExtreme) continue

      const hasSentenceEvidence = EVIDENCE_MARKER_REGEX.test(sentence)
      const hasHedging = HEDGING_REGEX.test(sentence)
      if (hasSentenceEvidence || hasSectionEvidence || hasHedging) continue

      overclaimFindings.push({
        section: key,
        sentence,
        reason: hasExtreme ? 'extreme_without_evidence' : 'absolute_without_evidence',
      })
      if (overclaimFindings.length >= 20) break
    }
  }
  const foreignSystemIssueCount = foreignSystemFindings.length
  const overclaimIssueCount = overclaimFindings.length
  const antiOverclaimScore = clamp100(
    sectionCount > 0 ? (1 - overclaimIssueCount / sectionCount) * 100 : 100
  )
  const shouldBlock =
    overclaimIssueCount >= 2 || antiOverclaimScore < 60 || foreignSystemIssueCount > 0

  const keywordBonus =
    input.keywords && input.keywords.length >= 3
      ? 2
      : input.keywords && input.keywords.length > 0
        ? 1
        : 0

  const overallQualityScore = clamp100(
    completenessScore * 0.25 +
      crossEvidenceScore * 0.25 +
      orbEvidenceScore * 0.15 +
      actionabilityScore * 0.2 +
      clarityScore * 0.1 +
      antiOverclaimScore * 0.05 +
      keywordBonus
  )

  const issues: string[] = []
  const strengths: string[] = []
  const recommendations: string[] = []

  if (completenessScore < 80) {
    issues.push('필수 섹션 누락이 있습니다.')
    recommendations.push('필수 섹션을 모두 채우고 theme 특화 섹션을 강화하세요.')
  } else {
    strengths.push('필수 섹션 구성 완성도가 높습니다.')
  }

  if (crossEvidenceScore < 70) {
    issues.push('사주/점성 교차 근거가 부족합니다.')
    recommendations.push('각 섹션에 사주 근거 1개 + 점성 근거 1개를 함께 명시하세요.')
  } else {
    strengths.push('사주와 점성의 교차 근거가 안정적으로 포함됩니다.')
  }

  if (orbEvidenceScore < 55) {
    issues.push('각도·오브·허용오브 근거 밀도가 낮습니다.')
    recommendations.push('본문에 angle/orb/allowed 근거를 섹션당 최소 1세트 이상 명시하세요.')
  } else {
    strengths.push('각도·오브 근거가 실제 해석 문단에 반영됩니다.')
  }

  if (actionabilityScore < 60) {
    issues.push('실행 가능한 행동 가이드 밀도가 낮습니다.')
    recommendations.push('actionPlan 문장을 6문장 이상으로 늘리고, recommendations를 구체화하세요.')
  } else {
    strengths.push('행동 가이드가 실용적인 수준입니다.')
  }

  if (clarityScore < 70) {
    issues.push('문장 선명도 또는 길이가 부족합니다.')
    recommendations.push('섹션별 핵심 문장을 늘리고 placeholder 문구를 제거하세요.')
  } else {
    strengths.push('리포트 문장 가독성이 양호합니다.')
  }

  if (antiOverclaimScore < 70) {
    issues.push('과장/비약 가능성이 높은 단정 문장이 감지되었습니다.')
    recommendations.push(
      '단정 문장을 줄이고, 근거 표기(근거:) 또는 완충 표현(가능/경향)을 추가하세요.'
    )
  } else {
    strengths.push('과장/비약 리스크가 낮은 서술 패턴입니다.')
  }

  if (foreignSystemIssueCount > 0) {
    issues.push('사주/점성 외 해석 체계(예: 타로, 수비학 등) 언급이 감지되었습니다.')
    recommendations.push('사주·점성 근거만 사용하고 타 체계 용어를 제거하세요.')
  } else {
    strengths.push('사주·점성 외 체계 혼입이 감지되지 않았습니다.')
  }

  if (shouldBlock) {
    issues.push('과장/비약 리스크로 자동 차단 기준에 도달했습니다.')
    recommendations.push('근거 없는 절대 표현을 제거한 뒤 다시 생성하세요.')
  }

  if (recommendations.length === 0) {
    recommendations.push('현재 품질 점수 유지 위해 교차 근거와 실행 가이드의 균형을 유지하세요.')
  }

  return {
    completenessScore,
    crossEvidenceScore,
    orbEvidenceScore,
    actionabilityScore,
    clarityScore,
    antiOverclaimScore,
    foreignSystemIssueCount,
    foreignSystemFindings,
    overclaimIssueCount,
    overclaimFindings,
    shouldBlock,
    overallQualityScore,
    issues,
    strengths,
    recommendations,
  }
}

export function toQualityMarkdown(input: {
  reportId: string
  title: string
  createdAt: string
  quality: QualityAudit
}): string {
  const { reportId, title, createdAt, quality } = input
  return [
    '# Themed Report Quality Audit',
    '',
    `- Report ID: ${reportId}`,
    `- Title: ${title}`,
    `- Created At: ${createdAt}`,
    '',
    '## Scores',
    `- Overall: ${quality.overallQualityScore}/100`,
    `- Completeness: ${quality.completenessScore}/100`,
    `- Cross Evidence: ${quality.crossEvidenceScore}/100`,
    `- Orb Evidence: ${quality.orbEvidenceScore}/100`,
    `- Actionability: ${quality.actionabilityScore}/100`,
    `- Clarity: ${quality.clarityScore}/100`,
    `- Anti Overclaim: ${quality.antiOverclaimScore}/100`,
    `- Foreign System Issues: ${quality.foreignSystemIssueCount}`,
    `- Overclaim Issues: ${quality.overclaimIssueCount}`,
    `- Blocked: ${quality.shouldBlock ? 'YES' : 'NO'}`,
    ...(quality.overclaimFindings.length > 0
      ? [
          '- Overclaim Findings:',
          ...quality.overclaimFindings
            .slice(0, 5)
            .map((item) => `  - [${item.section}] (${item.reason}) ${item.sentence.slice(0, 120)}`),
        ]
      : []),
    '',
    '## Strengths',
    ...quality.strengths.map((item) => `- ${item}`),
    '',
    '## Issues',
    ...quality.issues.map((item) => `- ${item}`),
    '',
    '## Recommendations',
    ...quality.recommendations.map((item) => `- ${item}`),
    '',
  ].join('\n')
}

export function auditMatrixInputReadiness(
  input: MatrixCalculationInput
): MatrixInputReadinessAudit {
  const blockers: string[] = []
  const warnings: string[] = []

  if (!input.dayMasterElement) {
    blockers.push('dayMasterElement_missing')
  }

  const timingAnchorCount = [
    input.currentDaeunElement,
    input.currentSaeunElement,
    input.currentWolunElement,
    input.currentIljinElement || input.currentIljinDate,
  ].filter(Boolean).length
  if (timingAnchorCount < 2) {
    warnings.push('timing_anchor_coverage_low')
  }

  const activeTransitCount = Array.isArray(input.activeTransits) ? input.activeTransits.length : 0
  if (activeTransitCount === 0 && !input.astroTimingIndex) {
    warnings.push('timing_transit_signal_missing')
  }

  const aspectCount = Array.isArray(input.aspects) ? input.aspects.length : 0
  if (aspectCount === 0) {
    warnings.push('aspect_coverage_empty')
  }

  const relationCount = Array.isArray(input.relations) ? input.relations.length : 0
  if (relationCount === 0) {
    warnings.push('relation_coverage_empty')
  }

  const planetHouseCount = input.planetHouses ? Object.keys(input.planetHouses).length : 0
  if (planetHouseCount < 3) {
    warnings.push('planet_house_coverage_low')
  }

  if (input.currentIljinDate && !isValidIsoDate(input.currentIljinDate)) {
    blockers.push('currentIljinDate_invalid_iso')
  }

  if (input.currentDateIso && !isValidIsoDate(input.currentDateIso)) {
    blockers.push('currentDateIso_invalid_iso')
  }

  const astroTiming = input.astroTimingIndex
  if (astroTiming) {
    const values = [
      astroTiming.decade,
      astroTiming.annual,
      astroTiming.monthly,
      astroTiming.daily,
      astroTiming.confidence,
    ]
    if (
      values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
      !Number.isFinite(astroTiming.evidenceCount) ||
      astroTiming.evidenceCount < 0
    ) {
      blockers.push('astroTimingIndex_out_of_range')
    } else if (
      astroTiming.evidenceCount === 0 &&
      (astroTiming.decade > 0 ||
        astroTiming.annual > 0 ||
        astroTiming.monthly > 0 ||
        astroTiming.daily > 0)
    ) {
      warnings.push('astroTimingIndex_evidence_inconsistent')
    }
  }

  const hasSnapshots = {
    saju: !!input.sajuSnapshot && Object.keys(input.sajuSnapshot).length > 0,
    astrology: !!input.astrologySnapshot && Object.keys(input.astrologySnapshot).length > 0,
    cross: !!input.crossSnapshot && Object.keys(input.crossSnapshot).length > 0,
  }
  if (!hasSnapshots.saju || !hasSnapshots.astrology || !hasSnapshots.cross) {
    warnings.push('snapshot_coverage_partial')
  }

  const score = clamp100(100 - blockers.length * 35 - warnings.length * 7)
  return {
    score,
    ready: blockers.length === 0,
    blockers,
    warnings,
    metrics: {
      timingAnchorCount,
      activeTransitCount,
      aspectCount,
      relationCount,
      planetHouseCount,
      hasAstroTimingIndex: !!input.astroTimingIndex,
      hasSnapshots,
    },
  }
}

export function buildCalculationDetails(input: {
  matrixInput: MatrixCalculationInput
  timingData: TimingData
  matrixSummary?: MatrixSummary
  layerResults: Record<string, Record<string, MatrixCell>>
  topInsights?: Array<Record<string, unknown>>
  profileContext?: Record<string, unknown>
}): CalculationDetails {
  const { matrixInput, timingData, matrixSummary, layerResults, topInsights, profileContext } =
    input

  const sajuSnapshot: Record<string, unknown> = {
    dayMasterElement: matrixInput.dayMasterElement,
    pillarElements: matrixInput.pillarElements,
    sibsinDistribution: matrixInput.sibsinDistribution,
    twelveStages: matrixInput.twelveStages,
    relations: matrixInput.relations,
    geokguk: matrixInput.geokguk,
    yongsin: matrixInput.yongsin,
    currentDaeunElement: matrixInput.currentDaeunElement,
    currentSaeunElement: matrixInput.currentSaeunElement,
    currentWolunElement: matrixInput.currentWolunElement,
    currentIljinElement: matrixInput.currentIljinElement,
    currentIljinDate: matrixInput.currentIljinDate,
    shinsalList: matrixInput.shinsalList,
  }

  const astrologySnapshot: Record<string, unknown> = {
    dominantWesternElement: matrixInput.dominantWesternElement,
    planetHouses: matrixInput.planetHouses,
    planetSigns: matrixInput.planetSigns,
    aspects: matrixInput.aspects,
    activeTransits: matrixInput.activeTransits,
    asteroidHouses: matrixInput.asteroidHouses,
    extraPointSigns: matrixInput.extraPointSigns,
  }

  return {
    inputSnapshot: {
      profile:
        profileContext ||
        (matrixInput.profileContext ? { ...matrixInput.profileContext } : undefined),
      saju: sajuSnapshot,
      astrology: astrologySnapshot,
    },
    timingData,
    matrixSummary,
    layerResults,
    topInsightsWithSources: (topInsights || []).map((insight) => ({
      title: typeof insight.title === 'string' ? insight.title : undefined,
      description: typeof insight.description === 'string' ? insight.description : undefined,
      category: typeof insight.category === 'string' ? insight.category : undefined,
      score: typeof insight.score === 'number' ? insight.score : undefined,
      sources: Array.isArray(insight.sources) ? insight.sources : [],
    })),
  }
}
