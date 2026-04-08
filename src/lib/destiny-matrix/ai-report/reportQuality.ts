import { recordGauge } from '@/lib/metrics'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type {
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
  UnifiedTimelineEvent,
} from './types'

export interface ReportQualityMetrics {
  sectionCount: number
  avgSectionChars: number
  evidenceCoverageRatio: number
  minEvidenceSatisfiedRatio: number
  contradictionCount: number
  recheckGuidanceRatio: number
  overclaimCount: number
  coreQualityScore?: number
  coreQualityGrade?: 'A' | 'B' | 'C' | 'D'
  coreQualityWarningCount?: number
  coreQualityWarnings?: string[]
  coreQualityBlockingWarningCount?: number
  coreQualityBlockingWarnings?: string[]
  coreQualityPass?: boolean
  sectionCompletenessRate?: number
  avgEvidencePerParagraph?: number
  anchorCoverageRate?: number
  scenarioBundleCoverage?: number
  eventCountByDomain?: Record<string, number>
  tokenIntegrityPass?: boolean
  structurePass?: boolean
  forbiddenAdditionsPass?: boolean
  crossSectionRepetition?: number
  genericAdviceDensity?: number
  personalizationDensity?: number
  internalScenarioLeakCount?: number
  repetitiveLeadPatternCount?: number
  abstractNounRatio?: number
  sentenceLengthVariance?: number
  bilingualToneSkew?: number
}

export interface ReportQualityContext {
  requiredPaths?: string[]
  requiredHeadingsByPath?: Record<string, string[]>
  claims?: UnifiedClaim[]
  anchors?: UnifiedAnchor[]
  scenarioBundles?: UnifiedScenarioBundle[]
  timelineEvents?: UnifiedTimelineEvent[]
  coreQuality?: {
    score: number
    grade: 'A' | 'B' | 'C' | 'D'
    warnings: string[]
  }
}

type BuildQualityRegexRules = {
  recheck: RegExp
  absoluteRisk: RegExp
  irreversibleAction: RegExp
  cautionIndicator: RegExp
  immediateForce: RegExp
  mitigation: RegExp
  recommendationTone: RegExp
}

type BuildQualityParams = {
  sections: Record<string, unknown>
  sectionPaths: string[]
  evidenceRefs: SectionEvidenceRefs
  context?: ReportQualityContext
  minEvidenceRefsPerSection: number
  regex: BuildQualityRegexRules
  hasEvidenceSupport: (text: string, refs: ReportEvidenceRef[]) => boolean
  forbiddenAdditionsPass: boolean
}

const OBSERVATIONAL_CORE_QUALITY_WARNINGS = new Set([
  // Ambiguity can be acceptable when branches and action-first framing remain clear.
  'focus_domain_ambiguity_high',
  'top_scenario_gap_low',
  'top_decision_gap_low',
  'scenario_cluster_compression_high',
  // These indicate supporting-signal thinness, not a broken report by themselves.
  'verification_bias_active',
  'advanced_astro_signal_coverage_low',
  'shinsal_signal_coverage_low',
  'timing_signal_coverage_low',
])

function getPathText(sections: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = sections
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  if (typeof cur === 'string') return cur
  if (Array.isArray(cur)) return cur.map((v) => String(v)).join(' ')
  return ''
}

function looksLikeEncodingIssue(text: string): boolean {
  if (!text) return false
  if (text.includes('\uFFFD')) return true
  if (/\?\?\?+/.test(text)) return true
  return /(?:\u00c3.|\u00c2.|\u00ec.|\u00ed.|\u00eb.|\u00ea.){2,}/u.test(text)
}

function hasRequiredHeadings(
  sections: Record<string, unknown>,
  requiredHeadingsByPath: Record<string, string[]>
): boolean {
  for (const [path, headings] of Object.entries(requiredHeadingsByPath)) {
    const text = getPathText(sections, path)
    if (!text) return false
    for (const heading of headings) {
      if (!text.includes(heading)) return false
    }
  }
  return true
}

function toSentenceKeys(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map((segment) =>
      String(segment || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
    )
    .filter((segment) => segment.length >= 18)
}

function countRepeatedSentences(texts: Array<{ path: string; text: string }>): number {
  const seen = new Map<string, Set<string>>()
  for (const item of texts) {
    for (const key of toSentenceKeys(item.text)) {
      const bucket = seen.get(key) || new Set<string>()
      bucket.add(item.path)
      seen.set(key, bucket)
    }
  }
  let repeated = 0
  for (const paths of seen.values()) {
    if (paths.size >= 2) repeated += 1
  }
  return repeated
}

function countRepeatedLeads(texts: Array<{ path: string; text: string }>): number {
  const seen = new Map<string, Set<string>>()
  for (const item of texts) {
    const lead = item.text.split(/\n+/)[0]?.trim().replace(/\s+/g, ' ').toLowerCase()
    if (!lead || lead.length < 12) continue
    const key = lead.slice(0, 48)
    const bucket = seen.get(key) || new Set<string>()
    bucket.add(item.path)
    seen.set(key, bucket)
  }
  let repeated = 0
  for (const paths of seen.values()) {
    if (paths.size >= 2) repeated += 1
  }
  return repeated
}

function buildStyleMetrics(texts: Array<{ path: string; text: string }>) {
  const joined = texts.map((item) => item.text).join(' ')
  const tokenCount = joined.split(/\s+/).filter(Boolean).length || 1
  const abstractRegex =
    /(구조|흐름|변수|기준|방향|운영|관계|조건|리듬|가능성|판단|과제|국면|구간|영역|장면)/g
  const abstractHits = (joined.match(abstractRegex) || []).length
  const sentences = joined
    .split(/[.!?\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const lengths = sentences.map((sentence) => sentence.length)
  const avg = lengths.reduce((sum, len) => sum + len, 0) / Math.max(1, lengths.length)
  const variance =
    lengths.reduce((sum, len) => sum + (len - avg) ** 2, 0) / Math.max(1, lengths.length)
  const englishWordCount = (joined.match(/[A-Za-z]{3,}/g) || []).length

  return {
    repetitiveLeadPatternCount: countRepeatedLeads(texts),
    abstractNounRatio: Number((abstractHits / tokenCount).toFixed(4)),
    sentenceLengthVariance: Number(variance.toFixed(2)),
    bilingualToneSkew: Number((englishWordCount / tokenCount).toFixed(4)),
  }
}

function countTimelineEventsByDomain(
  events: UnifiedTimelineEvent[] | undefined
): Record<string, number> {
  const out: Record<string, number> = {
    career: 0,
    love: 0,
    money: 0,
    health: 0,
    move: 0,
    timing: 0,
    life: 0,
  }
  for (const event of events || []) {
    if (event.type === 'job') out.career += 1
    else if (event.type === 'marriage' || event.type === 'relationship') out.love += 1
    else if (event.type === 'money') out.money += 1
    else if (event.type === 'health') out.health += 1
    else if (event.type === 'relocation') out.move += 1
    else if (event.type === 'timing') out.timing += 1
    else out.life += 1
  }
  return out
}

export function buildReportQualityMetrics(params: BuildQualityParams): ReportQualityMetrics {
  const {
    sections,
    sectionPaths,
    evidenceRefs,
    context = {},
    minEvidenceRefsPerSection,
    regex,
    hasEvidenceSupport,
    forbiddenAdditionsPass,
  } = params

  const texts = sectionPaths
    .map((path) => ({ path, text: getPathText(sections, path) }))
    .filter((item) => item.text.length > 0)
  const sectionCount = texts.length
  if (sectionCount === 0) {
    return {
      sectionCount: 0,
      avgSectionChars: 0,
      evidenceCoverageRatio: 0,
      minEvidenceSatisfiedRatio: 0,
      contradictionCount: 0,
      recheckGuidanceRatio: 0,
      overclaimCount: 0,
      sectionCompletenessRate: 0,
      avgEvidencePerParagraph: 0,
      anchorCoverageRate: 0,
      scenarioBundleCoverage: 0,
      eventCountByDomain: countTimelineEventsByDomain(context.timelineEvents),
      tokenIntegrityPass: false,
      structurePass: false,
      forbiddenAdditionsPass: false,
    }
  }

  const totalChars = texts.reduce((acc, item) => acc + item.text.length, 0)
  const evidenceCovered = texts.filter((item) => {
    const refs = evidenceRefs[item.path] || []
    return refs.length === 0 || hasEvidenceSupport(item.text, refs)
  }).length
  const minEvidenceSatisfied = texts.filter(
    (item) => (evidenceRefs[item.path] || []).length >= minEvidenceRefsPerSection
  ).length
  const recheckGuidanceCount = texts.filter((item) => regex.recheck.test(item.text)).length
  const overclaimCount = texts.filter((item) => regex.absoluteRisk.test(item.text)).length
  const contradictionCount = texts.filter((item) => {
    const sentences = item.text
      .split(/[.!?\n]+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
    return sentences.some((sentence) => {
      const hasIrreversible = regex.irreversibleAction.test(sentence)
      const hasCaution = regex.cautionIndicator.test(sentence)
      if (!(hasIrreversible && hasCaution)) return false
      const hasRecommendationTone = regex.recommendationTone.test(sentence)
      if (!hasRecommendationTone) return false
      if (regex.mitigation.test(sentence)) return false
      return regex.immediateForce.test(sentence)
    })
  }).length

  const requiredPaths =
    context.requiredPaths && context.requiredPaths.length > 0 ? context.requiredPaths : sectionPaths
  const requiredPresent = requiredPaths.filter(
    (path) => getPathText(sections, path).trim().length > 0
  ).length
  const evidenceCounts = requiredPaths.map((path) => (evidenceRefs[path] || []).length)
  const avgEvidencePerParagraph =
    evidenceCounts.length > 0
      ? Number(
          (
            evidenceCounts.reduce((sum, count) => sum + count, 0) /
            Math.max(1, evidenceCounts.length)
          ).toFixed(2)
        )
      : 0

  const claimsBySignalId = new Map<string, UnifiedClaim[]>()
  for (const claim of context.claims || []) {
    for (const signalId of claim.selectedSignalIds || []) {
      const list = claimsBySignalId.get(signalId) || []
      list.push(claim)
      claimsBySignalId.set(signalId, list)
    }
  }
  const anchorCoverageHit = requiredPaths.filter((path) => {
    const refs = evidenceRefs[path] || []
    const hasClaimAnchor = refs.some((ref) =>
      (claimsBySignalId.get(ref.id) || []).some((claim) => (claim.anchorIds || []).length > 0)
    )
    if (hasClaimAnchor) return true
    const lowerPath = path.toLowerCase()
    return (context.anchors || []).some((anchor) => {
      const section = String(anchor.section || '').toLowerCase()
      return section.includes(lowerPath) || lowerPath.includes(section)
    })
  }).length

  const expectedScenarioDomains: UnifiedScenarioBundle['domain'][] = [
    'career',
    'relationship',
    'wealth',
    'move',
  ]
  const presentScenarioDomains = new Set(
    (context.scenarioBundles || []).map((bundle) => bundle.domain)
  )
  const coveredExpectedScenarioDomains = expectedScenarioDomains.filter((domain) =>
    presentScenarioDomains.has(domain)
  ).length
  const tokenIntegrityPass = texts.every((item) => !looksLikeEncodingIssue(item.text))
  const headingPass = context.requiredHeadingsByPath
    ? hasRequiredHeadings(sections, context.requiredHeadingsByPath)
    : true
  const structurePass = requiredPresent === requiredPaths.length && headingPass
  const repeatedSentenceCount = countRepeatedSentences(texts)
  const genericAdviceRegex =
    /(기준을 .*정리|속도 .*조절|재확인|단계적 합의|확정보다|조건 확인|check conditions|recheck|staged commitment|slow down|clarify expectations)/i
  const genericAdviceHits = texts.reduce((sum, item) => {
    const matches = item.text.match(new RegExp(genericAdviceRegex.source, 'gi'))
    return sum + (matches ? matches.length : 0)
  }, 0)
  const personalizationRegex =
    /(일간|격국|용신|대운|세운|월운|행성|하우스|aspect|transit|solar return|lunar return|jupiter|saturn|retrograde|eclipse|신살|십성|12운성)/i
  const personalizationHits = texts.reduce((sum, item) => {
    const matches = item.text.match(new RegExp(personalizationRegex.source, 'gi'))
    return sum + (matches ? matches.length : 0)
  }, 0)
  const internalScenarioLeakRegex =
    /(hidden support|defensive|cluster|fallback|generic|alt window|_window|scenario id)/i
  const internalScenarioLeakCount = texts.filter((item) =>
    internalScenarioLeakRegex.test(item.text)
  ).length
  const styleMetrics = buildStyleMetrics(texts)
  const coreQualityScore =
    typeof context.coreQuality?.score === 'number' ? context.coreQuality.score : undefined
  const coreQualityGrade = context.coreQuality?.grade
  const coreQualityWarningCount = Array.isArray(context.coreQuality?.warnings)
    ? context.coreQuality.warnings.length
    : undefined
  const coreQualityWarnings = Array.isArray(context.coreQuality?.warnings)
    ? [...context.coreQuality.warnings]
    : undefined
  const coreQualityBlockingWarnings = Array.isArray(context.coreQuality?.warnings)
    ? context.coreQuality.warnings.filter(
        (warning) => !OBSERVATIONAL_CORE_QUALITY_WARNINGS.has(warning)
      )
    : undefined
  const coreQualityBlockingWarningCount = Array.isArray(coreQualityBlockingWarnings)
    ? coreQualityBlockingWarnings.length
    : undefined
  const coreQualityPass =
    typeof coreQualityScore === 'number' && typeof coreQualityBlockingWarningCount === 'number'
      ? coreQualityScore >= 90 && coreQualityBlockingWarningCount === 0
      : undefined

  return {
    sectionCount,
    avgSectionChars: Math.round(totalChars / Math.max(1, sectionCount)),
    evidenceCoverageRatio: Number((evidenceCovered / sectionCount).toFixed(4)),
    minEvidenceSatisfiedRatio: Number((minEvidenceSatisfied / sectionCount).toFixed(4)),
    contradictionCount,
    recheckGuidanceRatio: Number((recheckGuidanceCount / sectionCount).toFixed(4)),
    overclaimCount,
    coreQualityScore,
    coreQualityGrade,
    coreQualityWarningCount,
    coreQualityWarnings,
    coreQualityBlockingWarningCount,
    coreQualityBlockingWarnings,
    coreQualityPass,
    sectionCompletenessRate: Number(
      (requiredPresent / Math.max(1, requiredPaths.length)).toFixed(4)
    ),
    avgEvidencePerParagraph,
    anchorCoverageRate: Number((anchorCoverageHit / Math.max(1, requiredPaths.length)).toFixed(4)),
    scenarioBundleCoverage: Number(
      (coveredExpectedScenarioDomains / Math.max(1, expectedScenarioDomains.length)).toFixed(4)
    ),
    eventCountByDomain: countTimelineEventsByDomain(context.timelineEvents),
    tokenIntegrityPass,
    structurePass,
    forbiddenAdditionsPass,
    crossSectionRepetition: repeatedSentenceCount,
    genericAdviceDensity: Number((genericAdviceHits / Math.max(1, sectionCount)).toFixed(4)),
    personalizationDensity: Number((personalizationHits / Math.max(1, sectionCount)).toFixed(4)),
    internalScenarioLeakCount,
    ...styleMetrics,
  }
}

export function recordReportQualityMetrics(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  quality: ReportQualityMetrics,
  stage: 'draft' | 'final' = 'final'
) {
  const labels = { report_type: reportType, model_used: modelUsed, stage }
  recordGauge(
    'destiny.ai_report.quality.evidence_coverage_ratio',
    quality.evidenceCoverageRatio,
    labels
  )
  recordGauge(
    'destiny.ai_report.quality.min_evidence_satisfied_ratio',
    quality.minEvidenceSatisfiedRatio,
    labels
  )
  recordGauge(
    'destiny.ai_report.quality.recheck_guidance_ratio',
    quality.recheckGuidanceRatio,
    labels
  )
  recordGauge('destiny.ai_report.quality.avg_section_chars', quality.avgSectionChars, labels)
  recordGauge('destiny.ai_report.quality.contradiction_count', quality.contradictionCount, labels)
  recordGauge('destiny.ai_report.quality.overclaim_count', quality.overclaimCount, labels)
  if (typeof quality.sectionCompletenessRate === 'number') {
    recordGauge(
      'destiny.ai_report.quality.section_completeness_rate',
      quality.sectionCompletenessRate,
      labels
    )
  }
  if (typeof quality.avgEvidencePerParagraph === 'number') {
    recordGauge(
      'destiny.ai_report.quality.avg_evidence_per_paragraph',
      quality.avgEvidencePerParagraph,
      labels
    )
  }
  if (typeof quality.anchorCoverageRate === 'number') {
    recordGauge(
      'destiny.ai_report.quality.anchor_coverage_rate',
      quality.anchorCoverageRate,
      labels
    )
  }
  if (typeof quality.scenarioBundleCoverage === 'number') {
    recordGauge(
      'destiny.ai_report.quality.scenario_bundle_coverage',
      quality.scenarioBundleCoverage,
      labels
    )
  }
  if (quality.eventCountByDomain) {
    for (const [domain, count] of Object.entries(quality.eventCountByDomain)) {
      recordGauge('destiny.ai_report.quality.event_count_by_domain', count, {
        ...labels,
        domain,
      })
    }
  }
  if (typeof quality.tokenIntegrityPass === 'boolean') {
    recordGauge(
      'destiny.ai_report.quality.token_integrity_pass',
      quality.tokenIntegrityPass ? 1 : 0,
      labels
    )
  }
  if (typeof quality.structurePass === 'boolean') {
    recordGauge('destiny.ai_report.quality.structure_pass', quality.structurePass ? 1 : 0, labels)
  }
  if (typeof quality.forbiddenAdditionsPass === 'boolean') {
    recordGauge(
      'destiny.ai_report.quality.forbidden_additions_pass',
      quality.forbiddenAdditionsPass ? 1 : 0,
      labels
    )
  }
  if (typeof quality.crossSectionRepetition === 'number') {
    recordGauge(
      'destiny.ai_report.quality.cross_section_repetition',
      quality.crossSectionRepetition,
      labels
    )
  }
  if (typeof quality.genericAdviceDensity === 'number') {
    recordGauge(
      'destiny.ai_report.quality.generic_advice_density',
      quality.genericAdviceDensity,
      labels
    )
  }
  if (typeof quality.personalizationDensity === 'number') {
    recordGauge(
      'destiny.ai_report.quality.personalization_density',
      quality.personalizationDensity,
      labels
    )
  }
  if (typeof quality.internalScenarioLeakCount === 'number') {
    recordGauge(
      'destiny.ai_report.quality.internal_scenario_leak_count',
      quality.internalScenarioLeakCount,
      labels
    )
  }
  if (typeof quality.repetitiveLeadPatternCount === 'number') {
    recordGauge(
      'destiny.ai_report.quality.repetitive_lead_pattern_count',
      quality.repetitiveLeadPatternCount,
      labels
    )
  }
  if (typeof quality.abstractNounRatio === 'number') {
    recordGauge('destiny.ai_report.quality.abstract_noun_ratio', quality.abstractNounRatio, labels)
  }
  if (typeof quality.sentenceLengthVariance === 'number') {
    recordGauge(
      'destiny.ai_report.quality.sentence_length_variance',
      quality.sentenceLengthVariance,
      labels
    )
  }
  if (typeof quality.bilingualToneSkew === 'number') {
    recordGauge('destiny.ai_report.quality.bilingual_tone_skew', quality.bilingualToneSkew, labels)
  }
  if (typeof quality.coreQualityScore === 'number') {
    recordGauge('destiny.ai_report.quality.core_quality_score', quality.coreQualityScore, labels)
  }
  if (typeof quality.coreQualityWarningCount === 'number') {
    recordGauge(
      'destiny.ai_report.quality.core_quality_warning_count',
      quality.coreQualityWarningCount,
      labels
    )
  }
  if (typeof quality.coreQualityPass === 'boolean') {
    recordGauge(
      'destiny.ai_report.quality.core_quality_pass',
      quality.coreQualityPass ? 1 : 0,
      labels
    )
  }
  if (quality.coreQualityGrade) {
    const gradeScoreMap: Record<'A' | 'B' | 'C' | 'D', number> = { A: 4, B: 3, C: 2, D: 1 }
    recordGauge(
      'destiny.ai_report.quality.core_quality_grade_score',
      gradeScoreMap[quality.coreQualityGrade],
      labels
    )
  }
}
