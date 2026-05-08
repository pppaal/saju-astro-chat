'use client'

import type { LifecycleTimingOutput } from '@/lib/astrology/foundation/lifecycleTiming'

export default function AstroLifecycleTimeline({ data }: { data: LifecycleTimingOutput }) {
  const { currentAge, events, activeEvent, nextEvent } = data

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">⏳ 점성 생애 사이클</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Saturn Return / Jupiter 회귀 / Uranus Opposition 등 주요 행성 사이클 — 사주의 결정적 시기에 대응
        </p>
      </div>

      {/* Current / Next banner */}
      {(activeEvent || nextEvent) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {activeEvent && (
            <div className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300 mb-1">
                지금 진행 중 ({currentAge}세)
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">{activeEvent.label}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{activeEvent.meaning}</p>
              <p className="text-xs text-fuchsia-200">💡 {activeEvent.advice}</p>
            </div>
          )}
          {nextEvent && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
                다음 ({nextEvent.ageRange})
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">{nextEvent.label}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">{nextEvent.meaning}</p>
              <p className="text-xs text-amber-200">💡 {nextEvent.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Full timeline */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md">
        <ul className="space-y-2.5">
          {events.map((e) => {
            const tone = e.isCurrent
              ? 'border-fuchsia-400/40 bg-fuchsia-500/10'
              : e.isPast
                ? 'border-slate-600/30 bg-slate-800/20 opacity-60'
                : 'border-white/10 bg-white/5'
            const status = e.isCurrent ? '진행 중' : e.isPast ? '지남' : '예정'
            const statusTone = e.isCurrent
              ? 'text-fuchsia-300'
              : e.isPast
                ? 'text-slate-500'
                : 'text-amber-300'
            return (
              <li key={e.event} className={`rounded-xl border p-3 ${tone}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{e.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {e.ageRange} · <span className={statusTone}>{status}</span>
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-snug">{e.meaning}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
