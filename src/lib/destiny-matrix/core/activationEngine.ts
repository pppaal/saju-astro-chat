import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type { CompiledFeatureToken } from './tokenCompiler'

export interface DomainActivationSource {
  tokenId: string
  sourceKind: string
  weight: number
  axes: string[]
}

export interface DomainActivation {
  domain: SignalDomain
  natalScore: number
  timeScore: number
  modulationScore: number
  activationScore: number
  dominantAxes: string[]
  sources: DomainActivationSource[]
}

export interface ActivationEngineResult {
  domains: DomainActivation[]
  globalTimePressure: number
  globalVerificationPressure: number
}

const DOMAINS: SignalDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'timing',
  'personality',
  'spirituality',
  'move',
]

const DOMAIN_TIME_WEIGHT: Record<SignalDomain, number> = {
  career: 1,
  relationship: 0.92,
  wealth: 0.96,
  health: 0.88,
  timing: 1.08,
  personality: 0.72,
  spirituality: 0.76,
  move: 1.02,
}

const DOMAIN_TIME_AXES: Record<SignalDomain, string[]> = {
  career: ['verification', 'discipline', 'structure', 'expansion', 'visibility'],
  relationship: ['bonding', 'verification', 'selective_distance', 'pressure'],
  wealth: ['resource_flow', 'verification', 'structure', 'pressure'],
  health: ['recovery', 'pressure', 'verification'],
  timing: ['transition', 'verification', 'pressure', 'meaning'],
  personality: ['meaning', 'verification', 'retreat'],
  spirituality: ['meaning', 'retreat', 'deep_work', 'transition'],
  move: ['transition', 'mobility', 'verification', 'pressure'],
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function resolveDomainTimeBias(input: {
  domain: SignalDomain
  matrixInput: MatrixCalculationInput
  domainTokens: CompiledFeatureToken[]
  astroTimeBoost: number
  cycleBoost: number
  transitBoost: number
}): number {
  const timedTokens = input.domainTokens.filter((token) =>
    ['cycle', 'transit', 'advanced_astro'].includes(token.sourceKind)
  )
  const timedTokenWeight = timedTokens.reduce((sum, token) => sum + token.weight, 0)
  const axisMatchWeight = input.domainTokens.reduce((sum, token) => {
    const axisOverlap = token.axes.filter((axis) => DOMAIN_TIME_AXES[input.domain].includes(axis)).length
    return sum + axisOverlap * token.weight
  }, 0)
  const transitHits = (input.matrixInput.activeTransits || []).filter((item) => {
    const value = String(item).toLowerCase()
    if (input.domain === 'move') return /move|travel|relocat|route|border|uranus|node/.test(value)
    if (input.domain === 'relationship') return /venus|moon|juno|node|eclipse/.test(value)
    if (input.domain === 'career') return /jupiter|saturn|mc|mercury|sun/.test(value)
    if (input.domain === 'wealth') return /jupiter|venus|saturn|pluto|retrograde/.test(value)
    if (input.domain === 'health') return /saturn|mars|chiron|retrograde/.test(value)
    if (input.domain === 'timing') return true
    if (input.domain === 'spirituality') return /neptune|pluto|node|eclipse/.test(value)
    return /retrograde|return|eclipse/.test(value)
  }).length
  const sharedBoost =
    input.astroTimeBoost * 0.3 + input.cycleBoost * 0.45 + input.transitBoost * 0.4
  const tokenBoost = Math.min(timedTokenWeight * 0.16, 0.9)
  const axisBoost = Math.min(axisMatchWeight * 0.03, 0.45)
  const transitBias = Math.min(transitHits * 0.06, 0.24)

  return round2(
    (sharedBoost + tokenBoost + axisBoost + transitBias) * DOMAIN_TIME_WEIGHT[input.domain]
  )
}

export function buildActivationEngine(input: {
  matrixInput: MatrixCalculationInput
  tokens: CompiledFeatureToken[]
}): ActivationEngineResult {
  const astroTiming = input.matrixInput.astroTimingIndex
  const astroTimeBoost = astroTiming
    ? astroTiming.decade * 0.1 +
      astroTiming.annual * 0.2 +
      astroTiming.monthly * 0.3 +
      astroTiming.daily * 0.4
    : 0

  const cycleBoost =
    (input.matrixInput.currentDaeunElement ? 0.18 : 0) +
    (input.matrixInput.currentSaeunElement ? 0.12 : 0) +
    (input.matrixInput.currentWolunElement ? 0.08 : 0) +
    (input.matrixInput.currentIljinElement || input.matrixInput.currentIljinDate ? 0.06 : 0)

  const transitBoost = Math.min((input.matrixInput.activeTransits || []).length * 0.04, 0.2)

  const domains = DOMAINS.map((domain) => {
    const domainTokens = input.tokens.filter((token) => token.domainHints.includes(domain))
    const domainTimeBias = resolveDomainTimeBias({
      domain,
      matrixInput: input.matrixInput,
      domainTokens,
      astroTimeBoost,
      cycleBoost,
      transitBoost,
    })
    const natalScore = round2(
      domainTokens
        .filter((token) => token.sourceKind !== 'cycle' && token.sourceKind !== 'transit')
        .reduce((sum, token) => sum + token.weight, 0)
    )
    const timeScore = round2(
      domainTokens
        .filter((token) => token.sourceKind === 'cycle' || token.sourceKind === 'transit' || token.sourceKind === 'advanced_astro')
        .reduce((sum, token) => sum + token.weight, 0) + domainTimeBias
    )
    const modulationScore = round2(
      domainTokens
        .filter((token) => token.role === 'modulator' || token.role === 'ornamental')
        .reduce((sum, token) => sum + token.weight * 0.5, 0)
    )
    const activationScore = round2(clamp(natalScore * 0.45 + timeScore * 0.4 + modulationScore * 0.15, 0, 6))
    const axisCounts = new Map<string, number>()
    for (const token of domainTokens) {
      for (const axis of token.axes) {
        axisCounts.set(axis, (axisCounts.get(axis) || 0) + token.weight)
      }
    }
    const dominantAxes = [...axisCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([axis]) => axis)

    return {
      domain,
      natalScore,
      timeScore,
      modulationScore,
      activationScore,
      dominantAxes,
      sources: domainTokens
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8)
        .map((token) => ({
          tokenId: token.id,
          sourceKind: token.sourceKind,
          weight: token.weight,
          axes: [...token.axes],
        })),
    } satisfies DomainActivation
  })

  const globalTimePressure = round2(clamp(cycleBoost + transitBoost + astroTimeBoost, 0, 1.2))
  const retrogradeBoost = (input.matrixInput.activeTransits || []).some((item) =>
    String(item).toLowerCase().includes('retrograde')
  )
    ? 0.24
    : 0
  const globalVerificationPressure = round2(
    clamp(
      domains.reduce(
        (sum, domain) => sum + (domain.dominantAxes.includes('verification') ? 0.12 : 0),
        0
      ) + retrogradeBoost,
      0,
      1.2
    )
  )

  return {
    domains,
    globalTimePressure,
    globalVerificationPressure,
  }
}
