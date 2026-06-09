'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from '@/components/report/SajuChart'
import { ChartReading } from '@/components/report/ChartReading'
import { ScoreBreakdown } from '@/components/report/atoms/ScoreBreakdown'
import { CompatLines } from '@/components/report/atoms/CompatLines'
import { generateChartSummary } from '@/lib/report/local-report-generator'
import { CompatNatalOverlay } from './CompatNatalOverlay'
import { CompatRadarOverlay } from './CompatRadarOverlay'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/**
 * 궁합 차트 모달 — 두 사람 차트를 따로 쌓지 않고 하나로 합쳐 보여준다.
 *   1) 사주 좌우 비교: A·B 사주팔자를 두 칸으로 나란히 (동양은 사주가 먼저)
 *   2) 오행 비교: 한 레이더에 두 사람 오행을 겹쳐 그림
 *   3) 점성 시너스트리: 한 황도 위에 두 사람 행성을 색으로 겹쳐 그림
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
  // A/B 구분은 유지 — rose/sky 칩 dark 변형 (-500/15 bg + -200 text).
  const chipStyle =
    accent === 'rose'
      ? { background: 'rgba(244, 63, 94, 0.15)', color: '#fecdd3' }
      : { background: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd' }
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'var(--ds-dark-surface)',
        border: '1px solid var(--ds-dark-border)',
      }}
    >
      <span
        className="mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
        style={chipStyle}
      >
        {name}
      </span>
      <ChartReading
        text={line}
        theme="dark"
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ds-dark-text)' }}
      />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  // 옛 rose/sky 좌측 border 는 A/B 구분이 아니라 동양/서양 구분이었음 — 그건
  // 헤딩 텍스트 자체가 이미 명시하므로 좌측 border 는 gold 단일로 통일.
  return (
    <h3
      className="border-l-2 px-2 text-sm font-semibold"
      style={{
        borderColor: 'var(--ds-gold-on-dark)',
        color: 'var(--ds-dark-text)',
      }}
    >
      {children}
    </h3>
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
  const trapRef = useFocusTrap(open)

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
      ref={trapRef}
      className="chart-backdrop-in fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(7, 9, 26, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="chart-pop-in relative w-full max-w-2xl overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid var(--ds-gold-line)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          maxHeight: '96dvh',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isKo ? '궁합 차트' : 'Couple chart'}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: 'var(--ds-dark-text-muted)' }}
        >
          <X size={18} />
        </button>

        <div className="mb-5 space-y-1 text-center">
          <h2
            className="text-xl font-semibold"
            style={{
              color: 'var(--ds-dark-text)',
              fontFamily: 'var(--font-cinzel), Georgia, serif',
              letterSpacing: '-0.01em',
            }}
          >
            {isKo ? '궁합 차트' : 'Couple Chart'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--ds-gold-on-dark)' }}>
            {isKo
              ? '두 사람의 사주와 네이탈을 하나로 겹쳐 비교'
              : 'Both charts overlaid for a side-by-side read'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Level 0 — ScoreBreakdown: 총합 점수 + 5 카테고리 분해.
              사주 합/충 + 오행 보완 + 시너스트리 자동 계산. */}
          <div className="chart-rise-in" style={{ ['--i' as string]: 0 } as React.CSSProperties}>
            <ScoreBreakdown
              sajuA={sajuA}
              sajuB={sajuB}
              astroA={astroA}
              astroB={astroB}
              lang={lang}
            />
          </div>

          {/* 한 줄 해석 — 두 사람 나란히 */}
          <div
            className="chart-rise-in grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ ['--i' as string]: 1 } as React.CSSProperties}
          >
            <QuickRead name={labelA} accent="rose" saju={sajuA} astro={astroA} lang={lang} />
            <QuickRead name={labelB} accent="sky" saju={sajuB} astro={astroB} lang={lang} />
          </div>

          {/* CompatLines — 두 사람 사주 8글자 사이 합/충 라인 시각화 */}
          <div className="chart-rise-in" style={{ ['--i' as string]: 2 } as React.CSSProperties}>
            <CompatLines sajuA={sajuA} sajuB={sajuB} lang={lang} />
          </div>

          {/* 동양 — 오행 · 사주팔자 비교 (한 그룹으로 묶음) */}
          <section
            className="chart-rise-in space-y-4 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 1,
                background: 'var(--ds-dark-surface)',
                border: '1px solid var(--ds-dark-border)',
              } as React.CSSProperties
            }
          >
            <SectionTitle>
              {isKo ? '동양 — 사주팔자 · 오행 비교' : 'Eastern — Saju & Five Elements'}
            </SectionTitle>

            <div className="space-y-1.5">
              <div
                className="px-1 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--ds-gold-on-dark)' }}
              >
                {isKo ? '사주팔자 비교' : 'Saju (4 Pillars) Comparison'}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fecdd3' }}
                  >
                    {labelA}
                  </span>
                  <SajuChart saju={sajuA as never} lang={lang} theme="dark" />
                </div>
                <div className="space-y-1.5">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd' }}
                  >
                    {labelB}
                  </span>
                  <SajuChart saju={sajuB as never} lang={lang} theme="dark" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div
                className="px-1 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--ds-gold-on-dark)' }}
              >
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
            className="chart-rise-in space-y-2 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 2,
                background: 'var(--ds-dark-surface)',
                border: '1px solid var(--ds-dark-border)',
              } as React.CSSProperties
            }
          >
            <SectionTitle>
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
