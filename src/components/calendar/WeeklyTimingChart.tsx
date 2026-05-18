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
import { TrendingUp } from 'lucide-react'
import type { ImportantDate } from './types'

interface Props {
  monthDates: ImportantDate[]
}

/**
 * 주간 흐름 그래프 — 한 라인 (그 달의 달력 row 수만큼 = 4~6주).
 *
 * 이전엔 무조건 5칸을 잡고 7일 chunk로 채워서 (1-7, 8-14, ...) 29-31일
 * 짜리 달은 마지막 5주 칸이 3일밖에 안 되는데도 한 칸을 차지하는
 * "5주가 비정상적으로 짧음" 문제가 있었음. 또 28일 2월은 4주 그래프인데
 * 30/31일 달은 5주 그래프가 돼서 사용자 직관 ("4주가 보통이지")과 안 맞음.
 *
 * 새 방식: 달력 grid의 실제 row 인덱스로 bucket — leadingBlanks(=1일의
 * 요일 인덱스)와 daysInMonth로 row 수를 계산. 매월 화면의 monthly grid와
 * 정확히 같은 주 구분이 됨.
 *
 * - 데이터: 주별 평균 displayScore (cell.derivedScore가 채운 값)
 * - 50점 기준선 + 위 영역 emerald (좋은 구간) / 아래 영역 rose (주의 구간)
 */
export default function WeeklyTimingChart({ monthDates }: Props) {
  const weekly = useMemo(() => {
    if (monthDates.length === 0) return []

    // Derive month boundaries from the first cell — every monthDate is in
    // the same calendar month, so any one works.
    const firstDate = monthDates[0].date
    const year = parseInt(firstDate.slice(0, 4), 10)
    const month = parseInt(firstDate.slice(5, 7), 10) - 1
    const leadingBlanks = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeksInMonth = Math.ceil((leadingBlanks + daysInMonth) / 7)

    const buckets: ImportantDate[][] = Array.from({ length: weeksInMonth }, () => [])
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      const w = Math.floor((leadingBlanks + day - 1) / 7)
      if (w >= 0 && w < weeksInMonth) buckets[w].push(d)
    }

    return buckets
      .map((arr, i) => {
        if (arr.length === 0) return null
        const scores = arr.map((d) => d.displayScore ?? d.score ?? 50)
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        return {
          week: `${i + 1}주`,
          score: avg,
        }
      })
      .filter((w) => w !== null)
  }, [monthDates])

  if (weekly.length === 0) return null

  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-1 flex items-center gap-2 tracking-wider uppercase">
        <TrendingUp className="w-5 h-5 text-indigo-400" />
        주간 흐름
      </h3>
      <p className="text-xs text-zinc-500 mb-3">한 달의 주별 평균 점수 — 50이 보통</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={weekly} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="weeklyGood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="week" stroke="#a1a1aa" fontSize={13} fontWeight={600} />
          <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: '#09090b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '13px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#e4e4e7', fontWeight: 700 }}
            itemStyle={{ padding: '2px 0' }}
            formatter={(value) => [`${value}점`, '주 평균']}
          />
          <ReferenceLine y={50} stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4">
            <Label value="보통 50" position="right" fill="#a1a1aa" fontSize={11} />
          </ReferenceLine>
          {/* 점수 자체 area (단일) — 색은 평균값 따라 자동으로 emerald/rose 톤 */}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#818cf8"
            strokeWidth={3}
            fill="url(#weeklyGood)"
            dot={{ r: 6, fill: '#818cf8', stroke: '#0a0f1e', strokeWidth: 2 }}
            activeDot={{ r: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
