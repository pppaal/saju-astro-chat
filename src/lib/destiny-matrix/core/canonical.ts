import type { MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type {
  BuildCoreCanonicalOutputInput,
  CoreInteractionHit,
  CoreLayerScore,
  CoreTimelineHit,
  DestinyCoreCanonicalOutput,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeToUnit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value >= 0 && value <= 1) return round2(clamp(value, 0, 1))
  if (value > 1 && value <= 100) return round2(clamp(value / 100, 0, 1))
  return null
}

function buildLayerScores(input: BuildCoreCanonicalOutputInput): CoreLayerScore[] {
  const grouped = new Map<number, CoreLayerScore>()
  for (const signal of input.signalSynthesis.normalizedSignals || []) {
    const prev = grouped.get(signal.layer) || {
      layer: signal.layer,
      signalCount: 0,
      avgScore: 0,
      strengthCount: 0,
      cautionCount: 0,
      balanceCount: 0,
    }
    prev.signalCount += 1
    prev.avgScore += signal.score
    if (signal.polarity === 'strength') prev.strengthCount += 1
    else if (signal.polarity === 'caution') prev.cautionCount += 1
    else prev.balanceCount += 1
    grouped.set(signal.layer, prev)
  }
  return [...grouped.values()]
    .map((layer) => ({
      ...layer,
      avgScore: layer.signalCount > 0 ? round2(layer.avgScore / layer.signalCount) : 0,
    }))
    .sort((a, b) => a.layer - b.layer)
}

function buildInteractionHits(input: BuildCoreCanonicalOutputInput): CoreInteractionHit[] {
  return (input.signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 16)
    .map((signal) => ({
      id: signal.id,
      layer: signal.layer,
      rowKey: signal.rowKey,
      colKey: signal.colKey,
      domainHints: [...(signal.domainHints || [])],
      polarity: signal.polarity,
      score: signal.score,
      keyword: signal.keyword,
      sajuBasis: signal.sajuBasis,
      astroBasis: signal.astroBasis,
    }))
}

function buildTimelineHits(input: BuildCoreCanonicalOutputInput): CoreTimelineHit[] {
  const hits: CoreTimelineHit[] = []
  const fromScenarios = (input.scenarios || [])
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 8)
    .map<CoreTimelineHit>((scenario) => ({
      id: `scenario:${scenario.id}`,
      source: 'scenario',
      domain: scenario.domain,
      window: scenario.window,
      confidence: round2(clamp(scenario.confidence, 0, 1)),
      evidenceIds: [scenario.patternId],
    }))
  hits.push(...fromScenarios)

  const timeline = (input.matrixSummary?.overlapTimeline || [])
    .slice()
    .sort((a, b) => b.overlapStrength - a.overlapStrength)
    .slice(0, 4)
    .map<CoreTimelineHit>((point: MonthlyOverlapPoint) => ({
      id: `overlap:${point.month}`,
      source: 'matrix-overlap',
      domain: 'timing',
      window: point.month,
      confidence: round2(clamp(point.overlapStrength, 0, 1)),
      evidenceIds: [point.month, point.peakLevel],
    }))
  hits.push(...timeline)
  return hits
}

function buildEvidenceRefs(input: BuildCoreCanonicalOutputInput): Record<string, string[]> {
  const refs: Record<string, string[]> = {}
  for (const claim of input.signalSynthesis.claims || []) {
    refs[claim.claimId] = [...new Set(claim.evidence || [])]
  }
  refs.__caution__ = (input.signalSynthesis.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 10)
    .map((signal) => signal.id)
  return refs
}

function buildCautions(input: BuildCoreCanonicalOutputInput): string[] {
  return (input.signalSynthesis.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8)
    .map((signal) => signal.id)
}

function resolveConfidence(input: BuildCoreCanonicalOutputInput): number {
  const summaryConfidence = normalizeToUnit(input.matrixSummary?.confidenceScore)
  if (typeof summaryConfidence === 'number') return summaryConfidence
  const scenarioConfidence =
    input.scenarios.length > 0
      ? input.scenarios.reduce((sum, scenario) => sum + clamp(scenario.confidence, 0, 1), 0) /
        input.scenarios.length
      : 0.5
  return round2(clamp(scenarioConfidence, 0, 1))
}

export function buildCoreCanonicalOutput(
  input: BuildCoreCanonicalOutputInput
): DestinyCoreCanonicalOutput {
  const claimIds = [...new Set((input.signalSynthesis.claims || []).map((claim) => claim.claimId))]
    .filter((id) => id.length > 0)
    .sort()

  return {
    version: 'v1',
    claimIds,
    evidenceRefs: buildEvidenceRefs(input),
    confidence: resolveConfidence(input),
    crossAgreement: normalizeToUnit(input.crossAgreement),
    phase: input.strategy.phase,
    attackPercent: input.strategy.attackPercent,
    defensePercent: input.strategy.defensePercent,
    cautions: buildCautions(input),
    layerScores: buildLayerScores(input),
    interactionHits: buildInteractionHits(input),
    timelineHits: buildTimelineHits(input),
  }
}
