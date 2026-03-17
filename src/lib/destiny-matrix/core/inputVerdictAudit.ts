import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type { FeatureCompilationResult } from './tokenCompiler'
import type { ActivationEngineResult } from './activationEngine'
import type { RuleEngineResult } from './ruleEngine'
import type { StateEngineResult } from './stateEngine'
import type { PatternResult } from './patternEngine'
import type { ScenarioResult } from './scenarioEngine'
import type { DecisionEngineResult } from './decisionEngine'
import type { DestinyCoreCanonicalOutput } from './types'
import type { MatrixCrossInputKey } from '@/lib/destiny-matrix/inputCross'

export type VerdictAuditInputKey = MatrixCrossInputKey | 'profileContext' | 'currentDateIso' | 'startYearMonth'

export interface InputVerdictAuditEntry {
  key: VerdictAuditInputKey
  present: boolean
  tokenCount: number
  sampleTokenIds: string[]
  activationDomains: SignalDomain[]
  ruleDomains: SignalDomain[]
  stateDomains: SignalDomain[]
  patternIds: string[]
  scenarioIds: string[]
  focusVerdict: boolean
  advisoryDomains: SignalDomain[]
  manifestationDomains: SignalDomain[]
  timingDomains: SignalDomain[]
  coverageScore: number
  verdictPressureScore: number
  influenceScore: number
  notes: string[]
}

export interface InputVerdictAuditResult {
  entries: InputVerdictAuditEntry[]
  summary: {
    highCoverageKeys: VerdictAuditInputKey[]
    highVerdictPressureKeys: VerdictAuditInputKey[]
    coverageOnlyKeys: VerdictAuditInputKey[]
    weakVerdictPressureKeys: VerdictAuditInputKey[]
    unusedKeys: VerdictAuditInputKey[]
  }
}

const AUDIT_KEYS: VerdictAuditInputKey[] = [
  'dayMasterElement',
  'pillarElements',
  'sibsinDistribution',
  'twelveStages',
  'relations',
  'geokguk',
  'yongsin',
  'currentDaeunElement',
  'currentSaeunElement',
  'currentWolunElement',
  'currentIljinElement',
  'currentIljinDate',
  'shinsalList',
  'dominantWesternElement',
  'planetHouses',
  'planetSigns',
  'aspects',
  'activeTransits',
  'astroTimingIndex',
  'asteroidHouses',
  'extraPointSigns',
  'advancedAstroSignals',
  'sajuSnapshot',
  'astrologySnapshot',
  'crossSnapshot',
  'profileContext',
  'currentDateIso',
  'startYearMonth',
]

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function isPresent(input: MatrixCalculationInput, key: VerdictAuditInputKey): boolean {
  const value = (input as unknown as Record<string, unknown>)[key]
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return value !== undefined && value !== null && value !== ''
}

function matchesKey(key: VerdictAuditInputKey, tokenId: string, sourceKind: string): boolean {
  switch (key) {
    case 'dayMasterElement':
      return sourceKind === 'day_master'
    case 'pillarElements':
      return sourceKind === 'pillar_element'
    case 'sibsinDistribution':
      return sourceKind === 'sibsin'
    case 'twelveStages':
      return sourceKind === 'twelve_stage'
    case 'relations':
      return sourceKind === 'relation'
    case 'geokguk':
      return sourceKind === 'geokguk'
    case 'yongsin':
      return sourceKind === 'yongsin'
    case 'currentDaeunElement':
      return sourceKind === 'cycle' && tokenId.startsWith('daeun:')
    case 'currentSaeunElement':
      return sourceKind === 'cycle' && tokenId.startsWith('saeun:')
    case 'currentWolunElement':
      return sourceKind === 'cycle' && tokenId.startsWith('wolun:')
    case 'currentIljinElement':
      return sourceKind === 'cycle' && tokenId.startsWith('ilun:') && !tokenId.startsWith('ilun-date:')
    case 'currentIljinDate':
      return sourceKind === 'cycle' && tokenId.startsWith('ilun-date:')
    case 'shinsalList':
      return sourceKind === 'shinsal'
    case 'dominantWesternElement':
      return sourceKind === 'dominant_element'
    case 'planetHouses':
      return sourceKind === 'planet_house'
    case 'planetSigns':
      return sourceKind === 'planet_sign'
    case 'aspects':
      return sourceKind === 'aspect'
    case 'activeTransits':
      return sourceKind === 'transit'
    case 'astroTimingIndex':
      return tokenId.startsWith('crossSnapshot:astroTimingIndex') || tokenId.startsWith('advanced:astroTimingIndex')
    case 'asteroidHouses':
      return sourceKind === 'asteroid_house'
    case 'extraPointSigns':
      return sourceKind === 'extra_point'
    case 'advancedAstroSignals':
      return sourceKind === 'advanced_astro'
    case 'sajuSnapshot':
      return tokenId.startsWith('sajuSnapshot:')
    case 'astrologySnapshot':
      return tokenId.startsWith('astrologySnapshot:')
    case 'crossSnapshot':
      return tokenId.startsWith('crossSnapshot:')
    case 'profileContext':
      return tokenId.startsWith('profileContext:')
    case 'currentDateIso':
      return tokenId === 'profileContext:currentDateIso'
    case 'startYearMonth':
      return tokenId === 'profileContext:startYearMonth'
    default:
      return false
  }
}

export function buildInputVerdictAudit(input: {
  matrixInput: MatrixCalculationInput
  features: FeatureCompilationResult
  activation: ActivationEngineResult
  rules: RuleEngineResult
  states: StateEngineResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  canonical: DestinyCoreCanonicalOutput
}): InputVerdictAuditResult {
  const entries = AUDIT_KEYS.map((key) => {
    const matchedTokens = input.features.tokens.filter((token) => matchesKey(key, token.id, token.sourceKind))
    const tokenDomainHints = uniq(matchedTokens.flatMap((token) => token.domainHints))
    const activationDomains = uniq(
      input.activation.domains
        .filter((domain) => {
          const sourceMatched = domain.sources.some((source) =>
            matchedTokens.some((token) => token.id === source.tokenId)
          )
          const hintMatched =
            tokenDomainHints.includes(domain.domain) &&
            (domain.activationScore > 0 || domain.natalScore > 0 || domain.timeScore > 0 || domain.modulationScore > 0)
          return sourceMatched || hintMatched
        })
        .map((domain) => domain.domain)
    )
    const ruleDomains = uniq(
      input.rules.domains
        .filter(
          (rule) =>
            activationDomains.includes(rule.domain) &&
            (rule.amplify.length > 0 || rule.suppress.length > 0 || rule.gate.length > 0 || rule.delay.length > 0 || rule.convert.length > 0)
        )
        .map((rule) => rule.domain)
    )
    const stateDomains = uniq(
      input.states.domains.filter((state) => activationDomains.includes(state.domain)).map((state) => state.domain)
    )
    const patternIds = uniq(
      input.patterns
        .filter((pattern) => pattern.domains.some((domain) => activationDomains.includes(domain)))
        .map((pattern) => pattern.id)
    )
    const scenarioIds = uniq(
      input.scenarios
        .filter((scenario) => activationDomains.includes(scenario.domain))
        .map((scenario) => scenario.id)
    )
    const advisoryDomains = uniq(
      input.canonical.advisories.filter((item) => activationDomains.includes(item.domain)).map((item) => item.domain)
    )
    const manifestationDomains = uniq(
      input.canonical.manifestations.filter((item) => activationDomains.includes(item.domain)).map((item) => item.domain)
    )
    const timingDomains = uniq(
      input.canonical.domainTimingWindows.filter((item) => activationDomains.includes(item.domain)).map((item) => item.domain)
    )

    const focusVerdict = activationDomains.includes(input.canonical.focusDomain)
    const topOptionId = input.decisionEngine.topOptionId || ''
    const decisionTouchesDomain =
      activationDomains.length > 0 &&
      activationDomains.some((domain) => topOptionId.startsWith(`${domain}__`))
    const topScenarioTouchesDomain =
      activationDomains.length > 0 &&
      input.canonical.topScenarios.some((scenario) => activationDomains.includes(scenario.domain))

    const coverageScore = Number(
      Math.min(
        1,
        matchedTokens.length * 0.06 +
          activationDomains.length * 0.1 +
          ruleDomains.length * 0.1 +
          stateDomains.length * 0.08
      ).toFixed(2)
    )
    const verdictPressureScore = Number(
      Math.min(
        1,
        Math.min(patternIds.length, 3) * 0.08 +
          Math.min(scenarioIds.length, 4) * 0.07 +
          (focusVerdict ? 0.18 : 0) +
          advisoryDomains.length * 0.08 +
          manifestationDomains.length * 0.08 +
          timingDomains.length * 0.07 +
          (decisionTouchesDomain ? 0.12 : 0) +
          (topScenarioTouchesDomain ? 0.08 : 0)
      ).toFixed(2)
    )
    const influenceScore = Number((coverageScore * 0.45 + verdictPressureScore * 0.55).toFixed(2))

    const notes: string[] = []
    if (matchedTokens.length === 0 && isPresent(input.matrixInput, key)) notes.push('present_but_no_tokens')
    if (matchedTokens.length > 0 && activationDomains.length === 0) notes.push('tokenized_but_not_activated')
    if (activationDomains.length > 0 && scenarioIds.length === 0) notes.push('activated_but_no_scenarios')
    if (focusVerdict) notes.push('touches_focus_domain')
    if (coverageScore >= 0.5 && verdictPressureScore < 0.35) notes.push('high_coverage_low_verdict_pressure')
    if (decisionTouchesDomain) notes.push('touches_top_decision')
    if (topScenarioTouchesDomain) notes.push('touches_top_scenarios')

    return {
      key,
      present: isPresent(input.matrixInput, key),
      tokenCount: matchedTokens.length,
      sampleTokenIds: matchedTokens.slice(0, 6).map((token) => token.id),
      activationDomains,
      ruleDomains,
      stateDomains,
      patternIds: patternIds.slice(0, 8),
      scenarioIds: scenarioIds.slice(0, 10),
      focusVerdict,
      advisoryDomains,
      manifestationDomains,
      timingDomains,
      coverageScore,
      verdictPressureScore,
      influenceScore,
      notes,
    } satisfies InputVerdictAuditEntry
  })

  return {
    entries,
    summary: {
      highCoverageKeys: entries.filter((entry) => entry.present && entry.coverageScore >= 0.6).map((entry) => entry.key),
      highVerdictPressureKeys: entries
        .filter((entry) => entry.present && entry.verdictPressureScore >= 0.6)
        .map((entry) => entry.key),
      coverageOnlyKeys: entries
        .filter((entry) => entry.present && entry.coverageScore >= 0.6 && entry.verdictPressureScore < 0.35)
        .map((entry) => entry.key),
      weakVerdictPressureKeys: entries
        .filter((entry) => entry.present && entry.verdictPressureScore > 0 && entry.verdictPressureScore < 0.35)
        .map((entry) => entry.key),
      unusedKeys: entries.filter((entry) => entry.present && entry.coverageScore === 0 && entry.verdictPressureScore === 0).map((entry) => entry.key),
    },
  }
}
