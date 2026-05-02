'use client'

/**
 * Multi-Facet Grid — renders the 8-dimension relationship breakdown
 * as a grid of cards. Each card has score / band-color / headline /
 * strengths / minds / actionable tip.
 */

import { memo } from 'react'
import type { FacetReport } from '@/hooks/useCompatibilityAnalysis'

interface MultiFacetGridProps {
  facets: FacetReport[]
  tier: 'free' | 'premium'
}

const BAND_STYLE: Record<FacetReport['band'], { color: string; bg: string; border: string; pill: string }> = {
  great: {
    color: '#34d399',
    bg: 'bg-emerald-400/[0.06]',
    border: 'border-emerald-300/25',
    pill: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100',
  },
  good: {
    color: '#22d3ee',
    bg: 'bg-cyan-400/[0.06]',
    border: 'border-cyan-300/25',
    pill: 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100',
  },
  mixed: {
    color: '#a3a3a3',
    bg: 'bg-white/[0.03]',
    border: 'border-white/10',
    pill: 'border-white/15 bg-white/[0.04] text-slate-300',
  },
  caution: {
    color: '#fbbf24',
    bg: 'bg-amber-400/[0.06]',
    border: 'border-amber-300/25',
    pill: 'border-amber-300/30 bg-amber-400/15 text-amber-100',
  },
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
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {facets.map((f) => {
          const style = BAND_STYLE[f.band]
          return (
            <div
              key={f.key}
              className={`flex flex-col rounded-2xl border p-5 backdrop-blur-md ${style.border} ${style.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[1.1rem]">{f.emoji}</span>
                  <h3 className="text-[14.5px] font-semibold text-white">{f.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[1.4rem] font-semibold leading-none tabular-nums"
                    style={{ color: style.color }}
                  >
                    {f.score}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.pill}`}
                  >
                    {BAND_LABEL[f.band]}
                  </span>
                </div>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${f.score}%`, background: style.color }}
                />
              </div>

              <p
                className="mt-3 text-[13px] leading-relaxed text-slate-200"
                style={{ wordBreak: 'keep-all' }}
              >
                {f.headline}
              </p>

              {f.strengths.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-emerald-300/85">
                    자연스러운 부분
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {f.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-[12.5px] leading-relaxed text-slate-300"
                        style={{ wordBreak: 'keep-all' }}
                      >
                        <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-emerald-300" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {f.minds.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-amber-300/85">
                    다스려야 할 부분
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {f.minds.map((m, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-[12.5px] leading-relaxed text-slate-300"
                        style={{ wordBreak: 'keep-all' }}
                      >
                        <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-amber-300" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {f.tip && (
                <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-400/[0.06] p-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-violet-300/90">
                    실천 팁
                  </p>
                  <p
                    className="mt-1 text-[12.5px] leading-relaxed text-slate-200"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {f.tip}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tier !== 'premium' && facets.length === 4 && (
        <div className="mt-2 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-4 text-center">
          <p className="text-[12.5px] text-slate-300" style={{ wordBreak: 'keep-all' }}>
            프리미엄에서는 <strong className="text-violet-200">갈등·가치관·일상·성장</strong> 4개 각도가
            추가로 풀이되어 총 8개 각도를 볼 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
})
