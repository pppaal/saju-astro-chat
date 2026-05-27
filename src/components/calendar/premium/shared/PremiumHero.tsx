'use client'

/**
 * Premium tier hero — period label + verdict + "score/100" + emoji anchor.
 * year/month/day 세 tier 공용. heroBgClass + heroShadowClass(scoreGrade)로
 * grade별 글로우 backdrop.
 */
import type { GradeInfo } from '../../scoreGrade'

interface Props {
  /** "2026 한 해" / "2026년 5월" / "5월 27일 목요일" 등 tier별 라벨 */
  periodLabel: string
  /** 한 줄 verdict (engine 생성) */
  verdict: string
  /** 평균 점수 0-100 */
  score: number
  grade: GradeInfo
  /** 우측 점수 위 작은 라벨 — 기본 "평균 에너지" */
  scoreCaption?: string
}

export default function PremiumHero({
  periodLabel,
  verdict,
  score,
  grade,
  scoreCaption = '평균 에너지',
}: Props) {
  return (
    <div
      className={`rounded-3xl border ${grade.borderClass} ${grade.heroBgClass} ${grade.heroShadowClass} px-6 py-6 flex flex-col md:flex-row md:items-end gap-6`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl shrink-0" aria-hidden>
            {grade.emoji}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
            {periodLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-3 leading-none mb-3">
          <span className={`text-5xl font-black ${grade.colorClass}`}>{grade.label}</span>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{verdict}</p>
      </div>
      <div className="md:text-right shrink-0">
        <p className="text-[10px] text-zinc-500 mb-1 tracking-wider uppercase">{scoreCaption}</p>
        <div className="flex items-baseline gap-1 md:justify-end">
          <span className="text-6xl font-black text-white">{score}</span>
          <span className="text-2xl text-zinc-600 font-light">/100</span>
        </div>
      </div>
    </div>
  )
}
