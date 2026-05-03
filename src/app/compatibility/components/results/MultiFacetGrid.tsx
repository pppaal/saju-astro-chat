'use client'

/**
 * Multi-Facet — book-style flowing prose for each of the 8 dimensions.
 * Each facet is rendered as a single connected paragraph (headline +
 * what works + what to mind + tip woven together) instead of a card
 * grid with bullet lists.
 */

import { memo } from 'react'
import type { FacetReport } from '@/hooks/useCompatibilityAnalysis'

interface MultiFacetGridProps {
  facets: FacetReport[]
  tier: 'free' | 'premium'
}

const BAND_COLOR: Record<FacetReport['band'], string> = {
  great: '#34d399',
  good: '#22d3ee',
  mixed: '#a3a3a3',
  caution: '#fbbf24',
}

const BAND_LABEL: Record<FacetReport['band'], string> = {
  great: '아주 좋음',
  good: '좋음',
  mixed: '보통',
  caution: '주의',
}

export const MultiFacetGrid = memo(function MultiFacetGrid({ facets, tier }: MultiFacetGridProps) {
  if (!facets || facets.length === 0) return null

  return (
    <div className="space-y-8">
      {facets.map((f, i) => {
        const color = BAND_COLOR[f.band]
        return (
          <article key={f.key} className="space-y-3">
            <header className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[1.2rem]">{f.emoji}</span>
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.012em] text-white">
                  {f.label}
                </h3>
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500">
                  Chapter {i + 1}
                </span>
              </div>
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span
                  className="text-[1.4rem] font-semibold leading-none tabular-nums"
                  style={{ color }}
                >
                  {f.score}
                </span>
                <span className="text-[11px] text-slate-400">· {BAND_LABEL[f.band]}</span>
              </div>
            </header>

            <p
              className="mx-auto max-w-[68ch] text-[15.5px] leading-[1.95] text-slate-100/95"
              style={{
                wordBreak: 'keep-all',
                textWrap: 'pretty',
                letterSpacing: '0.005em',
                fontFeatureSettings: '"kern", "palt"',
              }}
            >
              {f.prose ||
                [
                  f.headline,
                  f.strengths.length > 0 ? f.strengths.join(' ') : '',
                  f.minds.length > 0 ? `다만 ${f.minds.join(' ')}` : '',
                  f.tip,
                ]
                  .filter(Boolean)
                  .join(' ')}
            </p>
          </article>
        )
      })}

      {tier !== 'premium' && facets.length === 4 && (
        <div className="mt-2 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-4 text-center">
          <p className="text-[12.5px] text-slate-300" style={{ wordBreak: 'keep-all' }}>
            프리미엄에서는 <strong className="text-violet-200">갈등·가치관·일상·성장</strong> 4개 챕터가
            추가로 풀이되어 총 8 챕터를 볼 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
})
