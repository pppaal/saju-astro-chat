'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
} from 'recharts'
import { Clock } from 'lucide-react'
import type { ImportantDate } from './types'
import ChartTooltip from './premium/shared/ChartTooltip'
import { getCalLabels, type CalLocale } from './premium/labels'

/** dayCross.hourly.slots 의 sub-shape — useDateDetail 이 제공. */
export interface HourlySlot {
  hour: number
  score: number
}

interface Props {
  /** dayCross.hourly.slots — 24h × {hour, score}. 우선 사용. */
  slots?: HourlySlot[] | null
  /** importantDate.engineSignals (hourly) — dayCross 도착 전 폴백. */
  importantDate?: ImportantDate | null
  /** 표시 중인 날짜(YYYY-MM-DD). 오늘이면 현재 시각에 세로 가이드 표시. */
  dateStr?: string
  locale?: CalLocale
}

/**
 * 24시간 시간대 흐름 그래프 — dayCross.hourly.slots 직접 사용.
 *
 * 이전엔 importantDate.engineSignals 의 layer=hourly 만 필터해서 polarity ×
 * weight 평균 → 50 + avg*16 으로 계산했음. 그 결과로 365 일자에 engineSignals
 * (전 layer, ~5MB) 가 다 따라붙어 payload 거대화 →
 * dayCross.hourly.slots 가 이미 같은 24h × score 0-100 제공 → 그대로 매핑.
 *
 * 표시(다른 차트들과 톤 통일): 단일 amber gradient area, 50 기준선 + "지금"
 * reference line.
 */
export default function DailyHourlyChart({ slots, importantDate, dateStr, locale }: Props) {
  const t = getCalLabels(locale)
  const hourSuffix = locale === 'en' ? 'h' : '시'
  // 오늘이면 현재 시각에 노란 세로 가이드. XAxis dataKey="hour" 와 같은 포맷.
  const nowHourLabel = (() => {
    if (!dateStr) return null
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (dateStr.slice(0, 10) !== todayStr) return null
    return `${String(today.getHours()).padStart(2, '0')}${hourSuffix}`
  })()

  const data: HourPoint[] = useMemo(() => {
    // 1) dayCross.hourly.slots 우선 — useDateDetail 이 제공.
    if (slots && slots.length > 0) {
      return slots.map((s) => ({
        hour: `${String(s.hour).padStart(2, '0')}${hourSuffix}`,
        hourNum: s.hour,
        score: Math.round(s.score),
      }))
    }
    // 2) 폴백 — importantDate.engineSignals[layer=hourly] 시간별 평균 (dayCross
    //    도착 전 즉시 렌더). 서버가 hourly 만 부착해 페이로드 작음.
    if (!importantDate?.engineSignals) return []
    const hourlySignals = importantDate.engineSignals.filter((s) => s.layer === 'hourly')
    if (hourlySignals.length === 0) return []
    const buckets: number[][] = Array.from({ length: 24 }, () => [])
    for (const s of hourlySignals) {
      const hourFromId = inferHourFromSignalId(s.id)
      if (hourFromId == null) continue
      buckets[hourFromId].push(s.polarity * s.weight)
    }
    return buckets.map((scores, hour) => {
      const avg = scores.length > 0 ? scores.reduce((a, v) => a + v, 0) / scores.length : 0
      return {
        hour: `${String(hour).padStart(2, '0')}${hourSuffix}`,
        hourNum: hour,
        score: Math.round(50 + avg * 16),
      }
    })
  }, [slots, importantDate, hourSuffix])

  if (data.length === 0) return null

  // Y축 사용자 시간대 범위에 맞춰 stretch — saju/astro 둘 다 보통 35~65 좁은 밴드라
  // 0~100 고정이면 굴곡 안 보임. min/max ±5 padding으로 줌인.
  const allHourlyScores = data.map((d) => d.score)
  const yMin = Math.max(0, Math.floor(Math.min(...allHourlyScores) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...allHourlyScores) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50

  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          {t.hourlyTitle}
        </h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">{t.hourlySubtitle}</p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 28, right: 40, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="hourEnergy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="#525252"
            fontSize={11}
            interval={2}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#525252"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<HourlyTooltip />} cursor={{ stroke: '#404040', strokeWidth: 1 }} />
          {showNeutral50 && (
            <ReferenceLine y={50} stroke="#262626" strokeWidth={1} strokeDasharray="3 3">
              <Label value={t.hourlyNeutralRef} position="right" fill="#525252" fontSize={11} />
            </ReferenceLine>
          )}
          {nowHourLabel && (
            <ReferenceLine x={nowHourLabel} stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 3">
              <Label
                value={t.nowLabel}
                position="top"
                offset={12}
                fill="#fbbf24"
                fontSize={11}
                fontWeight={600}
              />
            </ReferenceLine>
          )}
          <Area
            type="monotone"
            dataKey="score"
            name={locale === 'en' ? 'Energy' : '에너지'}
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#hourEnergy)"
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0a0a0a', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function HourlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; dataKey?: string; color?: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0 || !label) return null
  const series = payload
    .filter((p) => typeof p.value === 'number' && p.name)
    .map((p) => ({
      name: p.name as string,
      value: p.value as number,
      color: p.color ?? '#fbbf24',
    }))
  return <ChartTooltip label={label} series={series} />
}

interface HourPoint {
  hour: string
  hourNum: number
  /** 0-100 score (50=중립, 100=최대 우호) */
  score: number
}

/**
 * 신호 ID에서 시간 추정 (importantDate.engineSignals 폴백 경로 전용).
 * 사주 시진: 'saju.hour.YYYY-MM-DD.{branch}.{stem}' — branch → 0-22.
 * 점성 행성시: 'astro.planetary-hour.YYYY-MM-DD.H{hh}.{planet}' — hh 직접.
 * 점성 VoC/moon-phase: 정오 매핑.
 */
function inferHourFromSignalId(id: string): number | null {
  const BRANCH_HOUR: Record<string, number> = {
    子: 0,
    丑: 2,
    寅: 4,
    卯: 6,
    辰: 8,
    巳: 10,
    午: 12,
    未: 14,
    申: 16,
    酉: 18,
    戌: 20,
    亥: 22,
  }
  const sajuMatch = id.match(/^saju\.hour\..+\.([子丑寅卯辰巳午未申酉戌亥])\./)
  if (sajuMatch) {
    const hour = BRANCH_HOUR[sajuMatch[1]]
    return typeof hour === 'number' ? hour : null
  }
  const astroHourMatch = id.match(/^astro\.planetary-hour\..+\.H(\d{1,2})\./)
  if (astroHourMatch) {
    const h = Number(astroHourMatch[1])
    return h >= 0 && h < 24 ? h : null
  }
  if (id.startsWith('astro.voc') || id.startsWith('astro.moon-phase')) {
    return 12
  }
  return null
}
