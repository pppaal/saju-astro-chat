'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from '@/components/destiny-map/charts/SajuChart'
import { ChartReading } from '@/components/destiny-map/charts/ChartReading'
import { generateChartSummary } from '@/lib/destiny-map/local-report-generator'
import { CompatNatalOverlay } from './CompatNatalOverlay'
import { CompatRadarOverlay } from './CompatRadarOverlay'

/**
 * 궁합 차트 모달 — 두 사람 차트를 따로 쌓지 않고 하나로 합쳐 보여준다.
 *   1) 점성 시너스트리: 한 황도 위에 두 사람 행성을 색으로 겹쳐 그림
 *   2) 오행 비교: 한 레이더에 두 사람 오행을 겹쳐 그림
 *   3) 사주 좌우 비교: A·B 사주팔자를 두 칸으로 나란히
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
    (data.chartData as Record<string, unknown>) ?? (r.chartData as Record<string, unknown>) ?? data
  )
}

function QuickRead({
  name,
  accent,
  saju,
  astro,
  lang,
}: {
  name: string
  accent: 'rose' | 'sky'
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
  lang: 'ko' | 'en'
}) {
  const line = generateChartSummary(saju, astro, lang)
  if (!line) return null
  const chip = accent === 'rose' ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'
  return (
    <div className="rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa] p-3">
      <span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${chip}`}>
        {name}
      </span>
      <ChartReading text={line} theme="light" className="text-sm leading-relaxed text-[#44403c]" />
    </div>
  )
}

function SectionTitle({
  children,
  accent,
}: {
  children: React.ReactNode
  accent: 'indigo' | 'rose'
}) {
  const border = accent === 'indigo' ? 'border-sky-400' : 'border-rose-400'
  return (
    <h3 className={`border-l-2 ${border} px-2 text-sm font-semibold text-[#1c1917]`}>{children}</h3>
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

  const sajuA = unwrapSaju(person1Saju)
  const sajuB = unwrapSaju(person2Saju)
  const astroA = unwrapAstro(person1Astro)
  const astroB = unwrapAstro(person2Astro)
  const labelA = nameA || 'A'
  const labelB = nameB || 'B'

  return (
    <div
      className="chart-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(28,25,23,0.45)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="chart-pop-in relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e7e4df] bg-white p-6 shadow-[0_24px_48px_rgba(28,25,23,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isKo ? '궁합 차트' : 'Couple chart'}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#a8a29e] transition-colors hover:bg-[#f5f4f1] hover:text-[#1c1917]"
        >
          <X size={18} />
        </button>

        <div className="mb-5 space-y-1 text-center">
          <h2
            className="text-lg font-bold text-[#1c1917]"
            style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            {isKo ? '궁합 차트' : 'Couple Chart'}
          </h2>
          <p className="text-xs text-[#8b857d]">
            {isKo
              ? '두 사람의 사주와 네이탈을 하나로 겹쳐 비교'
              : 'Both charts overlaid for a side-by-side read'}
          </p>
        </div>

        <div className="space-y-6">
          {/* 한 줄 해석 — 두 사람 나란히 */}
          <div
            className="chart-rise-in grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <QuickRead name={labelA} accent="rose" saju={sajuA} astro={astroA} lang={lang} />
            <QuickRead name={labelB} accent="sky" saju={sajuB} astro={astroB} lang={lang} />
          </div>

          {/* 동양 — 오행 · 사주팔자 비교 (한 그룹으로 묶음) */}
          <section
            className="chart-rise-in space-y-4 rounded-2xl border border-[#ece9e4] bg-[#fcfbfa] p-4"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <SectionTitle accent="rose">
              {isKo ? '동양 — 사주팔자 · 오행 비교' : 'Eastern — Saju & Five Elements'}
            </SectionTitle>

            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-medium text-[#8b857d]">
                {isKo ? '사주팔자 비교' : 'Saju (4 Pillars) Comparison'}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                    {labelA}
                  </span>
                  <SajuChart saju={sajuA as never} lang={lang} />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-600">
                    {labelB}
                  </span>
                  <SajuChart saju={sajuB as never} lang={lang} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-medium text-[#8b857d]">
                {isKo ? '오행 비교' : 'Five-Element Comparison'}
              </div>
              <CompatRadarOverlay
                sajuA={sajuA}
                sajuB={sajuB}
                nameA={labelA}
                nameB={labelB}
                lang={lang}
              />
            </div>
          </section>

          {/* 서양 — 시너스트리 (네이탈 겹침) */}
          <section
            className="chart-rise-in space-y-2 rounded-2xl border border-[#ece9e4] bg-[#fcfbfa] p-4"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <SectionTitle accent="indigo">
              {isKo ? '서양 — 시너스트리 (네이탈 겹침)' : 'Synastry — Natal Overlay'}
            </SectionTitle>
            <CompatNatalOverlay
              astroA={astroA as never}
              astroB={astroB as never}
              nameA={labelA}
              nameB={labelB}
              lang={lang}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export default CompatChartModal
