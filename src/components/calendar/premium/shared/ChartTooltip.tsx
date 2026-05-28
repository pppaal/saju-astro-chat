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

const ACCENT: Record<TooltipPointType, string> = {
  best: 'border-emerald-400/40 shadow-emerald-500/20',
  caution: 'border-rose-400/40 shadow-rose-500/20',
  convergence: 'border-violet-400/40 shadow-violet-500/20',
  normal: 'border-amber-400/30 shadow-amber-500/10',
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
  const accent = ACCENT[pointType]
  const showSeries = series && series.length > 0
  return (
    <div
      className={`min-w-[140px] bg-zinc-950/90 backdrop-blur-md border ${accent} px-3.5 py-2.5 rounded-xl shadow-2xl`}
    >
      <p className="text-amber-300 font-bold text-[11px] mb-1.5 tracking-wide">{label}</p>

      {!showSeries && typeof value !== 'undefined' && (
        <p className="text-white text-sm font-medium">
          {yLabel && <span className="text-zinc-400">{yLabel} </span>}
          <span className="font-black text-lg ml-1 tabular-nums bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            {value ?? '—'}
          </span>
        </p>
      )}

      {showSeries && (
        <div className="space-y-1">
          {series!.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}
              />
              <span className="text-zinc-300 font-medium">{p.name}</span>
              <span className="font-black tabular-nums text-white ml-auto">{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {pointType === 'best' && bestLabel && (
        <p className="text-emerald-400 text-[11px] mt-1.5 flex items-center gap-1 font-medium">
          <Star size={11} className="fill-emerald-400" /> {bestLabel}
        </p>
      )}
      {pointType === 'caution' && cautionLabel && (
        <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1 font-medium">
          <AlertTriangle size={11} /> {cautionLabel}
        </p>
      )}
      {pointType === 'convergence' && convergenceLabel && (
        <p className="text-violet-400 text-[11px] mt-1.5 flex items-center gap-1 font-medium">
          <Sparkles size={11} /> {convergenceLabel}
        </p>
      )}
    </div>
  )
}
