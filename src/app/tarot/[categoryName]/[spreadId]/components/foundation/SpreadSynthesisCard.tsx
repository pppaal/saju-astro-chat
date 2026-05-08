'use client'

import { useState } from 'react'
import type { TarotSynthesis } from '@/lib/Tarot/foundation/synthesis'

const ELEMENT_FRIENDLY: Record<string, { label: string; emoji: string; meaning: string }> = {
  fire:   { label: '행동·열정', emoji: '🔥', meaning: '불 (Wands)' },
  water:  { label: '감정·관계', emoji: '💧', meaning: '물 (Cups)' },
  air:    { label: '생각·소통', emoji: '💨', meaning: '공기 (Swords)' },
  earth:  { label: '현실·물질', emoji: '🌱', meaning: '땅 (Pentacles)' },
  spirit: { label: '운명·각성', emoji: '✨', meaning: '메이저 카드' },
}

function buildHeadline(data: TarotSynthesis): string {
  const elemLabel = ELEMENT_FRIENDLY[data.elementBalance.dominant]?.label ?? ''
  const flow =
    data.reversalLoad.flavor === 'flowing'
      ? '흐름이 매끄럽게 흘러가는 자리'
      : data.reversalLoad.flavor === 'blocked'
        ? '내면 정리가 먼저 필요한 자리'
        : '일부는 흐르고 일부는 막힌 자리'
  const fated =
    data.majorMinorRatio.flavor === 'fated'
      ? '인생의 큰 결이 움직이고 있어요'
      : data.majorMinorRatio.flavor === 'practical'
        ? '일상의 작은 선택들이 지금 중요해요'
        : '큰 흐름과 일상이 같이 움직여요'
  return `지금은 "${elemLabel}" 에너지가 강하게 도는 시기예요. ${fated}. ${flow}.`
}

export default function SpreadSynthesisCard({ data }: { data: TarotSynthesis }) {
  const [showDetail, setShowDetail] = useState(false)
  const { elementBalance, archetypes, court, numerology, shape } = data
  const total = data.cardCount
  const headline = buildHeadline(data)
  const elementOrder: Array<keyof typeof ELEMENT_FRIENDLY> = ['fire', 'water', 'air', 'earth', 'spirit']

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🔮 지금 카드 흐름</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          뽑힌 카드들이 가리키는 큰 그림 — 카드 한 장씩 보기 전에 전체부터
        </p>
      </div>

      {/* Big plain headline */}
      <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-amber-500/10 p-5 mb-3">
        <p className="text-[14px] text-white leading-relaxed font-medium">{headline}</p>
      </div>

      {/* Element bars — friendly labels */}
      <div className="rounded-2xl border border-purple-400/30 bg-slate-900/40 p-4 backdrop-blur-md mb-3">
        <div className="text-[11px] text-slate-300 mb-2 font-semibold">어떤 에너지가 강한가</div>
        <div className="space-y-2">
          {elementOrder.map((el) => {
            const count = elementBalance[el as keyof typeof elementBalance] as number
            const pct = total === 0 ? 0 : (count / total) * 100
            const isDominant = elementBalance.dominant === el
            const friendly = ELEMENT_FRIENDLY[el]
            return (
              <div key={el} className="flex items-center gap-2">
                <span className={`text-[12px] w-28 ${isDominant ? 'text-fuchsia-200 font-bold' : 'text-slate-400'}`}>
                  {friendly.emoji} {friendly.label}
                </span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={isDominant ? 'h-full bg-fuchsia-400' : 'h-full bg-purple-400/40'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
        {elementBalance.missing.length > 0 && (
          <p className="text-[11px] text-amber-300 mt-3">
            지금 빠진 영역: {elementBalance.missing.map((m) => ELEMENT_FRIENDLY[m]?.label).join(', ')} — 이 영역은 잠시 신경 끄셔도 돼요
          </p>
        )}
      </div>

      {/* Archetype themes as friendly chips */}
      {archetypes.length > 0 && (
        <div className="rounded-2xl border border-fuchsia-400/30 bg-slate-900/40 p-4 backdrop-blur-md mb-3">
          <div className="text-[11px] text-slate-300 mb-2 font-semibold">스프레드의 핵심 주제</div>
          <div className="flex flex-wrap gap-2">
            {archetypes.slice(0, 4).map((a) => (
              <div key={a.theme} className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1">
                <span className="text-[12px] text-white font-semibold">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Court — only if present */}
      {court.hasCourt && (
        <div className="rounded-2xl border border-cyan-400/30 bg-slate-900/40 p-4 backdrop-blur-md mb-3">
          <div className="text-[11px] text-cyan-300 mb-1 font-semibold">👤 등장하는 인물</div>
          <p className="text-[12.5px] text-slate-200 leading-relaxed">{court.meaning}</p>
        </div>
      )}

      {/* Detail toggle — hide jargon by default */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
      >
        {showDetail ? '자세히 접기' : '자세히 보기 (수비학·구조)'}
      </button>

      {showDetail && (
        <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-[11.5px] text-slate-300 leading-relaxed">
          <p>
            <span className="text-emerald-300 font-semibold">스프레드 숫자</span>: {numerology.reducedNumber}
            {' '}(카드 번호 합 {numerology.totalSum}) — {numerology.meaning}
          </p>
          <p>
            <span className="text-amber-300 font-semibold">구조</span>: {shape.meaning}
          </p>
          <p>
            <span className="text-fuchsia-300 font-semibold">메이저/마이너</span>: 운명 카드 {data.majorMinorRatio.majorCount}장 / 일상 카드 {data.majorMinorRatio.minorCount}장 — {data.majorMinorRatio.flavorMeaning}
          </p>
          <p>
            <span className="text-purple-300 font-semibold">정·역방향</span>: {data.reversalLoad.flavorMeaning}
          </p>
        </div>
      )}
    </section>
  )
}
