'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from './SajuChart'
import { ElementRadar } from './ElementRadar'
import { NatalChart } from './NatalChart'
import { ChartReading } from './ChartReading'
import { generateChartSummary } from '@/lib/destiny-map/local-report-generator'

interface ChartModalProps {
  open: boolean
  onClose: () => void
  saju?: unknown
  astro?: unknown
  lang?: 'ko' | 'en'
}

export function ChartModal({ open, onClose, saju, astro, lang = 'ko' }: ChartModalProps) {
  const isKo = lang === 'ko'

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const readLine = generateChartSummary(saju, astro, lang)

  return (
    <div
      className="chart-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '내 차트' : 'My chart'}
    >
      <div
        className="chart-pop-in relative w-full max-w-2xl rounded-2xl border border-stone-700/50 bg-gradient-to-b from-stone-900 to-stone-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
          className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="mb-5 space-y-1 text-center">
          <h2 className="text-lg font-bold text-stone-200">
            {isKo ? '내 운명 차트' : 'My Destiny Chart'}
          </h2>
          <p className="text-xs text-stone-400">
            {isKo ? '사주팔자와 네이탈 차트' : 'Saju Pillars & Natal Chart'}
          </p>
        </div>

        {readLine && (
          <div
            className="chart-rise-in mb-5 rounded-2xl border border-stone-700/70 bg-stone-800/60 p-4 shadow-inner"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-stone-400">
              {isKo ? '한 줄 해석' : 'Quick read'}
            </div>
            <ChartReading
              text={readLine}
              theme="dark"
              className="text-sm leading-relaxed text-stone-200"
            />
          </div>
        )}

        <div className="space-y-6">
          {/* 동양 — 사주팔자 · 오행 균형 (한 그룹으로 묶음) */}
          <section
            className="chart-rise-in space-y-3 rounded-2xl border border-stone-800/80 bg-stone-900/40 p-4"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <h3 className="border-l-2 border-rose-500 px-2 text-sm font-semibold text-stone-200">
              {isKo ? '동양 — 사주팔자 · 오행 균형' : 'Eastern — Saju & Five Elements'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="px-1 text-[11px] font-medium text-stone-500">
                  {isKo ? '사주팔자' : '4 Pillars'}
                </div>
                <SajuChart saju={saju as never} lang={lang} />
              </div>
              <div className="space-y-1.5">
                <div className="px-1 text-[11px] font-medium text-stone-500">
                  {isKo ? '오행 균형' : 'Five-Element Balance'}
                </div>
                <ElementRadar saju={saju} lang={lang} />
              </div>
            </div>
          </section>

          {/* 서양 — 네이탈 차트 */}
          <section
            className="chart-rise-in space-y-3 rounded-2xl border border-stone-800/80 bg-stone-900/40 p-4"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <h3 className="border-l-2 border-indigo-500 px-2 text-sm font-semibold text-stone-200">
              {isKo ? '서양 — 네이탈 차트' : 'Western — Natal Chart'}
            </h3>
            <NatalChart astro={astro as never} lang={lang} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default ChartModal
