'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from './SajuChart'
import { ElementRadar } from './ElementRadar'
import { NatalChart } from './NatalChart'
import { ChartReading } from './ChartReading'
import { PersonaCard } from './atoms/PersonaCard'
import { InsightStrip } from './atoms/InsightStrip'
import { CrossRefTable } from './atoms/CrossRefTable'
import { PillarDrawer } from './atoms/PillarDrawer'
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
  // 셀 탭 → PillarDrawer. null 이면 닫힘.
  const [openPillar, setOpenPillar] = React.useState<'time' | 'day' | 'month' | 'year' | null>(null)

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
        /* 옛 warm stone 그라데이션 → navy glass + gold-line. About/FAQ 와
           통일. 모바일 max-h 96dvh 풀스크린에 가까워 키보드 영역 안 잘림. */
        className="chart-pop-in relative w-full max-w-2xl rounded-2xl p-6 overflow-y-auto"
        style={{
          background: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid var(--ds-gold-line)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          maxHeight: '96dvh',
        }}
        onClick={(e) => e.stopPropagation()}
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
            {isKo ? '내 운명 차트' : 'My Destiny Chart'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--ds-gold-on-dark)' }}>
            {isKo ? '사주팔자와 네이탈 차트' : 'Saju Pillars & Natal Chart'}
          </p>
        </div>

        {/* Level 0 — PersonaCard: "당신은 X" 한 줄 정체성. saju 데이터에서
            격국 + 신강약 + 부족 오행 도출. 사용자가 모달 열자마자 본질 파악. */}
        <div
          className="chart-rise-in mb-3"
          style={{ ['--i' as string]: 0 } as React.CSSProperties}
        >
          <PersonaCard saju={saju} />
        </div>

        {/* Level 1 — InsightStrip: 핵심 3 줄. 십성 dominant + 부족 오행 +
            현재 대운 등 자동 도출. PersonaCard 의 한 줄을 뒷받침. */}
        <div
          className="chart-rise-in mb-3"
          style={{ ['--i' as string]: 1 } as React.CSSProperties}
        >
          <InsightStrip saju={saju} />
        </div>

        {/* Level 1.5 — CrossRefTable: 사주↔점성 7행 교차 표. 같은 영역의
            동서양 raw 를 좌/우 나란히 + 보완/동조 자동 감지. */}
        <div
          className="chart-rise-in mb-5"
          style={{ ['--i' as string]: 2 } as React.CSSProperties}
        >
          <CrossRefTable saju={saju} astro={astro} lang={lang} />
        </div>

        {/* 기존 "한 줄 해석" — fallback / 보조. PersonaCard 가 메인. */}
        {readLine && (
          <div
            className="chart-rise-in mb-5 rounded-xl p-3"
            style={
              {
                ['--i' as string]: 2,
                background: 'rgba(212, 181, 114, 0.04)',
                border: '1px solid var(--ds-gold-line)',
              } as React.CSSProperties
            }
          >
            <div
              className="mb-1 text-[10px] font-semibold tracking-wide uppercase opacity-80"
              style={{ color: 'var(--ds-gold-on-dark)' }}
            >
              {isKo ? '요약' : 'Summary'}
            </div>
            <ChartReading
              text={readLine}
              theme="dark"
              className="text-xs leading-relaxed"
              style={{ color: 'var(--ds-dark-text-muted)' }}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* 동양 — 사주팔자 · 오행 균형 (한 그룹으로 묶음) */}
          <section
            className="chart-rise-in space-y-3 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 1,
                background: 'var(--ds-dark-surface)',
                border: '1px solid var(--ds-dark-border)',
              } as React.CSSProperties
            }
          >
            <h3
              className="border-l-2 px-2 text-sm font-semibold"
              style={{
                borderColor: 'var(--ds-gold-on-dark)',
                color: 'var(--ds-dark-text)',
              }}
            >
              {isKo ? '동양 — 사주팔자 · 오행 균형' : 'Eastern — Saju & Five Elements'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div
                  className="px-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '사주팔자' : '4 Pillars'}
                </div>
                {/* dark theme — 운명 차트 모달 navy glass 안에서 자연스럽게 */}
                <SajuChart
                  saju={saju as never}
                  lang={lang}
                  theme="dark"
                  onPillarClick={(p) => setOpenPillar(p)}
                />
              </div>
              <div className="space-y-1.5">
                <div
                  className="px-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '오행 균형' : 'Five-Element Balance'}
                </div>
                <ElementRadar saju={saju} lang={lang} />
              </div>
            </div>
          </section>

          {/* 서양 — 네이탈 차트 */}
          <section
            className="chart-rise-in space-y-3 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 2,
                background: 'var(--ds-dark-surface)',
                border: '1px solid var(--ds-dark-border)',
              } as React.CSSProperties
            }
          >
            <h3
              className="border-l-2 px-2 text-sm font-semibold"
              style={{
                borderColor: 'var(--ds-gold-on-dark)',
                color: 'var(--ds-dark-text)',
              }}
            >
              {isKo ? '서양 — 네이탈 차트' : 'Western — Natal Chart'}
            </h3>
            <NatalChart astro={astro as never} lang={lang} />
          </section>
        </div>

        {/* Level 3 — 셀 탭 시 펼침: 한자뜻 + 지장간 + 12운성 + 12신살 + 합/충
            + 통근 + 일주 archetype (day-only). 모든 raw + plain 의미. */}
        {openPillar && (
          <PillarDrawer
            open={true}
            onClose={() => setOpenPillar(null)}
            pillar={openPillar}
            saju={saju}
            lang={lang}
          />
        )}
      </div>
    </div>
  )
}

export default ChartModal
