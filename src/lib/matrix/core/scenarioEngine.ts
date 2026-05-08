import type { SignalDomain } from './signalSynthesizer'
import type { StrategyEngineResult } from './strategyEngine'
import type { MatrixCalculationInputNormalized } from './runDestinyCore'
import type { PatternResult } from './patternEngine'
import type { ActivationEngineResult } from './activationEngine'
import type { RuleEngineResult } from './ruleEngine'
import type { StateEngineResult } from './stateEngine'
import {
  resolveScenarioBranchPolicyWeight,
  resolveScenarioTimingPolicyWeight,
} from './scenarioPolicies'

export type ScenarioWindow = 'now' | '1-3m' | '3-6m' | '6-12m'
export type TimingGranularity = 'day' | 'week' | 'fortnight' | 'month' | 'season'

export interface ScenarioDefinition {
  id: string
  patternId: string
  domain: SignalDomain
  branch: string
  title: string
  risk: string
  reversible: boolean
  actions: string[]
}

export interface ScenarioResult {
  id: string
  patternId: string
  domain: SignalDomain
  branch: string
  title: string
  rawScore?: number
  probability: number
  confidence: number
  window: ScenarioWindow
  timingRelevance: number
  timingGranularity: TimingGranularity
  precisionReason: string
  risk: string
  reversible: boolean
  actions: string[]
  whyNow: string
  whyNotYet: string
  entryConditions: string[]
  abortConditions: string[]
  sustainConditions: string[]
  reversalRisk: string
  wrongMoveCost: string
  sustainability: number
  manifestationHints: string[]
  supportingSignalIds: string[]
  evidenceIds: string[]
}

import {
  DOMAIN_SENSITIVITY,
  SCENARIO_DEFINITIONS,
  buildAbortConditions,
  buildEntryConditions,
  buildFallbackDefinitions,
  buildManifestationHints,
  buildPrecisionReason,
  buildReversalRisk,
  buildSustainability,
  buildSustainConditions,
  buildWhyNotYet,
  buildWhyNow,
  buildWrongMoveCost,
  compressScenarioProbability,
  resolveAstroTimingIndex,
  resolveBranchSpecificWeight,
  resolveTimingGranularity,
  resolveTimingPressureWeight,
  resolveTimingRelevance,
  resolveWindow,
  round1,
  clamp,
  type ScenarioResolvedContext,
} from './scenarioEngineSupport'

export function buildScenarioEngine(
  patterns: PatternResult[],
  strategyEngine: StrategyEngineResult,
  normalizedInput: MatrixCalculationInputNormalized,
  lang: 'ko' | 'en',
  resolvedContext?: ScenarioResolvedContext
): ScenarioResult[] {
  const focusDomain = strategyEngine.domainStrategies[0]?.domain || null
  const astroTimingIndex = resolveAstroTimingIndex(normalizedInput)
  const astroTimingWeight = astroTimingIndex
    ? (astroTimingIndex.decade * 0.05 +
        astroTimingIndex.annual * 0.04 +
        astroTimingIndex.monthly * 0.03 +
        astroTimingIndex.daily * 0.02) *
      (0.7 + astroTimingIndex.confidence * 0.3)
    : 0
  const maxPatternCount = (() => {
    const raw = Number(process.env.DESTINY_SCENARIO_PATTERN_LIMIT || 24)
    if (!Number.isFinite(raw) || raw <= 0) return 24
    return Math.max(12, Math.min(120, Math.floor(raw)))
  })()
  const timingWeight =
    1 +
    (normalizedInput.currentDaeunElement ? 0.08 : 0) +
    (normalizedInput.currentSaeunElement ? 0.05 : 0) +
    (normalizedInput.currentWolunElement ? 0.04 : 0) +
    (normalizedInput.currentIljinElement || normalizedInput.currentIljinDate ? 0.03 : 0) +
    (normalizedInput.activeTransits.length > 0 ? 0.06 : 0) +
    astroTimingWeight

  return patterns
    .filter((pattern) => pattern.score >= 42)
    .slice(0, maxPatternCount)
    .flatMap((pattern) => {
      const definitions = SCENARIO_DEFINITIONS.filter((item) => item.patternId === pattern.id)
      const resolvedDefinitions =
        definitions.length > 0 ? definitions : buildFallbackDefinitions(pattern)
      const leadDomain = pattern.domains[0] || 'personality'
      const domainStrategy = strategyEngine.domainStrategies.find(
        (item) => item.domain === leadDomain
      )
      const executionWeight =
        ((domainStrategy?.attackPercent || strategyEngine.attackPercent) / 100) * 0.35 + 0.65
      const sensitivity = DOMAIN_SENSITIVITY[leadDomain] || 1
      return resolvedDefinitions.map((definition) => {
        const activationDomain = resolvedContext?.activation?.domains.find(
          (item) => item.domain === definition.domain
        )
        const ruleDomain = resolvedContext?.rules?.domains.find((item) => item.domain === definition.domain)
        const stateDomain = resolvedContext?.states?.domains.find((item) => item.domain === definition.domain)
        const resolvedMode = ruleDomain?.resolvedMode || pattern.resolvedMode
        const resolvedState = stateDomain?.state || pattern.domainState
        const activationWeight =
          !activationDomain
            ? 1
            : activationDomain.activationScore < 0.8
              ? 0.88
              : activationDomain.activationScore < 1.6
                ? 0.94
                : activationDomain.activationScore < 2.4
                  ? 1
                  : activationDomain.activationScore < 3.4
                    ? 1.03
                    : activationDomain.activationScore < 4.6
                      ? 1.06
                      : 1.08
        const contradictionWeight = ruleDomain?.contradictionPenalty
          ? clamp(1 - Math.min(0.14, ruleDomain.contradictionPenalty * 0.35), 0.84, 1)
          : 1
        const modulationWeight =
          (ruleDomain?.amplify.length ? 1.02 : 1) *
          (ruleDomain?.suppress.length ? 0.98 : 1) *
          (ruleDomain?.delay.length ? 0.98 : 1) *
          (ruleDomain?.gate.length && !definition.reversible ? 0.94 : 1) *
          contradictionWeight
        const branchWeight = resolveBranchSpecificWeight({
          branch: definition.branch,
          domain: definition.domain,
          pattern,
          activationAxes: activationDomain?.dominantAxes || [],
          rule: ruleDomain,
          state: stateDomain,
        })
        const timingPressureWeight = resolveTimingPressureWeight({
          domain: definition.domain,
          branch: definition.branch,
          rule: ruleDomain,
          state: stateDomain,
        })
        const modePenalty =
          resolvedMode === 'prepare'
            ? 0.9
            : resolvedMode === 'verify'
              ? 0.96
              : 1
        const stateWeight =
          resolvedState === 'peak'
            ? 1.06
            : resolvedState === 'active'
              ? 1.03
              : resolvedState === 'opening'
                ? 1
                : resolvedState === 'consolidation'
                  ? 0.94
                  : resolvedState === 'residue'
                    ? 0.88
                    : 0.92
        const agreementWeight =
          typeof pattern.crossAgreement === 'number'
            ? pattern.crossAgreement >= 0.65
              ? 1.04
              : pattern.crossAgreement < 0.35
                ? 0.92
                : 1
            : 1
        const reversibilityWeight = definition.reversible ? 1.03 : 0.97
        const focusDomainWeight =
          definition.domain === focusDomain
            ? definition.domain === 'move'
              ? 1.16
              : 1.08
            : 1
        const rawProbability =
          pattern.score *
          timingWeight *
          executionWeight *
          sensitivity *
          activationWeight *
          modePenalty *
          stateWeight *
          agreementWeight *
          modulationWeight *
          branchWeight *
          timingPressureWeight *
          reversibilityWeight *
          focusDomainWeight
        const probability = clamp(round1(compressScenarioProbability(rawProbability)), 1, 95)
        const branchConfidenceBonus = clamp((branchWeight - 1) * 0.45, -0.05, 0.05)
        const confidence = clamp(
          Number(
            (
              pattern.confidence * 0.68 +
              (probability / 100) * 0.28 +
              branchConfidenceBonus
            ).toFixed(2)
          ),
          0.1,
          0.98
        )
        const window = resolveWindow(normalizedInput, pattern, astroTimingIndex)
        const timingRelevance = resolveTimingRelevance(normalizedInput, window, astroTimingIndex)
        const timingGranularity = resolveTimingGranularity({
          normalizedInput,
          window,
          astroTimingIndex,
        })
        const evidenceIds = [...new Set([pattern.id, ...pattern.matchedSignalIds.slice(0, 6)])]
        return {
          id: definition.id,
          patternId: pattern.id,
          domain: definition.domain,
          branch: definition.branch,
          title: definition.title,
          rawScore: Number(rawProbability.toFixed(4)),
          probability,
          confidence,
          window,
          timingRelevance,
          timingGranularity,
          precisionReason: buildPrecisionReason({
            lang,
            granularity: timingGranularity,
            normalizedInput,
            astroTimingIndex,
          }),
          risk: definition.risk,
          reversible: definition.reversible,
          actions: definition.actions,
          whyNow: buildWhyNow({
            lang,
            pattern,
            window,
            timingRelevance,
            astroTimingIndex,
            normalizedInput,
          }),
          whyNotYet: buildWhyNotYet({
            lang,
            pattern,
            timingRelevance,
          }),
          entryConditions: buildEntryConditions({
            lang,
            pattern,
            definition,
            probability,
            confidence,
            timingRelevance,
          }),
          abortConditions: buildAbortConditions({
            lang,
            definition,
            pattern,
            probability,
            timingRelevance,
          }),
          sustainConditions: buildSustainConditions({
            lang,
            pattern,
            definition,
            timingRelevance,
          }),
          reversalRisk: buildReversalRisk({
            lang,
            pattern,
            definition,
          }),
          wrongMoveCost: buildWrongMoveCost({
            lang,
            pattern,
            definition,
          }),
          sustainability: buildSustainability({
            pattern,
            probability,
            timingRelevance,
            definition,
          }),
          manifestationHints: buildManifestationHints({
            lang,
            pattern,
            definition,
          }),
          supportingSignalIds: pattern.matchedSignalIds.slice(0, 6),
          evidenceIds,
        } satisfies ScenarioResult
      })
    })
    .sort(
      (a, b) =>
        (b.domain === focusDomain ? 1 : 0) - (a.domain === focusDomain ? 1 : 0) ||
        (b.rawScore || 0) - (a.rawScore || 0) ||
        b.probability - a.probability ||
        b.timingRelevance - a.timingRelevance ||
        b.confidence - a.confidence
    )
}
