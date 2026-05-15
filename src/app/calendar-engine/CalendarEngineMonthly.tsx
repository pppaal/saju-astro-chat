'use client'

import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import type { CalendarCell } from '@/lib/calendar-engine/types'

interface Props {
  monthLabel: string
  viewYear: number
  viewMonth: number   // 0-indexed
  cells: CalendarCell[]
  currentDay: number
  onDayClick: (day: number) => void
  meta?: { elapsedMs: number; cellCount: number; signalCount: number; natal: { dayMaster: string; yongsin: string } }
}

/**
 * 월간 뷰 — 기존 DestinyMatrixPlanner의 monthly view와 동일 구조.
 * 셀의 amber 도트는 cell.matchedPatterns.length > 0 OR cell.derivedScore ≥ 75 일 때.
 */
export default function CalendarEngineMonthly({
  monthLabel,
  viewYear,
  viewMonth,
  cells,
  currentDay,
  onDayClick,
  meta,
}: Props) {
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay()
  const eventDays = new Set(
    cells
      .filter((c) => c.matchedPatterns.length > 0 || c.derivedScore >= 75)
      .map((c) => new Date(c.datetime).getDate()),
  )

  const avg = cells.length === 0 ? 0 : Math.round(cells.reduce((s, c) => s + c.derivedScore, 0) / cells.length)
  const patternCount = cells.reduce((s, c) => s + c.matchedPatterns.length, 0)

  // 가장 강한 패턴 top 1 (요약 텍스트용)
  const topPattern = cells
    .flatMap((c) => c.matchedPatterns.map((p) => ({ p, date: c.datetime })))
    .sort((a, b) => b.p.strength - a.p.strength)[0]

  return (
    <motion.div
      key="monthly"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-6"
    >
      {/* 그리드 카드 */}
      <div className="bg-zinc-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-zinc-100 tracking-widest">{monthLabel}</h2>
          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            용신: {meta?.natal.yongsin ?? '—'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span
              key={i}
              className={`text-xs font-bold ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-400' : 'text-zinc-500'}`}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isSelected = day === currentDay
            const hasEvent = eventDays.has(day)
            return (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                key={day}
                onClick={() => onDayClick(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/50 border-transparent'
                    : 'text-zinc-300 bg-zinc-950/50 hover:bg-zinc-800 border border-white/5'
                }`}
              >
                {day}
                {hasEvent && !isSelected && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-amber-400 shadow shadow-amber-400/80" />
                )}
                {hasEvent && isSelected && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white shadow shadow-white/80" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 월간 종합 카드 */}
      <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 shadow-xl">
        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-indigo-400" /> 월간 종합 (Engine v2)
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-zinc-950/80 p-4 rounded-xl border border-indigo-500/20 min-w-[80px]">
            <span className="text-[10px] text-zinc-500 font-bold mb-1">월 평균</span>
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {avg}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            매칭 패턴 <span className="text-amber-400 font-bold">{patternCount}건</span> 검출
            {topPattern && (
              <>. 최강 패턴 <span className="text-indigo-300 font-bold">{topPattern.p.name}</span> (strength {topPattern.p.strength})</>
            )}.
            <br />
            <span className="text-zinc-500">활성 신호 {meta?.signalCount ?? '—'}개 · 빌드 {meta?.elapsedMs ?? '—'}ms</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
