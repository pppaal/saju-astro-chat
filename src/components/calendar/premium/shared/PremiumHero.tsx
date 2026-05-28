'use client'

/**
 * Premium tier hero — period label + verdict + "score/100" + emoji anchor.
 * year/month/day 세 tier 공용. heroBgClass + heroShadowClass(scoreGrade)로
 * grade별 글로우 backdrop.
 *
 * 사주/점성/합치 chip 제거 (사용자 cut: "이 카드는 뭐지?" - 디테일 dashboard 느낌).
 * 점수가 어떻게 나왔는지는 daily 뷰의 24h chart + engine narrative 로 충분.
 */
import type { GradeInfo } from '../../scoreGrade'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  /** "2026 한 해" / "2026년 5월" / "5월 27일 목요일" 등 tier별 라벨 */
  periodLabel: string
  /** 한 줄 verdict (engine 생성) */
  verdict: string
  /** 평균 점수 0-100 */
  score: number
  grade: GradeInfo
  /** 우측 점수 위 작은 라벨 — 미지정 시 locale 기본 */
  scoreCaption?: string
  /** UI 라벨 locale */
  locale?: CalLocale
}

export default function PremiumHero({
  periodLabel,
  verdict,
  score,
  grade,
  scoreCaption,
  locale,
}: Props) {
  const t = getCalLabels(locale)
  const caption = scoreCaption ?? t.scoreCaption
  const gradeLabel = t.gradeLabel(grade.key)
  return (
    <div
      className={`relative rounded-2xl border ${grade.borderClass} ${grade.heroBgClass} ${grade.heroShadowClass} px-5 py-4`}
    >
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl shrink-0 leading-none" aria-hidden>
              {grade.emoji}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
              {periodLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-3 leading-none mb-2">
            <span className={`text-4xl font-black ${grade.colorClass}`}>{gradeLabel}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{verdict}</p>
        </div>
        <div className="md:text-right shrink-0">
          <p className="text-[10px] text-zinc-500 mb-0.5 tracking-wider uppercase">{caption}</p>
          <div className="flex items-baseline gap-1 md:justify-end">
            <span className="text-5xl font-black text-white">{score}</span>
            <span className="text-xl text-zinc-600 font-light">/100</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 이전 ScoreBreakdown export 호환성 — 다른 컴포넌트가 type 만 import 할 수 있음.
// 현재 hero 는 chip 제거로 미사용이지만 type signature 깨면 호출부 lint 깨지므로 keep.
export interface ScoreBreakdown {
  sajuAxis: number
  astroAxis: number
  sajuAxisRaw?: number | null
  astroAxisRaw?: number | null
  agreementPercent?: number | null
}
