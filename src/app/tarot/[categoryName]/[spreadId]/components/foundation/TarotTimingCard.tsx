'use client'

import type { TarotTimingOutput } from '@/lib/Tarot/foundation/timing'

export default function TarotTimingCard({ data }: { data: TarotTimingOutput }) {
  const confPct = Math.round(data.confidence * 100)

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">⏳ 타로 타이밍 분석</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          카드별 전통 타이밍 + 트리거 + 역방향 지연 — &ldquo;언제&rdquo;에 대한 확률적 답
        </p>
      </div>

      {/* Primary verdict */}
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-fuchsia-500/10 p-4 mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
          결정적 시기
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-xl font-bold text-white">{data.primaryLabel}</span>
          <span className="text-[11px] font-mono text-amber-200">신뢰도 {confPct}%</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300">트리거</span>
          <span className="text-[12px] text-white">{data.primaryTriggerLabel}</span>
        </div>
        <p className="text-[12px] text-slate-200 leading-relaxed mb-2">{data.summary}</p>
        <p className="text-[11.5px] text-amber-200 leading-snug pt-2 border-t border-white/5">
          💡 {data.advice}
        </p>
      </div>

      {/* Per-card breakdown */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
          카드별 타이밍 근거
        </div>
        <ul className="space-y-1.5">
          {data.perCard.map((c, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span className="text-[11.5px] text-white font-semibold flex-shrink-0">
                {c.cardName}
                {c.isReversed && <span className="text-[10px] text-amber-300 ml-1">(역)</span>}
              </span>
              <span className="text-[10px] text-slate-400 font-mono text-right">
                {c.window} · {c.trigger.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
