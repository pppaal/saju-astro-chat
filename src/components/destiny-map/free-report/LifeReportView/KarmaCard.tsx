'use client'

import { Moon } from 'lucide-react'
import type { KarmaSection } from '@/lib/fusion/lifeReport'

interface KarmaCardProps {
  karma: KarmaSection
  isKo: boolean
}

/**
 * Karma / latent potential section. Renders up to ~4 paragraphs.
 * Silent when paragraphs are empty.
 */
export default function KarmaCard({ karma, isKo }: KarmaCardProps) {
  const paragraphs = karma.paragraphs.filter((p) => (isKo ? p.ko : p.en)?.trim())
  if (paragraphs.length === 0) return null

  return (
    <section className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <header className="flex items-center gap-2 mb-4">
        <Moon className="w-4 h-4 text-indigo-300" aria-hidden />
        <h2 className="text-sm md:text-base font-bold text-white">
          {isKo ? '카르마와 잠재력' : 'Karma & Latent Potential'}
        </h2>
      </header>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed text-slate-200 whitespace-pre-line"
          >
            {isKo ? p.ko : p.en}
          </p>
        ))}
      </div>
    </section>
  )
}
