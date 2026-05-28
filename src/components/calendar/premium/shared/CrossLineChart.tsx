'use client'

/**
 * 사주 vs 점성 dual line — 두 시스템의 일별 축 점수를 한 차트에 겹쳐서
 * "어디서 합쳐지고 어디서 갈라지나" 한눈에 보이게.
 *
 * FlowChart 가 단일 area 라면 이건 두 라인 (amber=사주, cyan=점성) + 교차 지점
 * 마커. aligned + bothSystems 인 일자엔 emerald dot, opposed 인 일자엔 rose
 * dot 을 ReferenceDot 으로 찍어 시각화.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
} from 'recharts'
import { getCalLabels, type CalLocale } from '../labels'
import ChartTooltip from './ChartTooltip'

export interface CrossLinePoint {
  /** X축 라벨 ("5일" / "5") */
  label: string
  /** 풀 라벨 (tooltip header) — "5월 5일" 류 */
  fullLabel: string
  /** 사주축 0-100 */
  saju: number | null
  /** 점성축 0-100 */
  astro: number | null
  /** axisAgreement — 마커 색 결정 */
  agreement: 'aligned' | 'mixed' | 'opposed' | null
  /** bothSystems (양쪽 다 무거운 신호) — aligned 일 때만 emerald dot 자격 */
  bothSystems?: boolean
}

interface Props {
  data: CrossLinePoint[]
  /** 차트 높이 — 기본 160 */
  height?: number
  /** X축 라벨 보일 간격 (recharts interval) */
  xInterval?: number
  /** "지금" 가이드 라벨 — 데이터 X축 라벨과 정확히 일치해야 그려짐 */
  nowLabel?: string | null
  locale?: CalLocale
}

interface TooltipPayloadEntry {
  payload: CrossLinePoint
}

function CrossTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  locale?: CalLocale
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  const t = getCalLabels(locale)
  const series: Array<{ name: string; value: number; color: string }> = []
  if (typeof d.saju === 'number') {
    series.push({ name: t.dayWhySajuLabel, value: d.saju, color: '#f59e0b' })
  }
  if (typeof d.astro === 'number') {
    series.push({ name: t.dayWhyAstroLabel, value: d.astro, color: '#22d3ee' })
  }
  const pointType: 'best' | 'caution' | 'convergence' | 'normal' =
    d.agreement === 'aligned' && d.bothSystems
      ? 'best'
      : d.agreement === 'opposed'
        ? 'caution'
        : d.agreement === 'aligned'
          ? 'convergence'
          : 'normal'
  return (
    <ChartTooltip
      label={d.fullLabel}
      series={series}
      pointType={pointType}
      bestLabel={t.crossSpotAlignedHeader}
      cautionLabel={t.crossSpotOpposedHeader}
      convergenceLabel={t.tooltipConvergence}
    />
  )
}

export default function CrossLineChart({
  data,
  height = 160,
  xInterval = 0,
  nowLabel,
  locale,
}: Props) {
  // 두 축 데이터 모두 비면 렌더 X
  const hasAny = data.some((d) => typeof d.saju === 'number' || typeof d.astro === 'number')
  if (!hasAny) return null

  const allScores = data.flatMap((d) =>
    [d.saju, d.astro].filter((s): s is number => typeof s === 'number')
  )
  if (allScores.length === 0) return null
  const yMin = Math.max(0, Math.floor(Math.min(...allScores) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...allScores) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50

  // 교차 지점 마커 — aligned+bothSystems 는 emerald, opposed 는 rose
  const alignedPts = data.filter(
    (d) =>
      d.agreement === 'aligned' &&
      d.bothSystems &&
      typeof d.saju === 'number' &&
      typeof d.astro === 'number'
  )
  const opposedPts = data.filter(
    (d) =>
      d.agreement === 'opposed' && typeof d.saju === 'number' && typeof d.astro === 'number'
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#525252"
          fontSize={10}
          interval={xInterval}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          domain={[yMin, yMax]}
          stroke="#525252"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<CrossTooltip locale={locale} />}
          cursor={{ stroke: '#404040', strokeWidth: 1 }}
        />
        {showNeutral50 && (
          <ReferenceLine y={50} stroke="#262626" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {nowLabel && (
          <ReferenceLine x={nowLabel} stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 3" />
        )}
        <Line
          type="monotone"
          dataKey="saju"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0a0a0a', strokeWidth: 2 }}
          connectNulls
          isAnimationActive
          animationDuration={500}
          animationEasing="ease-out"
        />
        <Line
          type="monotone"
          dataKey="astro"
          stroke="#22d3ee"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0a0a0a', strokeWidth: 2 }}
          connectNulls
          isAnimationActive
          animationDuration={500}
          animationEasing="ease-out"
        />
        {alignedPts.map((p) => {
          // aligned 지점은 두 라인 평균 자리에 emerald
          const mid = ((p.saju as number) + (p.astro as number)) / 2
          return (
            <ReferenceDot
              key={`aligned-${p.label}`}
              x={p.label}
              y={mid}
              r={4}
              fill="#10b981"
              stroke="#0a0a0a"
              strokeWidth={1.5}
            />
          )
        })}
        {opposedPts.map((p) => {
          // opposed 지점은 두 라인 평균 자리에 rose
          const mid = ((p.saju as number) + (p.astro as number)) / 2
          return (
            <ReferenceDot
              key={`opposed-${p.label}`}
              x={p.label}
              y={mid}
              r={4}
              fill="#f43f5e"
              stroke="#0a0a0a"
              strokeWidth={1.5}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
