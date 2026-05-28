import type { FusionInsight, FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { EvidenceBundle } from './structuredEvidence'
import { detectQuestionIntent } from './questionIntent'
import { getDeterministicCoreWeights, type DeterministicProfile } from './deterministicCoreConfig'
import { clamp } from '@/lib/utils/math'

export type DeterministicVerdict = 'GO' | 'DELAY' | 'NO'

export interface DeterministicCoverage {
  saju: {
    hasDayMaster: boolean
    pillarElementCount: number
    sibsinKeys: number
    relationCount: number
    hasGeokguk: boolean
    hasYongsin: boolean
    hasDaeun: boolean
    hasSaeun: boolean
    hasWolun: boolean
    hasIljin: boolean
    shinsalCount: number
    snapshotKeys: number
  }
  astrology: {
    planetHouseCount: number
    planetSignCount: number
    aspectCount: number
    aspectsWithOrb: number
    aspectsWithAngle: number
    hasDominantElement: boolean
    asteroidHouseCount: number
    extraPointCount: number
    activeTransitCount: number
    snapshotKeys: number
  }
  cross: {
    graphAnchorCount: number
    graphSetCount: number
    topInsightCount: number
    driverCount: number
    cautionCount: number
    domainScoreCount: number
    snapshotKeys: number
    hasCurrentDateIso: boolean
    currentDateIso?: string
  }
}

export interface DeterministicDecision {
  enabled: boolean
  verdict: DeterministicVerdict
  score: number
  confidence: number
  reasons: string[]
  blockers: string[]
}

export interface DeterministicBlockEvidenceRef {
  claimIds: string[]
  signalIds: string[]
  anchorIds: string[]
}

export interface DeterministicSectionBlock {
  blockId: string
  paraId: string
  heading: string
  bullets: string[]
  mustKeepTokens: string[]
  evidence: DeterministicBlockEvidenceRef
}

export interface DeterministicCoreArtifacts {
  mappingRulebook?: Record<string, unknown>
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
  scenarioBundles?: Array<{
    id: string
    domain: string
    mainTokens: string[]
    altTokens: string[][]
  }>
  evidenceLinks?: Array<{
    id: string
    signalId: string
    claimIds: string[]
    anchorId?: string
    setIds: string[]
    score: number
  }>
  timelinePriority?: 'life_first' | 'default'
}

export interface DeterministicCoreOutput {
  profile: DeterministicProfile
  coverage: DeterministicCoverage
  decision: DeterministicDecision
  promptBlock: string
  artifacts?: DeterministicCoreArtifacts
}

function round(value: number): number {
  return Math.round(value)
}

function countInsightsByCategory(
  report: FusionReport,
  categories: FusionInsight['category'][]
): number {
  return Array.isArray(report.topInsights)
    ? report.topInsights.filter((insight) => categories.includes(insight.category)).length
    : 0
}

function buildCoverage(
  input: MatrixCalculationInput,
  report: FusionReport,
  graph?: EvidenceBundle
): DeterministicCoverage {
  const aspects = Array.isArray(input.aspects) ? input.aspects : []
  const anchors = graph?.anchors || []
  const setCount = anchors.reduce((sum, a) => sum + (a.crossEvidenceSets || []).length, 0)

  return {
    saju: {
      hasDayMaster: ['목', '화', '토', '금', '수'].includes(input.dayMasterElement),
      pillarElementCount: Array.isArray(input.pillarElements) ? input.pillarElements.length : 0,
      sibsinKeys: Object.keys(input.sibsinDistribution || {}).length,
      relationCount: Array.isArray(input.relations) ? input.relations.length : 0,
      hasGeokguk: !!input.geokguk,
      hasYongsin: !!input.yongsin,
      hasDaeun: !!input.currentDaeunElement,
      hasSaeun: !!input.currentSaeunElement,
      hasWolun: !!input.currentWolunElement,
      hasIljin: !!input.currentIljinElement || !!input.currentIljinDate,
      shinsalCount: Array.isArray(input.shinsalList) ? input.shinsalList.length : 0,
      snapshotKeys: Object.keys(input.sajuSnapshot || {}).length,
    },
    astrology: {
      planetHouseCount: Object.keys(input.planetHouses || {}).length,
      planetSignCount: Object.keys(input.planetSigns || {}).length,
      aspectCount: aspects.length,
      aspectsWithOrb: aspects.filter((a) => typeof a.orb === 'number').length,
      aspectsWithAngle: aspects.filter((a) => typeof a.angle === 'number').length,
      hasDominantElement: !!input.dominantWesternElement,
      asteroidHouseCount: Object.keys(input.asteroidHouses || {}).length,
      extraPointCount: Object.keys(input.extraPointSigns || {}).length,
      activeTransitCount: Array.isArray(input.activeTransits) ? input.activeTransits.length : 0,
      snapshotKeys: Object.keys(input.astrologySnapshot || {}).length,
    },
    cross: {
      graphAnchorCount: anchors.length,
      graphSetCount: setCount,
      topInsightCount: Array.isArray(report.topInsights) ? report.topInsights.length : 0,
      driverCount: countInsightsByCategory(report, ['strength']),
      cautionCount: countInsightsByCategory(report, ['caution', 'challenge']),
      domainScoreCount: Object.keys(report.domainAnalysis || {}).length,
      snapshotKeys: Object.keys(input.crossSnapshot || {}).length,
      hasCurrentDateIso: !!input.currentDateIso,
      currentDateIso: input.currentDateIso,
    },
  }
}

function buildDecision(
  input: MatrixCalculationInput,
  report: FusionReport,
  coverage: DeterministicCoverage,
  userQuestion: string | undefined,
  profile: DeterministicProfile
): DeterministicDecision {
  const w = getDeterministicCoreWeights(profile)
  const intent = detectQuestionIntent(userQuestion)
  if (intent !== 'binary_decision') {
    return {
      enabled: false,
      verdict: 'DELAY',
      score: 0,
      confidence: 0,
      reasons: [],
      blockers: [],
    }
  }

  let score = w.baseScore
  const reasons: string[] = []
  const blockers: string[] = []

  if (input.yongsin && input.currentSaeunElement && input.yongsin === input.currentSaeunElement) {
    score += w.yongsinMatchBonus
    reasons.push(`세운(${input.currentSaeunElement})이 용신(${input.yongsin})과 일치`)
  } else if (input.yongsin && input.currentSaeunElement) {
    score -= w.yongsinMismatchPenalty
    reasons.push(`세운(${input.currentSaeunElement})과 용신(${input.yongsin}) 불일치`)
  }

  if (input.yongsin && input.currentWolunElement && input.yongsin === input.currentWolunElement) {
    score += Math.round(w.yongsinMatchBonus * 0.5)
    reasons.push(`월운(${input.currentWolunElement})이 용신(${input.yongsin})과 일치`)
  } else if (input.yongsin && input.currentWolunElement) {
    score -= Math.round(w.yongsinMismatchPenalty * 0.5)
    reasons.push(`월운(${input.currentWolunElement})과 용신(${input.yongsin}) 불일치`)
  }

  if (input.yongsin && input.currentIljinElement && input.yongsin === input.currentIljinElement) {
    score += Math.round(w.yongsinMatchBonus * 0.3)
    reasons.push(`일진(${input.currentIljinElement})이 용신(${input.yongsin})과 일치`)
  } else if (input.yongsin && input.currentIljinElement) {
    score -= Math.round(w.yongsinMismatchPenalty * 0.3)
    reasons.push(`일진(${input.currentIljinElement})과 용신(${input.yongsin}) 불일치`)
  }

  if (input.currentDaeunElement) {
    score += w.daeunPresentBonus
    reasons.push(`대운 오행(${input.currentDaeunElement}) 데이터 반영`)
  } else {
    reasons.push('대운 데이터 누락으로 신뢰도 보수 적용')
  }
  if (input.currentWolunElement) {
    score += Math.max(1, Math.round(w.daeunPresentBonus * 0.5))
    reasons.push(`월운 오행(${input.currentWolunElement}) 데이터 반영`)
  }
  if (input.currentIljinElement || input.currentIljinDate) {
    score += 1
    reasons.push(
      `일진 데이터(${input.currentIljinElement || 'element:N/A'}${input.currentIljinDate ? ` @${input.currentIljinDate}` : ''}) 반영`
    )
  }

  if (coverage.cross.graphAnchorCount >= w.graphAnchorTarget) score += w.graphAnchorBonus
  else blockers.push('교차 근거 앵커 부족')

  if (coverage.cross.graphSetCount >= coverage.cross.graphAnchorCount)
    score += w.graphSetDensityBonus
  else blockers.push('교차 근거 세트 밀도 부족')

  if (coverage.astrology.aspectCount >= w.aspectCountTarget) score += w.aspectCountBonus
  else score -= w.aspectCountPenalty

  if (coverage.saju.relationCount >= w.relationCountTarget) score += w.relationCountBonus
  if (coverage.saju.shinsalCount >= w.shinsalCountTarget) score += w.shinsalCountBonus

  const cautionCount = countInsightsByCategory(report, ['caution', 'challenge'])
  if (cautionCount >= w.cautionPenaltyThreshold) {
    score -= w.cautionPenalty
    reasons.push(`주의 신호 ${cautionCount}개 감점`)
  }

  if (!input.profileContext?.birthDate || !input.profileContext?.birthTime) {
    blockers.push('출생시각/날짜 맥락 불완전')
    score -= w.missingProfilePenalty
  }

  score = clamp(score, 0, 100)
  let verdict: DeterministicVerdict = 'DELAY'
  if (score >= w.goThreshold && blockers.length === 0) verdict = 'GO'
  else if (score < w.noThreshold) verdict = 'NO'

  const confidence = clamp(
    round(
      (coverage.saju.pillarElementCount >= 4 ? 25 : 10) +
        (coverage.astrology.planetHouseCount >= 7 ? 25 : 10) +
        (coverage.cross.graphAnchorCount >= 6 ? 30 : 12) +
        (blockers.length === 0 ? 20 : 8)
    ),
    0,
    100
  )

  return {
    enabled: true,
    verdict,
    score: round(score),
    confidence,
    reasons,
    blockers,
  }
}

function formatPromptBlock(core: DeterministicCoreOutput, lang: 'ko' | 'en'): string {
  const c = core.coverage
  const d = core.decision

  if (lang === 'ko') {
    return [
      '## Deterministic Core (모든 데이터 통합)',
      `- Profile: ${core.profile}`,
      `- SAJU coverage: dayMaster=${c.saju.hasDayMaster}, pillars=${c.saju.pillarElementCount}, sibsinKeys=${c.saju.sibsinKeys}, relations=${c.saju.relationCount}, geokguk=${c.saju.hasGeokguk}, yongsin=${c.saju.hasYongsin}, daeun=${c.saju.hasDaeun}, saeun=${c.saju.hasSaeun}, shinsal=${c.saju.shinsalCount}, sajuSnapshotKeys=${c.saju.snapshotKeys}`,
      `- ASTRO coverage: planetHouses=${c.astrology.planetHouseCount}, planetSigns=${c.astrology.planetSignCount}, aspects=${c.astrology.aspectCount}, orb=${c.astrology.aspectsWithOrb}, angle=${c.astrology.aspectsWithAngle}, dominantElement=${c.astrology.hasDominantElement}, asteroids=${c.astrology.asteroidHouseCount}, extraPoints=${c.astrology.extraPointCount}, activeTransits=${c.astrology.activeTransitCount}, astroSnapshotKeys=${c.astrology.snapshotKeys}`,
      `- CROSS coverage: anchors=${c.cross.graphAnchorCount}, sets=${c.cross.graphSetCount}, topInsights=${c.cross.topInsightCount}, drivers=${c.cross.driverCount}, cautions=${c.cross.cautionCount}, domainScores=${c.cross.domainScoreCount}, crossSnapshotKeys=${c.cross.snapshotKeys}, hasCurrentDateIso=${c.cross.hasCurrentDateIso}, currentDate=${c.cross.currentDateIso || '-'}`,
      d.enabled
        ? `- DECISION: verdict=${d.verdict}, score=${d.score}, confidence=${d.confidence}, reasons=${d.reasons.join(' | ') || '-'}, blockers=${d.blockers.join(' | ') || '-'}`
        : '- DECISION: n/a (비결정형 질문)',
      '- 작성 강제: 모든 핵심 섹션에서 사주근거 + 점성근거 + 교차결론 + 실행문장을 반드시 포함.',
    ].join('\n')
  }

  return [
    '## Deterministic Core (all-data synthesis)',
    `- Profile: ${core.profile}`,
    `- SAJU coverage: dayMaster=${c.saju.hasDayMaster}, pillars=${c.saju.pillarElementCount}, sibsinKeys=${c.saju.sibsinKeys}, relations=${c.saju.relationCount}, geokguk=${c.saju.hasGeokguk}, yongsin=${c.saju.hasYongsin}, daeun=${c.saju.hasDaeun}, saeun=${c.saju.hasSaeun}, shinsal=${c.saju.shinsalCount}, sajuSnapshotKeys=${c.saju.snapshotKeys}`,
    `- ASTRO coverage: planetHouses=${c.astrology.planetHouseCount}, planetSigns=${c.astrology.planetSignCount}, aspects=${c.astrology.aspectCount}, orb=${c.astrology.aspectsWithOrb}, angle=${c.astrology.aspectsWithAngle}, dominantElement=${c.astrology.hasDominantElement}, asteroids=${c.astrology.asteroidHouseCount}, extraPoints=${c.astrology.extraPointCount}, activeTransits=${c.astrology.activeTransitCount}, astroSnapshotKeys=${c.astrology.snapshotKeys}`,
    `- CROSS coverage: anchors=${c.cross.graphAnchorCount}, sets=${c.cross.graphSetCount}, topInsights=${c.cross.topInsightCount}, drivers=${c.cross.driverCount}, cautions=${c.cross.cautionCount}, domainScores=${c.cross.domainScoreCount}, crossSnapshotKeys=${c.cross.snapshotKeys}, hasCurrentDateIso=${c.cross.hasCurrentDateIso}, currentDate=${c.cross.currentDateIso || '-'}`,
    d.enabled
      ? `- DECISION: verdict=${d.verdict}, score=${d.score}, confidence=${d.confidence}, reasons=${d.reasons.join(' | ') || '-'}, blockers=${d.blockers.join(' | ') || '-'}`
      : '- DECISION: n/a (non-binary question)',
    '- Hard rule: every core section must include Saju basis + Astrology basis + cross conclusion + action step.',
  ].join('\n')
}

export function buildDeterministicCore(input: {
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  graphEvidence?: EvidenceBundle
  userQuestion?: string
  lang: 'ko' | 'en'
  profile?: DeterministicProfile
}): DeterministicCoreOutput {
  const profile = input.profile || 'balanced'
  const coverage = buildCoverage(input.matrixInput, input.matrixReport, input.graphEvidence)
  const decision = buildDecision(
    input.matrixInput,
    input.matrixReport,
    coverage,
    input.userQuestion,
    profile
  )
  const base: DeterministicCoreOutput = {
    profile,
    coverage,
    decision,
    promptBlock: '',
  }
  return {
    ...base,
    promptBlock: formatPromptBlock(base, input.lang),
  }
}
