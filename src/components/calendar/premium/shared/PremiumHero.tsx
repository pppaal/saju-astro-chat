'use client'

/**
 * Premium tier hero — period label + verdict + "score/100" + emoji anchor.
 * year/month/day 세 tier 공용. heroBgClass + heroShadowClass(scoreGrade)로
 * grade별 글로우 backdrop. locale 받아 chip 라벨 ko/en 분기.
 */
import type { GradeInfo } from '../../scoreGrade'
import { getCalLabels, type CalLocale } from '../labels'

export interface ScoreBreakdown {
  /** 0-100, 사주 신호 강도. v2 override 활성 시엔 score 정렬 시프트값이 와서
   *  실제 신호 강도가 아닐 수 있음 — 가능하면 sajuAxisRaw 우선. */
  sajuAxis: number
  /** 0-100, 점성 신호 강도. 같은 caveat. */
  astroAxis: number
  /** v2 override 미시프트 사주 raw — 있으면 UI 표시에 이쪽 우선. */
  sajuAxisRaw?: number | null
  /** 점성 raw */
  astroAxisRaw?: number | null
  /** 사주↔점성 합치도 0-100. engine 가 안 계산했으면 null. */
  agreementPercent?: number | null
}

interface Props {
  /** "2026 한 해" / "2026년 5월" / "5월 27일 목요일" 등 tier별 라벨 */
  periodLabel: string
  /** 한 줄 verdict (engine 생성) */
  verdict: string
  /** 평균 점수 0-100 */
  score: number
  grade: GradeInfo
  /** 우측 점수 위 작은 라벨 — 미지정 시 locale 기본 ("평균 에너지" / "Avg energy") */
  scoreCaption?: string
  /** 점수 분포 — 있으면 hero 아래 chip 라인으로 표시 */
  breakdown?: ScoreBreakdown | null
  /** UI 라벨 locale */
  locale?: CalLocale
}

function deriveAgreement(b: ScoreBreakdown): number | null {
  if (typeof b.agreementPercent === 'number') return Math.round(b.agreementPercent)
  // 엔진이 합치도를 안 계산했으면 fabricate 안 함 — null 반환해 chip 숨김.
  // 이전 폴백(100 - diff)은 사주=점성=50(신호 없음) 케이스에서 100% 표시해
  // "완벽 합치" 거짓말을 만들었음.
  return null
}

export default function PremiumHero({
  periodLabel,
  verdict,
  score,
  grade,
  scoreCaption,
  breakdown,
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

      {/* 점수 분포 — "이 점수 어떻게 나왔어?" 시각화. raw 우선 (있으면 실제 신호
          강도), 없으면 shifted axis (final 정렬값) 폴백. */}
      {breakdown &&
        (() => {
          const agreement = deriveAgreement(breakdown)
          const sajuShown =
            typeof breakdown.sajuAxisRaw === 'number' ? breakdown.sajuAxisRaw : breakdown.sajuAxis
          const astroShown =
            typeof breakdown.astroAxisRaw === 'number'
              ? breakdown.astroAxisRaw
              : breakdown.astroAxis
          return (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 text-[11px]">
              <span className="text-zinc-500">{t.distribution}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/15 text-amber-200">
                {t.saju} <span className="font-bold">{Math.round(sajuShown)}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/15 text-cyan-200">
                {t.astro} <span className="font-bold">{Math.round(astroShown)}</span>
              </span>
              {agreement != null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/10 border border-white/10 text-zinc-300">
                  {t.agreementShort} <span className="font-bold">{agreement}%</span>
                </span>
              )}
            </div>
          )
        })()}
    </div>
  )
}
