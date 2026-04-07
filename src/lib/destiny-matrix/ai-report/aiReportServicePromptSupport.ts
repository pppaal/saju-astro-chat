import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type { ReportTheme } from './types'
import type { SignalDomain, SignalSynthesisResult } from './signalSynthesizer'
import type { StrategyEngineResult } from './strategyEngine'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import type { GraphRAGEvidenceAnchor, GraphRAGCrossEvidenceSet } from './graphRagEvidence'
import { summarizeGraphRAGEvidence } from './graphRagEvidence'
import {
  findReportCoreAdvisory,
  findReportCoreManifestation,
  findReportCoreTimingWindow,
  findReportCoreVerdict,
} from './reportCoreHelpers'
import { localizeReportNarrativeText } from './reportTextHelpers'
import {
  dedupeNarrativeSentences,
  sanitizeSectionNarrative,
  sanitizeUserFacingNarrative,
} from './reportNarrativeSanitizer'
import { splitSentences } from './sectionQualityGate'
import { buildSynthesisFactsForSection, getDomainsForSection } from './signalSynthesizer'
import { resolveSignalDomain } from './reportEvidenceSupport'
import {
  buildManifestationNarrative,
  buildTimingWindowNarrative,
  buildVerdictNarrative,
} from './aiReportServiceNarrativeSupport'
import {
  describeExecutionStance,
  describePhaseFlow,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'

const SECTION_CONCRETE_NOUNS: Record<keyof AIPremiumReport['sections'], string[]> = {
  introduction: ['상황', '기준', '흐름', '판', '기회', '관계선'],
  personalityDeep: ['성향', '습관', '반응', '기준', '선택방식', '운영'],
  careerPath: ['역할', '책임', '평가', '프로젝트', '직무 범위', '성과 기준'],
  relationshipDynamics: ['대화', '거리', '속도', '경계', '신뢰', '합의'],
  spouseProfile: ['생활', '리듬', '책임', '속도', '기준', '배려'],
  wealthPotential: ['현금', '지출', '손익분기', '계약 조건', '기한', '비용'],
  healthGuidance: ['수면', '회복', '리듬', '식사', '에너지', '경고'],
  lifeMission: ['방향', '역할', '기준', '가치', '목표', '삶의 축'],
  lifeStages: ['초년', '청년', '중년', '노년', '전환점', '패턴'],
  turningPoints: ['계약', '이직', '관계', '이동', '돈', '변곡점'],
  futureOutlook: ['계획', '조건', '시도', '전략', '선택', '판단'],
  timingAdvice: ['시기', '1~3개월', '창', '리듬', '속도', '검토'],
  actionPlan: ['순서', '행동', '단계', '확인절차', '중간점검', '기준'],
  conclusion: ['결론', '승부처', '핵심', '방향', '기준', '순서'],
}

const REPETITIVE_OPENER_REGEX = /^(?:결론부터 말하면|요약하면|핵심은)\b/

const SECTION_OPENERS_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 먼저 읽어야 할 흐름부터 정리하겠습니다.',
  personalityDeep: '이 사람의 기본 운영 방식부터 보겠습니다.',
  careerPath: '커리어에서는 무엇을 먼저 고정해야 하는지가 중요합니다.',
  relationshipDynamics: '관계에서는 거리와 속도를 맞추는 문제가 먼저 보입니다.',
  spouseProfile: '오래 가는 관계의 조건부터 짚어보겠습니다.',
  wealthPotential: '재정은 숫자보다 조건 관리가 먼저 보입니다.',
  healthGuidance: '건강은 버티는 힘보다 회복 구조가 중요합니다.',
  lifeMission: '삶의 방향은 추상적 사명보다 실제 역할에서 드러납니다.',
  lifeStages: '인생 단계는 한 번의 사건보다 반복 패턴으로 읽는 편이 정확합니다.',
  turningPoints: '변곡점은 어디서 판이 바뀌는지로 읽어야 합니다.',
  futureOutlook: '앞으로 3~5년은 어떤 기준을 반복 가능한 구조로 만드는지가 핵심입니다.',
  timingAdvice: '타이밍은 속도보다 순서를 먼저 보는 편이 맞습니다.',
  actionPlan: '실행은 한 번의 결단보다 단계별 점검이 더 중요합니다.',
  conclusion: '마지막으로 지금 승부처를 한 줄로 정리하겠습니다.',
}

export interface GraphRagSummaryPayload {
  topInsights: string[]
  drivers: string[]
  cautions: string[]
  trust: {
    avgOverlapScore: number
    avgOrbFitScore: number
    highTrustSetCount: number
    lowTrustSetCount: number
    totalSets: number
  }
  cautionSections: string[]
}

export function isComprehensiveSectionsPayload(
  value: unknown,
  comprehensiveSectionKeys: readonly (keyof AIPremiumReport['sections'])[]
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return comprehensiveSectionKeys.every((key) => typeof record[key] === 'string')
}

function normalizeSentenceKey(sentence: string): string {
  return sentence
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

export function postProcessSectionNarrative(
  text: string,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  const base = sanitizeSectionNarrative(text)
  if (!base) return base
  const sentences = splitSentences(base)
  if (sentences.length === 0) return base
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const sentence of sentences) {
    const key = normalizeSentenceKey(sentence)
    if (key.length < 12 || !seen.has(key)) {
      deduped.push(sentence)
      if (key.length >= 12) seen.add(key)
    }
  }
  if (lang === 'ko' && deduped[0] && REPETITIVE_OPENER_REGEX.test(deduped[0])) {
    deduped[0] = SECTION_OPENERS_KO[sectionKey]
  }
  return deduped
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function toKoreanDomainLabel(domain: SignalDomain): string {
  const map: Record<SignalDomain, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '삶의 방향',
    timing: '타이밍',
    move: '이동',
  }
  return map[domain]
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = String(value || '').trim()
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

export function buildGraphRagSummaryPayload(
  lang: 'ko' | 'en',
  matrixReport: FusionReport,
  graphRagEvidence: NonNullable<AIPremiumReport['graphRagEvidence']>,
  signalSynthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  reportCore?: ReportCoreViewModel
): GraphRagSummaryPayload {
  const graphSummary = summarizeGraphRAGEvidence(graphRagEvidence)
  const preferredDomains: Set<SignalDomain> | null = reportCore
    ? new Set([
        reportCore.focusDomain as SignalDomain,
        ...reportCore.domainVerdicts.slice(0, 2).map((item) => item.domain as SignalDomain),
      ])
    : null

  const topInsightTitles = uniqueStrings(
    (matrixReport.topInsights || [])
      .filter((item) => !preferredDomains || preferredDomains.has(item.domain as SignalDomain))
      .map((item) => item.title),
    5
  )
  const claimFallback = uniqueStrings(
    (signalSynthesis?.claims || [])
      .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain as SignalDomain))
      .map((claim) => claim.thesis),
    5
  )
  const anchorFallback = uniqueStrings(
    (graphRagEvidence.anchors || []).map((anchor) =>
      lang === 'ko' ? `${anchor.section} 교차 근거` : `${anchor.section} cross evidence`
    ),
    5
  )
  const topInsights =
    topInsightTitles.length > 0
      ? topInsightTitles
      : claimFallback.length > 0
        ? claimFallback
        : anchorFallback

  const strengthSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'strength')
    .slice(0, 3)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 강점 신호: ${signal.keyword || signal.rowKey}`
      }
      return `${domain} upside signal: ${signal.keyword || signal.rowKey}`
    })

  const strategyDrivers = (strategyEngine?.domainStrategies || [])
    .filter(
      (strategy) => !preferredDomains || preferredDomains.has(strategy.domain as SignalDomain)
    )
    .slice(0, 3)
    .map((strategy) => {
      const strategyDomain = strategy.domain as SignalDomain
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(strategyDomain)}은 ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      }
      return `${strategy.domain} is in a phase where ${describePhaseFlow(
        strategy.phaseLabel,
        'en'
      ).toLowerCase()} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
    })

  const drivers = uniqueStrings(
    [
      ...strengthSignals,
      ...strategyDrivers,
      ...(signalSynthesis?.claims || [])
        .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain as SignalDomain))
        .map((claim) => {
          const claimDomain = claim.domain as SignalDomain
          return lang === 'ko'
            ? `${toKoreanDomainLabel(claimDomain)}: ${claim.thesis}`
            : `${claim.domain}: ${claim.thesis}`
        }),
    ],
    6
  )

  const cautionSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 4)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} 주의: ${signal.keyword || signal.rowKey} 신호는 한 번 더 확인이 필요합니다.`
      }
      return `${domain} caution: ${signal.keyword || signal.rowKey} requires recheck before commitment.`
    })

  const cautionSections = (graphSummary?.cautionSections || []).slice(0, preferredDomains ? 3 : 6)
  const cautionFromSections = cautionSections.map((section) =>
    lang === 'ko'
      ? `${section} 섹션은 교차 근거 신뢰도가 낮아 검증 우선이 필요합니다.`
      : `${section} section has lower cross-evidence trust and should run verification-first.`
  )
  const trustCaution =
    (graphSummary?.lowTrustSetCount || 0) > 0
      ? [
          lang === 'ko'
            ? `교차 근거 세트 중 ${graphSummary?.lowTrustSetCount || 0}개는 신뢰도가 낮아 서명/확정 판단을 보수적으로 잡아야 합니다.`
            : `There are ${graphSummary?.lowTrustSetCount || 0} low-trust cross sets, so keep sign/finalize decisions conservative.`,
        ]
      : []

  const cautions = uniqueStrings([...cautionSignals, ...cautionFromSections, ...trustCaution], 6)

  return {
    topInsights,
    drivers:
      drivers.length > 0
        ? drivers
        : [
            lang === 'ko'
              ? '지금 흐름은 강점 신호와 실행 속도를 함께 보고 판단하는 편이 맞습니다.'
              : 'Use the positive signals together with the current pace and phase before acting.',
          ],
    cautions:
      cautions.length > 0
        ? cautions
        : [
            lang === 'ko'
              ? '교차 근거 신뢰도가 낮을 때는 서두르지 말고 확인 절차를 먼저 두는 편이 맞습니다.'
              : 'When evidence trust is low, apply checklist verification before commitment.',
          ],
    trust: {
      avgOverlapScore: graphSummary?.avgOverlapScore || 0,
      avgOrbFitScore: graphSummary?.avgOrbFitScore || 0,
      highTrustSetCount: graphSummary?.highTrustSetCount || 0,
      lowTrustSetCount: graphSummary?.lowTrustSetCount || 0,
      totalSets: graphSummary?.totalSets || 0,
    },
    cautionSections,
  }
}

export function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  const pairMatch = set.astrologyEvidence.match(/^([A-Za-z]+)-([a-z]+)-([A-Za-z]+)/i)
  const p1 = pairMatch?.[1] || '행성A'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || '행성B'
  const aspectKoMap: Record<string, string> = {
    conjunction: '같은 방향으로 겹칩니다',
    opposition: '서로 반대편에서 긴장을 만듭니다',
    square: '부딪히며 조정을 요구합니다',
    trine: '자연스럽게 힘을 실어 줍니다',
    sextile: '보조선처럼 연결됩니다',
    quincunx: '각도를 다시 맞춰야 합니다',
  }
  const aspectKo = aspectKoMap[aspectRaw] || '각도 차이를 만듭니다'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}와 ${p2}의 흐름이 ${aspectKo}. ${domains} 영역에서 같은 근거가 반복됩니다.`
}

export function extractTopMatrixFacts(matrixReport: FusionReport, sectionKey: string): string[] {
  const domainBySection: Record<string, string[]> = {
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
  const targets = new Set(domainBySection[sectionKey] || ['personality'])
  return matrixReport.topInsights
    .filter((item) => targets.has(item.domain))
    .slice(0, 3)
    .map(
      (item) =>
        `${item.title} 신호가 두드러집니다. 특히 ${toKoreanDomainLabel(item.domain as SignalDomain)} 쪽에서 반복됩니다.`
    )
}

export function buildStrategyFactsForSection(
  strategyEngine: StrategyEngineResult | undefined,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string[] {
  if (!strategyEngine) return []
  const domains = getDomainsForSection(sectionKey)
  const candidates = strategyEngine.domainStrategies
    .filter((strategy) => domains.includes(strategy.domain))
    .slice(0, 2)
  if (candidates.length === 0) return []
  const lines: string[] = []
  for (const strategy of candidates) {
    const key = `${strategy.domain}:${strategy.phase}`
    const koActionByKey: Record<string, string> = {
      'career:expansion':
        '핵심 과제 1~2개를 먼저 끝내고, 그 다음 대외 확정을 검토하는 편이 맞습니다.',
      'career:high_tension_expansion':
        '결정은 하더라도 서명과 발신은 24시간 재확인 뒤로 미루는 편이 맞습니다.',
      'relationship:expansion_guarded':
        '대화를 늘리되 결론 문장은 늦춰서 해석 오차를 줄이는 편이 맞습니다.',
      'wealth:expansion_guarded':
        '금액, 기한, 취소 조건을 먼저 고정하고 규모를 나눠 들어가는 편이 맞습니다.',
      'health:defensive_reset':
        '과속을 멈추고 수면, 수분, 회복 리듬을 먼저 복구하는 편이 맞습니다.',
      'timing:high_tension_expansion':
        '결정 타이밍과 실행 타이밍을 분리해서 커뮤니케이션 리스크를 줄이는 편이 맞습니다.',
    }
    const enActionByKey: Record<string, string> = {
      'career:expansion':
        'Finish 1-2 core tasks first, then commit externally after checklist pass.',
      'career:high_tension_expansion':
        'Decide now, but push signing/sending behind a 24h recheck slot.',
      'relationship:expansion_guarded':
        'Increase dialogue and delay final statements to reduce interpretation errors.',
      'wealth:expansion_guarded':
        'Lock amount/deadline/cancellation terms first and split position size.',
      'health:defensive_reset': 'Stop overspeed and restore sleep-hydration-recovery blocks first.',
      'timing:high_tension_expansion':
        'Separate decision timing from execution timing to reduce communication risk.',
    }
    const phaseAction =
      lang === 'ko'
        ? koActionByKey[key] || '지금 단계에서는 속도보다 확인 절차를 먼저 두는 편이 맞습니다.'
        : enActionByKey[key] || 'Run staged execution with recheck gates before commitment.'

    if (lang === 'ko') {
      lines.push(
        `${toKoreanDomainLabel(strategy.domain as SignalDomain)}은 ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    } else {
      lines.push(
        `${strategy.domain} is in a phase where ${describePhaseFlow(
          strategy.phaseLabel,
          'en'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    }
  }
  return lines
}

export function buildSectionFactPack(
  sectionKey: keyof AIPremiumReport['sections'],
  anchor: GraphRAGEvidenceAnchor | undefined,
  matrixReport: FusionReport,
  input: MatrixCalculationInput,
  reportCore: ReportCoreViewModel | undefined,
  signalSynthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  buildTimingWindowNarrativeFn: typeof buildTimingWindowNarrative,
  buildManifestationNarrativeFn: typeof buildManifestationNarrative,
  buildVerdictNarrativeFn: typeof buildVerdictNarrative,
  lang: 'ko' | 'en' = 'ko'
): string[] {
  const cleanFact = (line: string): string => {
    const normalized = sanitizeUserFacingNarrative(localizeReportNarrativeText(line, lang))
      .replace(/\bcore pattern family\b/gi, '')
      .replace(/\bpattern\b/gi, lang === 'ko' ? '흐름' : 'pattern')
      .replace(/\bscenario\b/gi, lang === 'ko' ? '가능한 경로' : 'scenario')
      .replace(/\bList [A-Za-z0-9 ,/-]+\b/g, '')
      .replace(/\bL\d+\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return normalized
  }

  const bullets: string[] = []
  const hasReportCore = Boolean(reportCore)

  const topSets = [...(anchor?.crossEvidenceSets || [])]
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, hasReportCore ? 1 : 2)
  for (const set of topSets) {
    bullets.push(humanizeCrossSetFact(set))
  }

  let addedTimingNarrative = false
  if (reportCore) {
    const sectionDomains = getDomainsForSection(sectionKey)
    for (const domain of sectionDomains) {
      const advisory = findReportCoreAdvisory(reportCore, domain)
      const timing = findReportCoreTimingWindow(reportCore, domain)
      const manifestation = findReportCoreManifestation(reportCore, domain)
      const verdict = findReportCoreVerdict(reportCore, domain)
      if (advisory?.thesis) bullets.push(advisory.thesis)
      if (advisory?.action) bullets.push(advisory.action)
      if (advisory?.caution) bullets.push(advisory.caution)
      if (timing) {
        bullets.push(buildTimingWindowNarrativeFn(domain, timing, lang))
        addedTimingNarrative = true
      }
      if (manifestation) bullets.push(buildManifestationNarrativeFn(manifestation, lang))
      if (verdict) bullets.push(buildVerdictNarrativeFn(verdict, lang))
    }
    bullets.push(reportCore.primaryAction)
    bullets.push(reportCore.primaryCaution)
    bullets.push(reportCore.riskControl)
    bullets.push(reportCore.judgmentPolicy.rationale)
  } else {
    bullets.push(...buildSynthesisFactsForSection(signalSynthesis, sectionKey, lang))
    bullets.push(...buildStrategyFactsForSection(strategyEngine, sectionKey, lang))
    bullets.push(...extractTopMatrixFacts(matrixReport, sectionKey))
  }

  const activeTransits = (input.activeTransits || []).slice(0, 2)
  if (!hasReportCore && activeTransits.length > 0) {
    bullets.push(`현재 트랜짓 ${activeTransits.join(', ')}가 같이 작동해 실행 압력을 높입니다.`)
  }
  if (
    !hasReportCore &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push('장기 흐름과 단기 흐름이 같이 움직여서 순서와 속도 조절이 중요합니다.')
  }
  if (
    hasReportCore &&
    !addedTimingNarrative &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push(
      lang === 'ko'
        ? '장기 흐름과 단기 흐름이 같이 움직여서, 지금은 확정보다 확인 절차를 먼저 두는 편이 맞습니다.'
        : 'Long-cycle and short-cycle signals are moving together, so fix sequencing and verification before commitment.'
    )
  }

  return bullets
    .map((line) => cleanFact(line))
    .filter((line, idx, arr) => line.length > 0 && arr.indexOf(line) === idx)
    .slice(0, 12)
}

export function buildSectionPrompt(
  sectionKey: keyof AIPremiumReport['sections'],
  factPack: string[],
  lang: 'ko' | 'en',
  draftText?: string,
  targetMinChars?: number
): string {
  const facts = factPack.map((fact) => `- ${fact}`).join('\n')
  const concreteNouns = SECTION_CONCRETE_NOUNS[sectionKey].join(', ')
  const minChars = Math.max(220, Math.floor(targetMinChars || (lang === 'ko' ? 420 : 320)))
  const longForm = minChars >= (lang === 'ko' ? 600 : 450)
  if (lang === 'ko') {
    return [
      '당신은 사주와 점성을 함께 읽는 전문 상담가입니다.',
      `섹션 키: ${sectionKey}`,
      '작성 규칙:',
      '- 첫 문장은 바로 결론으로 시작하되 섹션마다 다른 오프너를 사용합니다.',
      '- 왜 그런지와 무엇을 먼저 해야 하는지를 반드시 함께 설명합니다.',
      longForm
        ? '- 22~60자 문장을 섞어 8~14문장으로 씁니다.'
        : '- 15~35자 문장을 섞어 4~7문장으로 씁니다.',
      `- 최소 ${minChars}자 이상 씁니다.`,
      '- bullet, 번호, JSON, 메타 설명은 금지합니다.',
      `- 다음 구체 명사(${concreteNouns})를 가능한 한 본문에 포함합니다.`,
      '- 패턴명, 시나리오 id, 내부 라벨은 금지합니다.',
      '- 같은 뜻의 문장을 반복하지 않습니다.',
      draftText ? '기존 초안을 더 깊고 자연스럽게 다듬습니다.' : '아래 fact pack만 근거로 씁니다.',
      'fact pack:',
      facts,
      draftText ? `초안:\n${draftText}` : '',
      '반환 형식은 JSON 하나만: {"text":"..."}',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You are a combined Saju+Astrology counselor.',
    `Section: ${sectionKey}`,
    'Style rules:',
    '- Start with a direct conclusion, but vary opening expressions by section.',
    longForm
      ? '- Use medium-length declarative sentences with concrete detail and context.'
      : '- Use concise declarative sentences with concrete details.',
    longForm
      ? '- Write 8-14 connected sentences for this section.'
      : '- Write 4-7 connected sentences for this section.',
    `- This section must be at least ${minChars} characters.`,
    '- No bullet or numbered output; prose paragraphs only.',
    '- Avoid repeating semantically equivalent sentences.',
    draftText
      ? 'Refine the draft with stronger depth and precision.'
      : 'Write only from the fact pack below.',
    'Fact pack:',
    facts,
    draftText ? `Draft:\n${draftText}` : '',
    'Return JSON only: {"text":"..."}',
  ]
    .filter(Boolean)
    .join('\n')
}

export function summarizeTopInsightsByCategory(
  report: FusionReport,
  categories: string[],
  lang: 'ko' | 'en',
  limit = 3
): string {
  const rows = (report.topInsights || [])
    .filter((item) => categories.includes(item.category))
    .slice(0, limit)
    .map((item) => (lang === 'ko' ? item.title : item.titleEn || item.title))
    .filter(Boolean)
  return rows.length > 0
    ? rows.join(', ')
    : lang === 'ko'
      ? '핵심 신호를 검토 중입니다'
      : 'Core signals in review'
}

export function ensureLongSectionNarrative(
  base: string,
  minChars: number,
  extras: string[]
): string {
  let out = String(base || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const uniqExtras = [...new Set(extras.map((v) => String(v || '').trim()).filter(Boolean))]
  for (const extra of uniqExtras) {
    if (out.length >= minChars) break
    if (out.includes(extra)) continue
    out = `${out} ${extra}`.replace(/\s{2,}/g, ' ').trim()
  }
  return dedupeNarrativeSentences(out)
}

export function cleanRecommendationLine(text: string, lang: 'ko' | 'en'): string {
  return sanitizeUserFacingNarrative(String(text || '').trim())
    .replace(/,+/g, ',')
    .replace(/,\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function buildSynthesisPromptBlock(
  synthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  lang: 'ko' | 'en',
  mode: 'timing' | 'themed',
  theme?: ReportTheme
): string {
  if (!synthesis || synthesis.claims.length === 0) return ''
  const themeDomainMap: Record<ReportTheme, string[]> = {
    love: ['relationship', 'personality'],
    career: ['career', 'wealth'],
    wealth: ['wealth', 'career'],
    health: ['health', 'timing'],
    family: ['relationship', 'personality'],
  }
  const preferredDomains =
    mode === 'timing'
      ? ['timing', 'career', 'relationship', 'wealth', 'health']
      : themeDomainMap[theme || 'career']
  const pickedClaims = synthesis.claims
    .filter((claim) => preferredDomains.includes(claim.domain))
    .slice(0, 4)
  const claims = pickedClaims.length > 0 ? pickedClaims : synthesis.claims.slice(0, 3)
  const claimLines = claims.map((claim) => {
    const evidence = claim.evidence
      .slice(0, 2)
      .map((id) => synthesis.signalsById[id])
      .filter(Boolean)
      .map((signal) => `${signal.id}:${signal.keyword || signal.rowKey}`)
      .join(', ')
    if (lang === 'ko') {
      return `- ${claim.domain}: ${claim.thesis} | 근거: ${evidence || 'pending'} | 제어: ${claim.riskControl}`
    }
    return `- ${claim.domain}: ${claim.thesis} | evidence: ${evidence || 'pending'} | control: ${claim.riskControl}`
  })
  const strategyLines = (strategyEngine?.domainStrategies || [])
    .filter((item) => preferredDomains.includes(item.domain))
    .slice(0, 3)
    .map((item) =>
      lang === 'ko'
        ? `- 전략 ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'ko')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'ko')} | thesis=${item.thesis}`
        : `- strategy ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'en')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'en')} | thesis=${item.thesis}`
    )
  if (lang === 'ko') {
    return [
      '## Signal Synthesizer (고정 근거)',
      '- 아래 근거와 ID를 넘어서 사실을 추가하지 마세요',
      '- 강점과 주의가 공존하면 "기회 + 제어 조건" 형태로 묶으세요',
      strategyEngine
        ? `- 전체 위상: ${describePhaseFlow(strategyEngine.overallPhaseLabel, 'ko')} ${describeExecutionStance(strategyEngine.attackPercent, strategyEngine.defensePercent, 'ko')}`
        : '',
      ...strategyLines,
      ...claimLines,
    ].join('\n')
  }
  return [
    '## Signal Synthesizer (fixed evidence)',
    '- Do not add facts beyond these claim/evidence IDs',
    '- If strength and caution coexist in a domain, synthesize as "upside + risk-control"',
    strategyEngine
      ? `- Overall phase: ${strategyEngine.overallPhaseLabel}, offense ${strategyEngine.attackPercent}% / defense ${strategyEngine.defensePercent}%`
      : '',
    ...strategyLines,
    ...claimLines,
  ].join('\n')
}
