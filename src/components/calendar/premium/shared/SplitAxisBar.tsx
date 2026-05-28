'use client'

/**
 * 사주↔점성 dual bar — 한 줄에 두 축 점수를 색으로 분리 표시.
 * 좌측 amber = 사주, 우측 cyan = 점성. 가운데 분기선이 두 raw 점수 비율.
 * agreement (aligned / mixed / opposed) 는 분기선 색 + 우측 chip 으로.
 *
 * 사용처: DayVerdictCard, (확장 시) MonthInsights / YearInsights.
 */

import { motion } from 'framer-motion'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  /** 0-100 */
  sajuScore: number
  /** 0-100 */
  astroScore: number
  agreement?: 'aligned' | 'mixed' | 'opposed' | null
  locale?: CalLocale
}

export default function SplitAxisBar({ sajuScore, astroScore, agreement, locale }: Props) {
  const t = getCalLabels(locale)
  const saju = Math.max(0, Math.min(100, Math.round(sajuScore)))
  const astro = Math.max(0, Math.min(100, Math.round(astroScore)))
  const splitPct = saju + astro > 0 ? (saju / (saju + astro)) * 100 : 50

  const dividerTone =
    agreement === 'aligned'
      ? 'bg-emerald-300'
      : agreement === 'opposed'
        ? 'bg-rose-300'
        : 'bg-zinc-300'

  return (
    <div className="space-y-1.5">
      <div className="relative h-2 rounded-full bg-zinc-800/70 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/80 to-amber-400/70"
          initial={{ width: 0 }}
          animate={{ width: `${splitPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-cyan-500/80 to-cyan-400/70"
          initial={{ width: 0 }}
          animate={{ width: `${100 - splitPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.div
          className={`absolute inset-y-0 ${dividerTone} w-[2px] shadow-[0_0_4px_rgba(255,255,255,0.4)]`}
          initial={{ left: '50%' }}
          animate={{ left: `${splitPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ transform: 'translateX(-1px)' }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-zinc-500">{t.dayWhySajuLabel}</span>
          <span className="font-bold text-amber-200 tabular-nums">{saju}</span>
        </span>
        {agreement && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              agreement === 'aligned'
                ? 'text-emerald-300'
                : agreement === 'opposed'
                  ? 'text-rose-300'
                  : 'text-zinc-400'
            }`}
          >
            {t.dayAxisAgreement(agreement)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-cyan-200 tabular-nums">{astro}</span>
          <span className="text-zinc-500">{t.dayWhyAstroLabel}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </span>
      </div>
    </div>
  )
}
