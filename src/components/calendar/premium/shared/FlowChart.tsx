'use client'

/**
 * 흐름 area chart — year(12mo) / month(N days) / day(24h) tier 공용.
 * 추가 reference dot으로 베스트/주의/수렴 포인트를 시각화.
 *
 * type 으로 reference dot 색 결정:
 *   - best: emerald
 *   - caution: rose
 *   - convergence: purple
 *   - normal: dot 안 찍음
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  Label,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { getCalLabels, type CalLocale } from '../labels'
import ChartTooltip from './ChartTooltip'

export type PointType = 'best' | 'caution' | 'convergence' | 'normal'

export interface FlowPoint {
  label: string
  score: number | null
  type: PointType
  fullLabel: string
}

interface Props {
  data: FlowPoint[]
  /** 카드 헤더 — 기본 locale */
  title?: string
  /** 카드 sub 한 줄 */
  subtitle?: string
  /** y축 라벨 단위 — 기본 locale */
  yLabel?: string
  /** 차트 높이 — 기본 220 */
  height?: number
  /** X축 라벨 보일 간격 (recharts interval) */
  xInterval?: number
  /** 점 클릭 핸들 — 받으면 라벨 텍스트 전달 */
  onPointClick?: (label: string) => void
  /** "지금" 가이드 라벨 — 데이터 X축 라벨과 정확히 일치해야 그려짐 */
  nowLabel?: string | null
  /** UI locale */
  locale?: CalLocale
}

interface TooltipPayload {
  payload: FlowPoint
}

function FlowTooltip({
  active,
  payload,
  yLabel,
  locale,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  yLabel: string
  locale?: CalLocale
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  const t = getCalLabels(locale)
  return (
    <ChartTooltip
      label={d.fullLabel}
      yLabel={yLabel}
      value={d.score}
      pointType={d.type}
      bestLabel={t.tooltipBest}
      cautionLabel={t.tooltipCaution}
      convergenceLabel={t.tooltipConvergence}
    />
  )
}

export default function FlowChart({
  data,
  title,
  subtitle,
  yLabel,
  height = 220,
  xInterval = 0,
  onPointClick,
  nowLabel,
  locale,
}: Props) {
  const tLabels = getCalLabels(locale)
  const cardTitle = title ?? tLabels.flowTitle
  const yAxisLabel = yLabel ?? tLabels.flowYLabel
  const validScores = data.map((d) => d.score).filter((s): s is number => typeof s === 'number')
  if (validScores.length === 0) return null
  const yMin = Math.max(0, Math.floor(Math.min(...validScores) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...validScores) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50

  // 점 타입별 분류 — recharts ReferenceDot은 정적이라 미리 픽
  const bestPts = data.filter((d) => d.type === 'best' && typeof d.score === 'number')
  const cautionPts = data.filter((d) => d.type === 'caution' && typeof d.score === 'number')
  const convergencePts = data.filter((d) => d.type === 'convergence' && typeof d.score === 'number')

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/50 to-zinc-950/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-xl overflow-hidden">
      {/* subtle decorative glow — top-right */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 bg-amber-500/8 blur-3xl rounded-full" />
      <div className="relative flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          {cardTitle}
        </h3>
      </div>
      {subtitle && <p className="relative text-xs text-zinc-500 mb-3 -mt-2">{subtitle}</p>}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 14, right: 20, left: -14, bottom: 0 }}
            onClick={(e) => {
              if (!onPointClick) return
              const p = (e as unknown as { activePayload?: Array<{ payload?: FlowPoint }> })
                ?.activePayload?.[0]?.payload
              if (p?.label) onPointClick(p.label)
            }}
          >
            <defs>
              <linearGradient id="flowAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="flowStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <filter id="flowGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#52525288"
              fontSize={11}
              interval={xInterval}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#52525288"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<FlowTooltip yLabel={yAxisLabel} locale={locale} />}
              cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.6 }}
            />
            {showNeutral50 && (
              <ReferenceLine y={50} stroke="#52525266" strokeWidth={1} strokeDasharray="4 4" />
            )}
            {nowLabel && (
              <ReferenceLine x={nowLabel} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3">
                <Label
                  value={tLabels.nowLabel}
                  position="insideTop"
                  offset={8}
                  fill="#fbbf24"
                  fontSize={10}
                  fontWeight={700}
                />
              </ReferenceLine>
            )}
            <Area
              type="monotone"
              dataKey="score"
              stroke="url(#flowStroke)"
              strokeWidth={2.5}
              fill="url(#flowAmber)"
              dot={false}
              activeDot={{
                r: 5,
                fill: '#fbbf24',
                stroke: '#0a0f1e',
                strokeWidth: 2,
                filter: 'url(#dotGlow)',
              }}
              connectNulls
              filter="url(#flowGlow)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
            {bestPts.map((p) => (
              <ReferenceDot
                key={`best-${p.label}`}
                x={p.label}
                y={p.score as number}
                r={6}
                fill="#10b981"
                stroke="#022c22"
                strokeWidth={2}
                filter="url(#dotGlow)"
              />
            ))}
            {cautionPts.map((p) => (
              <ReferenceDot
                key={`caution-${p.label}`}
                x={p.label}
                y={p.score as number}
                r={6}
                fill="#f43f5e"
                stroke="#4c0519"
                strokeWidth={2}
                filter="url(#dotGlow)"
              />
            ))}
            {convergencePts.map((p) => (
              <ReferenceDot
                key={`conv-${p.label}`}
                x={p.label}
                y={p.score as number}
                r={6}
                fill="#a855f7"
                stroke="#3b0764"
                strokeWidth={2}
                filter="url(#dotGlow)"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
