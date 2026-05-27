'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
} from 'recharts'
import { CalendarDays } from 'lucide-react'
import type { ImportantDate } from './types'

interface Props {
  monthDates: ImportantDate[]
  /** 표시 중인 달 (0-indexed) — 현재 위치 세로 가이드 결정에 사용 */
  viewYear: number
  viewMonth: number
  onDayClick?: (day: number) => void
}

/**
 * 월간 일별 흐름 — 그 달의 매일 displayScore를 area chart 1줄로.
 *
 * YearOverviewCard(12개월)와 시각적 일관성: 같은 indigo 그라데이션·
 * 50점 기준선·dot 스타일. viewYear/viewMonth가 "오늘"과 같으면
 * 오늘 일에 노란 세로 가이드("지금") 표시.
 *
 * 데이터 누락 일(±1달 윈도우 밖)은 graph에서 점프 없이 자연 보간되도록
 * undefined로 둬서 connectNulls 효과를 활용.
 */
export default function MonthlyDailyChart({ monthDates, viewYear, viewMonth, onDayClick }: Props) {
  const data = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const byDay = new Map<number, number>()
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      const s = d.displayScore ?? d.score
      if (typeof s === 'number') byDay.set(day, s)
    }
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return { day, dayLabel: `${day}일`, score: byDay.get(day) ?? null }
    })
  }, [monthDates, viewYear, viewMonth])

  const today = new Date()
  const nowDayLabel =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth
      ? `${today.getDate()}일`
      : null

  const hasAny = data.some((d) => typeof d.score === 'number')
  if (!hasAny) return null

  // Y축 사용자 범위에 맞춰 stretch (그날들이 30~70 같은 좁은 밴드에 몰릴 때 굴곡 보이게)
  const validScores = data.map((d) => d.score).filter((s): s is number => typeof s === 'number')
  const yMin = Math.max(0, Math.floor(Math.min(...validScores) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...validScores) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50

  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-1 flex items-center gap-2 tracking-wider uppercase">
        <CalendarDays className="w-5 h-5 text-indigo-300" />
        이번 달 흐름
      </h3>
      <p className="text-xs text-zinc-500 mb-3">매일 점수 — 50이 보통, 노란 선이 오늘</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{ top: 14, right: 24, left: -10, bottom: 0 }}
          onClick={(e) => {
            if (!onDayClick) return
            const p = (e as unknown as { activePayload?: Array<{ payload?: { day?: number } }> })
              ?.activePayload?.[0]?.payload
            if (p && typeof p.day === 'number') onDayClick(p.day)
          }}
        >
          <defs>
            <linearGradient id="monthFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="dayLabel"
            stroke="#a1a1aa"
            fontSize={10}
            interval={4}
            tickFormatter={(v: string) => v.replace('일', '')}
          />
          <YAxis domain={[yMin, yMax]} stroke="#a1a1aa" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: '#09090b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '13px',
              padding: '6px 10px',
            }}
            labelStyle={{ color: '#e4e4e7', fontWeight: 700 }}
            formatter={(v) =>
              typeof v === 'number' ? [`${v}점`, '일 점수'] : ['(없음)', '일 점수']
            }
          />
          {showNeutral50 && (
            <ReferenceLine y={50} stroke="#71717a" strokeWidth={1.2} strokeDasharray="4 4">
              <Label value="보통 50" position="right" fill="#a1a1aa" fontSize={10} />
            </ReferenceLine>
          )}
          {nowDayLabel && (
            <ReferenceLine x={nowDayLabel} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3">
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
            type="natural"
            dataKey="score"
            stroke="#a5b4fc"
            strokeWidth={2.2}
            fill="url(#monthFlow)"
            dot={false}
            activeDot={{ r: 4, fill: '#a5b4fc', stroke: '#0a0f1e', strokeWidth: 1 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
