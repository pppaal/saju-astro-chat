'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from './SajuChart'
import { ElementRadar } from './ElementRadar'
import { NatalChart } from './NatalChart'
import { chartInterpretation } from './interpretation'

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

  const readLine = chartInterpretation(saju, astro, isKo)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '내 차트' : 'My chart'}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-stone-700/50 bg-stone-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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
          <div className="mb-5 rounded-2xl border border-stone-700 bg-stone-800/60 p-4">
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-stone-400">
              {isKo ? '한 줄 해석' : 'Quick read'}
            </div>
            <p className="text-sm leading-relaxed text-stone-200">{readLine}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="border-l-2 border-rose-500 px-2 text-sm font-medium text-stone-300">
              {isKo ? '동양 — 사주팔자' : 'Saju (4 Pillars)'}
            </h3>
            <SajuChart saju={saju as never} lang={lang} />
            <h3 className="border-l-2 border-rose-500 px-2 pt-1 text-sm font-medium text-stone-300">
              {isKo ? '동양 — 오행 균형' : 'Five-Element Balance'}
            </h3>
            <ElementRadar saju={saju} lang={lang} />
          </div>
          <div className="space-y-2">
            <h3 className="border-l-2 border-indigo-500 px-2 text-sm font-medium text-stone-300">
              {isKo ? '서양 — 네이탈 차트' : 'Natal Chart'}
            </h3>
            <NatalChart astro={astro as never} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartModal
