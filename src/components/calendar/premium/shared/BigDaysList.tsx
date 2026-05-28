'use client'

/**
 * "큰 날" 리스트 한 줄 — 날짜 + meaning + 펼치기 가능한 근거 chip.
 *
 * 사용처: MonthInsights(BigTurns), YearInsights(YearBigDays).
 * 이전엔 두 곳에 거의 동일 BigTurnRow / BigDayRow 컴포넌트 중복 (~70줄씩).
 *
 * 행 한 줄에 날짜·의미 + "근거 ▾" 토글. 펼치면 astro/saju 신호 chip 가로 wrap.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface BigDay {
  /** 표시용 날짜 라벨 (이미 포맷된 — "5월 21일") */
  date: string
  meaning?: string
  astro: string[]
  saju: string[]
}

interface Props {
  days: BigDay[]
  astroLabel: string
  sajuLabel: string
  evidenceToggle: string
  evidenceShow: string
  evidenceHide: string
  /** 날짜 클릭 → 이동 (year tier: month 로, month tier: day 로) */
  onDateClick?: (idx: number) => void
}

export default function BigDaysList({
  days,
  astroLabel,
  sajuLabel,
  evidenceToggle,
  evidenceShow,
  evidenceHide,
  onDateClick,
}: Props) {
  return (
    <div className="relative space-y-3">
      {days.map((d, i) => (
        <BigDayRow
          key={`${d.date}-${i}`}
          date={d.date}
          meaning={d.meaning}
          astro={d.astro}
          saju={d.saju}
          astroLabel={astroLabel}
          sajuLabel={sajuLabel}
          evidenceToggle={evidenceToggle}
          evidenceShow={evidenceShow}
          evidenceHide={evidenceHide}
          onClick={onDateClick ? () => onDateClick(i) : undefined}
        />
      ))}
    </div>
  )
}

function BigDayRow({
  date,
  meaning,
  astro,
  saju,
  astroLabel,
  sajuLabel,
  evidenceToggle,
  evidenceShow,
  evidenceHide,
  onClick,
}: {
  date: string
  meaning?: string
  astro: string[]
  saju: string[]
  astroLabel: string
  sajuLabel: string
  evidenceToggle: string
  evidenceShow: string
  evidenceHide: string
  onClick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const hasEvidence = astro.length > 0 || saju.length > 0
  return (
    <div className="rounded-lg hover:bg-white/[0.03] -mx-2 px-2 py-1.5 transition">
      <div className="flex items-baseline gap-2 flex-wrap">
        <button
          type="button"
          onClick={onClick}
          className={`text-base font-bold text-violet-200 ${onClick ? 'hover:text-violet-100' : ''} transition`}
          disabled={!onClick}
        >
          {date}
        </button>
        {meaning && <span className="text-sm text-zinc-300 leading-snug flex-1">— {meaning}</span>}
        {hasEvidence && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-0.5 ml-auto shrink-0 transition"
            aria-expanded={open}
            aria-label={open ? evidenceHide : evidenceShow}
          >
            {evidenceToggle}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {open && hasEvidence && (
        <div className="mt-2 space-y-1.5">
          {astro.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-bold shrink-0">
                {astroLabel}
              </span>
              {astro.map((sig, i) => (
                <span
                  key={`a-${i}`}
                  className="inline-flex px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-200 text-[11px] font-medium"
                >
                  {sig}
                </span>
              ))}
            </div>
          )}
          {saju.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold shrink-0">
                {sajuLabel}
              </span>
              {saju.map((sig, i) => (
                <span
                  key={`s-${i}`}
                  className="inline-flex px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-200 text-[11px] font-medium"
                >
                  {sig}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
