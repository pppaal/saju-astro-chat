'use client'

/**
 * 사주↔점성 교차 인사이트 카드 — 한 기간(month / year) 동안 두 시스템이
 * 얼마나 합의했는지 visual 로.
 *
 *   1. 좌/우 두 원 (사주 amber / 점성 cyan) — 평균 raw 점수 = 원 크기
 *   2. 가운데 overlap 영역 = 합의(aligned) 일 수
 *   3. 하단 막대: aligned / mixed / opposed 일 카운트 비율
 *
 * monthDates / yearDates 의 evidence.sajuAxisRaw / astroAxisRaw / axisAgreement
 * 가 있어야 동작. 없으면 카드 자체 스킵.
 */

import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
}

export default function CrossInsightCard({ dates, locale }: Props) {
  const t = getCalLabels(locale)

  let sajuSum = 0
  let sajuCount = 0
  let astroSum = 0
  let astroCount = 0
  let alignedDays = 0
  let mixedDays = 0
  let opposedDays = 0

  for (const d of dates) {
    const ev = d.evidence
    if (!ev) continue
    const saju = (ev as { sajuAxisRaw?: number }).sajuAxisRaw
    const astro = (ev as { astroAxisRaw?: number }).astroAxisRaw
    if (typeof saju === 'number') {
      sajuSum += saju
      sajuCount += 1
    }
    if (typeof astro === 'number') {
      astroSum += astro
      astroCount += 1
    }
    const ag = (ev as { axisAgreement?: 'aligned' | 'mixed' | 'opposed' }).axisAgreement
    if (ag === 'aligned') alignedDays += 1
    else if (ag === 'opposed') opposedDays += 1
    else if (ag === 'mixed') mixedDays += 1
  }

  if (sajuCount === 0 && astroCount === 0) return null

  const sajuAvg = sajuCount > 0 ? Math.round(sajuSum / sajuCount) : 0
  const astroAvg = astroCount > 0 ? Math.round(astroSum / astroCount) : 0
  const total = alignedDays + mixedDays + opposedDays
  const alignedPct = total > 0 ? (alignedDays / total) * 100 : 0
  const mixedPct = total > 0 ? (mixedDays / total) * 100 : 0
  const opposedPct = total > 0 ? (opposedDays / total) * 100 : 0

  // 원 크기 = 평균 점수 (40-90px 매핑)
  const sajuRadius = 20 + (sajuAvg / 100) * 25
  const astroRadius = 20 + (astroAvg / 100) * 25

  // overlap = 합의일 비중 — 두 원의 거리로 표현 (높을수록 가깝게)
  const closeness = total > 0 ? alignedDays / total : 0.5
  const gap = 60 - closeness * 50 // 60(분리) → 10(거의 겹침)
  const cx1 = 80 - gap / 2
  const cx2 = 80 + gap / 2

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-emerald-950/15 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 bg-emerald-500/8 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-emerald-200 flex items-center gap-2 mb-4 group">
        <Compass className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition" />
        {t.crossInsightTitle}
      </h3>

      <div className="relative flex items-center gap-5">
        <svg viewBox="0 0 160 110" className="w-40 h-28 shrink-0">
          <defs>
            <radialGradient id="sajuGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
            </radialGradient>
            <radialGradient id="astroGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
            </radialGradient>
          </defs>
          <motion.circle
            cx={cx1}
            cy="55"
            r={sajuRadius}
            fill="url(#sajuGrad)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.circle
            cx={cx2}
            cy="55"
            r={astroRadius}
            fill="url(#astroGrad)"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          />
          <text x={cx1} y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fde68a">
            {sajuAvg}
          </text>
          <text x={cx2} y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a5f3fc">
            {astroAvg}
          </text>
          <text x="80" y="105" textAnchor="middle" fontSize="9" fill="#71717a" letterSpacing="1">
            {t.crossInsightAvgLabel}
          </text>
        </svg>

        <div className="flex-1 min-w-0 space-y-2">
          {total > 0 && (
            <>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{t.crossInsightAgreementLabel}</span>
                <span className="text-emerald-300 font-bold tabular-nums">
                  {Math.round(alignedPct)}%
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800/60">
                {alignedDays > 0 && (
                  <motion.div
                    className="bg-emerald-400/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${alignedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}
                {mixedDays > 0 && (
                  <motion.div
                    className="bg-zinc-500/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${mixedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  />
                )}
                {opposedDays > 0 && (
                  <motion.div
                    className="bg-rose-400/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${opposedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-400">{t.crossInsightAligned}</span>
                  <span className="text-emerald-300 font-bold tabular-nums">{alignedDays}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span className="text-zinc-400">{t.crossInsightMixed}</span>
                  <span className="text-zinc-300 font-bold tabular-nums">{mixedDays}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-zinc-400">{t.crossInsightOpposed}</span>
                  <span className="text-rose-300 font-bold tabular-nums">{opposedDays}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
