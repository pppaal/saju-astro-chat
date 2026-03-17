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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
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
    const natalScore = round2(
      domainTokens
        .filter((token) => token.sourceKind !== 'cycle' && token.sourceKind !== 'transit')
        .reduce((sum, token) => sum + token.weight, 0)
    )
    const timeScore = round2(
      domainTokens
        .filter((token) => token.sourceKind === 'cycle' || token.sourceKind === 'transit' || token.sourceKind === 'advanced_astro')
        .reduce((sum, token) => sum + token.weight, 0) + astroTimeBoost + cycleBoost + transitBoost
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
