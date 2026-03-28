import type { DomainKey, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type {
  BuildCoreCanonicalOutputInput,
  CoreCoherenceAudit,
  CoreDomainAdvisory,
  CoreDomainLead,
  CoreDomainTimingWindow,
  CoreDomainVerdict,
  CoreJudgmentPolicy,
  CorePatternLead,
  CoreProvenance,
  CoreScenarioLead,
} from './types'
import {
  DOMAIN_ARBITRATION_RULES,
  downgradeMode,
  uniqueActions,
} from './canonicalPolicy'

export const ACTIONABLE_DOMAINS = ['career', 'relationship', 'wealth', 'health', 'move'] as const

export function mapSignalDomainToSummaryDomainKey(domain: string): DomainKey | null {
  if (domain === 'relationship') return 'love'
  if (domain === 'wealth') return 'money'
  if (domain === 'career' || domain === 'health' || domain === 'move') return domain
  return null
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function localizeCanonicalDomain(domain: SignalDomain): string {
  switch (domain) {
    case 'career':
      return '커리어'
    case 'relationship':
      return '관계'
    case 'wealth':
      return '재정'
    case 'health':
      return '건강'
    case 'move':
      return '이동'
    case 'personality':
    default:
      return '성향'
  }
}

export function localizeCanonicalPhase(phase: string | null | undefined): string {
  switch (phase) {
    case 'expansion':
      return '확장 국면'
    case 'stabilize':
      return '안정화 국면'
    case 'expansion_guarded':
      return '확장 관리 국면'
    case 'defensive_reset':
      return '방어적 재정비 국면'
    default:
      return phase || '현재 국면'
  }
}

export function localizeCanonicalMode(mode: 'execute' | 'verify' | 'prepare'): string {
  switch (mode) {
    case 'execute':
      return '실행 우선'
    case 'prepare':
      return '준비 우선'
    case 'verify':
    default:
      return '검토 우선'
  }
}

export function localizePatternFamily(family: string | null | undefined): string {
  switch (family) {
    case 'career':
      return '커리어 흐름'
    case 'relationship':
      return '관계 흐름'
    case 'wealth':
      return '재정 흐름'
    case 'health':
      return '건강 흐름'
    case 'move':
      return '이동 흐름'
    case 'timing':
      return '타이밍 흐름'
    case 'personality':
      return '성향 흐름'
    case 'core':
    default:
      return '핵심 패턴'
  }
}

export function resolveTimingConflictProfile(input: {
  lang: 'ko' | 'en'
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  domain: string
}): {
  timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
  timingConflictNarrative: string
} {
  const gap = input.readinessScore - input.triggerScore
  const domainLabel = input.domain

  if (input.readinessScore < 0.32 && input.triggerScore < 0.32) {
    return {
      timingConflictMode: 'weak_both',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지와 촉발 신호가 모두 약해, 사건을 좁혀 보기보다 판이 살아나는지부터 관찰하는 편이 맞습니다.`
          : `${domainLabel} has weak structural support and weak triggering pressure, so the right move is to watch for activation before narrowing the timeline.`,
    }
  }

  if (gap >= 0.18) {
    return {
      timingConflictMode: 'readiness_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지는 먼저 열려 있지만 촉발 신호가 아직 좁지 않아, 지금은 실행보다 준비와 검토가 더 맞습니다.`
          : `${domainLabel} has structural readiness before a clean trigger, so preparation and staged review fit better than immediate execution.`,
    }
  }

  if (gap <= -0.18) {
    return {
      timingConflictMode: 'trigger_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 촉발은 강하지만 구조 지지가 뒤따르지 않아, 사건성은 있어도 지속성은 약할 수 있습니다.`
          : `${domainLabel} has a live trigger before full structural support, so event pressure may be real while long-term sustainability stays weaker.`,
    }
  }

  return {
    timingConflictMode: 'aligned',
    timingConflictNarrative:
      input.lang === 'ko'
        ? `${domainLabel}은 구조 지지와 촉발 신호가 비교적 같은 방향으로 맞물려, 준비와 실행 리듬을 함께 잡을 수 있는 구간입니다.`
        : `${domainLabel} shows structural support and trigger pressure moving in the same direction, so timing can be staged without fighting the underlying trend.`,
  }
}

export function buildTimingHintByDomain(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string {
  const scenarioWindow =
    (input.scenarios || []).find((scenario) => scenario.domain === focusDomain)?.window ||
    input.scenarios[0]?.window
  if (scenarioWindow) return scenarioWindow

  const overlapMonth = (input.matrixSummary?.overlapTimeline || [])[0]?.month
  return overlapMonth || 'now'
}

export function buildSourceFields(
  input: BuildCoreCanonicalOutputInput,
  domain: string,
  includeTiming = false
): string[] {
  const fields = new Set<string>()
  const add = (condition: boolean, field: string) => {
    if (condition) fields.add(field)
  }

  add(Boolean(input.matrixInput?.dayMasterElement), 'dayMasterElement')
  add(Boolean(input.matrixInput?.pillarElements?.length), 'pillarElements')
  add(
    Boolean(
      input.matrixInput?.sibsinDistribution &&
      Object.keys(input.matrixInput.sibsinDistribution).length
    ),
    'sibsinDistribution'
  )
  add(Boolean(input.matrixInput?.relations?.length), 'relations')
  add(Boolean(input.matrixInput?.geokguk), 'geokguk')
  add(Boolean(input.matrixInput?.yongsin), 'yongsin')
  add(
    Boolean(input.matrixInput?.planetSigns && Object.keys(input.matrixInput.planetSigns).length),
    'planetSigns'
  )
  add(
    Boolean(input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length),
    'planetHouses'
  )
  add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
  add(Boolean(input.matrixInput?.astroTimingIndex), 'astroTimingIndex')
  add(
    Boolean(input.matrixInput?.crossSnapshot?.crossAgreement !== undefined),
    'crossSnapshot.crossAgreement'
  )
  add(Boolean(input.matrixInput?.crossSnapshot?.astroTimingIndex), 'crossSnapshot.astroTimingIndex')
  add(Boolean(input.matrixInput?.advancedAstroSignals), 'advancedAstroSignals')

  if (includeTiming) {
    add(Boolean(input.matrixInput?.currentDaeunElement), 'currentDaeunElement')
    add(Boolean(input.matrixInput?.currentSaeunElement), 'currentSaeunElement')
    add(Boolean(input.matrixInput?.currentWolunElement), 'currentWolunElement')
    add(Boolean(input.matrixInput?.currentIljinElement), 'currentIljinElement')
    add(Boolean(input.matrixInput?.currentIljinDate), 'currentIljinDate')
  }

  if (domain === 'relationship') {
    add(Boolean(input.matrixInput?.relations?.length), 'relations')
    add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  } else if (domain === 'career') {
    add(Boolean(input.matrixInput?.geokguk), 'geokguk')
    add(
      Boolean(
        input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length
      ),
      'planetHouses'
    )
  } else if (domain === 'wealth') {
    add(Boolean(input.matrixInput?.yongsin), 'yongsin')
    add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  } else if (domain === 'health') {
    add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
    add(
      Boolean(input.matrixInput?.planetSigns && Object.keys(input.matrixInput.planetSigns).length),
      'planetSigns'
    )
  } else if (domain === 'move') {
    add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
    add(
      Boolean(
        input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length
      ),
      'planetHouses'
    )
  }

  return [...fields]
}

export function buildSourceSetIds(evidenceIds: string[]): string[] {
  return [
    ...new Set(
      (evidenceIds || []).filter((id) => /(set|anchor|claim|graph|rag)/i.test(String(id)))
    ),
  ].slice(0, 8)
}

export function buildProvenance(input: {
  canonicalInput: BuildCoreCanonicalOutputInput
  domain: string
  evidenceIds: string[]
  signalIds?: string[]
  ruleIds?: string[]
  includeTiming?: boolean
}): CoreProvenance {
  return {
    sourceFields: buildSourceFields(
      input.canonicalInput,
      input.domain,
      input.includeTiming === true
    ),
    sourceSignalIds: [...new Set(input.signalIds || [])].slice(0, 8),
    sourceRuleIds: [...new Set(input.ruleIds || [])].slice(0, 8),
    sourceSetIds: buildSourceSetIds(input.evidenceIds || []),
  }
}

export function resolveRiskControl(input: BuildCoreCanonicalOutputInput, focusDomain: string): string {
  const focusedClaim = (input.signalSynthesis.claims || []).find(
    (claim) => claim.domain === focusDomain
  )
  if (focusedClaim?.riskControl) return focusedClaim.riskControl

  const firstClaim = (input.signalSynthesis.claims || []).find((claim) => claim.riskControl)
  if (firstClaim?.riskControl) return firstClaim.riskControl

  return input.strategy.riskControl || ''
}

export function isPresentationScenario(scenario: { id: string; branch: string }): boolean {
  const id = String(scenario.id || '').toLowerCase()
  const branch = String(scenario.branch || '').toLowerCase()
  if (!id && !branch) return false
  const genericPattern =
    /(hidden|support|defensive|cluster|alt|fallback|generic|background|residual|residue)/
  return !genericPattern.test(id) && !genericPattern.test(branch)
}

export function getPresentationScenarios(input: BuildCoreCanonicalOutputInput) {
  const scenarios = (input.scenarios || []).filter((scenario) => isPresentationScenario(scenario))
  return scenarios.length > 0 ? scenarios : input.scenarios || []
}

export function buildTopScenarios(input: BuildCoreCanonicalOutputInput): CoreScenarioLead[] {
  const sourceScenarios = getPresentationScenarios(input)
  const focusDomain =
    input.strategy.focusDomain || input.strategy.domainStrategies[0]?.domain || null
  const leadScenarioId =
    sourceScenarios.find((scenario) => scenario.domain === focusDomain)?.id || null
  const scenarioSpecificity = (branch: string) => {
    const key = branch.toLowerCase()
    if (
      /(review|negotiation|restructure|compliance|acceptance|decision|conflict|disruption)/.test(
        key
      )
    )
      return 4
    if (
      /(manager|specialist|authority|cohabitation|cross_border|lease|allocation|execution)/.test(
        key
      )
    )
      return 3
    if (/(entry|travel|new_connection|recovery|bond_deepening)/.test(key)) return 2
    return 1
  }
  return sourceScenarios
    .slice()
    .sort(
      (a, b) =>
        (b.domain === focusDomain ? 1 : 0) - (a.domain === focusDomain ? 1 : 0) ||
        (b.id === leadScenarioId ? 1 : 0) - (a.id === leadScenarioId ? 1 : 0) ||
        b.probability - a.probability ||
        b.timingRelevance - a.timingRelevance ||
        b.confidence - a.confidence ||
        scenarioSpecificity(b.branch) - scenarioSpecificity(a.branch) ||
        a.abortConditions.length - b.abortConditions.length
    )
    .slice(0, 6)
    .map(
      (scenario): CoreScenarioLead => ({
        id: scenario.id,
        patternId: scenario.patternId,
        domain: scenario.domain,
        branch: scenario.branch,
        probability: scenario.probability,
        confidence: round2(clamp(scenario.confidence, 0, 1)),
        window: scenario.window,
        timingRelevance: round2(clamp(scenario.timingRelevance, 0, 1)),
        timingGranularity: scenario.timingGranularity,
        precisionReason: scenario.precisionReason,
        reversible: scenario.reversible,
        whyNow: scenario.whyNow,
        entryConditions: [...scenario.entryConditions].slice(0, 3),
        abortConditions: [...scenario.abortConditions].slice(0, 3),
        sustainConditions: [...scenario.sustainConditions].slice(0, 3),
        reversalRisk: scenario.reversalRisk,
        wrongMoveCost: scenario.wrongMoveCost,
        sustainability: round2(clamp(scenario.sustainability, 0, 1)),
        evidenceIds: [...scenario.evidenceIds].slice(0, 6),
      })
    )
}

export function buildDomainAdvisoryCopy(input: {
  lang: 'ko' | 'en'
  domain: string
  phase: string
  claimThesis?: string | null
  scenarioWhyNow?: string | null
  leadScenarioId?: string | null
  action?: string | null
  caution?: string | null
  verdictRationale?: string | null
}): Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'> {
  const leadScenario = String(input.leadScenarioId || '')
  if (input.lang === 'ko') {
    const koDefaults: Record<
      string,
      Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'>
    > = {
      career: {
        thesis:
          input.claimThesis ||
          '커리어는 일을 넓히는 것보다 맡을 역할, 책임, 평가 기준을 먼저 분명히 할 때 성장 폭이 커집니다.',
        action: input.action || '역할, 범위, 기한을 먼저 고정한 뒤 다음 단계를 여세요.',
        caution:
          input.caution || '분위기만 보고 바로 확정하지 말고 조건과 책임 범위를 먼저 확인하세요.',
        strategyLine:
          input.verdictRationale ||
          '커리어는 확장보다 우선순위와 책임 범위를 먼저 고정할 때 결과 변동이 줄어듭니다.',
      },
      relationship: {
        thesis:
          input.claimThesis ||
          '관계는 감정의 강도보다 거리, 기대치, 경계가 같은 뜻으로 맞춰질 때 안정됩니다.',
        action: input.action || '결론보다 기대치와 속도를 먼저 맞추는 대화를 여세요.',
        caution: input.caution || '해석이 다르다고 느껴질 때 바로 확정이나 약속으로 밀지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '관계에서는 감정 표현보다 속도와 경계를 먼저 맞출수록 오해 비용이 줄어듭니다.',
      },
      wealth: {
        thesis:
          input.claimThesis ||
          '재정은 수익 기대보다 유입 구조와 누수 지점을 먼저 분리해 볼 때 더 안정적으로 커집니다.',
        action: input.action || '금액보다 기한, 취소 조건, 책임 범위를 먼저 나눠 확인하세요.',
        caution: input.caution || '좋아 보이는 조건도 손실 상한을 정하지 않은 채 확정하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '재정은 공격보다 손실 상한과 조건 점검을 먼저 고정할 때 복원력이 커집니다.',
      },
      health: {
        thesis:
          input.claimThesis ||
          '건강은 버티는 힘보다 회복 리듬과 과부하 신호를 얼마나 빨리 정리하느냐에서 갈립니다.',
        action: input.action || '강도를 올리기보다 회복 블록을 일정에 먼저 고정하세요.',
        caution: input.caution || '피로 신호를 의지로 덮은 채 일정 밀도를 유지하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '건강은 강한 하루보다 반복 가능한 회복 루틴을 먼저 세울 때 안정됩니다.',
      },
      move: {
        thesis:
          input.claimThesis ||
          '이동과 거점 변화는 크게 옮기는 결정보다 동선, 경로, 생활 거점을 다시 설계할 때 더 정확해집니다.',
        action: input.action || '경로와 생활 동선을 먼저 재확인한 뒤 큰 이동 결정을 여세요.',
        caution:
          input.caution || '계약이나 이동 일정을 한 번에 확정하지 말고 경로와 비용을 나눠 보세요.',
        strategyLine:
          input.verdictRationale ||
          '이동은 속도보다 경로 검증과 거점 재정비를 먼저 할 때 손실이 줄어듭니다.',
      },
      personality: {
        thesis:
          input.claimThesis ||
          '기본 성향은 빠른 판단보다 기준을 먼저 세우고 정밀하게 조정할 때 더 강하게 작동합니다.',
        action: input.action || '결론을 내리기 전에 기준 문장을 먼저 짧게 고정하세요.',
        caution: input.caution || '해석이 끝나기 전에 결론부터 확정하지 마세요.',
        strategyLine:
          input.verdictRationale || '성향의 강점은 속도가 아니라 기준과 재정렬 능력에서 나옵니다.',
      },
      timing: {
        thesis:
          input.claimThesis ||
          '타이밍은 빨리 결정하는지보다 검토와 확정을 다른 슬롯으로 나눌 수 있는지에 달려 있습니다.',
        action: input.action || '착수와 확정 사이에 재확인 슬롯을 반드시 두세요.',
        caution: input.caution || '당일 판단과 당일 확정을 같은 결정으로 묶지 마세요.',
        strategyLine:
          input.verdictRationale || '타이밍의 핵심은 속도가 아니라 검토와 확정의 분리입니다.',
      },
      spirituality: {
        thesis:
          input.claimThesis ||
          '장기 방향은 외부 성과보다 어떤 기준을 반복 가능한 방식으로 남기는지에서 선명해집니다.',
        action: input.action || '지금 선택을 설명하는 한 줄 원칙을 먼저 정리하세요.',
        caution: input.caution || '큰 의미를 한 번에 확정하려 하지 마세요.',
        strategyLine:
          input.verdictRationale || '장기 방향은 순간의 확신보다 반복 가능한 기준에서 나옵니다.',
      },
    }
    const base = koDefaults[input.domain] || koDefaults.personality
    const scenarioLine = input.scenarioWhyNow
      ? `${input.scenarioWhyNow}`
      : leadScenario
        ? `${leadScenario} 장면이 실제 사건축으로 붙고 있습니다.`
        : ''
    return {
      thesis: base.thesis,
      action: base.action,
      caution: base.caution,
      strategyLine: [base.strategyLine, scenarioLine].filter(Boolean).join(' '),
    }
  }

  const enDefaults: Record<
    string,
    Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'>
  > = {
    career: {
      thesis:
        input.claimThesis ||
        'Career grows faster when role, responsibility, and evaluation standards are clearer than raw expansion.',
      action:
        input.action || 'Lock scope, deadline, and responsibility before opening the next step.',
      caution:
        input.caution ||
        'Do not finalize on momentum alone before checking conditions and responsibility.',
      strategyLine:
        input.verdictRationale ||
        'Career becomes more stable when priorities and responsibility are fixed before expansion.',
    },
    relationship: {
      thesis:
        input.claimThesis ||
        'Relationships stabilize when distance, expectations, and boundaries line up before commitment pressure rises.',
      action: input.action || 'Align pace and expectations before asking for a conclusion.',
      caution:
        input.caution ||
        'Do not force labels or promises while interpretation is still mismatched.',
      strategyLine:
        input.verdictRationale ||
        'Relationship risk falls when pace and boundaries are clarified before commitment.',
    },
    wealth: {
      thesis:
        input.claimThesis ||
        'Wealth improves when inflow structure and leakage are separated before upside is chased.',
      action: input.action || 'Check terms, deadlines, and downside first.',
      caution: input.caution || 'Do not commit before the loss boundary is explicit.',
      strategyLine:
        input.verdictRationale ||
        'Financial resilience improves when downside and conditions are fixed before growth.',
    },
    health: {
      thesis:
        input.claimThesis ||
        'Health depends more on recovery rhythm and overload detection than on endurance alone.',
      action: input.action || 'Schedule recovery blocks before increasing load.',
      caution: input.caution || 'Do not cover fatigue signals with willpower.',
      strategyLine:
        input.verdictRationale ||
        'Health stabilizes when recovery is repeatable rather than heroic.',
    },
    move: {
      thesis:
        input.claimThesis ||
        'Movement and relocation improve when route, commute, and basecamp design are checked before big commitment.',
      action: input.action || 'Recheck route and living logistics before final movement decisions.',
      caution:
        input.caution || 'Do not bundle contract, route, and move timing into one rushed decision.',
      strategyLine:
        input.verdictRationale ||
        'Movement works best when route validation comes before relocation commitment.',
    },
    personality: {
      thesis:
        input.claimThesis ||
        'Your baseline works best when standards are set before speed takes over.',
      action: input.action || 'Fix the standard in one short sentence before deciding.',
      caution: input.caution || 'Do not finalize before the interpretation is complete.',
      strategyLine:
        input.verdictRationale || 'The core strength is not speed but standards and recalibration.',
    },
    timing: {
      thesis:
        input.claimThesis ||
        'Timing improves when review and commitment are treated as separate slots.',
      action: input.action || 'Insert a recheck slot between starting and finalizing.',
      caution:
        input.caution || 'Do not treat same-day judgment and same-day commitment as one action.',
      strategyLine:
        input.verdictRationale || 'Timing is won through separation between review and commitment.',
    },
    spirituality: {
      thesis:
        input.claimThesis ||
        'Long-range direction becomes clearer when repeatable standards outlast temporary certainty.',
      action: input.action || 'Name the operating principle before chasing the outcome.',
      caution: input.caution || 'Do not try to finalize meaning in one move.',
      strategyLine:
        input.verdictRationale || 'Long-range direction is built through repeatable principles.',
    },
  }
  const base = enDefaults[input.domain] || enDefaults.personality
  const scenarioLine = input.scenarioWhyNow
    ? input.scenarioWhyNow
    : leadScenario
      ? `${leadScenario} is the active scene underneath this domain.`
      : ''
  return {
    thesis: base.thesis,
    action: base.action,
    caution: base.caution,
    strategyLine: [base.strategyLine, scenarioLine].filter(Boolean).join(' '),
  }
}

export function findEvidenceIdsForDomain(input: BuildCoreCanonicalOutputInput, domain: string): string[] {
  return [
    ...(input.signalSynthesis.claims || [])
      .filter((item) => item.domain === domain)
      .flatMap((item) => item.evidence || []),
    ...(input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.some((hint) => hint === domain))
      .map((signal) => signal.id),
    ...(input.patterns || [])
      .filter((pattern) => pattern.domains.some((hint) => hint === domain))
      .map((pattern) => pattern.id),
    ...(input.scenarios || [])
      .filter((scenario) => scenario.domain === domain)
      .flatMap((scenario) => [scenario.id, ...(scenario.evidenceIds || [])]),
    ...(input.strategy.domainStrategies || [])
      .filter((strategy) => strategy.domain === domain)
      .flatMap((strategy) => strategy.evidenceIds || []),
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
}

export function buildFallbackDomainLead(
  input: BuildCoreCanonicalOutputInput,
  domain: string
): CoreDomainLead | null {
  const evidenceIds = findEvidenceIdsForDomain(input, domain)
  if (evidenceIds.length === 0) return null

  const strategy =
    (input.strategy.domainStrategies || []).find((item) => item.domain === domain) || null
  const patternScore = round2(
    (input.patterns || [])
      .filter((pattern) => pattern.domains.some((hint) => hint === domain))
      .reduce((sum, pattern) => sum + pattern.score, 0)
  )
  const scenarioScore = round2(
    (input.scenarios || [])
      .filter((scenario) => scenario.domain === domain)
      .reduce((sum, scenario) => sum + scenario.probability * scenario.confidence, 0)
  )
  const decisionScore = round2(
    Math.max(
      0,
      ...(input.decisionEngine.options || [])
        .filter((option) => option.domain === domain)
        .map((option) => option.scores.total)
    )
  )
  const totalSignalScore = round2(
    (input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.some((hint) => hint === domain))
      .reduce((sum, signal) => sum + signal.score, 0)
  )

  return {
    domain: domain as CoreDomainLead['domain'],
    phase: strategy?.phase || input.strategy.phase,
    totalSignalScore,
    patternScore,
    scenarioScore,
    decisionScore,
    dominanceScore: round2(
      totalSignalScore * 0.45 + patternScore * 0.2 + scenarioScore * 0.15 + decisionScore * 0.2
    ),
    evidenceIds: evidenceIds.slice(0, 8),
  }
}

export function collectCanonicalDomains(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[]
): CoreDomainLead[] {
  const leadMap = new Map(domainLeads.map((lead) => [lead.domain, lead]))
  const actionable = ACTIONABLE_DOMAINS.map(
    (domain) => leadMap.get(domain) || buildFallbackDomainLead(input, domain)
  ).filter((lead): lead is CoreDomainLead => Boolean(lead))
  const extras = domainLeads.filter(
    (lead) => !ACTIONABLE_DOMAINS.includes(lead.domain as (typeof ACTIONABLE_DOMAINS)[number])
  )
  return [...actionable, ...extras.slice(0, 2)]
}

export function buildDomainTimingWindow(
  input: BuildCoreCanonicalOutputInput,
  lead: CoreDomainLead,
  domainVerdict: CoreDomainVerdict | null
): CoreDomainTimingWindow {
  const scenario =
    (input.scenarios || [])
      .filter((item) => item.domain === lead.domain)
      .sort(
        (a, b) =>
          b.timingRelevance - a.timingRelevance ||
          b.probability - a.probability ||
          b.confidence - a.confidence
      )[0] || null
  const summaryDomainKey = mapSignalDomainToSummaryDomainKey(lead.domain)
  const strategyDomain =
    (input.strategy.domainStrategies || []).find((item) => item.domain === lead.domain) || null
  const overlapPoint = summaryDomainKey
    ? (input.matrixSummary?.overlapTimelineByDomain?.[summaryDomainKey] || [])[0] || null
    : null
  const domainScore = summaryDomainKey
    ? input.matrixSummary?.domainScores?.[summaryDomainKey]
    : null
  const overlapConfidence = overlapPoint
    ? clamp(
        overlapPoint.overlapStrength * 0.75 + (overlapPoint.timeOverlapWeight - 1) * 0.5,
        0.2,
        0.95
      )
    : null

  let window: CoreDomainTimingWindow['window'] = scenario?.window || '6-12m'
  if (!scenario && overlapPoint) {
    window =
      overlapPoint.peakLevel === 'peak'
        ? '1-3m'
        : overlapPoint.peakLevel === 'high'
          ? '3-6m'
          : '6-12m'
  }
  if (!scenario && !overlapPoint && domainVerdict?.mode === 'prepare') {
    window = '12m+'
  }
  const timingGranularity =
    scenario?.timingGranularity ||
    (window === 'now'
      ? 'week'
      : window === '1-3m'
        ? 'month'
        : window === '3-6m'
          ? 'month'
          : 'season')
  const readinessScore = round2(clamp(strategyDomain?.metrics.readinessScore || 0.25, 0, 1))
  const triggerScore = round2(clamp(strategyDomain?.metrics.triggerScore || 0.25, 0, 1))
  const convergenceScore = round2(clamp(strategyDomain?.metrics.convergenceScore || 0.2, 0, 1))

  const confidence = round2(
    clamp(
      scenario?.confidence ||
        overlapConfidence ||
        domainScore?.confidenceScore ||
        lead.dominanceScore / 100 ||
        0.35,
      0.2,
      0.98
    )
  )
  const timingRelevance = round2(
    clamp(
      scenario?.timingRelevance ||
        overlapPoint?.overlapStrength ||
        domainScore?.overlapStrength ||
        lead.scenarioScore / 100 ||
        0.25,
      0.15,
      0.99
    )
  )
  const whyNow =
    scenario?.whyNow ||
    (input.lang === 'ko'
      ? overlapPoint
        ? `${lead.domain} 영역은 ${overlapPoint.month} 전후로 겹침 강도가 올라 timing window가 열립니다.`
        : `${lead.domain} 영역은 현재 국면과 도메인 주도권 기준으로 당장 확정보다 조건 정리가 먼저 필요한 구간입니다.`
      : overlapPoint
        ? `${lead.domain} is entering a stronger timing window around ${overlapPoint.month}.`
        : `${lead.domain} currently needs condition-setting before hard commitment.`)
  const precisionReason =
    scenario?.precisionReason ||
    (input.lang === 'ko'
      ? timingGranularity === 'week'
        ? '단기 신호는 보이지만, 표현 정밀도는 주 단위 상한으로 제한합니다.'
        : timingGranularity === 'month'
          ? '구조 지지가 더 넓어 월 단위 상한으로 해석하는 편이 맞습니다.'
          : '지금은 구조적 흐름을 읽는 구간이라 계절 단위 상한으로 보는 편이 안전합니다.'
      : timingGranularity === 'week'
        ? 'Short-term signals are visible, but the wording is capped at week-level.'
        : timingGranularity === 'month'
          ? 'Structural support is broader than the trigger, so month-level is the safe cap.'
          : 'This is treated as a structural window, so the safe cap stays at season-level.')
  const { timingConflictMode, timingConflictNarrative } = resolveTimingConflictProfile({
    lang: input.lang,
    readinessScore,
    triggerScore,
    convergenceScore,
    domain: lead.domain,
  })
  const entryConditions = scenario?.entryConditions?.length
    ? [...scenario.entryConditions].slice(0, 3)
    : input.lang === 'ko'
      ? [
          '핵심 조건 1개를 먼저 문장으로 고정',
          '바로 확정하지 말고 검증 단계를 먼저 통과',
          '주도 도메인 기준선과 충돌하는 행동은 제외',
        ]
      : [
          'Lock one condition first',
          'Pass a verification step before commitment',
          'Exclude moves that conflict with the lead-domain baseline',
        ]
  const abortConditions = scenario?.abortConditions?.length
    ? [...scenario.abortConditions].slice(0, 3)
    : input.lang === 'ko'
      ? ['신뢰가 더 낮아질 때', '핵심 조건이 바뀔 때', '반복 경고 신호가 늘어날 때']
      : [
          'When confidence drops further',
          'When the key condition changes',
          'When repeated caution signals increase',
        ]
  const evidenceIds = [
    ...(scenario?.evidenceIds || []),
    ...lead.evidenceIds,
    ...(overlapPoint ? [overlapPoint.month, overlapPoint.peakLevel] : []),
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

  return {
    domain: lead.domain,
    window,
    confidence,
    timingRelevance,
    timingGranularity,
    precisionReason,
    timingConflictMode,
    timingConflictNarrative,
    readinessScore,
    triggerScore,
    convergenceScore,
    whyNow,
    entryConditions,
    abortConditions,
    evidenceIds: evidenceIds.slice(0, 8),
    provenance: buildProvenance({
      canonicalInput: input,
      domain: lead.domain,
      evidenceIds,
      signalIds: lead.evidenceIds.filter((id) =>
        (input.signalSynthesis.selectedSignals || []).some((signal) => signal.id === id)
      ),
      ruleIds: [
        scenario?.patternId,
        scenario?.id,
        domainVerdict?.leadPatternId,
        domainVerdict?.leadScenarioId,
      ].filter((value): value is string => Boolean(value)),
      includeTiming: true,
    }),
  }
}

export function buildDomainAdvisories(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[],
  domainVerdicts: CoreDomainVerdict[]
): CoreDomainAdvisory[] {
  return domainLeads.map((lead) => {
    const claim =
      (input.signalSynthesis.claims || []).find((item) => item.domain === lead.domain) ||
      input.signalSynthesis.claims[0]
    const sourceScenarios = getPresentationScenarios(input)
    const scenarios = sourceScenarios.filter((item) => item.domain === lead.domain)
    const scenario = scenarios[0] || sourceScenarios[0] || input.scenarios[0]
    const verdict = domainVerdicts.find((item) => item.domain === lead.domain) || null
    const cautionSignal =
      (input.signalSynthesis.selectedSignals || []).find(
        (signal) => signal.polarity === 'caution' && signal.domainHints.includes(lead.domain)
      ) ||
      (input.signalSynthesis.selectedSignals || []).find((signal) => signal.polarity === 'caution')
    const leadSignals = (input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.includes(lead.domain))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 3)
    const leadPatterns = (input.patterns || [])
      .filter((pattern) => pattern.domains.some((domain) => domain === lead.domain))
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
      .slice(0, 2)
    const evidenceIds = [
      ...(claim?.evidence || []),
      ...leadSignals.map((signal) => signal.id),
      ...leadPatterns.map((pattern) => pattern.id),
      ...(scenario ? [scenario.id] : []),
      ...(lead.evidenceIds || []),
    ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

    const advisoryCopy = buildDomainAdvisoryCopy({
      lang: input.lang,
      domain: lead.domain,
      phase: lead.phase,
      claimThesis: claim?.thesis,
      scenarioWhyNow: scenario?.whyNow,
      leadScenarioId: scenario?.id,
      action:
        claim?.actions?.[0] || scenario?.actions?.[0] || resolveRiskControl(input, lead.domain),
      caution:
        cautionSignal?.advice ||
        cautionSignal?.keyword ||
        (input.lang === 'ko'
          ? '?? ??? ? ? ? ????? ?? ?????.'
          : 'Do not skip the recheck step before commitment.'),
      verdictRationale: verdict?.rationale,
    })

    return {
      domain: lead.domain,
      phase: lead.phase,
      thesis: advisoryCopy.thesis,
      action: advisoryCopy.action,
      caution: advisoryCopy.caution,
      timingHint: scenario?.whyNow || buildTimingHintByDomain(input, lead.domain),
      strategyLine: advisoryCopy.strategyLine,
      leadSignalIds: leadSignals.map((signal) => signal.id),
      leadPatternIds: leadPatterns.map((pattern) => pattern.id),
      leadScenarioIds: scenarios.slice(0, 2).map((item) => item.id),
      evidenceIds: evidenceIds.slice(0, 8),
      provenance: buildProvenance({
        canonicalInput: input,
        domain: lead.domain,
        evidenceIds,
        signalIds: leadSignals.map((signal) => signal.id),
        ruleIds: [
          ...leadPatterns.map((pattern) => pattern.id),
          ...scenarios.slice(0, 2).map((item) => item.id),
        ],
      }),
    } satisfies CoreDomainAdvisory
  })
}

export function buildDomainTimingWindows(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[],
  domainVerdicts: CoreDomainVerdict[]
): CoreDomainTimingWindow[] {
  return domainLeads.map((lead) =>
    buildDomainTimingWindow(
      input,
      lead,
      domainVerdicts.find((item) => item.domain === lead.domain) || null
    )
  )
}

export function buildDomainVerdicts(input: {
  lang: 'ko' | 'en'
  domainLeads: CoreDomainLead[]
  topPatterns: CorePatternLead[]
  topScenarios: CoreScenarioLead[]
  decisionEngine: BuildCoreCanonicalOutputInput['decisionEngine']
  coherenceAudit: CoreCoherenceAudit
}): CoreDomainVerdict[] {
  return input.domainLeads.map((lead) => {
    const rules = DOMAIN_ARBITRATION_RULES[lead.domain] || DOMAIN_ARBITRATION_RULES.personality
    const leadPattern =
      input.topPatterns.find((pattern) => pattern.domains.includes(lead.domain)) || null
    const leadScenario =
      input.topScenarios.find((scenario) => scenario.domain === lead.domain) || null
    const domainOptions = input.decisionEngine.options.filter(
      (option) => option.domain === lead.domain
    )
    let blockedActions = uniqueActions(
      domainOptions.filter((option) => option.gated).map((option) => option.action)
    )
    let allowedActions = uniqueActions(
      domainOptions.filter((option) => !option.gated).map((option) => option.action)
    )
    let mode: CoreJudgmentPolicy['mode'] =
      blockedActions.includes('commit_now') && allowedActions.length <= 1
        ? 'prepare'
        : blockedActions.includes('commit_now') || input.coherenceAudit.verificationBias
          ? 'verify'
          : 'execute'

    const leadConfidence = round2(
      clamp((lead.dominanceScore / 100) * 0.65 + (lead.scenarioScore / 100) * 0.35, 0.1, 0.99)
    )

    if (leadConfidence < rules.commitThreshold && allowedActions.includes('commit_now')) {
      allowedActions = allowedActions.filter((action) => action !== 'commit_now')
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
      mode = downgradeMode(mode, 'verify')
    }

    if (
      rules.forceBlockCommitOnRiskFamily &&
      leadPattern?.profile === 'risk' &&
      allowedActions.includes('commit_now')
    ) {
      allowedActions = allowedActions.filter((action) => action !== 'commit_now')
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
      mode = downgradeMode(mode, 'verify')
    }

    if (
      rules.forceVerificationWhenIrreversible &&
      leadScenario &&
      !leadScenario.reversible &&
      mode === 'execute'
    ) {
      mode = downgradeMode(mode, 'verify')
    }

    mode = downgradeMode(mode, rules.minMode)

    if (mode === 'prepare') {
      allowedActions = allowedActions.filter((action) => action === 'prepare_only')
      if (allowedActions.length === 0) allowedActions = ['prepare_only']
      blockedActions = uniqueActions([
        'commit_now',
        'staged_commit',
        'review_first',
        'negotiate_first',
        'boundary_first',
        'pilot_first',
        'route_recheck_first',
        'lease_review_first',
        'basecamp_reset_first',
        ...blockedActions,
      ])
    } else if (mode === 'verify') {
      allowedActions = uniqueActions(
        allowedActions
          .filter((action) => action !== 'commit_now')
          .concat('prepare_only', 'staged_commit', 'review_first')
      )
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
    }

    const rationale =
      input.lang === 'ko'
        ? `${localizeCanonicalDomain(lead.domain)} 영역은 ${localizeCanonicalPhase(lead.phase)}이며, ${localizePatternFamily(leadPattern?.family)}이 중심을 잡고 있습니다. 현재 판단은 ${localizeCanonicalMode(mode)} 쪽으로 정리됩니다.`
        : `${lead.domain} is in ${lead.phase} phase, led by the ${leadPattern?.family || 'core'} pattern family. The current judgment resolves toward ${mode}.`

    return {
      domain: lead.domain,
      mode,
      confidence: leadConfidence,
      leadPatternId: leadPattern?.id || null,
      leadPatternFamily: leadPattern?.family || null,
      leadScenarioId: leadScenario?.id || null,
      allowedActions: allowedActions.length > 0 ? allowedActions : ['prepare_only'],
      blockedActions,
      rationale,
      evidenceIds: [
        ...new Set([...(lead.evidenceIds || []), ...(leadScenario?.evidenceIds || [])]),
      ].slice(0, 8),
      provenance: buildProvenance({
        canonicalInput: input as unknown as BuildCoreCanonicalOutputInput,
        domain: lead.domain,
        evidenceIds: [
          ...new Set([...(lead.evidenceIds || []), ...(leadScenario?.evidenceIds || [])]),
        ],
        signalIds: [],
        ruleIds: [leadPattern?.id, leadScenario?.id].filter((value): value is string =>
          Boolean(value)
        ),
        includeTiming: true,
      }),
    }
  })
}


