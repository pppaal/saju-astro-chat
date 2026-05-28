'use client'

/**
 * 차트 공용 tooltip — FlowChart / DailyHourlyChart 두 곳에서 동일 모양.
 *
 * 단일 값(area 한 줄) 모드 + 멀티 값(saju/astro 두 줄) 모드 모두 지원.
 *   - <ChartTooltip variant="single" payload={[{value, color}]} ... />
 *   - <ChartTooltip variant="multi" payload={[saju, astro]} ... />
 *
 * type 별 border + shadow 색조 (best/caution/convergence/normal) — 어느
 * 종류 포인트 호버하는지 톤으로 즉시 전달.
 */

import { Star, AlertTriangle, Sparkles } from 'lucide-react'

export type TooltipPointType = 'best' | 'caution' | 'convergence' | 'normal'

interface SeriesPoint {
  /** "사주" / "점성" 같은 시리즈 라벨 */
  name: string
  /** 0-100 값 */
  value: number
  /** dot 색 hex */
  color: string
}

interface Props {
  /** 헤더 — "5월 21일" 같은 풀 라벨 */
  label: string
  /** 단일 시리즈 (FlowChart 류) 일 때 yLabel + score */
  yLabel?: string
  /** 단일 시리즈 점수 */
  value?: number | null
  /** 멀티 시리즈 (DailyHourlyChart 류) */
  series?: SeriesPoint[]
  /** 포인트 종류 — border + shadow tone + footer chip */
  pointType?: TooltipPointType
  /** locale 별 footer 라벨 */
  bestLabel?: string
  cautionLabel?: string
  convergenceLabel?: string
}

export default function ChartTooltip({
  label,
  yLabel,
  value,
  series,
  pointType = 'normal',
  bestLabel,
  cautionLabel,
  convergenceLabel,
}: Props) {
  const showSeries = series && series.length > 0
  return (
    <div className="min-w-[120px] bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3 py-2 rounded-lg shadow-2xl text-xs">
      <p className="text-neutral-400 mb-1">{label}</p>

      {!showSeries && typeof value !== 'undefined' && (
        <p className="text-amber-400 font-medium tracking-wide">
          {yLabel ?? ''} <span className="text-white ml-1 tabular-nums">{value ?? '—'}</span>
        </p>
      )}

      {showSeries && (
        <div className="space-y-0.5">
          {series!.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-neutral-400">{p.name}</span>
              <span className="font-medium tabular-nums text-white ml-auto">{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {pointType === 'best' && bestLabel && (
        <p className="text-emerald-400 mt-1 flex items-center gap-1">
          <Star size={10} className="fill-emerald-400" /> {bestLabel}
        </p>
      )}
      {pointType === 'caution' && cautionLabel && (
        <p className="text-rose-400 mt-1 flex items-center gap-1">
          <AlertTriangle size={10} /> {cautionLabel}
        </p>
      )}
      {pointType === 'convergence' && convergenceLabel && (
        <p className="text-violet-400 mt-1 flex items-center gap-1">
          <Sparkles size={10} /> {convergenceLabel}
        </p>
      )}
    </div>
  )
}
