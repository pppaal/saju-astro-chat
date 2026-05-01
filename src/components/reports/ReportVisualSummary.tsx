'use client'

/**
 * Report Visual Summary — 리포트 상단에 표시되는 시각 요약.
 * 5행 도넛 + Confidence Badge + Cross Map.
 *
 * 데이터가 없으면 graceful 미렌더링 (null return).
 */

import FiveElementsDonut from './FiveElementsDonut'
import ConfidenceScoreBadge from './ConfidenceScoreBadge'
import SajuAstroCrossMap from './SajuAstroCrossMap'

interface ReportVisualSummaryProps {
  fiveElements?: { wood?: number; fire?: number; earth?: number; metal?: number; water?: number }
  confidence?: {
    scorePercent: number
    band: 'high' | 'medium' | 'low' | 'conflict'
    description?: string
  }
  crossSignals?: Array<{
    axis: string
    saju: string
    astro: string
    meaning?: string
    strength?: 'strong' | 'medium' | 'weak'
    direction?: 'flow' | 'caution' | 'neutral'
  }>
  className?: string
}

export default function ReportVisualSummary({
  fiveElements,
  confidence,
  crossSignals,
  className = '',
}: ReportVisualSummaryProps) {
  // 모든 데이터 없으면 미렌더링
  const hasFive = fiveElements && Object.values(fiveElements).some((v) => (v || 0) > 0)
  const hasConfidence = confidence && typeof confidence.scorePercent === 'number'
  const hasCross = crossSignals && crossSignals.length > 0
  if (!hasFive && !hasConfidence && !hasCross) return null

  return (
    <div className={`mx-auto max-w-6xl space-y-6 px-4 ${className}`}>
      {(hasFive || hasConfidence) && (
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:grid-cols-2">
          {hasFive && fiveElements && (
            <div className="flex flex-col items-center gap-3 border-b border-white/[0.07] pb-6 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
                5행 분포
              </h2>
              <FiveElementsDonut fiveElements={fiveElements} />
            </div>
          )}
          {hasConfidence && confidence && (
            <div className="flex flex-col justify-center gap-3">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
                사주·점성 합의 강도
              </h2>
              <ConfidenceScoreBadge
                scorePercent={confidence.scorePercent}
                band={confidence.band}
                description={confidence.description}
                size="lg"
              />
            </div>
          )}
        </section>
      )}
      {hasCross && crossSignals && <SajuAstroCrossMap signals={crossSignals} />}
    </div>
  )
}
