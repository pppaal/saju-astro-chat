'use client'

import type { TarotSynthesis } from '@/lib/Tarot/foundation/synthesis'

const ELEMENT_LABEL: Record<string, string> = {
  fire: '🔥 불 (Wands)',
  water: '💧 물 (Cups)',
  air: '💨 공기 (Swords)',
  earth: '🌱 땅 (Pentacles)',
  spirit: '✨ 영 (Major)',
}

export default function SpreadSynthesisCard({ data }: { data: TarotSynthesis }) {
  const { elementBalance, majorMinorRatio, reversalLoad, numerology, court, archetypes, shape } = data
  const total = data.cardCount
  const elementOrder: Array<keyof typeof ELEMENT_LABEL> = ['fire', 'water', 'air', 'earth', 'spirit']

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🔮 스프레드 종합 분석</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          원소 균형 / 메이저-마이너 비율 / 역방향 부하 / 수비학 / 코트 카드 — 카드별 해석 이전의 구조 진단
        </p>
      </div>

      {/* 4-card balance grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Element balance */}
        <div className="rounded-2xl border border-purple-400/30 bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-2">
            원소 균형
          </div>
          <div className="space-y-1.5">
            {elementOrder.map((el) => {
              const count = elementBalance[el as keyof typeof elementBalance] as number
              const pct = total === 0 ? 0 : (count / total) * 100
              const isDominant = elementBalance.dominant === el
              return (
                <div key={el} className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono w-32 ${isDominant ? 'text-fuchsia-300 font-bold' : 'text-slate-400'}`}>
                    {ELEMENT_LABEL[el]}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className={isDominant ? 'h-full bg-fuchsia-400' : 'h-full bg-purple-400/50'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
          {elementBalance.missing.length > 0 && (
            <p className="text-[10.5px] text-amber-300 mt-2">
              결여 원소: {elementBalance.missing.map((m) => ELEMENT_LABEL[m]).join(', ')}
            </p>
          )}
        </div>

        {/* Major-minor + reversal */}
        <div className="rounded-2xl border border-fuchsia-400/30 bg-slate-900/40 p-4 backdrop-blur-md space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300 mb-1">
              메이저 vs 마이너
            </div>
            <div className="text-sm text-white font-semibold">
              메이저 {majorMinorRatio.majorCount} / 마이너 {majorMinorRatio.minorCount}{' '}
              <span className="text-[11px] text-fuchsia-200">({majorMinorRatio.flavor})</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">{majorMinorRatio.flavorMeaning}</p>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
              역방향 부하
            </div>
            <div className="text-sm text-white font-semibold">
              {reversalLoad.reversedCount} / {total}{' '}
              <span className="text-[11px] text-amber-200">({reversalLoad.flavor})</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">{reversalLoad.flavorMeaning}</p>
          </div>
        </div>

        {/* Numerology */}
        <div className="rounded-2xl border border-emerald-400/30 bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-1">
            스프레드 수비학
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{numerology.reducedNumber}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              (총합 {numerology.totalSum})
            </span>
          </div>
          <p className="text-[11.5px] text-slate-300 mt-1.5 leading-snug">{numerology.meaning}</p>
          {numerology.dominantRank !== null && (
            <p className="text-[10.5px] text-emerald-300 mt-2 font-mono">
              반복 랭크: {numerology.dominantRank}
            </p>
          )}
        </div>

        {/* Shape + court */}
        <div className="rounded-2xl border border-amber-400/30 bg-slate-900/40 p-4 backdrop-blur-md space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
              스프레드 형태
            </div>
            <div className="text-sm text-white font-semibold capitalize">{shape.shape}</div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">{shape.meaning}</p>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 mb-1">
              코트 카드 (인물)
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{court.meaning}</p>
            {court.hasCourt && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {court.page > 0 && <span className="text-[10px] font-mono text-cyan-200">Page×{court.page}</span>}
                {court.knight > 0 && <span className="text-[10px] font-mono text-cyan-200">Knight×{court.knight}</span>}
                {court.queen > 0 && <span className="text-[10px] font-mono text-cyan-200">Queen×{court.queen}</span>}
                {court.king > 0 && <span className="text-[10px] font-mono text-cyan-200">King×{court.king}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Archetypes */}
      {archetypes.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md mb-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
            핵심 archetype 테마 (가중치 순)
          </div>
          <div className="flex flex-wrap gap-2">
            {archetypes.map((a) => (
              <div
                key={a.theme}
                className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5"
              >
                <div className="text-[11.5px] text-white font-semibold">
                  {a.label}{' '}
                  <span className="text-[10px] text-fuchsia-200 font-mono">×{a.weight}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{a.evidence.slice(0, 3).join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-amber-500/5 p-4">
        <p className="text-[12px] text-slate-200 leading-relaxed">{data.summary}</p>
      </div>
    </section>
  )
}
