'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ImportantDate } from './types'
import { getScoreGrade } from './scoreGrade'

interface Props {
  /** 그 달의 모든 ImportantDate (calendar-engine 점수 포함) */
  monthDates: ImportantDate[]
  /** 일 클릭 핸들러 — 1~31 받아 daily 뷰로 점프 */
  onDayClick: (day: number) => void
  /** 표시할 상위/하위 개수 (기본 5) */
  topN?: number
}

/**
 * 그 달의 길일 TOP N + 흉일 TOP N.
 * "월간 종합 분석" 카드 다음에 위치.
 *
 * 점수는 cell.derivedScore 우선 (engine v2). 없으면 displayScore.
 * 핵심 사유는 matchedPatterns[0].name 우선, 없으면 topReasons / sajuFactors.
 */
export default function MonthHighlightsCard({ monthDates, onDayClick, topN = 5 }: Props) {
  if (monthDates.length === 0) return null

  const ranked = monthDates
    .map((d) => ({
      date: d,
      score: pickScore(d),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const lucky = ranked.slice(0, topN)
  const unlucky = [...ranked].reverse().slice(0, topN)

  return (
    <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-white/5">
        {/* ── 길일 TOP ── */}
        <div className="bg-zinc-900/60 p-4">
          <h3 className="text-xs font-bold text-emerald-400 mb-3 flex items-center gap-1.5 tracking-wider uppercase">
            <TrendingUp className="w-3.5 h-3.5" />
            길일 TOP {topN}
          </h3>
          <div className="space-y-1.5">
            {lucky.length === 0 ? (
              <div className="text-[10px] text-zinc-500 py-2 text-center">데이터 없음</div>
            ) : (
              lucky.map((item, i) => (
                <DayRow
                  key={item.date.date}
                  rank={i + 1}
                  importantDate={item.date}
                  score={item.score}
                  onClick={() => onDayClick(parseDay(item.date.date))}
                />
              ))
            )}
          </div>
        </div>

        {/* ── 흉일 TOP ── */}
        <div className="bg-zinc-900/60 p-4">
          <h3 className="text-xs font-bold text-rose-400 mb-3 flex items-center gap-1.5 tracking-wider uppercase">
            <TrendingDown className="w-3.5 h-3.5" />
            흉일 TOP {topN}
          </h3>
          <div className="space-y-1.5">
            {unlucky.length === 0 ? (
              <div className="text-[10px] text-zinc-500 py-2 text-center">데이터 없음</div>
            ) : (
              unlucky.map((item, i) => (
                <DayRow
                  key={item.date.date}
                  rank={i + 1}
                  importantDate={item.date}
                  score={item.score}
                  onClick={() => onDayClick(parseDay(item.date.date))}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface DayRowProps {
  rank: number
  importantDate: ImportantDate
  score: number
  onClick: () => void
}

function DayRow({ rank, importantDate, score, onClick }: DayRowProps) {
  const grade = getScoreGrade(score)
  const day = parseDay(importantDate.date)
  // reason 방향이 점수와 일치해야 자연스러움 (길일에 흉신호 사유 안 나오게)
  const direction: 'positive' | 'negative' = score >= 50 ? 'positive' : 'negative'
  const reason = pickReason(importantDate, direction)

  return (
    <button
      onClick={onClick}
      className="w-full bg-zinc-950/60 hover:bg-zinc-900 rounded-lg p-2 flex items-center gap-2 text-left transition border border-white/5"
    >
      <span className="text-[10px] text-zinc-600 font-mono w-4 shrink-0">#{rank}</span>
      <div className="flex flex-col items-center justify-center w-9 shrink-0">
        <span className="text-base font-bold text-zinc-100 leading-none">{day}</span>
        <span className="text-[8px] text-zinc-600 font-mono mt-0.5">{score}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-bold ${grade.colorClass} leading-tight`}>
          {grade.label}
        </div>
        <div className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">
          {reason}
        </div>
      </div>
    </button>
  )
}

function pickScore(d: ImportantDate): number {
  return Math.round(d.displayScore ?? d.score ?? 50)
}

function parseDay(iso: string): number {
  // 'YYYY-MM-DD'에서 DD
  const m = iso.slice(8, 10)
  return parseInt(m, 10)
}

function pickReason(d: ImportantDate, direction: 'positive' | 'negative'): string {
  // 점수 방향과 같은 신호만 사유로 픽 (길일에 흉신호 사유 표시 방지).
  // 매칭 패턴은 점수에 이미 반영돼 있으니 우선.
  if (d.matchedPatterns && d.matchedPatterns.length > 0) {
    return `★ ${d.matchedPatterns[0].name}`
  }
  if (d.engineSignals && d.engineSignals.length > 0) {
    const matchSign = (s: { polarity: number }) =>
      direction === 'positive' ? s.polarity > 0 : s.polarity < 0
    // transient 레이어 우선 (decadal/yearly는 매일 동일)
    const transient = d.engineSignals.filter(
      (s) => (s.layer === 'daily' || s.layer === 'monthly' || s.layer === 'hourly') && matchSign(s),
    )
    const pool = transient.length > 0
      ? transient
      : d.engineSignals.filter(matchSign)
    if (pool.length > 0) {
      const top = [...pool].sort(
        (a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight,
      )[0]
      const arrow = top.polarity > 0 ? '↑' : '↓'
      return `${arrow} ${top.korean ?? top.name}`
    }
  }
  if (d.sajuFactors && d.sajuFactors.length > 0) {
    return d.sajuFactors[0]
  }
  return d.title ?? ''
}
