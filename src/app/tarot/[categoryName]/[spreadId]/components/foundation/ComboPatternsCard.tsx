'use client'

import type { ComboHit } from '@/lib/Tarot/foundation/combinations'

const TONE_STYLE: Record<string, { border: string; bg: string; pill: string; emoji: string }> = {
  harmony: {
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-500/10',
    pill: 'text-emerald-300',
    emoji: '🌿',
  },
  tension: {
    border: 'border-amber-400/40',
    bg: 'bg-amber-500/10',
    pill: 'text-amber-300',
    emoji: '⚡',
  },
  transformation: {
    border: 'border-fuchsia-400/40',
    bg: 'bg-fuchsia-500/10',
    pill: 'text-fuchsia-300',
    emoji: '🔄',
  },
  warning: {
    border: 'border-rose-400/40',
    bg: 'bg-rose-500/10',
    pill: 'text-rose-300',
    emoji: '⚠️',
  },
}

export default function ComboPatternsCard({ hits }: { hits: ComboHit[] }) {
  if (hits.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🎭 명명된 카드 결합 패턴</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          신살 / 어스펙트 패턴에 대응 — 두세 카드가 함께일 때 스프레드 의미가 압축적으로 활성됩니다
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
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="text-sm font-bold text-white">
                  {style.emoji} {pattern.label}
                </h4>
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest ${style.pill}`}
                >
                  {pattern.tone}
                </span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed mb-2">{pattern.meaning}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {matchedCardNames.map((name) => (
                  <span
                    key={name}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200 font-mono"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-[11.5px] text-slate-200 leading-snug pt-2 border-t border-white/5">
                💡 {pattern.advice}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
