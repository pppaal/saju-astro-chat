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
import {
  buildDomainTimingAbortConditions,
  buildDomainTimingEntryConditions,
  resolveDomainTimingGranularity,
  buildDomainTimingPrecisionReason,
  buildDomainTimingWhyNow,
  buildTimingHintByDomain,
  resolveDomainTimingWindow,
  resolveTimingConflictProfile,
} from './canonicalTimingSupport'

export {
  buildDomainTimingAbortConditions,
  buildDomainTimingEntryConditions,
  resolveDomainTimingGranularity,
  buildDomainTimingPrecisionReason,
  buildDomainTimingWhyNow,
  buildTimingHintByDomain,
  resolveDomainTimingWindow,
  resolveTimingConflictProfile,
} from './canonicalTimingSupport'

import {
  ACTIONABLE_DOMAINS,
  buildDomainAdvisoryCopy,
  buildProvenance,
  buildSourceFields,
  buildSourceSetIds,
  buildTopScenarios,
  clamp,
  getPresentationScenarios,
  isPresentationScenario,
  localizeCanonicalDomain,
  localizeCanonicalMode,
  localizeCanonicalPhase,
  localizePatternFamily,
  mapSignalDomainToSummaryDomainKey,
  resolveRiskControl,
  round2,
} from './canonicalDomainSupportSupport'

export {
  ACTIONABLE_DOMAINS,
  buildDomainAdvisoryCopy,
  buildProvenance,
  buildSourceFields,
  buildSourceSetIds,
  buildTopScenarios,
  clamp,
  getPresentationScenarios,
  isPresentationScenario,
  localizeCanonicalDomain,
  localizeCanonicalMode,
  localizeCanonicalPhase,
  localizePatternFamily,
  mapSignalDomainToSummaryDomainKey,
  resolveRiskControl,
  round2,
} from './canonicalDomainSupportSupport'

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
  const readinessScore = round2(clamp(strategyDomain?.metrics.readinessScore || 0.25, 0, 1))
  const triggerScore = round2(clamp(strategyDomain?.metrics.triggerScore || 0.25, 0, 1))
  const convergenceScore = round2(clamp(strategyDomain?.metrics.convergenceScore || 0.2, 0, 1))
  window = resolveDomainTimingWindow({
    domain: lead.domain,
    window,
    readinessScore,
    triggerScore,
    convergenceScore,
    hasScenario: Boolean(scenario),
  })
  const timingGranularity =
    scenario?.timingGranularity || resolveDomainTimingGranularity({ domain: lead.domain, window })

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
    buildDomainTimingWhyNow({
      lang: input.lang,
      domain: lead.domain,
      overlapPoint,
      mode: domainVerdict?.mode || null,
    })
  const precisionReason =
    scenario?.precisionReason ||
    buildDomainTimingPrecisionReason({
      lang: input.lang,
      domain: lead.domain,
      timingGranularity,
    })
  const { timingConflictMode, timingConflictNarrative } = resolveTimingConflictProfile({
    lang: input.lang,
    readinessScore,
    triggerScore,
    convergenceScore,
    domain: lead.domain,
  })
  const entryConditions = scenario?.entryConditions?.length
    ? [...scenario.entryConditions].slice(0, 3)
    : buildDomainTimingEntryConditions({ lang: input.lang, domain: lead.domain })
  const abortConditions = scenario?.abortConditions?.length
    ? [...scenario.abortConditions].slice(0, 3)
    : buildDomainTimingAbortConditions({ lang: input.lang, domain: lead.domain })
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


