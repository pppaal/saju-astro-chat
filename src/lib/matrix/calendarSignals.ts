import { clamp01 } from './componentScores'
import type { DomainKey, MonthlyOverlapPoint } from './types'

type SignalLevel = 'high' | 'medium' | 'caution'

export interface CalendarSignal {
  level: SignalLevel
  trigger: string
  score: number
}

export interface CalendarSignalSummaryLike {
  finalScoreAdjusted?: number
  timeOverlapWeight?: number
  alignmentScore?: number
  confidenceScore?: number
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
}

export function deriveCalendarSignals(summary: CalendarSignalSummaryLike): CalendarSignal[] {
  const signals: CalendarSignal[] = []
  const finalScoreAdjusted = summary.finalScoreAdjusted ?? 0
  const timeOverlapWeight = summary.timeOverlapWeight ?? 1
  const alignmentScore = clamp01(summary.alignmentScore ?? 0)
  const confidenceScore = clamp01(summary.confidenceScore ?? 0)

  if (finalScoreAdjusted >= 7.5 && timeOverlapWeight >= 1.15) {
    signals.push({
      level: 'high',
      trigger: 'Peak Convergence Window',
      score: Math.round(Math.min(10, finalScoreAdjusted) * 1000) / 1000,
    })
  }

  const overlapTimeline = Array.isArray(summary.overlapTimeline) ? summary.overlapTimeline : []
  for (const point of overlapTimeline) {
    if (point.peakLevel === 'peak') {
      signals.push({
        level: 'high',
        trigger: `Peak Convergence Window (${point.month})`,
        score: Math.round(clamp01(point.overlapStrength) * 10 * 1000) / 1000,
      })
    } else if (point.peakLevel === 'high') {
      signals.push({
        level: 'medium',
        trigger: `High Convergence Window (${point.month})`,
        score: Math.round(clamp01(point.overlapStrength) * 10 * 1000) / 1000,
      })
    }
  }

  const overlapTimelineByDomain =
    summary.overlapTimelineByDomain || ({} as Record<DomainKey, MonthlyOverlapPoint[]>)
  for (const [domain, points] of Object.entries(overlapTimelineByDomain) as Array<
    [DomainKey, MonthlyOverlapPoint[]]
  >) {
    if (!Array.isArray(points)) {
      continue
    }
    for (const point of points) {
      if (point.peakLevel === 'peak') {
        signals.push({
          level: 'medium',
          trigger: `Peak ${domain} window (${point.month})`,
          score: Math.round(clamp01(point.overlapStrength) * 10 * 1000) / 1000,
        })
      }
    }
  }

  if (alignmentScore < 0.4) {
    signals.push({
      level: 'caution',
      trigger: 'Cross-system divergence',
      score: Math.round((1 - alignmentScore) * 1000) / 1000,
    })
  }

  if (confidenceScore < 0.5) {
    signals.push({
      level: 'caution',
      trigger: 'Low certainty window',
      score: Math.round((1 - confidenceScore) * 1000) / 1000,
    })
  }

  return signals
}
