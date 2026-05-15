'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { ActiveSignal, CalendarCell, SignalLayer } from '@/lib/calendar-engine/types'

interface Props {
  cell: CalendarCell | null
  currentDay: number
  onPrev: () => void
  onNext: () => void
}

const LAYER_LABEL: Record<SignalLayer, string> = {
  decadal: '大運',
  yearly:  '歲運',
  monthly: '月運',
  daily:   '日辰',
  hourly:  '時',
  instant: '·',
}

const TOP_THEMES: Array<{ key: string; label: string }> = [
  { key: 'money',      label: '재물' },
  { key: 'career',     label: '직업' },
  { key: 'love',       label: '연애' },
  { key: 'health',     label: '건강' },
  { key: 'study',      label: '학업' },
  { key: 'reputation', label: '명예' },
]

export default function CalendarEngineDaily({ cell, currentDay, onPrev, onNext }: Props) {
  const [activeTab, setActiveTab] = useState<'saju' | 'astro'>('saju')

  if (!cell) {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm">
        {currentDay}일 셀 데이터 없음
      </div>
    )
  }

  const sajuSignals = cell.signals.filter((s) => s.source === 'saju')
  const astroSignals = cell.signals.filter((s) => s.source === 'astro')
  const visibleSignals = activeTab === 'saju' ? sajuSignals : astroSignals
  const date = new Date(cell.datetime)
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  const grade = gradeFor(cell.derivedScore)

  return (
    <motion.div
      key="daily"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-4"
    >
      {/* 날짜 + 점수 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="p-2 text-zinc-500 hover:text-zinc-300"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <div className="text-xs text-zinc-500">
            {date.getFullYear()}.{String(date.getMonth() + 1).padStart(2, '0')}.{String(date.getDate()).padStart(2, '0')} {dayName}요일
          </div>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mt-1">
            {cell.derivedScore}
          </div>
          <div className={`text-[10px] font-bold mt-1 ${grade.color}`}>{grade.label}</div>
        </div>
        <button onClick={onNext} className="p-2 text-zinc-500 hover:text-zinc-300"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* 매칭 패턴 */}
      {cell.matchedPatterns.length > 0 && (
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-amber-500/20">
          <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5" /> 매칭 패턴 ({cell.matchedPatterns.length})
          </h3>
          <div className="space-y-2 text-sm">
            {cell.matchedPatterns.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-zinc-200">{p.name}</span>
                <span className="text-emerald-400 text-xs font-bold">strength {p.strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테마별 점수 */}
      <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
        <h3 className="text-xs font-bold text-zinc-300 mb-3">테마별 점수</h3>
        <div className="space-y-2">
          {TOP_THEMES.map((t) => {
            const score = (cell.themeScores as Record<string, number>)[t.key] ?? 50
            return (
              <div key={t.key} className="flex items-center gap-2 text-xs">
                <span className="w-10 text-zinc-400">{t.label}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="w-6 text-right text-zinc-300">{score}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 신호 리스트 */}
      <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-zinc-300">활성 신호 ({cell.signals.length})</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('saju')}
              className={`text-[10px] px-2 py-0.5 rounded-md transition ${
                activeTab === 'saju' ? 'bg-amber-500/30 text-amber-200' : 'bg-zinc-800/50 text-zinc-500'
              }`}
            >
              사주 {sajuSignals.length}
            </button>
            <button
              onClick={() => setActiveTab('astro')}
              className={`text-[10px] px-2 py-0.5 rounded-md transition ${
                activeTab === 'astro' ? 'bg-cyan-500/30 text-cyan-200' : 'bg-zinc-800/50 text-zinc-500'
              }`}
            >
              점성 {astroSignals.length}
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto text-xs pr-1">
          {visibleSignals.length === 0 && (
            <div className="text-zinc-500 text-center py-4">활성 신호 없음</div>
          )}
          {visibleSignals.map((s) => (
            <SignalRow key={s.id} signal={s} />
          ))}
        </div>
      </div>

      {/* 상위 사유 */}
      {cell.topReasons.length > 0 && (
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 text-[10px] text-zinc-500 space-y-1">
          {cell.topReasons.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}
    </motion.div>
  )
}

function SignalRow({ signal }: { signal: ActiveSignal }) {
  const arrow = signal.polarity > 1 ? '↑' : signal.polarity < -1 ? '↓' : signal.polarity > 0 ? '↗' : signal.polarity < 0 ? '↘' : '·'
  const arrowColor = signal.polarity > 0 ? 'text-emerald-400' : signal.polarity < 0 ? 'text-rose-400' : 'text-zinc-500'
  const layerColor = signal.source === 'saju' ? 'text-amber-400' : 'text-cyan-400'
  return (
    <div className="bg-zinc-950/50 rounded-lg p-2 flex items-start gap-2">
      <span className={`${arrowColor} font-bold`}>{arrow}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-medium text-zinc-200 truncate">{signal.korean ?? signal.name}</span>
          <span className={`text-[10px] shrink-0 ${layerColor}`}>{LAYER_LABEL[signal.layer]}</span>
        </div>
        <div className="text-[10px] text-zinc-500 truncate">
          {signal.evidence.orbDegrees != null && `orb ${signal.evidence.orbDegrees.toFixed(1)}° · `}
          polarity {signal.polarity > 0 ? '+' : ''}{signal.polarity}
          {signal.themes.length > 0 && ` · ${signal.themes.slice(0, 3).join(', ')}`}
        </div>
      </div>
    </div>
  )
}

function gradeFor(score: number): { label: string; color: string } {
  if (score >= 85) return { label: '최상 · 5층 정렬 가능', color: 'text-emerald-400' }
  if (score >= 75) return { label: '우수', color: 'text-emerald-400' }
  if (score >= 65) return { label: '양호', color: 'text-cyan-400' }
  if (score >= 55) return { label: '보통', color: 'text-zinc-400' }
  if (score >= 45) return { label: '주의', color: 'text-amber-400' }
  return { label: '신중', color: 'text-rose-400' }
}
