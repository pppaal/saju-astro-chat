'use client'

import { useState } from 'react'
import type { CoupleMatrixResult, CoupleMatrixCell } from '@/lib/compatibility/coupleMatrix'

interface NineLayerGridProps {
  matrix: CoupleMatrixResult
}

const LAYER_META: Array<{
  key: keyof CoupleMatrixResult['layers']
  label: string
  short: string
  desc: string
}> = [
  { key: 'L1_element', label: '오행 공명', short: 'L1', desc: '두 사주의 오행 비율과 점성 4원소 합산이 기후처럼 잘 어울리는지' },
  { key: 'L2_sibsin_planet', label: '십신 × 행성', short: 'L2', desc: '내 십신(財·官·印 등)이 상대 행성(금성·화성·태양)과 같은 결을 가리키는지' },
  { key: 'L3_stem_combination', label: '천간 합화', short: 'L3', desc: '둘 천간 사이의 합(甲己 토합 같은) — 강한 끌림/결속 신호' },
  { key: 'L4_branch_interaction', label: '지지 충형회합', short: 'L4', desc: '둘 지지 사이의 충(冲)·형(刑)·회(會)·합(合) — 일상 마찰/안정 축' },
  { key: 'L5_aspect_bridge', label: '점성 어스펙트', short: 'L5', desc: '둘 차트의 행성이 만드는 컨정션·트라인·스퀘어 — 감정 라인' },
  { key: 'L6_daewoon_sync', label: '대운 동기화', short: 'L6', desc: '둘의 대운이 같은 방향으로 흐르는지 (지금부터 앞 10~20년)' },
  { key: 'L7_daeun_natal', label: '대운 × 원국', short: 'L7', desc: '내 대운이 상대 원국 핵심 글자를 깨우는지/누르는지' },
  { key: 'L8_shinsal_planet', label: '신살 × 행성', short: 'L8', desc: '도화·역마·천을귀인 같은 신살이 상대 행성을 만나면 일어나는 패턴' },
  { key: 'L9_geokguk_dominant', label: '격국 × 주성', short: 'L9', desc: '내 사주 격국과 상대 차트 dominant 행성이 같은 가치관인지' },
]

function cellTone(avg: number): { bg: string; ring: string; label: string } {
  if (avg >= 6) return { bg: 'bg-emerald-500/30', ring: 'ring-emerald-400/60', label: '시너지' }
  if (avg >= 3) return { bg: 'bg-cyan-500/20', ring: 'ring-cyan-400/40', label: '균형' }
  if (avg >= 0) return { bg: 'bg-slate-600/20', ring: 'ring-slate-500/30', label: '약함' }
  if (avg >= -3) return { bg: 'bg-amber-500/25', ring: 'ring-amber-400/40', label: '주의' }
  return { bg: 'bg-rose-500/30', ring: 'ring-rose-400/60', label: '마찰' }
}

function layerAverage(cells: CoupleMatrixCell[]): number {
  if (!cells.length) return 0
  const positiveSum = cells.reduce((acc, c) => acc + (c.polarity === 'negative' ? -c.score : c.score), 0)
  return positiveSum / cells.length
}

export default function NineLayerGrid({ matrix }: NineLayerGridProps) {
  const [activeLayer, setActiveLayer] = useState<keyof CoupleMatrixResult['layers'] | null>(null)
  const layerAvgs = LAYER_META.map((m) => ({
    ...m,
    avg: layerAverage(matrix.layers[m.key]),
    cells: matrix.layers[m.key],
  }))
  const detail = activeLayer ? layerAvgs.find((l) => l.key === activeLayer) : null

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-bold text-white">9-레이어 매트릭스</h3>
        <span className="text-xs font-mono text-slate-400">셀 클릭 → 디테일</span>
      </div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-3">
        {layerAvgs.map((l) => {
          const tone = cellTone(l.avg)
          const active = activeLayer === l.key
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setActiveLayer(active ? null : l.key)}
              className={`relative rounded-2xl ${tone.bg} ring-1 ${tone.ring} p-4 text-left
                hover:ring-2 transition-all ${active ? 'ring-2 scale-[1.02]' : ''}`}
            >
              <div className="text-[10px] font-mono text-white/50 mb-1">{l.short}</div>
              <div className="text-sm font-semibold text-white leading-snug mb-2">{l.label}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {l.avg >= 0 ? '+' : ''}
                  {l.avg.toFixed(1)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/60">{tone.label}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-1">{l.cells.length} 셀</div>
            </button>
          )
        })}
      </div>

      {/* Cell-level detail of the selected layer */}
      {detail && (
        <div className="rounded-2xl bg-slate-900/60 border border-fuchsia-400/20 p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs font-mono text-fuchsia-300">{detail.short}</div>
              <h4 className="text-lg font-bold text-white">{detail.label}</h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveLayer(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              닫기 ✕
            </button>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{detail.desc}</p>

          {detail.cells.length === 0 ? (
            <p className="text-xs text-slate-500">이 레이어는 둘 사이에 활성화된 셀이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {detail.cells.slice(0, 8).map((c, i) => {
                const isPositive = c.polarity === 'positive'
                const isNegative = c.polarity === 'negative'
                return (
                  <div
                    key={`${c.rowKey}-${c.colKey}-${i}`}
                    className={`rounded-lg border p-3 text-xs
                      ${isPositive ? 'border-emerald-400/30 bg-emerald-500/5' : ''}
                      ${isNegative ? 'border-rose-400/30 bg-rose-500/5' : ''}
                      ${!isPositive && !isNegative ? 'border-white/10 bg-white/5' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-base ${
                          isPositive ? 'text-emerald-300' : isNegative ? 'text-rose-300' : 'text-slate-300'
                        }`}
                      >
                        {isPositive ? '+' : isNegative ? '−' : '·'}
                      </span>
                      <span className="text-white font-medium leading-snug">{c.description}</span>
                      <span className="ml-auto font-mono text-slate-400">{c.score}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 ml-6">
                      <span className="text-slate-300">{c.sajuBasis}</span>
                      <span className="mx-1.5 text-slate-600">×</span>
                      <span className="text-slate-300">{c.astroBasis}</span>
                    </div>
                  </div>
                )
              })}
              {detail.cells.length > 8 && (
                <p className="text-xs text-slate-500 text-center pt-1">
                  +{detail.cells.length - 8}개 셀 더 있음
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
