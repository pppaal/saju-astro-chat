import React from 'react'
import { Link2 } from 'lucide-react'

interface CombinationsSectionProps {
  combinations: { cards: string[]; meaning: string }[] | undefined
  language: string
}

export function CombinationsSection({ combinations, language }: CombinationsSectionProps) {
  if (!combinations || combinations.length === 0) return null
  const isKo = language === 'ko'

  return (
    <section className="rounded-2xl bg-slate-900/50 border border-violet-500/20 shadow-[0_0_24px_rgba(139,92,246,0.06)] p-5 md:p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-violet-300" />
        <h2 className="text-sm font-medium text-violet-300 tracking-wider uppercase">
          {isKo ? '카드 조합' : 'Card Combinations'}
        </h2>
      </div>
      <ul className="space-y-3">
        {combinations.map((combo, i) => (
          <li key={i} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
            {combo.cards?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {combo.cards.map((c, j) => (
                  <span
                    key={j}
                    className="px-2.5 py-0.5 text-xs rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            <p className="text-base text-slate-100 leading-relaxed">{combo.meaning}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
