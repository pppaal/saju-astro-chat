'use client'

import React from 'react'
import { X, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SajuChart } from './SajuChart'
import { ElementRadar } from './ElementRadar'
import { NatalChart } from './NatalChart'
import { ChartReading } from './ChartReading'
import { CrossRefTable } from './atoms/CrossRefTable'
import { PillarDrawer } from './atoms/PillarDrawer'
import { DaeunTimeline } from './atoms/DaeunTimeline'
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
  const router = useRouter()
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
  const birthYear = (saju as { birthYear?: number } | undefined)?.birthYear

  return (
    <div
      className="chart-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '내 차트' : 'My chart'}
    >
      <div
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

        {/* 자연어 종합 — 격국·신강약·일간·오행·태양/달·대운 흐르는 한 문단.
            generateChartSummary 가 advancedAnalysis 기반 6-10 문장 생성. */}
        {readLine && (
          <div
            className="chart-rise-in mb-6 rounded-2xl p-5"
            style={
              {
                ['--i' as string]: 0,
                background:
                  'linear-gradient(135deg, rgba(212,181,114,0.08) 0%, rgba(212,181,114,0.04) 50%, rgba(212,181,114,0.06) 100%)',
                border: '1px solid var(--ds-gold-line)',
              } as React.CSSProperties
            }
          >
            <ChartReading
              text={readLine}
              theme="dark"
              className="text-sm leading-relaxed"
              style={{ color: 'var(--ds-dark-text)' }}
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
            <div className="space-y-0.5">
              <h3
                className="border-l-2 px-2 text-sm font-semibold"
                style={{
                  borderColor: 'var(--ds-gold-on-dark)',
                  color: 'var(--ds-dark-text)',
                }}
              >
                {isKo ? '🏛️ 동양 — 사주팔자' : '🏛️ Eastern — Saju'}
              </h3>
              <p
                className="px-2 text-[11px] leading-snug"
                style={{ color: 'var(--ds-dark-text-muted)' }}
              >
                {isKo
                  ? '태어난 연·월·일·시에 담긴 음양오행으로 성격·운세·관계를 읽어요'
                  : 'Reading personality, fortune, and relationships from yin-yang and five elements at your birth'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div
                  className="px-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '사주팔자 (탭 → 상세)' : '4 Pillars (tap → detail)'}
                </div>
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

            {/* 대운 timeline — 인생 10년 단위 흐름 8개 가로 펼침 */}
            <div className="space-y-1.5">
              <div
                className="px-1 text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--ds-gold-on-dark)' }}
              >
                {isKo ? '대운 — 인생의 흐름' : 'Daeun — Life Cycles'}
              </div>
              <DaeunTimeline saju={saju} birthYear={birthYear} lang={lang} />
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
            <div className="space-y-0.5">
              <h3
                className="border-l-2 px-2 text-sm font-semibold"
                style={{
                  borderColor: 'var(--ds-gold-on-dark)',
                  color: 'var(--ds-dark-text)',
                }}
              >
                {isKo ? '✨ 서양 — 네이탈 차트' : '✨ Western — Natal Chart'}
              </h3>
              <p
                className="px-2 text-[11px] leading-snug"
                style={{ color: 'var(--ds-dark-text-muted)' }}
              >
                {isKo
                  ? '태어난 순간 하늘의 태양·달·행성 위치로 내면·재능·인생 영역을 읽어요'
                  : 'Reading inner self, talents, and life areas from sun, moon, and planet positions at your birth'}
              </p>
            </div>
            <NatalChart astro={astro as never} lang={lang} />
          </section>

          {/* 사주 ↔ 점성 교차 표 — 같은 영역의 동서양 raw 를 좌/우 나란히 */}
          <section
            className="chart-rise-in space-y-3 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 3,
                background: 'var(--ds-dark-surface)',
                border: '1px solid var(--ds-dark-border)',
              } as React.CSSProperties
            }
          >
            <div className="space-y-0.5">
              <h3
                className="border-l-2 px-2 text-sm font-semibold"
                style={{
                  borderColor: 'var(--ds-gold-on-dark)',
                  color: 'var(--ds-dark-text)',
                }}
              >
                {isKo ? '🔗 사주 ↔ 점성 교차' : '🔗 Saju ↔ Astrology Cross-Reference'}
              </h3>
              <p
                className="px-2 text-[11px] leading-snug"
                style={{ color: 'var(--ds-dark-text-muted)' }}
              >
                {isKo
                  ? '같은 본질을 두 언어로 — 어디서 만나고 어디서 다른지'
                  : 'Same essence in two languages — where they meet and where they differ'}
              </p>
            </div>
            <CrossRefTable saju={saju} astro={astro} lang={lang} />
          </section>

          {/* 캘린더 cross-link — 시간 흐름은 캘린더 책임 */}
          <button
            type="button"
            onClick={() => {
              onClose()
              router.push('/calendar')
            }}
            className="chart-rise-in flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm transition-colors hover:bg-white/5"
            style={
              {
                ['--i' as string]: 4,
                background: 'rgba(212, 181, 114, 0.06)',
                border: '1px solid var(--ds-gold-line)',
                color: 'var(--ds-gold-on-dark)',
              } as React.CSSProperties
            }
          >
            <Calendar size={14} />
            <span>
              {isKo
                ? '오늘·이번달·올해 운세는 캘린더에서 →'
                : "Today's / this month's / this year's fortune → Calendar"}
            </span>
          </button>
        </div>

        {/* 셀 탭 시 펼침: 한자뜻 + 지장간 + 12운성 + 12신살 + 합/충 + 통근 +
            일주 archetype (day-only). 모든 raw + plain 의미. */}
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
