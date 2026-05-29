'use client'

/**
 * Year tier insights — yearlyMonthly[].themes 평균 5바 + yearlyConvergence 큰 날.
 *
 *   1. YearFocus    — 5 theme bar (12개월 평균) + top tone narrative
 *   2. YearBigDays  — yearlyConvergence.keyDays bothSystems + meaning + 펼치기 가능한 근거
 *
 * 각 카드는 데이터 없으면 자체 렌더 스킵.
 */

import { motion } from 'framer-motion'
import { Sparkles, Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import type { YearMonthly } from '../../DestinyMatrixPlanner'
import { getCalLabels, type CalLocale } from '../labels'
import { cardStack, cardItem } from './motionVariants'
import DomainBar from './DomainBar'
import BigDaysList from './BigDaysList'

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
    <motion.div
      className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4"
      variants={cardStack}
      initial="hidden"
      animate="show"
    >
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
          <DomainBar
            key={a.theme}
            label={t.themeName(a.theme)}
            score={a.score}
            isTop={a.theme === topTheme}
          />
        ))}
      </div>
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
  // 사용자 요청: 1월부터 시간 순. 점수 정렬(엔진 기본)이 아니라 chronological.
  const days = (yearlyConvergence?.keyDays ?? [])
    .filter((d) => d.bothSystems && d.meaning)
    .slice() // 원본 변형 방지
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  if (days.length === 0) return null

  const fmtDate = (iso: string) => {
    const m = parseInt(iso.slice(5, 7), 10)
    const d = parseInt(iso.slice(8, 10), 10)
    return t.fmtMonthDay(m, d)
  }
  const handleClick = (iso: string) => {
    if (!onMonthClick) return
    const m = parseInt(iso.slice(5, 7), 10)
    if (m >= 1 && m <= 12) onMonthClick(m - 1)
  }

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-[rgba(160,122,60,0.15)] backdrop-blur-sm border border-[rgba(212,181,114,0.15)] rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -bottom-16 -right-12 w-40 h-40 bg-[rgba(212,181,114,0.08)] blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-[#e8cc8a] flex items-center gap-2 mb-5 group">
        <Compass className="w-4 h-4 text-[#d4b572] group-hover:text-[#d4b572] transition" />
        {t.yearBigDaysTitle}
      </h3>
      <BigDaysList
        days={days.map((d) => ({
          date: fmtDate(d.date),
          meaning: d.meaning,
          astro: d.astro,
          saju: d.saju,
        }))}
        astroLabel={t.bigTurnsAstroLabel}
        sajuLabel={t.bigTurnsSajuLabel}
        evidenceToggle={t.evidenceToggle}
        evidenceShow={t.evidenceShow}
        evidenceHide={t.evidenceHide}
        onDateClick={onMonthClick ? (i) => handleClick(days[i].date) : undefined}
      />
    </div>
  )
}
