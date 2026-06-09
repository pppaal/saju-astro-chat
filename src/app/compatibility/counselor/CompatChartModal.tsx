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
import { computeSynastryView, type SynastryTone } from './computeSynastry'
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
  // 상담사와 같은 엔진(calculateSynastry) 결과 — 어스펙트·하우스 오버레이.
  const synView = computeSynastryView(astroA, astroB, lang)

  const toneColor = (tone: SynastryTone): string =>
    tone === 'harmony'
      ? 'var(--ds-gold-on-dark, #d4af6a)'
      : tone === 'tension'
        ? '#f9a8a8'
        : 'var(--ds-dark-text-muted)'

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
          {/* Level 0 — 히어로: verdict 밴드 + 분해 바(사주 합/충·오행 보완·
              시너 조화/긴장). 산식이 휴리스틱이라 "N/100" 숫자는 안 박고(가짜
              정밀 회피) 밴드 라벨 + 근거 바만. */}
          <div className="chart-rise-in" style={{ ['--i' as string]: 0 } as React.CSSProperties}>
            <ScoreBreakdown
              sajuA={sajuA}
              sajuB={sajuB}
              astroA={astroA}
              astroB={astroB}
              lang={lang}
              variant="band"
            />
            <p
              className="mt-2 px-1 text-center text-[11px] leading-relaxed"
              style={{ color: 'var(--ds-dark-text-muted)' }}
            >
              {isKo
                ? '조화·긴장 막대는 두 사람 사주 합·충과 별자리 각도에서 자동 계산돼요. 깊은 풀이는 상담사에게 물어보세요.'
                : 'The harmony/tension bars are computed from your Saju unions/clashes and planetary angles. Ask the counselor for the deep read.'}
            </p>
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
            <p
              className="px-2 text-xs leading-relaxed"
              style={{ color: 'var(--ds-dark-text-muted)' }}
            >
              {isKo
                ? '두 사람의 여덟 글자가 만났을 때 합·충이 어디서 일어나는지, 한쪽에 부족한 오행을 상대가 채워주는지를 봐요. 겹친 레이더에서 한 사람이 낮은 축을 다른 사람이 높게 채우면 상호보완이에요.'
                : "Where the two charts' eight characters meet — which pillars pull together (union) or push apart (clash), and whether one's missing element is what the other has in abundance. On the overlaid radar, a low axis filled by the partner means complementarity."}
            </p>

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
            <p
              className="px-2 text-xs leading-relaxed"
              style={{ color: 'var(--ds-dark-text-muted)' }}
            >
              {isKo
                ? '한 황도 위에 두 사람의 행성을 겹쳐, 누구의 행성이 상대의 어느 영역(하우스)에 떨어지는지 봐요. 금성·달이 조화 각(120·60도)이면 끌림·정서적 합, 화성·토성이 긴장 각(90·180도)이면 속도·가치관 마찰로 읽혀요.'
                : "Both charts on one zodiac — whose planet lands in which of the other's life areas (houses). Venus/Moon at harmonious angles (120°/60°) read as attraction and emotional ease; Mars/Saturn at hard angles (90°/180°) as friction in pace or values."}
            </p>
            <CompatNatalOverlay
              astroA={astroA as never}
              astroB={astroB as never}
              nameA={labelA}
              nameB={labelB}
              lang={lang}
            />

            {/* 핵심 시너스트리 — 상담사와 동일한 calculateSynastry 결과(어스펙트별
                orb·가중). 차트 숫자 = 상담사가 추론한 그 값. */}
            {synView && synView.aspects.length > 0 && (
              <div className="space-y-1.5">
                <div
                  className="px-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '핵심 시너스트리 (개인행성 cross)' : 'Key synastry (personal planets)'}
                </div>
                <ul className="space-y-1">
                  {synView.aspects.map((asp, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--ds-dark-text)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: toneColor(asp.tone) }}
                      />
                      <span className="flex-1">
                        <b>
                          {labelA} {asp.a}
                        </b>{' '}
                        <span style={{ color: toneColor(asp.tone) }}>{asp.label}</span>{' '}
                        <b>
                          {labelB} {asp.b}
                        </b>
                      </span>
                      <span
                        className="shrink-0 tabular-nums"
                        style={{ color: 'var(--ds-dark-text-muted)' }}
                      >
                        {asp.orb}°
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 하우스 오버레이 — "A의 금성이 B의 7H(결혼)" 식 정통 신호 */}
            {synView && (synView.overlaysAtoB.length > 0 || synView.overlaysBtoA.length > 0) && (
              <div className="space-y-1">
                <div
                  className="px-1 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ds-gold-on-dark)' }}
                >
                  {isKo ? '하우스 오버레이 (누가 어느 영역에)' : 'House overlays'}
                </div>
                <ul className="space-y-0.5 text-xs" style={{ color: 'var(--ds-dark-text-muted)' }}>
                  {synView.overlaysAtoB.map((o, i) => (
                    <li key={`ab${i}`}>
                      {labelA} {o.planet} → {labelB} {o.house}H{o.meaning ? ` (${o.meaning})` : ''}
                    </li>
                  ))}
                  {synView.overlaysBtoA.map((o, i) => (
                    <li key={`ba${i}`}>
                      {labelB} {o.planet} → {labelA} {o.house}H{o.meaning ? ` (${o.meaning})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default CompatChartModal
