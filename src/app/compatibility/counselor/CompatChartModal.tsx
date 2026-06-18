'use client'

import React from 'react'
import { X } from 'lucide-react'
import { SajuChart } from '@/components/report/SajuChart'
import { ChartReading } from '@/components/report/ChartReading'
import { ScoreBreakdown } from '@/components/report/atoms/ScoreBreakdown'
import { generateChartSummary } from '@/lib/report/local-report-generator'
import { CompatNatalOverlay } from './CompatNatalOverlay'
import { CompatRadarOverlay } from './CompatRadarOverlay'
import type { SynastryTone } from '@/lib/compatibility/synastryView'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryFormatter'
import type { CompatReport } from '@/lib/compatibility/compatReport'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { ShareImageButton } from '@/components/share/ShareImageButton'
import { CompatShareCard } from '@/components/compatibility/CompatShareCard'
import { buildCompatShareData } from '@/components/compatibility/buildCompatShareData'

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
  /** A/B 성별 — 배우자성(재성/관성) 도식용. 정규화는 서버 라우트에서. */
  genderA?: string
  genderB?: string
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

// 한글 받침 유무로 주제 조사(은/는) 선택 — "준영는"(X) → "준영은"(O).
// 비한글(영문 등)은 '는' 기본. (KO 문장에만 사용)
function withNeun(name: string): string {
  if (!name) return name
  const c = name.charCodeAt(name.length - 1)
  if (c >= 0xac00 && c <= 0xd7a3) return name + ((c - 0xac00) % 28 !== 0 ? '은' : '는')
  return name + '는'
}

// 배우자성(십신)별 "어떻게 다가오는지" 동사 — 본질 4줄이 같은 어미로 반복되던 걸
// 십신마다 다르게. 없으면 기본 표현 폴백.
const SPOUSE_VERB: Record<string, { ko: string; en: string }> = {
  정관: { ko: '듬직하게 자리 잡아요', en: 'settles in as a steady presence' },
  편관: { ko: '강하게 끌어당겨요', en: 'pulls you in hard' },
  정재: { ko: '안정감으로 스며들어요', en: 'seeps in with a settling calm' },
  편재: { ko: '활달하게 다가와요', en: 'comes lively and open' },
  정인: { ko: '포근하게 감싸줘요', en: 'wraps around you warmly' },
  편인: { ko: '묘하게 끌려요', en: 'draws you in a curious way' },
  식신: { ko: '편안하게 어울려요', en: 'fits easy and comfortable' },
  상관: { ko: '톡톡 튀게 자극해요', en: 'sparks and stimulates' },
  비견: { ko: '동지처럼 나란히 서요', en: 'stands beside you like an ally' },
  겁재: { ko: '경쟁하듯 부딪혀요', en: 'meets you with a competitive edge' },
}

// 하우스 오버레이 — 칩만 잔뜩 던지지 말고 관계에서 가장 의미 큰 1개를 문장으로 승격.
const OVERLAY_NOTE: Record<number, { ko: string; en: string }> = {
  7: {
    ko: '동반자·결혼 자리에 — 관계를 진지하게 끌고 가는 인력',
    en: 'the partner & marriage seat — pulling toward commitment',
  },
  8: {
    ko: '깊은 결합·변환 자리에 — 강렬하게 얽히는 끌림',
    en: 'the depth & merge seat — an intense, entangling pull',
  },
  5: {
    ko: '연애·즐거움 자리에 — 설렘과 로맨스가 살아나는 곳',
    en: 'the romance & play seat — where the spark comes alive',
  },
  1: {
    ko: '자아·인상 자리에 — 첫인상부터 강하게 각인',
    en: 'the self & image seat — a strong first imprint',
  },
  4: {
    ko: '가정·뿌리 자리에 — 함께 안식처를 만드는 결',
    en: 'the home & roots seat — building a refuge together',
  },
  10: {
    ko: '커리어·지위 자리에 — 사회적으로 끌어주는 결',
    en: 'the career & status seat — a socially elevating pull',
  },
}
const OVERLAY_PRIORITY = [7, 8, 5, 1, 4, 10]
function topOverlay<T extends { house: number }>(rows: T[]): T | null {
  for (const h of OVERLAY_PRIORITY) {
    const hit = rows.find((r) => r.house === h)
    if (hit) return hit
  }
  return rows[0] ?? null
}

// 오행(한글) → "무슨 기운" 평이한 말. 천간(甲·丙) 옆에 붙여 비전공자도 읽히게.
const ELEMENT_NATURE: Record<string, { ko: string; en: string }> = {
  목: { ko: '나무 기운(성장)', en: 'Wood (growth)' },
  화: { ko: '불 기운(열정)', en: 'Fire (passion)' },
  토: { ko: '흙 기운(안정)', en: 'Earth (ground)' },
  금: { ko: '쇠 기운(결단)', en: 'Metal (resolve)' },
  수: { ko: '물 기운(지혜)', en: 'Water (wisdom)' },
}
function natureOf(el: string | undefined, isKo: boolean): string {
  if (!el) return ''
  const m = ELEMENT_NATURE[el]
  return m ? (isKo ? m.ko : m.en) : el
}

// 사주 관계 유형별 의미 — "끌어당기는 결/부딪히는 결" 2종 반복 대신 합/충/형…마다 다른 한 줄.
const REL_MEANING: Record<string, { ko: string; en: string }> = {
  천간합: { ko: '천간이 손잡아 뜻·명분이 통하는 결', en: 'stems clasp — aims and ideals align' },
  천간충: { ko: '천간이 정면으로 부딪혀 자극하는 결', en: 'stems collide head-on — stimulating' },
  육합: { ko: '속궁합이 부드럽게 맞물리는 결', en: 'inner fit clicks gently' },
  삼합: { ko: '같은 목표로 뭉치는 결', en: 'rallying toward a shared goal' },
  방합: { ko: '계절처럼 한 방향으로 모이는 결', en: 'gathering one way like a season' },
  충: { ko: '삶의 기반이 흔들리는 충돌', en: 'a clash that shakes your footing' },
  형: { ko: '가까울수록 거슬리는 형', en: 'the closer you get, the more it grates' },
  자형: { ko: '스스로 안고 가는 내적 마찰', en: 'an inner friction you carry yourself' },
  해: { ko: '은근히 갉아먹는 결', en: 'a quiet wearing-away' },
  파: { ko: '깨고 흩어놓는 결', en: 'a breaking, scattering edge' },
}
// 여러 태그면 가장 결정적인 것 우선(충돌 > 결속 > 기타).
const REL_PRIORITY = ['충', '형', '자형', '천간충', '천간합', '육합', '삼합', '방합', '파', '해']
function relGloss(tags: string[], isKo: boolean): string {
  const key = REL_PRIORITY.find((t) => tags.includes(t)) ?? tags[0]
  const m = key ? REL_MEANING[key] : undefined
  return m ? (isKo ? m.ko : m.en) : isKo ? '두 기둥이 엮이는 결' : 'a tie between the pillars'
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
  // A/B 구분 — rose/sky 라이트 칩 (10% tint bg + 700 ink text, 종이 위 대비).
  const chipStyle =
    accent === 'rose'
      ? { background: 'rgba(225,29,72,0.10)', color: '#be123c' }
      : { background: 'rgba(2,132,199,0.10)', color: '#0369a1' }
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'var(--ds-light-surface)',
        border: '1px solid var(--ds-light-border)',
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
        theme="light"
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ds-light-text)' }}
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
        borderColor: 'var(--ds-gold)',
        color: 'var(--ds-light-text)',
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
      <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ background: 'var(--ds-gold)' }} />
      <span
        className="text-[11px] font-bold"
        style={{ color: 'var(--ds-gold)', letterSpacing: '0.04em' }}
      >
        {children}
      </span>
      <span
        className="ml-1 h-px flex-1"
        style={{ background: 'linear-gradient(90deg, var(--ds-gold), transparent)' }}
      />
    </div>
  )
}

// 데이터 블록 카드 — 섹션 배경 위에 한 겹 더 얹어 layered 느낌 (운세차트 .card).
function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--ds-light-bg-soft, #f5f5f4)',
        border: '1px solid var(--ds-light-border)',
      }}
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
  genderA,
  genderB,
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

  // 계산은 서버(/api/compatibility/report)에서 — 시너스트리·사주 cross·점수
  // 로직을 클라 번들에서 빼 엣지(IP)를 보호한다. 차트는 결과만 받아 그린다.
  const [report, setReport] = React.useState<CompatReport | null>(null)
  const [reportLoading, setReportLoading] = React.useState(false)
  const [reportError, setReportError] = React.useState(false)
  // 재시도 — 증가하면 fetch effect 가 다시 돈다.
  const [retryKey, setRetryKey] = React.useState(0)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setReport(null)
    setReportError(false)
    setReportLoading(true)
    const body = {
      astroA: unwrapAstro(person1Astro) ?? null,
      astroB: unwrapAstro(person2Astro) ?? null,
      pillarsA: sajuToPillars(unwrapSaju(person1Saju)),
      pillarsB: sajuToPillars(unwrapSaju(person2Saju)),
      genderA,
      genderB,
      lang,
    }
    fetch('/api/compatibility/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
      },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`compat report ${r.status}`)
        return r.json()
      })
      .then((d: { data?: CompatReport } | null) => {
        if (!cancelled) setReport(d?.data ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null)
          setReportError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, person1Saju, person2Saju, person1Astro, person2Astro, genderA, genderB, lang, retryKey])

  if (!open) return null

  const sajuA = unwrapSaju(person1Saju)
  const sajuB = unwrapSaju(person2Saju)
  const astroA = unwrapAstro(person1Astro)
  const astroB = unwrapAstro(person2Astro)
  const labelA = nameA || 'A'
  const labelB = nameB || 'B'
  // 서버 리포트에서 — 시너스트리 뷰·일간·배우자성·밴드 (계산은 서버).
  const synView = report?.synView ?? null
  const dayMaster = report?.dayMaster ?? null
  const spouseTop = report?.spouseStars ?? []
  const ssotBand = report?.band
  // 사주 관계 요약 — 거미줄 선(옛 CompatLines) 대신 읽히는 줄. 일주 관여 우선 상위 6.
  const relRows = (report?.pillarRelations ?? [])
    .slice()
    .sort((a, b) => Number(b.isDayInvolved) - Number(a.isDayInvolved))
    .slice(0, 6)
  // 답 먼저 — 가장 결정적인 신호 한 줄. 일주 배우자성(가장 강한 정통 신호)이
  // 있으면 그걸, 없으면 가장 강한 시너스트리 어스펙트를 평이한 말로.
  const headlineReason: string | null = (() => {
    const sp = spouseTop[0]
    if (sp?.isDayPillar) {
      const feeling = sp.role.match(/\(([^)]+)\)/)?.[1] ?? sp.role
      const who = sp.from === 'A' ? labelA : labelB
      const other = sp.from === 'A' ? labelB : labelA
      return isKo
        ? `${who}에게 ${withNeun(other)} ‘${feeling}’의 짝으로 와요. 게다가 바로 배우자 자리에 떠 있고요.`
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
      ? 'var(--ds-gold)'
      : tone === 'tension'
        ? '#c0564a'
        : 'var(--ds-light-text-muted)'

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
          // 종이 셸 — 운세차트(IntegratedReport)와 같은 paper 톤 + 미세 dot 텍스처.
          // 궁합 상담사가 라이트(흰색)라 차트도 라이트/종이로 맞춘다.
          background: '#f4f1ea',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(120, 110, 90, 0.05) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          border: '1px solid var(--ds-gold)',
          boxShadow: '0 24px 60px rgba(40, 30, 10, 0.22)',
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
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: 'var(--ds-light-text-muted)' }}
        >
          <X size={18} />
        </button>

        <div className="mb-5 space-y-1 text-center">
          <h2
            className="text-xl font-semibold"
            style={{
              color: 'var(--ds-light-text)',
              fontFamily: 'var(--font-cinzel), Georgia, serif',
              letterSpacing: '-0.01em',
            }}
          >
            {isKo ? '궁합 차트' : 'Couple Chart'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--ds-gold)' }}>
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
            {reportLoading && !report ? (
              <div
                className="flex items-center justify-center gap-2 rounded-xl py-6 text-[13px]"
                style={{
                  background: 'var(--ds-gold-soft-bg, rgba(160,122,60,0.08))',
                  border: '1px solid var(--ds-light-border)',
                  color: 'var(--ds-light-text-muted)',
                }}
                role="status"
                aria-live="polite"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{ color: 'var(--ds-gold)' }}
                />
                {isKo ? '두 사람의 궁합을 분석하고 있어요…' : 'Analyzing your compatibility…'}
              </div>
            ) : reportError ? (
              <div
                className="flex flex-col items-center gap-3 rounded-xl py-6 text-[13px]"
                style={{
                  background: 'var(--ds-gold-soft-bg, rgba(160,122,60,0.08))',
                  border: '1px solid var(--ds-light-border)',
                  color: 'var(--ds-light-text-muted)',
                }}
                role="alert"
              >
                <span>
                  {isKo
                    ? '궁합 결과를 불러오지 못했어요.'
                    : "Couldn't load the compatibility result."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReportError(false)
                    setRetryKey((k) => k + 1)
                  }}
                  className="rounded-full px-5 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--ds-gold)',
                    color: '#1a1305',
                  }}
                >
                  {isKo ? '다시 시도' : 'Try again'}
                </button>
              </div>
            ) : (
              <ScoreBreakdown breakdown={ssotBand} lang={lang} variant="band" theme="light" />
            )}
            {/* 동·서 교차 종합 — 사주와 별자리가 한 방향인지 먼저(목록보다 위) */}
            {report?.crossVerdict && (
              <p
                className="mt-2.5 px-1 text-center text-[14px] font-semibold leading-relaxed"
                style={{
                  color:
                    report.crossVerdict.tone === 'aligned'
                      ? 'var(--ds-gold)'
                      : report.crossVerdict.tone === 'tension'
                        ? '#be123c'
                        : report.crossVerdict.tone === 'mixed'
                          ? '#b45309'
                          : 'var(--ds-light-text)',
                }}
              >
                {report.crossVerdict.text}
              </p>
            )}
            {/* 답 먼저 — 가장 결정적인 신호 한 줄 (밴드 바로 밑) */}
            {headlineReason && (
              <p
                className="mt-2.5 px-1 text-center text-[13px] font-medium leading-relaxed"
                style={{ color: 'var(--ds-light-text)' }}
              >
                {headlineReason}
              </p>
            )}
            {/* 공유 — 채팅이 아니라 엔진이 뽑은 결과(커플 유형·등급·종합 한 줄)만
                정사각 카드 이미지로 만들어 인스타/카톡에 공유. 결과 바로 아래(안내문
                위)에 눈에 띄게 — 바이럴 핵심 동선이라 묻히지 않게 한다. */}
            {report && !reportLoading && (report.crossVerdict || ssotBand) && (
              <div className="mt-4 flex justify-center">
                <ShareImageButton
                  language={lang}
                  variant="onLightSolid"
                  filenamePrefix="destinypal-compat"
                  shareTitle={isKo ? 'DestinyPal 궁합 결과' : 'My DestinyPal Compatibility'}
                  shareText={report.crossVerdict?.text}
                  size={1080}
                  backgroundColor="#f4f1ea"
                  renderCard={(ref) => (
                    <CompatShareCard
                      ref={ref}
                      data={buildCompatShareData(report, labelA, labelB, isKo)}
                    />
                  )}
                />
              </div>
            )}
            <p
              className="mt-3 px-1 text-center text-[11px] leading-relaxed"
              style={{ color: 'var(--ds-light-text-muted)' }}
            >
              {isKo
                ? '이 막대는 두 사람의 사주와 별자리에서 끌어당기는 기운과 부딪히는 기운을 함께 본 거예요. 더 깊은 이야기는 상담사가 풀어드려요.'
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

          {/* 사주 관계 요약 — 두 사람 기둥 사이 합/충/형 등을 읽히는 줄로. */}
          {relRows.length > 0 && (
            <div className="chart-rise-in" style={{ ['--i' as string]: 2 } as React.CSSProperties}>
              <DataCard>
                <SubLabel>{isKo ? '사주 관계 — 어디서 끌리고 부딪히나' : 'Saju ties'}</SubLabel>
                <ul className="space-y-1.5">
                  {relRows.map((r, i) => {
                    const meta =
                      r.tone === 'bond'
                        ? {
                            emoji: '💛',
                            color: 'var(--ds-gold)',
                            gloss: isKo ? '끌어당기는 결' : 'pull',
                          }
                        : r.tone === 'clash'
                          ? {
                              emoji: '⚡',
                              color: '#c0564a',
                              gloss: isKo ? '부딪히는 결' : 'friction',
                            }
                          : r.tone === 'friction'
                            ? {
                                emoji: '〰️',
                                color: '#d97706',
                                gloss: isKo ? '미묘한 거리감' : 'subtle gap',
                              }
                            : {
                                emoji: '·',
                                color: 'var(--ds-light-text-muted)',
                                gloss: isKo ? '사소한 파열' : 'small break',
                              }
                    const same = r.aPillar === r.bPillar
                    return (
                      <li
                        key={`rel-${r.aPillar}-${r.bPillar}-${r.aChar}-${r.bChar}-${i}`}
                        className="flex flex-col gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                        style={{ background: 'rgba(0,0,0,0.025)', color: 'var(--ds-light-text)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="shrink-0">
                            {meta.emoji}
                          </span>
                          <span className="flex-1 leading-snug">
                            {same ? (
                              <>{isKo ? `둘의 ${r.aPillar}주` : `both ${r.aPillar}`}</>
                            ) : (
                              <>
                                <b style={{ color: '#be123c' }}>
                                  {labelA} {r.aPillar}
                                </b>{' '}
                                ↔{' '}
                                <b style={{ color: '#0369a1' }}>
                                  {labelB} {r.bPillar}
                                </b>
                              </>
                            )}{' '}
                            <span style={{ color: meta.color, fontWeight: 600 }}>
                              {r.tags.join('·')}
                            </span>
                          </span>
                        </div>
                        {/* 관계 유형별 의미 — "끌어당기는/부딪히는 결" 2종 반복 제거 */}
                        <span
                          className="pl-6 text-[11.5px] leading-snug"
                          style={{ color: 'var(--ds-light-text-muted)' }}
                        >
                          {relGloss(r.tags, isKo)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </DataCard>
            </div>
          )}

          {/* 동양 — 오행 · 사주팔자 비교 (한 그룹으로 묶음) */}
          <section
            className="chart-rise-in space-y-4 rounded-2xl p-4"
            style={
              {
                ['--i' as string]: 1,
                background: 'var(--ds-light-surface)',
                border: '1px solid var(--ds-light-border)',
              } as React.CSSProperties
            }
          >
            <SectionTitle>
              {isKo ? '동양 — 사주·오행 겹쳐 보기' : 'Eastern — Saju & Five Elements'}
            </SectionTitle>
            <p
              className="px-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--ds-light-text)' }}
            >
              {isKo
                ? '두 사람의 여덟 글자가 만났을 때, 어디서 끌어당기고(합), 어디서 부딪히고(충·형), 한쪽에 부족한 기운을 상대가 채워주는지를 봐요.'
                : "Where your eight characters meet — where they pull together, where they clash, and whether one's missing energy is what the other brings."}
            </p>

            {/* 사주 궁합 핵심 — 상담사와 같은 computeSajuSynastryFacts 결과.
                일간 관계 + 배우자성(가장 강한 정통 신호). */}
            {dayMaster && (
              <DataCard>
                <SubLabel>{isKo ? '두 사람의 타고난 본질' : 'Your core natures'}</SubLabel>
                <p
                  className="px-1 text-[13px] leading-relaxed"
                  style={{ color: 'var(--ds-light-text)' }}
                >
                  {labelA} <b>{dayMaster.aStem}</b> · {natureOf(dayMaster.aEl, isKo)} ↔ {labelB}{' '}
                  <b>{dayMaster.bStem}</b> · {natureOf(dayMaster.bEl, isKo)} —{' '}
                  {dayMaster.relationLabel}
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
                          style={{ background: 'rgba(0,0,0,0.03)' }}
                        >
                          {s.isDayPillar && (
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                              style={{
                                background: 'rgba(212,175,106,0.15)',
                                color: 'var(--ds-gold)',
                              }}
                            >
                              {isKo ? '배우자 자리' : 'spouse seat'}
                            </span>
                          )}
                          <span
                            className="text-[12.5px] leading-snug"
                            style={{ color: 'var(--ds-light-text)' }}
                          >
                            {isKo
                              ? `${who}에게 ${withNeun(other)} ‘${feeling}’의 짝 — ${SPOUSE_VERB[s.sibsin]?.ko ?? '으로 다가와요'}`
                              : `To ${who}, ${other} ${SPOUSE_VERB[s.sibsin]?.en ?? 'reads as a partner'} — a “${feeling}” match`}
                            <span
                              className="ml-1 text-[11px]"
                              style={{ color: 'var(--ds-light-text-muted)' }}
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

            {/* 솔로 상세(각자 원국)는 관계 신호보다 아래 + 기본 접힘 — 위계상
                "둘 사이"가 먼저, 각자 차트는 펼쳐 보는 근거 자료. */}
            <details className="group">
              <summary
                className="flex cursor-pointer list-none items-center gap-2 py-1 text-[12px] font-semibold [&::-webkit-details-marker]:hidden"
                style={{ color: 'var(--ds-gold)' }}
              >
                <span
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-90"
                  style={{ color: 'var(--ds-gold)' }}
                >
                  ▸
                </span>
                {isKo ? '각자의 사주 원국 펼쳐 보기' : 'Show each chart (four pillars)'}
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'rgba(225,29,72,0.10)', color: '#be123c' }}
                  >
                    {labelA}
                  </span>
                  <SajuChart saju={sajuA as never} lang={lang} theme="light" />
                </div>
                <div className="space-y-1.5">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'rgba(2,132,199,0.10)', color: '#0369a1' }}
                  >
                    {labelB}
                  </span>
                  <SajuChart saju={sajuB as never} lang={lang} theme="light" />
                </div>
              </div>
            </details>

            <div>
              <SubLabel>
                {isKo
                  ? '오행(타고난 기운의 균형) — 서로 채워주는 결'
                  : 'Five elements — who fills whom'}
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
                background: 'var(--ds-light-surface)',
                border: '1px solid var(--ds-light-border)',
              } as React.CSSProperties
            }
          >
            <SectionTitle>
              {isKo ? '서양 — 별자리 겹쳐 보기' : 'Western — your charts overlaid'}
            </SectionTitle>
            <p
              className="px-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--ds-light-text)' }}
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
                      className="flex flex-col gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                      style={{
                        background: 'var(--ds-light-bg-soft, #f5f5f4)',
                        borderLeft: `2px solid ${toneColor(asp.tone)}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex-1" style={{ color: 'var(--ds-light-text)' }}>
                          <b style={{ color: '#be123c' }}>
                            {labelA} {asp.aRole}
                          </b>
                          <span
                            className="text-[10px]"
                            style={{ color: 'var(--ds-light-text-subtle)' }}
                          >
                            ({asp.a})
                          </span>
                          <span className="mx-1.5" style={{ color: toneColor(asp.tone) }}>
                            {asp.label}
                          </span>
                          <b style={{ color: '#0369a1' }}>
                            {labelB} {asp.bRole}
                          </b>
                          <span
                            className="text-[10px]"
                            style={{ color: 'var(--ds-light-text-subtle)' }}
                          >
                            ({asp.b})
                          </span>
                        </span>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: 'rgba(0,0,0,0.05)',
                            color: 'var(--ds-light-text-muted)',
                          }}
                          title={`${asp.orb}°`}
                        >
                          {asp.strength}
                        </span>
                      </div>
                      {/* raw 데이터에 해석 한 줄 — "받쳐줌/긴장"이 어떤 영역을 뜻하는지 */}
                      <span
                        className="text-[11.5px] leading-snug"
                        style={{ color: 'var(--ds-light-text-muted)' }}
                      >
                        {asp.meaning}
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
                    { rows: synView.overlaysAtoB, from: labelA, to: labelB, accent: '#be123c' },
                    { rows: synView.overlaysBtoA, from: labelB, to: labelA, accent: '#0369a1' },
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
                        {/* 핵심 1개를 문장으로 — 칩 더미보다 "무슨 뜻"을 먼저 */}
                        {(() => {
                          const top = topOverlay(col.rows)
                          const note = top ? OVERLAY_NOTE[top.house] : null
                          if (!top || !note) return null
                          return (
                            <p
                              className="mb-1.5 text-[11.5px] leading-snug"
                              style={{ color: 'var(--ds-light-text)' }}
                            >
                              <b style={{ color: col.accent }}>{top.planet}</b>
                              {isKo
                                ? `이 ${col.to}의 ${note.ko}`
                                : ` lands in ${col.to}'s ${note.en}`}
                            </p>
                          )
                        })()}
                        <div className="flex flex-wrap gap-1.5">
                          {col.rows.slice(0, 4).map((o) => (
                            <span
                              key={`${col.from}-${o.planet}-${o.house}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                              style={{
                                background: 'rgba(0,0,0,0.04)',
                                border: '1px solid var(--ds-light-border)',
                                color: 'var(--ds-light-text)',
                              }}
                            >
                              <b>{o.planet}</b>
                              <span style={{ color: 'var(--ds-gold)' }}>
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
