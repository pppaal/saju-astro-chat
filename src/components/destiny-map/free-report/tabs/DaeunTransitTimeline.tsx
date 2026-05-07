'use client'

import { useMemo, useState } from 'react'
import type { TimingMatrixResult } from '../analyzers/types/domain.types'

const ELEMENT_COLOR: Record<string, { bar: string; text: string; border: string }> = {
  목: { bar: 'bg-emerald-500/40', text: 'text-emerald-200', border: 'border-emerald-400/40' },
  화: { bar: 'bg-rose-500/40', text: 'text-rose-200', border: 'border-rose-400/40' },
  토: { bar: 'bg-amber-500/40', text: 'text-amber-200', border: 'border-amber-400/40' },
  금: { bar: 'bg-slate-300/40', text: 'text-slate-200', border: 'border-slate-300/40' },
  수: { bar: 'bg-blue-500/40', text: 'text-blue-200', border: 'border-blue-400/40' },
}
const FALLBACK = { bar: 'bg-purple-500/40', text: 'text-purple-200', border: 'border-purple-400/40' }

function elementOf(s: string | undefined): keyof typeof ELEMENT_COLOR | undefined {
  if (!s) return undefined
  const m = s.match(/[목화토금수]/)
  return (m?.[0] as keyof typeof ELEMENT_COLOR) || undefined
}

interface DaeunTransitTimelineProps {
  timing: TimingMatrixResult | null
  isKo: boolean
}

/**
 * Cross-system life timeline: 사주 大運 (top track, 10년 단위 색칠) +
 * 점성 major transits (bottom track, 마커). 같은 가로 시간축에 두
 * 시스템을 같이 깔아서 "지금 사주는 X 시기인데 점성에선 Y 회귀가
 * 진행 중" 같은 교차 패턴이 한눈에 보이게.
 */
export default function DaeunTransitTimeline({ timing, isKo }: DaeunTransitTimelineProps) {
  const [selectedDaeun, setSelectedDaeun] = useState<number | null>(null)
  const daeunList = timing?.daeunTimeline || []
  const transits = timing?.majorTransits || []
  const currentYear = new Date().getFullYear()

  // Anchor the timeline: from earliest daeun start to latest daeun end.
  const { minAge, maxAge } = useMemo(() => {
    if (daeunList.length === 0) return { minAge: 0, maxAge: 100 }
    const starts = daeunList.map((d) => d.startAge)
    const ends = daeunList.map((d) => d.endAge ?? d.startAge + 10)
    return {
      minAge: Math.min(...starts, 0),
      maxAge: Math.max(...ends, 90),
    }
  }, [daeunList])

  const current = daeunList.find((d) => d.isCurrent)
  const currentAge = current ? current.startAge + 5 : 35

  // Map age → 0..1 along the axis.
  const span = maxAge - minAge
  const pos = (age: number) => ((age - minAge) / span) * 100

  // Transit markers — try to extract age from `period` / `timing`.
  // Periods often look like "2024년 (32세)" or "32~34세".
  const transitMarkers = useMemo(() => {
    return transits
      .map((t, i) => {
        const period = t.period || t.timing || ''
        const ageMatch = period.match(/(\d{1,2})\s*세/)
        const yearMatch = period.match(/(\d{4})\s*년/)
        let age: number | null = null
        if (ageMatch) age = parseInt(ageMatch[1], 10)
        else if (yearMatch && current) {
          const targetYear = parseInt(yearMatch[1], 10)
          age = currentAge + (targetYear - currentYear)
        }
        if (age === null || age < minAge || age > maxAge) return null
        return {
          id: i,
          age,
          name: t.name || t.planet || t.transit || '',
          icon: t.icon || '🪐',
          isActive: !!t.isActive,
          isUpcoming: !!t.isUpcoming,
          description: isKo ? t.description?.ko : t.description?.en,
        }
      })
      .filter(Boolean) as Array<{
      id: number
      age: number
      name: string
      icon: string
      isActive: boolean
      isUpcoming: boolean
      description: string | undefined
    }>
  }, [transits, currentAge, currentYear, minAge, maxAge, isKo])

  if (daeunList.length === 0) return null

  const selectedItem =
    selectedDaeun !== null
      ? daeunList.find((d) => d.startAge === selectedDaeun)
      : current

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌊</span>
        <div>
          <h3 className="text-lg font-bold text-indigo-300">
            {isKo ? '대운 × 트랜짓 타임라인' : 'Major Luck × Transit Timeline'}
          </h3>
          <p className="text-gray-500 text-xs">
            {isKo ? '사주 10년 주기 + 점성 회귀 교차' : '10-year saju cycles × astro returns'}
          </p>
        </div>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
          L4
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Saju 大運 track */}
        <div className="mb-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-300/80 mb-1.5">
            사주 大運
          </div>
          <div className="relative h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
            {daeunList.map((d) => {
              const start = pos(d.startAge)
              const width = pos((d.endAge ?? d.startAge + 10)) - start
              const el = elementOf(d.element)
              const tone = (el && ELEMENT_COLOR[el]) || FALLBACK
              const isSelected = selectedDaeun === d.startAge
              return (
                <button
                  key={d.startAge}
                  type="button"
                  onClick={() => setSelectedDaeun(isSelected ? null : d.startAge)}
                  style={{ left: `${start}%`, width: `${width}%` }}
                  className={`absolute inset-y-0 ${tone.bar} ${tone.border} border-y border-r
                    flex items-center justify-center text-[10px] font-mono ${tone.text}
                    hover:brightness-125 hover:z-10 transition-all
                    ${d.isCurrent ? 'ring-2 ring-white/40 ring-inset' : ''}
                    ${isSelected ? 'ring-2 ring-fuchsia-400 z-20' : ''}
                  `}
                >
                  <span className="truncate px-1">
                    {d.element}
                    {d.stem || d.heavenlyStem || ''}
                    {d.branch || d.earthlyBranch || ''}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-1">
            <span>{minAge}세</span>
            <span className="text-slate-400">|</span>
            <span>{maxAge}세</span>
          </div>
        </div>

        {/* Now line */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${pos(currentAge)}%`,
            top: '20px',
            bottom: '20px',
          }}
        >
          <div className="w-px h-full bg-fuchsia-400/70 shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
          <div className="absolute -top-2 -translate-x-1/2 text-[9px] font-mono text-fuchsia-300 whitespace-nowrap bg-slate-900/80 px-1 rounded">
            지금 {currentAge}세
          </div>
        </div>

        {/* Astro transit track */}
        <div className="mt-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300/80 mb-1.5">
            점성 트랜짓
          </div>
          <div className="relative h-10 rounded-lg bg-white/5 border border-white/10">
            {transitMarkers.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-slate-500">
                {isKo ? '활성 트랜짓 없음' : 'No active transits'}
              </div>
            ) : (
              transitMarkers.map((t) => (
                <div
                  key={t.id}
                  style={{ left: `${pos(t.age)}%` }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm
                      ${
                        t.isActive
                          ? 'bg-purple-500 ring-2 ring-purple-300 shadow-lg shadow-purple-500/40'
                          : t.isUpcoming
                            ? 'bg-amber-500/80 ring-1 ring-amber-300'
                            : 'bg-slate-700 ring-1 ring-slate-500'
                      }
                    `}
                    title={`${t.name} (${t.age}세)`}
                  >
                    {t.icon}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-30">
                    <div className="bg-slate-900 border border-purple-400/40 rounded-md px-2 py-1 text-[10px] text-white whitespace-nowrap">
                      {t.name} · {t.age}세
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail of clicked / current daeun */}
      {selectedItem && (
        <div className="mt-5 p-4 rounded-xl bg-slate-900/60 border border-indigo-400/30 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl mr-2">{selectedItem.icon || '🌊'}</span>
              <span className="text-white font-bold text-base">
                {selectedItem.element}
                {selectedItem.stem || selectedItem.heavenlyStem || ''}
                {selectedItem.branch || selectedItem.earthlyBranch || ''}
              </span>
              <span className="ml-2 text-xs font-mono text-slate-400">
                {selectedItem.startAge}~{selectedItem.endAge ?? selectedItem.startAge + 9}세
              </span>
            </div>
            {selectedItem.isCurrent && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/20 px-2 py-0.5 rounded-full">
                현재
              </span>
            )}
          </div>
          {selectedItem.description && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {isKo ? selectedItem.description.ko : selectedItem.description.en}
            </p>
          )}
          {selectedItem.advice && (
            <p className="text-xs text-indigo-300 leading-relaxed border-t border-white/5 pt-3">
              💡 {isKo ? selectedItem.advice.ko : selectedItem.advice.en}
            </p>
          )}
          {/* Cross-system note */}
          {(() => {
            const overlapping = transitMarkers.filter(
              (t) =>
                t.age >= selectedItem.startAge &&
                t.age <= (selectedItem.endAge ?? selectedItem.startAge + 9),
            )
            if (overlapping.length === 0) return null
            return (
              <div className="border-t border-white/5 pt-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-2">
                  이 시기에 겹치는 트랜짓
                </div>
                <div className="flex flex-wrap gap-2">
                  {overlapping.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200"
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      <span className="text-purple-400/70">{t.age}세</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      <p className="text-[10px] text-slate-500 mt-3 text-center font-mono">
        클릭하면 그 대운의 디테일과 겹치는 트랜짓이 보입니다
      </p>
    </div>
  )
}
