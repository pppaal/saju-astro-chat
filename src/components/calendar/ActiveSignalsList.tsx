'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ImportantDate } from './types'

type EngineSignal = NonNullable<ImportantDate['engineSignals']>[number]
type LayerKey = EngineSignal['layer']

interface Props {
  signals: EngineSignal[] | undefined
}

const LAYER_LABEL: Record<LayerKey, string> = {
  decadal: '大運',
  yearly:  '歲運',
  monthly: '月運',
  daily:   '日辰',
  hourly:  '時',
  instant: '·',
}

/**
 * calendar-engine v2 raw 활성 신호 전체 노출.
 * 사주/점성 탭으로 분리 + polarity 강도순 정렬.
 * 기본은 5개만 보이고 "더보기"로 전체 펼침.
 */
export default function ActiveSignalsList({ signals }: Props) {
  const [tab, setTab] = useState<'saju' | 'astro'>('saju')
  const [expanded, setExpanded] = useState(false)

  const sajuSignals = useMemo(
    () => (signals ?? []).filter((s) => s.source === 'saju'),
    [signals],
  )
  const astroSignals = useMemo(
    () => (signals ?? []).filter((s) => s.source === 'astro'),
    [signals],
  )

  if (!signals || signals.length === 0) return null

  const visibleAll = tab === 'saju' ? sajuSignals : astroSignals
  // 강도(|polarity| × weight) desc 정렬
  const sorted = useMemo(
    () =>
      [...visibleAll].sort(
        (a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight,
      ),
    [visibleAll],
  )
  const shown = expanded ? sorted : sorted.slice(0, 5)

  return (
    <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
          활성 신호 ({signals.length})
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setTab('saju'); setExpanded(false) }}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition ${
              tab === 'saju'
                ? 'bg-amber-500/30 text-amber-200'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            사주 {sajuSignals.length}
          </button>
          <button
            onClick={() => { setTab('astro'); setExpanded(false) }}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition ${
              tab === 'astro'
                ? 'bg-cyan-500/30 text-cyan-200'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            점성 {astroSignals.length}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-4">
          이 탭에는 활성 신호 없음
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {shown.map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>

          {!expanded && sorted.length > 5 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full mt-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 font-medium"
            >
              + {sorted.length - 5}개 더보기
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          {expanded && sorted.length > 5 && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 font-medium"
            >
              접기
            </button>
          )}
        </>
      )}
    </div>
  )
}

function SignalRow({ signal: s }: { signal: EngineSignal }) {
  const arrow =
    s.polarity > 1 ? '↑↑' :
    s.polarity > 0 ? '↑' :
    s.polarity < -1 ? '↓↓' :
    s.polarity < 0 ? '↓' :
    '·'
  const arrowColor =
    s.polarity > 0 ? 'text-emerald-400' :
    s.polarity < 0 ? 'text-rose-400' :
    'text-zinc-500'
  const layerColor = s.source === 'saju' ? 'text-amber-400' : 'text-cyan-400'

  return (
    <div className="bg-zinc-950/60 rounded-lg p-2.5 flex items-start gap-2">
      <span className={`${arrowColor} font-black text-sm shrink-0 w-5`}>{arrow}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">
            {s.korean ?? s.name}
          </span>
          <span className={`text-[10px] font-bold shrink-0 ${layerColor}`}>
            {LAYER_LABEL[s.layer]}
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 truncate">
          polarity {s.polarity > 0 ? '+' : ''}{s.polarity}
          {' · '}
          weight {s.weight.toFixed(2)}
          {s.themes.length > 0 && ` · ${s.themes.slice(0, 3).join(', ')}`}
        </div>
      </div>
    </div>
  )
}
