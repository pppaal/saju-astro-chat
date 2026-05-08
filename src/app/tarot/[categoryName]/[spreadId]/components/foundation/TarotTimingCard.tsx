'use client'

import { useState } from 'react'
import type { TarotTimingOutput, TimingTrigger, TimingWindow } from '@/lib/Tarot/foundation/timing'

const WINDOW_FRIENDLY: Record<TimingWindow, string> = {
  immediate: '곧 (몇 주 안)',
  short: '한두 달 안',
  medium: '서너 달쯤',
  long: '반년~한 해 사이',
  extended: '한 해 넘는 큰 흐름',
}

const TRIGGER_FRIENDLY: Record<TimingTrigger, string> = {
  self_action: '내가 먼저 움직여야 흐름이 시작돼요',
  external_event: '외부에서 어떤 사건이 먼저 일어날 거예요',
  person_arrives: '특정 사람이 등장하면서 변곡점이 와요',
  inner_readiness: '내가 마음으로 준비될 때 흐름이 열려요',
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.6) return '카드들이 한 시기를 일관되게 가리켜요'
  if (confidence >= 0.4) return '대략 이 시기가 가장 유력해요'
  return '카드마다 시기가 좀 갈려요 — 정확한 시점보다는 흐름으로 보세요'
}

export default function TarotTimingCard({ data }: { data: TarotTimingOutput }) {
  const [showDetail, setShowDetail] = useState(false)
  const friendlyWindow = WINDOW_FRIENDLY[data.primaryWindow]
  const friendlyTrigger = TRIGGER_FRIENDLY[data.primaryTrigger]

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">⏳ 언제쯤 답이 보일까</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          뽑힌 카드들의 전통적인 시간 의미를 종합한 결과예요
        </p>
      </div>

      {/* Primary verdict — plain language */}
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-fuchsia-500/10 p-5 mb-3">
        <p className="text-[13px] text-amber-200 mb-1.5">예상 시기</p>
        <p className="text-2xl font-bold text-white mb-2">{friendlyWindow}</p>
        <p className="text-[12.5px] text-slate-200 leading-relaxed mb-3">
          {confidenceLabel(data.confidence)}.
        </p>

        <div className="pt-3 border-t border-white/10">
          <p className="text-[11.5px] text-fuchsia-200 mb-1">어떻게 시작될까</p>
          <p className="text-[13px] text-white font-medium">{friendlyTrigger}</p>
        </div>

        <p className="text-[12.5px] text-amber-100 leading-snug mt-3 pt-3 border-t border-white/10">
          💡 {data.advice}
        </p>
      </div>

      {/* Optional per-card breakdown — hidden by default */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
      >
        {showDetail ? '카드별 근거 접기' : '카드별 근거 보기'}
      </button>

      {showDetail && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md">
          <ul className="space-y-1.5">
            {data.perCard.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-white">
                  {c.cardName}
                  {c.isReversed && <span className="text-[10px] text-amber-300 ml-1">(역)</span>}
                </span>
                <span className="text-[11px] text-slate-400 text-right">
                  {WINDOW_FRIENDLY[c.window]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
