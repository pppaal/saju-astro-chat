'use client'

import type { ThemedAstroOutput } from '@/lib/astrology/foundation/themedReading'

export default function AstroThemedCards({ data }: { data: ThemedAstroOutput }) {
  if (!data.themes || data.themes.length === 0) {
    return null
  }

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🪐 점성 테마별 해석</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          연애 / 커리어 / 재물 / 건강 / 가족 / 영성 — 각 영역의 하우스와 핵심 행성으로 본 결
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.themes.map((t, ti) => (
          <div
            key={`${t.theme}-${ti}`}
            className="rounded-2xl border border-purple-400/20 bg-slate-900/40 p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{t.emoji}</span>
              <h4 className="text-sm font-semibold text-white">{t.label}</h4>
            </div>

            {t.summary && (
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{t.summary}</p>
            )}

            {/* Houses involved */}
            {t.houses.length > 0 && (
              <div className="space-y-1 mb-3">
                {t.houses.map((h, hi) => (
                  <div
                    key={`${h.index}-${hi}`}
                    className="text-[11px] text-slate-400 font-mono leading-snug break-words"
                  >
                    <span className="text-fuchsia-300">{h.index}H</span>{' '}
                    <span className="text-slate-300">{h.sign}</span>
                    {h.planets.length > 0 && (
                      <span className="text-emerald-300"> · {h.planets.join(', ')}</span>
                    )}
                    {h.meaning && <span className="text-slate-500"> — {h.meaning}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Key planets */}
            {t.keyPlanets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.keyPlanets.map((p, pi) => (
                  <span
                    key={`${p.name}-${pi}`}
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
                  <li
                    key={`s-${i}`}
                    className="text-[11.5px] text-emerald-300 leading-snug flex items-start gap-1.5"
                  >
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
                  <li
                    key={`c-${i}`}
                    className="text-[11.5px] text-amber-300 leading-snug flex items-start gap-1.5"
                  >
                    <span>−</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Advice */}
            {t.advice && (
              <p className="text-[11.5px] text-slate-300 leading-snug mt-2 pt-2 border-t border-white/5">
                💡 {t.advice}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
