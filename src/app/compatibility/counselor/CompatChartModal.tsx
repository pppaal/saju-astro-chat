'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from '@/components/destiny-map/charts/SajuChart'
import { ElementRadar } from '@/components/destiny-map/charts/ElementRadar'
import { NatalChart } from '@/components/destiny-map/charts/NatalChart'
import { generateChartSummary } from '@/lib/destiny-map/local-report-generator'

/**
 * 궁합 차트 모달 — 운명 상담사의 ChartModal과 똑같은 형태(사주팔자 +
 * 오행 radar + 네이탈 차트 + 한 줄 해석)를 두 사람분 쌓아 보여준다.
 *
 * 입력은 compat 페이지가 들고 있는 raw API 응답:
 *   personNSaju  = /api/saju 응답   { data: { yearPillar… fiveElements… } }
 *   personNAstro = /api/astrology   { data: { chartData: { planets, ascendant } } }
 * 차트 컴포넌트는 unwrap된 안쪽 객체를 기대하므로 여기서 풀어준다.
 */

interface CompatChartModalProps {
  open: boolean
  onClose: () => void
  person1Saju?: Record<string, unknown> | null
  person2Saju?: Record<string, unknown> | null
  person1Astro?: Record<string, unknown> | null
  person2Astro?: Record<string, unknown> | null
  nameA?: string
  nameB?: string
  lang?: 'ko' | 'en'
}

function unwrapSaju(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return (r.data as Record<string, unknown>) ?? r
}

function unwrapAstro(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const data = (r.data as Record<string, unknown>) ?? r
  return (
    (data.chartData as Record<string, unknown>) ??
    (r.chartData as Record<string, unknown>) ??
    data
  )
}

function PersonCharts({
  label,
  name,
  accent,
  saju,
  astro,
  lang,
}: {
  label: string
  name: string
  accent: 'rose' | 'sky'
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
  lang: 'ko' | 'en'
}) {
  const isKo = lang === 'ko'
  const readLine = generateChartSummary(saju, astro, lang)
  const chip =
    accent === 'rose'
      ? 'bg-rose-500/15 text-rose-300'
      : 'bg-sky-500/15 text-sky-300'

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${chip}`}>{label}</span>
        {name && <span className="text-base font-semibold text-stone-200">{name}</span>}
      </div>

      {readLine && (
        <div className="rounded-2xl border border-stone-700 bg-stone-800/60 p-4">
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
    </section>
  )
}

export function CompatChartModal({
  open,
  onClose,
  person1Saju,
  person2Saju,
  person1Astro,
  person2Astro,
  nameA = '',
  nameB = '',
  lang = 'ko',
}: CompatChartModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '궁합 차트' : 'Couple chart'}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-700/50 bg-stone-900 p-6 shadow-2xl"
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
            {isKo ? '궁합 차트' : 'Couple Chart'}
          </h2>
          <p className="text-xs text-stone-400">
            {isKo ? '두 사람의 사주팔자와 네이탈 차트' : 'Both saju pillars & natal charts'}
          </p>
        </div>

        <div className="space-y-6">
          <PersonCharts
            label="A"
            name={nameA}
            accent="rose"
            saju={unwrapSaju(person1Saju)}
            astro={unwrapAstro(person1Astro)}
            lang={lang}
          />
          <div className="border-t border-stone-700/60" />
          <PersonCharts
            label="B"
            name={nameB}
            accent="sky"
            saju={unwrapSaju(person2Saju)}
            astro={unwrapAstro(person2Astro)}
            lang={lang}
          />
        </div>
      </div>
    </div>
  )
}

export default CompatChartModal
