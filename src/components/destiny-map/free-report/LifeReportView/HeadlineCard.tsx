'use client'

import { Sparkles } from 'lucide-react'
import type { Headline } from '@/lib/fusion/lifeReport'

interface HeadlineCardProps {
  headline: Headline
  isKo: boolean
}

/**
 * One-line definition of the chart. Big readable text, single card.
 * Silent when both ko/en strings are empty.
 */
export default function HeadlineCard({ headline, isKo }: HeadlineCardProps) {
  const text = isKo ? headline.ko : headline.en
  if (!text || text.trim().length === 0) return null

  return (
    <section className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-slate-900/60 p-5 md:p-6 backdrop-blur-md">
      <header className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-fuchsia-300" aria-hidden />
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-fuchsia-200">
          {isKo ? '한 줄 정의' : 'Headline'}
        </p>
      </header>
      <p className="text-base md:text-lg leading-relaxed text-white whitespace-pre-line">
        {text}
      </p>
    </section>
  )
}
