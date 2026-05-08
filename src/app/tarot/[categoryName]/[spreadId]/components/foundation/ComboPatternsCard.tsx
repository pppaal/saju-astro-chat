'use client'

import type { ComboHit } from '@/lib/Tarot/foundation/combinations'

const TONE_STYLE: Record<string, { border: string; bg: string; emoji: string }> = {
  harmony:        { border: 'border-emerald-400/40', bg: 'bg-emerald-500/10', emoji: '🌿' },
  tension:        { border: 'border-amber-400/40',   bg: 'bg-amber-500/10',   emoji: '⚡' },
  transformation: { border: 'border-fuchsia-400/40', bg: 'bg-fuchsia-500/10', emoji: '🔄' },
  warning:        { border: 'border-rose-400/40',    bg: 'bg-rose-500/10',    emoji: '⚠️' },
}

export default function ComboPatternsCard({ hits }: { hits: ComboHit[] }) {
  if (hits.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🎭 함께 등장한 의미 깊은 카드</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          이 카드들이 같이 뽑혔을 때 평소보다 훨씬 강한 의미가 됩니다
        </p>
      </div>

      <div className="space-y-3">
        {hits.map(({ pattern, matchedCardNames }) => {
          const style = TONE_STYLE[pattern.tone] || TONE_STYLE.harmony
          return (
            <div
              key={pattern.key}
              className={`rounded-2xl border ${style.border} ${style.bg} p-4 backdrop-blur-md`}
            >
              <h4 className="text-sm font-bold text-white mb-2">
                {style.emoji} {pattern.label.replace(/\s*\(.*?\)$/, '')}
              </h4>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {matchedCardNames.map((name) => (
                  <span
                    key={name}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-[12.5px] text-slate-200 leading-relaxed mb-2">{pattern.meaning}</p>
              <p className="text-[12px] text-white leading-snug pt-2 border-t border-white/10">
                💡 {pattern.advice}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
