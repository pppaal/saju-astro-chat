'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ImportantDate } from './types'
import { getGrade } from './scoreGrade'

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
 * 점수·등급은 v2 cell.derivedScore + 절대 cutoff(57/43, scoreToGrade 정렬)로
 * 일관. 사용자 분포 percentile 기반은 narrative grade와 라벨이 어긋나 카드 안
 * 모순을 만들었기에 폐기.
 */
export default function MonthHighlightsCard({ monthDates, onDayClick, topN = 3 }: Props) {
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
          <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-1.5 tracking-wider uppercase">
            <TrendingUp className="w-4 h-4" />
            좋은 날 TOP {topN}
          </h3>
          <div className="space-y-2">
            {lucky.length === 0 ? (
              <div className="text-xs text-zinc-500 py-2 text-center">데이터 없음</div>
            ) : (
              lucky.map((item, i) => (
                <DayRow
                  key={item.date.date}
                  rank={i + 1}
                  importantDate={item.date}
                  score={item.score}
                  tone="positive"
                  onClick={() => onDayClick(parseDay(item.date.date))}
                />
              ))
            )}
          </div>
        </div>

        {/* ── 흉일 TOP ── */}
        <div className="bg-zinc-900/60 p-4">
          <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-1.5 tracking-wider uppercase">
            <TrendingDown className="w-4 h-4" />
            조심할 날 TOP {topN}
          </h3>
          <div className="space-y-2">
            {unlucky.length === 0 ? (
              <div className="text-xs text-zinc-500 py-2 text-center">데이터 없음</div>
            ) : (
              unlucky.map((item, i) => (
                <DayRow
                  key={item.date.date}
                  rank={i + 1}
                  importantDate={item.date}
                  score={item.score}
                  tone="negative"
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
  tone: 'positive' | 'negative'
  onClick: () => void
}

function DayRow({ rank, importantDate, score, tone, onClick }: DayRowProps) {
  const grade = getGrade(score)
  const day = parseDay(importantDate.date)
  const reason = pickReason(importantDate, tone)

  // 날짜 강조 — 길일은 emerald, 흉일은 rose 톤
  const dayClass = tone === 'positive' ? 'text-emerald-300' : 'text-rose-300'

  return (
    <button
      onClick={onClick}
      className="w-full bg-zinc-950/60 hover:bg-zinc-900 rounded-xl p-3 flex items-center gap-3 text-left transition border border-white/5 hover:border-white/10"
    >
      <span className="text-[10px] text-zinc-600 font-mono w-4 shrink-0">#{rank}</span>
      {/* 날짜 — 큰 글자로 한눈에 보이게 */}
      <div className="flex flex-col items-center justify-center min-w-[2.5rem] shrink-0">
        <span className={`text-3xl font-black leading-none ${dayClass}`}>{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold ${grade.colorClass} leading-tight`}>{grade.label}</div>
        <div className="text-xs text-zinc-400 truncate leading-snug mt-1">{reason}</div>
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
      (s) => (s.layer === 'daily' || s.layer === 'monthly' || s.layer === 'hourly') && matchSign(s)
    )
    const pool = transient.length > 0 ? transient : d.engineSignals.filter(matchSign)
    if (pool.length > 0) {
      const top = [...pool].sort(
        (a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight
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
