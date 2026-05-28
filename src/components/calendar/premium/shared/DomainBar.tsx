'use client'

/**
 * 도메인/테마 바 — 5바 그래프 한 줄.
 *
 * 사용처: MonthInsights(ThemeFocus), YearInsights(YearFocus), DayInsights(DayDomains).
 * 이전엔 세 곳에 거의 동일 코드(~40줄씩) 중복 → 단일 컴포넌트로.
 *
 * isTop 이면 amber 강조 + glow, 아니면 zinc 톤.
 * mount 시 framer-motion 의 barFill variant 로 0 → pct 애니메이션.
 */

import { motion } from 'framer-motion'
import { barFill } from './motionVariants'

interface Props {
  /** 라벨 — 보통 t.themeName(key) 결과 */
  label: string
  /** 0-100 점수 */
  score: number
  /** top 표시 (amber 강조) */
  isTop?: boolean
}

export default function DomainBar({ label, score, isTop = false }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-12 text-xs font-semibold shrink-0 ${
          isTop ? 'text-amber-200' : 'text-zinc-400'
        }`}
      >
        {label}
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
