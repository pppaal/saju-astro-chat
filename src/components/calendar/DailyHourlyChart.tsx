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
  Legend,
  ReferenceLine,
  Label,
} from 'recharts'
import { Clock } from 'lucide-react'
import type { ImportantDate } from './types'

interface Props {
  importantDate: ImportantDate | null
  /** 표시 중인 날짜(YYYY-MM-DD). 오늘이면 현재 시각에 세로 가이드 표시. */
  dateStr?: string
}

/**
 * 24시간 시간대 교차 그래프 — 사주 시진 × 점성 행성시.
 *
 * 데이터 소스:
 *  - engineSignals 중 layer === 'hourly' 신호 (saju-hour + astro-moon-phase-voc)
 *  - 시간(0-23)별 polarity × weight 평균 → 0~100 점수
 *  - sajuLine: 사주 source 신호 / astroLine: 점성 source 신호
 *
 * 표시(주간 그래프와 톤 통일): 라인이 아니라 그라데이션 area 로 채워 흐름이
 * 한눈에 보이게. 50 기준선 라벨 + 큰 점. 점성 신호가 실제로 있을 때만 점성
 * area 를 그리고, 두 라인이 교차하는 시각엔 ◆ 마커를 찍어 "시간 교차"를 강조.
 */
export default function DailyHourlyChart({ importantDate, dateStr }: Props) {
  // 오늘이면 현재 시각에 노란 세로 가이드. XAxis dataKey="hour"가 "HH시" 포맷이므로
  // ReferenceLine x도 같은 포맷으로.
  const nowHourLabel = (() => {
    if (!dateStr) return null
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (dateStr.slice(0, 10) !== todayStr) return null
    return `${String(today.getHours()).padStart(2, '0')}시`
  })()

  const { data, hasAstro } = useMemo(() => {
    const empty = { data: [] as HourPoint[], hasAstro: false }
    if (!importantDate?.engineSignals) return empty
    const hourlySignals = importantDate.engineSignals.filter((s) => s.layer === 'hourly')
    if (hourlySignals.length === 0) return empty

    // 시간(0-23)별 평균 polarity × weight
    const buckets: Array<{ saju: number[]; astro: number[] }> = Array.from({ length: 24 }, () => ({
      saju: [],
      astro: [],
    }))

    for (const s of hourlySignals) {
      const hourFromId = inferHourFromSignalId(s.id)
      if (hourFromId == null) continue
      const score = s.polarity * s.weight
      const target = s.source === 'saju' ? buckets[hourFromId].saju : buckets[hourFromId].astro
      target.push(score)
    }

    const data: HourPoint[] = buckets.map((b, hour) => {
      const sajuAvg = b.saju.length > 0 ? b.saju.reduce((a, v) => a + v, 0) / b.saju.length : 0
      const astroAvg = b.astro.length > 0 ? b.astro.reduce((a, v) => a + v, 0) / b.astro.length : 0
      return {
        hour: `${String(hour).padStart(2, '0')}시`,
        hourNum: hour,
        saju: Math.round(50 + sajuAvg * 16),
        astro: Math.round(50 + astroAvg * 16),
      }
    })

    const hasAstro = data.some((d) => d.astro !== 50)
    return { data, hasAstro }
  }, [importantDate])

  if (data.length === 0) return null

  // Y축 사용자 시간대 범위에 맞춰 stretch — saju/astro 둘 다 보통 35~65 좁은 밴드라
  // 0~100 고정이면 굴곡 안 보임. min/max ±5 padding으로 줌인.
  const allHourlyScores = data.flatMap((d) => (hasAstro ? [d.saju, d.astro] : [d.saju]))
  const yMin = Math.max(0, Math.floor(Math.min(...allHourlyScores) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...allHourlyScores) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/50 to-zinc-950/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 overflow-hidden">
      {/* decorative glows — amber top-left, cyan bottom-right */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 bg-amber-500/8 blur-3xl rounded-full" />
      {hasAstro && (
        <div className="pointer-events-none absolute -bottom-20 -right-16 w-56 h-56 bg-cyan-500/8 blur-3xl rounded-full" />
      )}
      <h3 className="relative text-base font-bold text-zinc-200 mb-1 flex items-center gap-2 tracking-wider uppercase">
        <Clock className="w-5 h-5 text-cyan-400" />
        시간대 흐름 (24시간)
      </h3>
      <p className="relative text-xs text-zinc-500 mb-3">
        {hasAstro
          ? '하루 중 사주·점성 흐름 — 두 선이 교차하는 구간이 전환 시점, 50점이 기준선'
          : '하루 중 어느 시간에 운이 오는지 — 50점이 기준선'}
      </p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 14, right: 44, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="hourSaju" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hourAstro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.5} />
                <stop offset="45%" stopColor="#22d3ee" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hourSajuStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="hourAstroStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <filter id="hourGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="hourDotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#71717a99"
              fontSize={11}
              fontWeight={600}
              interval={2}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#71717a99"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<HourlyTooltip />}
              cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
            />
            {hasAstro && (
              <Legend
                iconSize={10}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '12px',
                  fontWeight: 600,
                  paddingTop: '12px',
                  color: '#a1a1aa',
                }}
              />
            )}
            {showNeutral50 && (
              <ReferenceLine y={50} stroke="#71717a55" strokeWidth={1} strokeDasharray="4 4">
                <Label value="보통 50" position="right" fill="#a1a1aa" fontSize={11} />
              </ReferenceLine>
            )}
            {nowHourLabel && (
              <ReferenceLine
                x={nowHourLabel}
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              >
                <Label
                  value="지금"
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
              dataKey="saju"
              name="사주"
              stroke="url(#hourSajuStroke)"
              strokeWidth={2.5}
              fill="url(#hourSaju)"
              dot={false}
              activeDot={{
                r: 5,
                fill: '#fbbf24',
                stroke: '#0a0f1e',
                strokeWidth: 2,
                filter: 'url(#hourDotGlow)',
              }}
              filter="url(#hourGlow)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
            {hasAstro && (
              <Area
                type="monotone"
                dataKey="astro"
                name="점성"
                stroke="url(#hourAstroStroke)"
                strokeWidth={2.5}
                fill="url(#hourAstro)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#67e8f9',
                  stroke: '#0a0f1e',
                  strokeWidth: 2,
                  filter: 'url(#hourDotGlow)',
                }}
                filter="url(#hourGlow)"
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
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
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-zinc-950/90 backdrop-blur-md border border-amber-400/30 px-3.5 py-2.5 rounded-xl shadow-2xl shadow-amber-500/10">
      <p className="text-amber-300 font-bold text-[11px] mb-1.5 tracking-wide">{label}</p>
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}
            />
            <span className="text-zinc-300 font-medium">{p.name}</span>
            <span className="font-black tabular-nums text-white ml-auto">{p.value}점</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface HourPoint {
  hour: string
  hourNum: number
  saju: number
  astro: number
}

/**
 * 신호 ID에서 시간 추정.
 * 사주 시진: 'saju.hour.YYYY-MM-DD.{branch}.{stem}'
 *   branch → idx → 시간 (자=0, 축=1~2, ..., 해=21~22)
 * 점성 voc/phase: 시간 정보 없으니 정오(12)로 매핑
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
  // 점성 행성시 — id에 시각이 박혀 있음: astro.planetary-hour.YYYY-MM-DD.H{hh}.{planet}
  const astroHourMatch = id.match(/^astro\.planetary-hour\..+\.H(\d{1,2})\./)
  if (astroHourMatch) {
    const h = Number(astroHourMatch[1])
    return h >= 0 && h < 24 ? h : null
  }
  // 점성 VoC / 달위상은 정오 근처로 매핑 (정확한 시간 정보 부재)
  if (id.startsWith('astro.voc') || id.startsWith('astro.moon-phase')) {
    return 12
  }
  return null
}
