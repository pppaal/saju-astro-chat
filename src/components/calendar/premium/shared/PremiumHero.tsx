'use client'

/**
 * Premium tier hero — period label + verdict + "score/100" + emoji anchor.
 * year/month/day 세 tier 공용. heroBgClass + heroShadowClass(scoreGrade)로
 * grade별 글로우 backdrop + 노이즈 + ghost emoji + 점수 카운트업.
 */
import type { GradeInfo } from '../../scoreGrade'
import { getCalLabels, type CalLocale } from '../labels'
import { useCountUp } from './useCountUp'
import NoiseOverlay from './NoiseOverlay'

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
  const animatedScore = useCountUp(score)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${grade.borderClass} ${grade.heroBgClass} ${grade.heroShadowClass} px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`}
    >
      <NoiseOverlay opacity={0.025} />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -bottom-4 text-[120px] leading-none opacity-[0.06] select-none"
      >
        {grade.emoji}
      </span>
      <div className="relative">
        {/* 라벨 + 점수 동일 줄 — 모바일 / 데스크탑 동일 */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 leading-none" aria-hidden>
              {grade.emoji}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase truncate">
              {periodLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-3xl sm:text-4xl font-black tabular-nums bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-transparent">
              {animatedScore}
            </span>
            <span className="text-sm text-zinc-600 font-light">/100</span>
          </div>
        </div>
        {/* grade + caption — 합치율은 CrossInsightCard 가 근거와 함께 보여주므로 hero 에서 제거 */}
        <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
          <span className={`text-2xl sm:text-3xl font-black ${grade.colorClass}`}>
            {gradeLabel}
          </span>
          <span className="text-[10px] text-zinc-500 tracking-wider uppercase">{caption}</span>
        </div>
        <p className="text-sm text-zinc-300 leading-snug">{verdict}</p>
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
