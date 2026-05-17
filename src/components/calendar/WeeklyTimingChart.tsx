'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { ImportantDate } from './types'
import { deriveScore } from '@/lib/calendar-engine/derivers/score'

interface Props {
  monthDates: ImportantDate[]
}

/**
 * 주간 타이밍 그래프 — 한 달 4~5주의 saju × astro 라인.
 *
 * 데이터 소스 우선순위:
 *  1. cell.engineSignals — source별로 분리해 deriveScore (=cell.derivedScore와
 *     동일한 layer-가중 + 공명 보너스 공식) → 두 라인 평균이 그대로 캘린더
 *     displayScore에 근접 (그래프 ≡ 점수).
 *  2. scoreBreakdown.sajuAxis / astroAxis (fallback — cell-engine 미적용 달)
 *  3. displayScore 양쪽 동일 (최후 폴백)
 */
export default function WeeklyTimingChart({ monthDates }: Props) {
  const weekly = useMemo(() => {
    if (monthDates.length === 0) return []

    const buckets: ImportantDate[][] = [[], [], [], [], []]
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      const w = Math.min(4, Math.floor((day - 1) / 7))
      buckets[w].push(d)
    }

    return buckets
      .map((arr, i) => {
        if (arr.length === 0) return null

        // saju / astro 점수 — engineSignals 우선
        const sajuScores: number[] = []
        const astroScores: number[] = []

        for (const d of arr) {
          if (d.engineSignals && d.engineSignals.length > 0) {
            // source별로 deriveScore (cell.derivedScore와 같은 공식)
            // → 두 라인 평균이 화면 점수(displayScore)에 근접한다.
            const sajuSig = d.engineSignals.filter((s) => s.source === 'saju')
            const astroSig = d.engineSignals.filter((s) => s.source === 'astro')
            sajuScores.push(sajuSig.length > 0 ? deriveScore(sajuSig) : 50)
            astroScores.push(astroSig.length > 0 ? deriveScore(astroSig) : 50)
          } else if (d.scoreBreakdown?.sajuAxis != null && d.scoreBreakdown?.astroAxis != null) {
            sajuScores.push(d.scoreBreakdown.sajuAxis)
            astroScores.push(d.scoreBreakdown.astroAxis)
          } else {
            const fallback = d.displayScore ?? d.score
            sajuScores.push(fallback)
            astroScores.push(fallback)
          }
        }

        return {
          week: `${i + 1}주`,
          saju: Math.round(sajuScores.reduce((a, b) => a + b, 0) / sajuScores.length),
          astro: Math.round(astroScores.reduce((a, b) => a + b, 0) / astroScores.length),
        }
      })
      .filter((w) => w !== null)
  }, [monthDates])

  if (weekly.length === 0) return null

  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-3 flex items-center gap-2 tracking-wider uppercase">
        <TrendingUp className="w-5 h-5 text-indigo-400" />
        주간 타이밍
      </h3>
      <p className="text-xs text-zinc-500 mb-3">사주(노랑)와 점성(시안)이 주별로 어떻게 흐르는지</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={weekly} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
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
          />
          <Legend
            iconSize={12}
            wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="saju"
            name="사주"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="astro"
            name="점성"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{ r: 5, fill: '#22d3ee', strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
