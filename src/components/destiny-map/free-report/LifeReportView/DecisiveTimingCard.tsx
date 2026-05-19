'use client'

import { Clock } from 'lucide-react'
import type { DecisiveTiming } from '@/lib/fusion/lifeReport'

interface DecisiveTimingCardProps {
  timing: DecisiveTiming
  isKo: boolean
}

const DOMAIN_LABEL_KO: Record<string, string> = {
  career: '커리어',
  love: '관계',
  health: '건강',
  wealth: '재물',
  money: '재물',
  crisis: '전환점',
  family: '가족',
  children: '자녀',
}

const DOMAIN_LABEL_EN: Record<string, string> = {
  career: 'Career',
  love: 'Love',
  health: 'Health',
  wealth: 'Wealth',
  money: 'Wealth',
  crisis: 'Turning Point',
  family: 'Family',
  children: 'Children',
}

const DOMAIN_TONE: Record<string, string> = {
  career: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  love: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
  health: 'bg-teal-500/15 text-teal-200 border-teal-400/30',
  wealth: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  money: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  crisis: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  family: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
  children: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
}

/**
 * Decisive timing card. Renders narrative paragraphs + a list of
 * decisive years tagged by life domain. Silent when both are empty.
 */
export default function DecisiveTimingCard({ timing, isKo }: DecisiveTimingCardProps) {
  const paragraphs = timing.paragraphs.filter((p) => (isKo ? p.ko : p.en)?.trim())
  const years = timing.decisiveYears

  if (paragraphs.length === 0 && years.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <header className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-amber-300" aria-hidden />
        <h2 className="text-sm md:text-base font-bold text-white">
          {isKo ? '결정적 타이밍' : 'Decisive Timing'}
        </h2>
      </header>

      {paragraphs.length > 0 && (
        <div className="space-y-2.5 mb-5">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-slate-200 whitespace-pre-line"
            >
              {isKo ? p.ko : p.en}
            </p>
          ))}
        </div>
      )}

      {years.length > 0 && (
        <ul className="space-y-2.5">
          {years.map((y, i) => {
            const labelMap = isKo ? DOMAIN_LABEL_KO : DOMAIN_LABEL_EN
            const tone =
              DOMAIN_TONE[y.domain] ||
              'bg-slate-500/15 text-slate-200 border-slate-400/30'
            const label = labelMap[y.domain] || y.domain
            const desc = isKo ? y.description.ko : y.description.en
            return (
              <li
                key={`${y.year}-${y.domain}-${i}`}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-3"
              >
                <div className="shrink-0 text-center">
                  <div className="text-base md:text-lg font-bold text-white leading-none">
                    {y.year}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
                    {isKo ? `${y.age}세` : `age ${y.age}`}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-block text-[11px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 mb-1.5 ${tone}`}
                  >
                    {label}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-200">{desc}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
