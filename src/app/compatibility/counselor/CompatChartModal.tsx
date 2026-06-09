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
import {
  computeSajuSynastryFacts,
  type SajuPillarInput,
} from '@/lib/compatibility/sajuSynastryFormatter'
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

// unwrap된 saju → computeSajuSynastryFacts 가 받는 {stem,branch}[] (년·월·일·시).
// 일주(index 2)는 필수 — 없으면 facts 계산을 건너뛴다.
function sajuToPillars(saju: Record<string, unknown> | undefined): SajuPillarInput[] | null {
  if (!saju) return null
  const pillars = (saju.pillars as Record<string, unknown> | undefined) ?? undefined
  const cell = (p: unknown): SajuPillarInput => {
    const o = (p ?? {}) as Record<string, unknown>
    const hs = (o.heavenlyStem ?? {}) as Record<string, unknown>
    const eb = (o.earthlyBranch ?? {}) as Record<string, unknown>
    return { stem: String(hs.name ?? ''), branch: String(eb.name ?? '') }
  }
  const out = [
    cell(saju.yearPillar ?? pillars?.year),
    cell(saju.monthPillar ?? pillars?.month),
    cell(saju.dayPillar ?? pillars?.day),
    cell(saju.timePillar ?? saju.hourPillar ?? pillars?.time),
  ]
  if (!out[2].stem || !out[2].branch) return null
  return out
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
  // 운세차트 .secTitle 처럼 serif(Cinzel) — 섹션 헤드가 "구성된" 느낌.
  return (
    <h3
      className="border-l-2 px-2 text-[15px] font-semibold"
      style={{
        borderColor: 'var(--ds-gold-on-dark)',
        color: 'var(--ds-dark-text)',
        fontFamily: 'var(--font-cinzel), Georgia, serif',
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </h3>
  )
}

// 서브 블록 라벨 — 골드 tick + 페이드 hairline. 밋밋한 uppercase 텍스트가
// "디버그 덤프"처럼 보이던 걸 운세차트 .subcap 처럼 designed marker 로.
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="h-3 w-0.5 shrink-0 rounded-full"
        style={{ background: 'var(--ds-gold-on-dark)' }}
      />
      <span
        className="text-[11px] font-bold"
        style={{ color: 'var(--ds-gold-on-dark-soft)', letterSpacing: '0.04em' }}
      >
        {children}
      </span>
      <span
        className="ml-1 h-px flex-1"
        style={{ background: 'linear-gradient(90deg, var(--ds-gold-line), transparent)' }}
      />
    </div>
  )
}

// 데이터 블록 카드 — 섹션 배경 위에 한 겹 더 얹어 layered 느낌 (운세차트 .card).
function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--ds-dark-border)' }}
    >
      {children}
    </div>
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

  // 상담사와 같은 사주 cross 계산(computeSajuSynastryFacts) — 일간·배우자성·기둥관계.
  const pillarsA = sajuToPillars(sajuA)
  const pillarsB = sajuToPillars(sajuB)
  const sajuFacts = pillarsA && pillarsB ? computeSajuSynastryFacts({ pillarsA, pillarsB }) : null
  // 배우자성 — 일주(배우자궁)에 잡힌 것 우선 노출 (가장 강한 신호).
  const spouseTop = sajuFacts
    ? [...sajuFacts.spouseStars]
        .sort((a, b) => Number(b.isDayPillar) - Number(a.isDayPillar))
        .slice(0, 4)
    : []

  // 밴드 분해 바를 SSOT(엔진 시너스트리 + 사주 facts)에서 도출 — ScoreBreakdown
  // 의 자체 휴리스틱(플랫 6° orb·합/충만) 대신. 사주 충에는 형/해/파도 포함되고
  // (facts.pillarRelations.tone), 시너 조화/긴장은 차트에 표시된 어스펙트와 동일.
  type BandScores = {
    eastern_hap?: number
    eastern_chung?: number
    elements_match?: number
    synastry_harmonic?: number
    synastry_tension?: number
  }
  const ssotBand: BandScores | undefined = (() => {
    const out: BandScores = {}
    if (sajuFacts) {
      let bond = 0
      let clash = 0
      for (const r of sajuFacts.pillarRelations) {
        if (r.tone === 'bond') bond++
        else if (r.tone === 'clash') clash++
      }
      out.eastern_hap = Math.min(100, bond * 20)
      out.eastern_chung = Math.max(0, 100 - clash * 15)
      if (sajuFacts.elementBalance) {
        const { a, b } = sajuFacts.elementBalance
        let comp = 0
        for (const e of ['목', '화', '토', '금', '수']) {
          const av = a[e] ?? 0
          const bv = b[e] ?? 0
          if (av <= 1 && bv >= 2) comp += 20
          if (bv <= 1 && av >= 2) comp += 20
        }
        out.elements_match = Math.min(100, comp)
      }
    }
    if (synView && synView.aspects.length > 0) {
      let harm = 0
      let tens = 0
      for (const asp of synView.aspects) {
        if (asp.tone === 'harmony') harm++
        else if (asp.tone === 'tension') tens++
      }
      out.synastry_harmonic = Math.min(100, harm * 20)
      out.synastry_tension = Math.max(0, 100 - tens * 20)
    }
    return Object.keys(out).length > 0 ? out : undefined
  })()

  // 답 먼저 — 가장 결정적인 신호 한 줄. 일주 배우자성(가장 강한 정통 신호)이
  // 있으면 그걸, 없으면 가장 강한 시너스트리 어스펙트를 평이한 말로.
  const headlineReason: string | null = (() => {
    const sp = spouseTop[0]
    if (sp?.isDayPillar) {
      const feeling = sp.role.match(/\(([^)]+)\)/)?.[1] ?? sp.role
      const who = sp.from === 'A' ? labelA : labelB
      const other = sp.from === 'A' ? labelB : labelA
      return isKo
        ? `${who}에게 ${other}는 ‘${feeling}’의 짝으로 와요 — 그것도 배우자 자리에 바로 떠요.`
        : `To ${who}, ${other} reads as a "${feeling}" partner — landing right in the spouse seat.`
    }
    const a0 = synView?.aspects[0]
    if (a0) {
      return isKo
        ? `${labelA} ${a0.a}와 ${labelB} ${a0.b}가 ${a0.label}로 ${a0.strength} 이어져 있어요.`
        : `${labelA}'s ${a0.a} and ${labelB}'s ${a0.b} connect in ${a0.label}, ${a0.strength}.`
    }
    return null
  })()

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
              breakdown={ssotBand}
              sajuA={sajuA}
              sajuB={sajuB}
              astroA={astroA}
              astroB={astroB}
              lang={lang}
              variant="band"
            />
            {/* 답 먼저 — 가장 결정적인 신호 한 줄 (밴드 바로 밑) */}
            {headlineReason && (
              <p
                className="mt-2.5 px-1 text-center text-[13px] font-medium leading-relaxed"
                style={{ color: 'var(--ds-dark-text)' }}
              >
                {headlineReason}
              </p>
            )}
            <p
              className="mt-1.5 px-1 text-center text-[11px] leading-relaxed"
              style={{ color: 'var(--ds-dark-text-muted)' }}
            >
              {isKo
                ? '이 막대는 두 사람의 사주와 별자리에서 끌어당기는 기운과 부딪히는 기운을 함께 본 거예요. 더 깊은 이야기는 상담사에게.'
                : 'These bars weigh what pulls you together and what rubs — across both your Saju and stars. For the deeper read, ask the counselor.'}
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
              className="px-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--ds-dark-text)' }}
            >
              {isKo
                ? '두 사람의 여덟 글자가 만났을 때, 어디서 끌어당기고(합) 어디서 부딪히는지(충·형), 한쪽에 부족한 기운을 상대가 채워주는지를 봐요.'
                : "Where your eight characters meet — where they pull together, where they clash, and whether one's missing energy is what the other brings."}
            </p>

            {/* 사주 궁합 핵심 — 상담사와 같은 computeSajuSynastryFacts 결과.
                일간 관계 + 배우자성(가장 강한 정통 신호). */}
            {sajuFacts?.dayMaster && (
              <DataCard>
                <SubLabel>{isKo ? '두 사람의 본질 (일간)' : 'Your core natures'}</SubLabel>
                <p
                  className="px-1 text-[13px] leading-relaxed"
                  style={{ color: 'var(--ds-dark-text)' }}
                >
                  {labelA} <b>{sajuFacts.dayMaster.aStem}</b>({sajuFacts.dayMaster.aEl}) ↔ {labelB}{' '}
                  <b>{sajuFacts.dayMaster.bStem}</b>({sajuFacts.dayMaster.bEl}) —{' '}
                  {sajuFacts.dayMaster.relationLabel}
                </p>
                {spouseTop.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {spouseTop.map((s) => {
                      const feeling = s.role.match(/\(([^)]+)\)/)?.[1] ?? s.role
                      const who = s.from === 'A' ? labelA : labelB
                      const other = s.from === 'A' ? labelB : labelA
                      return (
                        <li
                          key={`spouse-${s.from}-${s.pillar}-${s.source}-${s.char}`}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          {s.isDayPillar && (
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                              style={{
                                background: 'rgba(212,175,106,0.15)',
                                color: 'var(--ds-gold-on-dark)',
                              }}
                            >
                              {isKo ? '배우자 자리' : 'spouse seat'}
                            </span>
                          )}
                          <span
                            className="text-[12.5px] leading-snug"
                            style={{ color: 'var(--ds-dark-text)' }}
                          >
                            {isKo
                              ? `${who}에게 ${other}는 ‘${feeling}’의 짝${s.isDayPillar ? ' — 바로 그 자리에 떠요' : '으로 비쳐요'}`
                              : `To ${who}, ${other} reads as a “${feeling}” partner${s.isDayPillar ? ' — right in the spouse seat' : ''}`}
                            <span
                              className="ml-1 text-[11px]"
                              style={{ color: 'var(--ds-dark-text-muted)' }}
                            >
                              ({s.sibsin})
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </DataCard>
            )}

            <div>
              <SubLabel>{isKo ? '사주팔자 — 나란히 보기' : 'Four pillars — side by side'}</SubLabel>
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

            <div>
              <SubLabel>
                {isKo ? '오행 — 서로 채워주나' : 'Five elements — who fills whom'}
              </SubLabel>
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
              {isKo ? '서양 별자리 — 두 사람 겹쳐 보기' : 'Western — your charts overlaid'}
            </SectionTitle>
            <p
              className="px-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--ds-dark-text)' }}
            >
              {isKo
                ? '두 사람의 별을 한 자리에 겹쳐, 어디서 끌리고 어디서 부딪히는지, 또 누가 상대의 어느 삶의 영역에 들어오는지 봐요.'
                : "Both your charts on one wheel — where you're drawn together, where you rub, and whose planets enter the other's life areas."}
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
              <DataCard>
                <SubLabel>
                  {isKo ? '별자리 — 끌림과 마찰' : 'Your stars — pull & friction'}
                </SubLabel>
                <ul className="space-y-1.5">
                  {synView.aspects.map((asp) => (
                    <li
                      key={`asp-${asp.a}-${asp.b}-${asp.orb}`}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        borderLeft: `2px solid ${toneColor(asp.tone)}`,
                      }}
                    >
                      <span className="flex-1" style={{ color: 'var(--ds-dark-text)' }}>
                        <b style={{ color: '#fecdd3' }}>
                          {labelA} {asp.a}
                        </b>
                        <span className="mx-1.5" style={{ color: toneColor(asp.tone) }}>
                          {asp.label}
                        </span>
                        <b style={{ color: '#bae6fd' }}>
                          {labelB} {asp.b}
                        </b>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--ds-dark-text-muted)',
                        }}
                        title={`${asp.orb}°`}
                      >
                        {asp.strength}
                      </span>
                    </li>
                  ))}
                </ul>
              </DataCard>
            )}

            {/* 하우스 오버레이 — "A의 금성이 B의 '동반자·결혼' 자리에" 정통 신호 */}
            {synView && (synView.overlaysAtoB.length > 0 || synView.overlaysBtoA.length > 0) && (
              <DataCard>
                <SubLabel>
                  {isKo ? '누가 상대의 어느 자리에' : 'Whose planet enters whose area'}
                </SubLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { rows: synView.overlaysAtoB, from: labelA, to: labelB, accent: '#fecdd3' },
                    { rows: synView.overlaysBtoA, from: labelB, to: labelA, accent: '#bae6fd' },
                  ]
                    .filter((col) => col.rows.length > 0)
                    .map((col) => (
                      <div key={col.from}>
                        <div
                          className="mb-1.5 text-[10px] font-semibold"
                          style={{ color: col.accent }}
                        >
                          {col.from} → {col.to}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {col.rows.map((o) => (
                            <span
                              key={`${col.from}-${o.planet}-${o.house}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                              style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--ds-dark-border)',
                                color: 'var(--ds-dark-text)',
                              }}
                            >
                              <b>{o.planet}</b>
                              <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>
                                {o.meaning || `${o.house}H`}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </DataCard>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default CompatChartModal
