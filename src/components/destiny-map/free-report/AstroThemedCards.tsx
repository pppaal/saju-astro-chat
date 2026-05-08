'use client'

import type { ThemedAstroOutput } from '@/lib/astrology/foundation/themedReading'

export default function AstroThemedCards({ data }: { data: ThemedAstroOutput }) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🪐 점성 테마별 해석</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          연애 / 커리어 / 재물 / 건강 / 가족 / 영성 — 각 영역의 하우스 + 핵심 행성 + 어스펙트 근거
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.themes.map((t) => (
          <div
            key={t.theme}
            className="rounded-2xl border border-purple-400/20 bg-slate-900/40 p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{t.emoji}</span>
              <h4 className="text-sm font-semibold text-white">{t.label}</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">{t.summary}</p>

            {/* Houses involved */}
            <div className="space-y-1 mb-3">
              {t.houses.map((h) => (
                <div key={h.index} className="text-[11px] text-slate-400 font-mono">
                  <span className="text-fuchsia-300">{h.index}H</span>{' '}
                  <span className="text-slate-300">{h.sign}</span>
                  {h.planets.length > 0 && (
                    <span className="text-emerald-300"> · {h.planets.join(', ')}</span>
                  )}
                  <span className="text-slate-500"> — {h.meaning}</span>
                </div>
              ))}
            </div>

            {/* Key planets */}
            {t.keyPlanets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.keyPlanets.map((p) => (
                  <span
                    key={p.name}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-200 font-mono"
                  >
                    {p.name} {p.sign}
                    {p.house && ` ${p.house}H`}
                  </span>
                ))}
              </div>
            )}

            {/* Strengths */}
            {t.strengths.length > 0 && (
              <ul className="space-y-1 mb-2">
                {t.strengths.map((s, i) => (
                  <li key={i} className="text-[11.5px] text-emerald-300 leading-snug flex items-start gap-1.5">
                    <span>+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Cautions */}
            {t.cautions.length > 0 && (
              <ul className="space-y-1 mb-2">
                {t.cautions.map((c, i) => (
                  <li key={i} className="text-[11.5px] text-amber-300 leading-snug flex items-start gap-1.5">
                    <span>−</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Advice */}
            <p className="text-[11.5px] text-slate-300 leading-snug mt-2 pt-2 border-t border-white/5">
              💡 {t.advice}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
