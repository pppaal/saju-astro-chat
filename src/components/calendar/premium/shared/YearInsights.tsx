'use client'

/**
 * Year tier insights — yearlyMonthly[].themes 평균 5바 + yearlyConvergence 큰 날.
 *
 *   1. YearFocus    — 5 theme bar (12개월 평균) + top tone narrative
 *   2. YearBigDays  — yearlyConvergence.keyDays bothSystems + meaning + astro/saju split
 *
 * 각 카드는 데이터 없으면 자체 렌더 스킵.
 */

import { motion } from 'framer-motion'
import { Sparkles, Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import type { YearMonthly } from '../../DestinyMatrixPlanner'
import { getCalLabels, type CalLocale } from '../labels'
import { cardStack, cardItem, barFill } from './motionVariants'

type ThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'
type YearlyConvergence = NonNullable<
  NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
>

interface Props {
  yearlyMonthly?: YearMonthly[]
  yearlyConvergence?: YearlyConvergence
  locale?: CalLocale
  /** 달 클릭 → 그 달 monthly 뷰로 (0-indexed) */
  onMonthClick?: (monthIdx: number) => void
}

export default function YearInsights({
  yearlyMonthly,
  yearlyConvergence,
  locale,
  onMonthClick,
}: Props) {
  return (
    <motion.div className="space-y-4" variants={cardStack} initial="hidden" animate="show">
      <motion.div variants={cardItem}>
        <YearFocusCard yearlyMonthly={yearlyMonthly} locale={locale} />
      </motion.div>
      <motion.div variants={cardItem}>
        <YearBigDaysCard
          yearlyConvergence={yearlyConvergence}
          locale={locale}
          onMonthClick={onMonthClick}
        />
      </motion.div>
    </motion.div>
  )
}

// ── 1. YearFocus ─────────────────────────────────────────────────────
function YearFocusCard({
  yearlyMonthly,
  locale,
}: {
  yearlyMonthly?: YearMonthly[]
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  if (!yearlyMonthly || yearlyMonthly.length === 0) return null

  const sums: Record<ThemeKey, { sum: number; count: number }> = {
    love: { sum: 0, count: 0 },
    money: { sum: 0, count: 0 },
    career: { sum: 0, count: 0 },
    health: { sum: 0, count: 0 },
    growth: { sum: 0, count: 0 },
  }
  for (const m of yearlyMonthly) {
    for (const th of m.themes ?? []) {
      const bucket = sums[th.theme]
      if (bucket) {
        bucket.sum += th.score
        bucket.count += 1
      }
    }
  }
  const averages = (Object.keys(sums) as ThemeKey[])
    .map((theme) => ({
      theme,
      score: sums[theme].count > 0 ? sums[theme].sum / sums[theme].count : 0,
    }))
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
  if (averages.length === 0) return null

  const topTheme = averages[0].theme
  return (
    <div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/45 to-zinc-950/55 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -left-12 w-40 h-40 bg-amber-500/8 blur-3xl rounded-full" />
      <div className="relative flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-amber-200 flex items-center gap-2 group">
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition" />
          {t.yearFocusTitle}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          {t.contextYearAvg}
        </span>
      </div>
      <div className="relative space-y-2.5">
        {averages.map((a) => (
          <YearBar
            key={a.theme}
            theme={a.theme}
            score={a.score}
            isTop={a.theme === topTheme}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function YearBar({
  theme,
  score,
  isTop,
  t,
}: {
  theme: ThemeKey
  score: number
  isTop: boolean
  t: ReturnType<typeof getCalLabels>
}) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-12 text-xs font-semibold shrink-0 ${isTop ? 'text-amber-200' : 'text-zinc-400'}`}
      >
        {t.themeName(theme)}
      </span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800/70 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isTop
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]'
              : 'bg-gradient-to-r from-zinc-500 to-zinc-600'
          }`}
          variants={barFill}
          custom={pct}
        />
      </div>
      <span
        className={`text-xs font-bold w-8 text-right shrink-0 tabular-nums ${
          isTop ? 'text-amber-200' : 'text-zinc-400'
        }`}
      >
        {pct}
      </span>
    </div>
  )
}

// ── 2. YearBigDays ───────────────────────────────────────────────────
function YearBigDaysCard({
  yearlyConvergence,
  locale,
  onMonthClick,
}: {
  yearlyConvergence?: YearlyConvergence
  locale?: CalLocale
  onMonthClick?: (monthIdx: number) => void
}) {
  const t = getCalLabels(locale)
  const days = (yearlyConvergence?.keyDays ?? [])
    .filter((d) => d.bothSystems && d.meaning)
    .slice(0, 4)
  if (days.length === 0) return null

  const fmtDate = (iso: string) => {
    const m = parseInt(iso.slice(5, 7), 10)
    const d = parseInt(iso.slice(8, 10), 10)
    return locale === 'en' ? `${m}/${d}` : `${m}월 ${d}일`
  }
  const handleClick = (iso: string) => {
    if (!onMonthClick) return
    const m = parseInt(iso.slice(5, 7), 10)
    if (m >= 1 && m <= 12) onMonthClick(m - 1)
  }

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-violet-950/15 backdrop-blur-sm border border-violet-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -bottom-16 -right-12 w-40 h-40 bg-violet-500/8 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-violet-200 flex items-center gap-2 mb-5 group">
        <Compass className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition" />
        {t.yearBigDaysTitle}
      </h3>
      <div className="relative space-y-4">
        {days.map((d) => {
          const Wrapper: React.ElementType = onMonthClick ? 'button' : 'div'
          return (
            <Wrapper
              key={d.date}
              onClick={onMonthClick ? () => handleClick(d.date) : undefined}
              className={`block w-full text-left ${
                onMonthClick ? 'hover:bg-white/[0.03] -mx-2 px-2 py-1.5 rounded-lg transition' : ''
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                <span className="text-base font-bold text-violet-200">{fmtDate(d.date)}</span>
                {d.meaning && (
                  <span className="text-sm text-zinc-300 leading-snug">— {d.meaning}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {d.astro.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-200 text-[11px]">
                    <span className="font-semibold opacity-70">{t.bigTurnsAstroLabel}</span>
                    <span className="font-medium">{d.astro.join(' · ')}</span>
                  </span>
                )}
                {d.saju.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-200 text-[11px]">
                    <span className="font-semibold opacity-70">{t.bigTurnsSajuLabel}</span>
                    <span className="font-medium">{d.saju.join(' · ')}</span>
                  </span>
                )}
              </div>
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}
