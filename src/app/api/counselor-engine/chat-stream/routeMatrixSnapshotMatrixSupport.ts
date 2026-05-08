import type { MatrixCalculationInput, TransitCycle } from '@/lib/destiny-matrix/types'
import type { FiveElement, PillarData } from '@/lib/Saju/types'
import { STEMS } from '@/lib/Saju/constants'

export type MatrixHighlight = { layer?: number; keyword?: string; score?: number }

const ELEMENT_MAP: Record<string, FiveElement> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const TRANSIT_CYCLE_SET = new Set<TransitCycle>([
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])

export function normalizeElementToFiveElement(value: unknown): FiveElement | undefined {
  if (typeof value !== 'string') return undefined
  return ELEMENT_MAP[value.trim().toLowerCase()] || ELEMENT_MAP[value.trim()]
}

export function inferElementFromStemName(stemName: string | undefined): FiveElement | undefined {
  if (!stemName) return undefined
  const stem = STEMS.find((item) => item.name === stemName)
  return normalizeElementToFiveElement(stem?.element)
}

export function normalizeTransitCycles(value: unknown): MatrixCalculationInput['activeTransits'] {
  if (!Array.isArray(value)) return []

  const out: TransitCycle[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      if (TRANSIT_CYCLE_SET.has(item as TransitCycle)) out.push(item as TransitCycle)
      continue
    }
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const cycleCandidate =
      typeof record.cycle === 'string'
        ? record.cycle
        : typeof record.type === 'string'
          ? record.type
          : typeof record.id === 'string'
            ? record.id
            : undefined
    if (cycleCandidate && TRANSIT_CYCLE_SET.has(cycleCandidate as TransitCycle)) {
      out.push(cycleCandidate as TransitCycle)
    }
  }

  return Array.from(new Set(out))
}

export function pickSajuPillars(raw: Record<string, unknown>): {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
} {
  const nested = raw.pillars as Record<string, unknown> | undefined
  return {
    yearPillar: (raw.yearPillar || nested?.year) as PillarData | undefined,
    monthPillar: (raw.monthPillar || nested?.month) as PillarData | undefined,
    dayPillar: (raw.dayPillar || nested?.day) as PillarData | undefined,
    timePillar: (raw.timePillar || nested?.time) as PillarData | undefined,
  }
}

export function buildSibsinDistributionFromPillars(input: {
  yearPillar?: PillarData
  monthPillar?: PillarData
  dayPillar?: PillarData
  timePillar?: PillarData
}): MatrixCalculationInput['sibsinDistribution'] {
  const out: Record<string, number> = {}
  for (const pillar of [input.yearPillar, input.monthPillar, input.dayPillar, input.timePillar]) {
    const cheon = pillar?.heavenlyStem?.sibsin
    const ji = pillar?.earthlyBranch?.sibsin
    if (typeof cheon === 'string' && cheon.trim()) out[cheon] = (out[cheon] || 0) + 1
    if (typeof ji === 'string' && ji.trim()) out[ji] = (out[ji] || 0) + 1
  }
  return out as MatrixCalculationInput['sibsinDistribution']
}

export function normalizeCalendarSignalLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (!item || typeof item !== 'object') return ''
          const signal = item as { level?: string; trigger?: string; score?: number }
          const trigger = signal.trigger || ''
          if (!trigger) return ''
          const score =
            typeof signal.score === 'number' && Number.isFinite(signal.score)
              ? ` (${signal.score.toFixed(1)})`
              : ''
          return signal.level ? `${signal.level}: ${trigger}${score}` : `${trigger}${score}`
        })
        .filter(Boolean)
    )
  ).slice(0, 6)
}

export function normalizeOverlapTimelineLines(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (!item || typeof item !== 'object') return ''
          const point = item as { month?: string; overlapStrength?: number; peakLevel?: string }
          const month = typeof point.month === 'string' ? point.month : ''
          const overlap =
            typeof point.overlapStrength === 'number' && Number.isFinite(point.overlapStrength)
              ? point.overlapStrength.toFixed(2)
              : ''
          const peak = typeof point.peakLevel === 'string' ? point.peakLevel : ''
          return [month, overlap ? `overlap ${overlap}` : '', peak].filter(Boolean).join(' ')
        })
        .filter(Boolean)
    )
  ).slice(0, 6)
}

export function normalizeDomainScoreMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw
      continue
    }
    if (!raw || typeof raw !== 'object') continue
    const candidate = raw as { finalScoreAdjusted?: number; baseFinalScore?: number }
    if (
      typeof candidate.finalScoreAdjusted === 'number' &&
      Number.isFinite(candidate.finalScoreAdjusted)
    ) {
      out[key] = candidate.finalScoreAdjusted
      continue
    }
    if (typeof candidate.baseFinalScore === 'number' && Number.isFinite(candidate.baseFinalScore)) {
      out[key] = candidate.baseFinalScore
    }
  }
  return out
}

export function buildTopLayers(
  highlights: MatrixHighlight[]
): Array<{ layer: number; score: number }> {
  const grouped = new Map<number, number[]>()
  for (const item of highlights) {
    const layer = Number(item.layer || 0)
    const score = Number(item.score || 0)
    if (!layer || !score) continue
    if (!grouped.has(layer)) grouped.set(layer, [])
    grouped.get(layer)!.push(score)
  }
  return Array.from(grouped.entries())
    .map(([layer, scores]) => ({
      layer,
      score: Number((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
