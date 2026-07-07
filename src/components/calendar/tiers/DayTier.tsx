'use client'

/* ============================================================
   destinypal · DayTier — 1일(日辰) "오늘의 일진" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT, 월 티어와 한 가족):
     · 앱 셸은 다크 — 이 티어는 .dayRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 일진 간지(庚申)·십신(겁재)·일간(辛) 등 raw 사주/점성 용어를 *표면에*
       드러낸다(월의 甲午처럼).
     · 한 줄 총평(verdict + term-tag) · 지금 일어나는 일 · 행동 처방 ·
       분야별 오늘 · 사주×별자리 교차(▲/▼) · 타이밍 · 하루 리듬 ·
       자세한 신호 보기(단일 fold).

   PRESENTATION ONLY — 엔진/derivers/타입 미변경. day.dayTone 이 톤의 단일 권위.
   ============================================================ */

import * as React from 'react'
import type { DestinyDay, Polarity } from '@/types/calendar'
import {
  sibsinArea,
  sibsinAreaEn,
  planetPlain,
  plainReason,
  isPlainReason,
  twelveStagePlain,
  geokgukStatusPlain,
} from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayDomains } from '@/lib/calendar-engine/derivers/dayDomains'
import { deriveDayActions } from '@/lib/calendar-engine/derivers/dayActions'
import { deriveDayDeepRead } from '@/lib/calendar-engine/derivers/dayDeepRead'
import { dayStrength } from '@/lib/calendar-engine/derivers/dayStrength'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import type { EvidenceRung } from '@/lib/calendar-engine/derivers/evidenceLadder'
import styles from './DayTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
import { ShareDayButton } from '@/components/calendar/ShareDayButton'
import { dayShareHook } from '@/lib/share/shareHook'
import StreakChip from '@/components/calendar/StreakChip'
import {
  shinsalEn,
  elementEn,
  jijangganLayerEn,
  twelveStageEn,
  appliedPatternEn,
  geokgukStatusLineEn,
} from '@/components/calendar/adapters/dayTierEnMaps'
import { CALENDAR_BANDS } from '@/lib/calendar-engine/derivers/constants'

// ============================================================================
// HourSlot / DayVoc — 외부 참조(네비 계약). prop 형태 유지 (HourSlot 은 미사용).
// ============================================================================

export interface HourSlot {
  hour: number
  branch: string
  score: number
}

export interface DayVoc {
  active: boolean
  from?: string
  to?: string
}

export interface DayTierProps {
  day: DestinyDay
  hours24?: HourSlot[]
  voc?: DayVoc
  onRise: () => void
  /** 분야별 연애 조언 성별 분기용 (남=재성, 여=관성이 배우자성). 기본 '남'. */
  sex?: string
  /**
   * day 가 '오늘'인지 — 월 그리드에서 다른 날을 골라 줌인하면 false 로 내려와
   * "오늘" 라벨을 그 날짜/'이날' 표기로 바꾼다. 기본 true(서버 렌더 = 오늘).
   */
  isToday?: boolean
}

// 영문 라틴 월 라벨 — 타이틀 Cinzel 표기.
const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'] as const
const DOW_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

const ELEM_PLAIN_KO: Record<string, string> = {
  목: '나무(木)',
  화: '불(火)',
  토: '흙(土)',
  금: '쇠(金)',
  수: '물(水)',
}
const LAYER_PLAIN_KO: Record<string, string> = {
  정기: '주된 기운',
  중기: '중간 기운',
  여기: '남은 기운',
}
const PILLAR_PLAIN: Record<string, { ko: string; en: string }> = {
  年: { ko: '태어난 해', en: 'birth year' },
  月: { ko: '태어난 달', en: 'birth month' },
  日: { ko: '나 자신', en: 'self (day)' },
  時: { ko: '태어난 시', en: 'birth hour' },
}

// ── 표면 섹션 헤더 (월의 .secH 1패턴 재사용). ──
function SecHead({ label, latin }: { label: string; latin: string }) {
  return (
    <div className={styles.secH}>
      <span className={styles.secLbl}>{label}</span>
      <span className={styles.secLn} />
      <span className={styles.secLat}>{latin}</span>
    </div>
  )
}

// ── 근거 사다리 — 시간층별 지배신호 1개를 "쉬운 결론 + 용어 칩"으로. 점수·근거·
//    톤이 같은 사다리를 함께 읽게 하는 표시(운흐름 근거 D2·D3 해소). ──
function EvidenceLadder({ rungs }: { rungs: EvidenceRung[] }) {
  if (rungs.length === 0) return null
  return (
    <ul className={styles.ladder}>
      {rungs.map((r) => (
        <li
          className={`${styles.rung} ${
            r.polarity > 0 ? styles.rungPos : r.polarity < 0 ? styles.rungNeg : ''
          }`.trim()}
          key={r.scale}
        >
          <span className={styles.rungScale}>{r.scaleLabel}</span>
          <div className={styles.rungBody}>
            <span className={styles.rungConcl}>{r.conclusion}</span>
            {r.chips.length > 0 && (
              <span className={styles.rungChips}>
                {r.chips.map((c, i) => (
                  <span
                    className={`${styles.rungChip} ${
                      c.source === 'saju' ? styles.chipSaju : styles.chipAstro
                    }`}
                    key={i}
                  >
                    {c.text}
                  </span>
                ))}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── 하루 시간 리듬 곡선 — 12시진을 가운데선 기준 *물결 그래프*로(막대 대신).
//    위=좋음(쪽빛) / 아래=주의(주황). 대운/인생 곡선과 같은 결. SVG 내부 좌표라
//    측정 JS 없이 SSR-safe. ──
function HourGraph({
  hours,
  ko,
}: {
  hours: Array<{ when: string; whenEn: string; tone: string; strength: number }>
  ko: boolean
}) {
  const n = hours.length
  if (n < 2) return null
  const W = 300
  const H = 86
  const padT = 8
  const padB = 18
  const padX = 8
  const plotH = H - padT - padB
  const midY = padT + plotH / 2
  const amp = (plotH / 2) * 0.9
  const signed = (h: { tone: string; strength: number }) => {
    const s = Math.max(0.25, Math.min(1, h.strength / 2))
    return h.tone === 'good' ? s : h.tone === 'caution' ? -s : 0
  }
  const X = (i: number) => padX + (i / (n - 1)) * (W - 2 * padX)
  const Y = (h: { tone: string; strength: number }) => midY - signed(h) * amp
  const pts = hours.map((h, i) => [X(i), Y(h)] as const)
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  const dotColor = (t: string) =>
    t === 'good' ? 'var(--indigo)' : t === 'caution' ? 'var(--sun)' : 'var(--line-2)'
  return (
    <svg
      className={styles.hourGraph}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ko ? '하루 시간 리듬 곡선' : "The day's rhythm curve"}
    >
      <line
        x1={padX}
        x2={W - padX}
        y1={midY}
        y2={midY}
        stroke="var(--line-2)"
        strokeWidth={0.8}
        strokeDasharray="3 3"
      />
      <path
        d={line}
        fill="none"
        stroke="var(--slate)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hours.map((h, i) => (
        <circle
          key={i}
          cx={X(i)}
          cy={Y(h)}
          r={2.6}
          fill={dotColor(h.tone)}
          stroke="#fff"
          strokeWidth={1}
        />
      ))}
      {hours.map((h, i) => {
        const label = (ko ? h.when : h.whenEn).replace(/\s*\(.*\)/, '').trim()
        return (
          <text
            key={`t-${i}`}
            x={X(i)}
            y={H - 5}
            textAnchor="middle"
            fontSize={6.5}
            fill="var(--t2)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── fold 전용 극성 칩(표면엔 ± 노출 X). ──
function PolChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? styles.polPos : v < 0 ? styles.polNeg : styles.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '·'
  return <span className={`${styles.pol} ${cls}`.trim()}>{txt}</span>
}

// ============================================================================
// DayTier (main).
// ============================================================================
export function DayTier({ day, onRise, sex = '남', isToday = true }: DayTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  // "오늘" 라벨 치환어 — 선택한 다른 날이면 '이날'/'this day' 로.
  const dayWord = ko ? (isToday ? '오늘' : '이날') : isToday ? 'today' : 'this day'

  // ── 톤 권위 — day.dayTone 우선, 없으면 reconcile 폴백. ──
  const verdict: DayVerdict =
    day.dayTone ??
    reconcileDayTone({
      score: day.score,
      reasonNet: 0,
      hasGoodReason: (day.topReasons ?? []).length > 0,
      hasCautionReason: (day.cautions ?? []).length > 0,
    })
  const dayBand: 'good' | 'mid' | 'low' =
    verdict.tone === 'positive' ? 'good' : verdict.tone === 'caution' ? 'low' : 'mid'
  // 점수 *색*은 월 그리드와 같은 축(점수 밴드) — verdict.band 를 그대로 쓴다(=
  // scoreToBand(shownScore), 단일 산출). 톤이 화해로 낮춰진 날(예: 65점 tense)에
  // 그리드는 초록인데 여기 점수만 회색이던 어긋남 제거. 말(toneWord·hero)은 톤을,
  // 숫자 색은 점수(밴드)를 따른다 — 시스템 전체에서 색=점수, 문장=톤.
  const scoreBand = verdict.band

  // mixed 는 결(flavor)로 갈린다 — 변동성(기복) vs 평이(잔잔). verdict 에 실린 단일
  // flavor 를 읽어(표면 재계산 금지) "평이 ↔ 기복" 모순을 없앤다(감사 U1·#2).
  const volatile = verdict.tone === 'mixed' && verdict.flavor === 'volatile'
  const toneWord = ko
    ? verdict.tone === 'positive'
      ? '순풍'
      : verdict.tone === 'caution'
        ? '역풍'
        : volatile
          ? '변덕'
          : '잔잔'
    : verdict.tone === 'positive'
      ? 'Tailwind'
      : verdict.tone === 'caution'
        ? 'Headwind'
        : volatile
          ? 'Shifting'
          : 'Calm'

  const strength = dayStrength(day.score)
  const sibsinRaw = String(day.iljinSibsin)
  const sibsinPlain = ko ? sibsinArea(sibsinRaw) : sibsinAreaEn(sibsinRaw)

  // ── 타이틀(라틴) — "June 15 2026". ──
  const [yyyy, mm, dd] = day.date.split('-')
  const monthEn = MONTH_EN[(Number(mm) || 1) - 1] ?? ''
  const titleLatin = `${monthEn} ${Number(dd) || ''} ${yyyy ?? ''}`.trim()

  // ── 한 줄 총평 + 분야/근거. ──
  const dayOneLine = ko ? day.oneLine : (day.oneLineEn ?? day.oneLine)
  const dayReasons = ko ? (day.topReasons ?? []) : (day.topReasonsEn ?? day.topReasons ?? [])
  const dayCautions = ko ? (day.cautions ?? []) : (day.cautionsEn ?? day.cautions ?? [])
  // 근거 사다리 — 10년→올해→이달→오늘 층별 지배신호(쉬운 결론 + 용어 칩).
  const dayLadder = (ko ? day.evidenceLadder : day.evidenceLadderEn) ?? day.evidenceLadder ?? []

  // 인라인 마커("↑ 이달 · " / "↓ 오늘 · ")를 걷어내 쉬운말만 남긴다.
  const stripMarker = (s: string) => s.replace(/^[↑↓▲▼]\s*[^·]*·\s*/, '').trim()

  // ── 가장 센 교차(절댓값) — 지금 일어나는 일에 한 줄 합류. ──
  const crossSorted = [...(day.crossActivations ?? [])].sort(
    (a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)
  )
  const strongestCross = crossSorted.find((c) => (ko ? c.meaning : (c.meaningEn ?? c.meaning)))
  const strongestCrossMeaning = strongestCross
    ? ko
      ? strongestCross.meaning
      : (strongestCross.meaningEn ?? strongestCross.meaning)
    : ''

  // 사유는 쉬운말만 — 전문용어(통근·공망·상관견관·한자…)는 drop-on-doubt 로 뺀다.
  // 교차 meaning 은 이미 plain 이라 *부호에 맞는 목록*에 합류 — 예전엔 부호 무시로
  // 무조건 happening 에 넣어, 흉 교차 경고문이 "받쳐주는 흐름" 헤더 밑에 뜨는
  // 모순이 있었다(감사 #8). 흉(−)이면 조심 목록으로. 전문 사유는 '자세한 신호'
  // 폴드에서 따로 본다.
  const plainHappening = dayReasons
    .map((r) => plainReason(stripMarker(r), ko))
    .filter(isPlainReason)
    .map((r) => localizeLabel(r, ko))
  const crossLine =
    strongestCrossMeaning && isPlainReason(strongestCrossMeaning)
      ? localizeLabel(plainReason(strongestCrossMeaning, ko), ko)
      : ''
  const crossPositive = (strongestCross?.polarity ?? 0) > 0
  const happeningLines = [
    ...plainHappening.slice(0, 2),
    ...(crossLine && crossPositive ? [crossLine] : []),
  ].slice(0, 3)
  const cautionLines = [
    ...dayCautions
      .map((c) => plainReason(stripMarker(c), ko))
      .filter(isPlainReason)
      .map((c) => localizeLabel(c, ko)),
    ...(crossLine && (strongestCross?.polarity ?? 0) < 0 ? [crossLine] : []),
  ].slice(0, 2)

  // ── novice hero: 톤 워드는 결론(oneLine)과 어긋나지 않게. ──
  // *verdict*(폴백 포함 화해 톤)를 쓴다 — 예전엔 day.dayTone 원시값을 읽어 구 캐시
  // (dayTone 없는) 응답에서 히어로만 dayHook·바람·점수색과 어긋났다(감사 U2).
  // mixed 는 결(flavor)로 갈라 변동성=기복 / 평이=무난 (감사 U1).
  const novToneWord = ko
    ? verdict.tone === 'positive'
      ? '좋은 날'
      : verdict.tone === 'caution'
        ? '조심할 날'
        : volatile
          ? '기복 있는 날'
          : '무난한 날'
    : verdict.tone === 'positive'
      ? 'A good day'
      : verdict.tone === 'caution'
        ? 'A careful day'
        : volatile
          ? 'A mixed day'
          : 'A steady day'

  // ── 인앱 후크 헤드라인 — 점수/톤에서만 뽑는 도발적 한 줄(Co-Star 식). 예전엔
  //    공유 카드에만 쓰고 인앱엔 차분한 결론만 노출해 "열어볼 이유"가 약했다(감사).
  //    hero 최상단에 후크를 얹어 재방문·클릭을 끌고, 아래 차분한 결론은 그대로 둔다.
  //    같은 소스를 공유 카드와 공유(본명 시드 고정 → 인앱·카드 문구 일치).
  const dayHook = dayShareHook({
    tone: verdict.tone,
    // 후크 72점 컷도 verdict.score(=보여주는 점수) 단일 소스에서 — 별도 day.score
    // 읽기를 없애 밴드·후크가 한 점수를 본다(감사 #3).
    score: verdict.score,
    seed: day.seed ?? 0,
    // 날짜(일-of-month)를 섞어 같은 톤이어도 날마다 다른 후크 → 매일 같은 헤드라인
    // 이 뜨던 문제(감사) 해소. day.date 는 'YYYY-MM-DD'.
    daySalt: Number(day.date?.slice(8, 10)) || 0,
    ko,
  })

  // ── novice hero "왜?" 한 줄 — 기존 평이 근거(받쳐줌/부딪힘)에서만 합성, 용어 0. ──
  const hasSupport = happeningLines.length > 0
  const hasFriction = cautionLines.length > 0
  const novWhy = ko
    ? hasSupport && hasFriction
      ? '부딪히는 기운이 좀 있지만 받쳐주는 흐름도 같이 와요.'
      : hasFriction
        ? `${dayWord}은 살짝 거스르는 기운이 깔려 있어요.`
        : hasSupport
          ? '받쳐주는 흐름이 같이 와요.'
          : ''
    : hasSupport && hasFriction
      ? 'A bit of friction, but a supporting flow comes with it.'
      : hasFriction
        ? `There's a slightly rough current underneath ${dayWord}.`
        : hasSupport
          ? 'A supporting flow comes with it.'
          : ''

  // ── 행동 처방. ──
  const dayActions = deriveDayActions({
    iljinSibsin: sibsinRaw,
    scoreBand: dayBand,
    seed: day.seed ?? 0,
  })

  // ── 분야별 오늘. ──
  const dayDomains = deriveDayDomains({
    iljinSibsin: sibsinRaw,
    sex,
    scoreBand: dayBand,
    ko,
    seed: day.seed ?? 0,
    evidence: {
      transits: (day.transits ?? []).map((t) => ({
        body: (t as { body?: string }).body,
        aspect: (t as { aspect?: string }).aspect,
        polarity: t.polarity,
      })),
      shinsal: day.shinsalActive ?? [],
      crossActivations: (day.crossActivations ?? []).map((c) => ({
        sajuSide: c.sajuSide,
        astroSide: c.astroSide,
        route: `${c.sajuKo ?? c.sajuSide} ${c.astroKo ?? c.astroSide}`,
        meaning: c.meaning,
        polarity: c.polarity,
      })),
      moon: (day.hourMoon ?? []).map((m) => ({
        body: m.body,
        aspectKo: m.aspectKo,
        aspectEn: m.aspectEn,
        when: m.when,
        whenEn: m.whenEn,
        polarity: m.polarity,
      })),
    },
  })

  // ── 교차 카드 (▲/▼, cap 4, 절댓값 정렬). ──
  const crossCards = crossSorted.slice(0, 4)
  const heroCross = crossCards[0]

  // ── 깊이 읽기 (fold 안). ──
  const peakHourSrc = [...(day.hourCrossings ?? [])].sort(
    (a, b) => Number(b.matched) - Number(a.matched) || b.strength - a.strength
  )[0]
  const deepRead = deriveDayDeepRead({
    iljinKr: day.iljin.kr,
    iljinSibsin: sibsinRaw,
    tone: verdict.tone,
    // "오늘의 흐름" 프레임 — 대운/세운(decadal/yearly) 배경 교차는 1년 내내 같은
    // 문장을 도배하므로 제외(감사 #12). layer 미기재(구 캐시)는 종전대로 포함.
    crosses: (day.crossActivations ?? [])
      .filter((c) => c.sajuKo && c.astroKo)
      .filter((c) => !c.layer || c.layer === 'daily' || c.layer === 'monthly')
      .map((c) => ({
        sajuKo: c.sajuKo as string,
        astroKo: c.astroKo as string,
        polarity: c.polarity,
      })),
    shinsal: (day.shinsalActive ?? []).slice(0, 2).map((s) => ({ ko: s, en: shinsalEn(s) })),
    peakHour: peakHourSrc
      ? {
          whenKo: peakHourSrc.when.replace(/\s*\(.*\)/, '').trim(),
          whenEn: peakHourSrc.whenEn.replace(/\s*\(.*\)/, '').trim(),
          tone: peakHourSrc.tone === 'good' ? 'good' : 'caution',
        }
      : null,
    seed: day.seed ?? 0,
  })

  // ── 자세한 신호 보기 — allSignals cap 12, polarity!==0, weight·polarity 정렬. ──
  const signalRows = [...(day.allSignals ?? [])]
    .filter((s) => s.polarity !== 0)
    .sort((a, b) => Math.abs(b.polarity * b.weight) - Math.abs(a.polarity * a.weight))
    .slice(0, 12)
  const strengthWord = (w: number) =>
    w >= 0.66 ? (ko ? '강' : 'strong') : w >= 0.33 ? (ko ? '중' : 'med') : ko ? '약' : 'weak'
  const srcTag = (s: (typeof signalRows)[number]) =>
    s.kind === 'cross-activation'
      ? ko
        ? '교차'
        : 'cross'
      : s.source === 'astro'
        ? ko
          ? '점성'
          : 'astro'
        : ko
          ? '사주'
          : 'saju'

  // ── 본명 풀이 (fold). ──
  const patterns = day.appliedPatterns ?? []
  const jj = day.jijanggan
  const jjLayers = [jj?.jeonggi, jj?.junggi, jj?.yeogi].filter(
    (l): l is NonNullable<typeof l> => !!l
  )
  const stages = day.twelveStageMatrix ?? []
  const geok = day.geokgukStatus

  // ── 시간대 하늘 (fold) + 하루 리듬(표면). ──
  const hourAll = day.hourCrossings ?? []
  const hourSorted = [...hourAll].sort((a, b) => {
    const ah = parseInt((a.when.match(/\d+/) ?? ['0'])[0], 10)
    const bh = parseInt((b.when.match(/\d+/) ?? ['0'])[0], 10)
    return ah - bh
  })
  // 하루 리듬(시간대) ↔ 일 톤 정합 — 둘은 *다른 축*(전체 하루 vs 그 안의 상대 리듬)
  // 이라 어긋날 수 있다(순풍 날인데 ↓ 막대가 많거나 그 반대). 어긋나면 한 줄로
  // "그날 안에서의 상대 리듬"임을 밝혀 "좋은 날인데 왜 다 주황?" 혼동을 막는다.
  const hourUp = hourSorted.filter((h) => h.tone === 'good').length
  const hourDn = hourSorted.length - hourUp

  // ── 시진 생활 문장 표면화 — 가장 센 좋은/조심 시각 각 1줄. ──
  // hourBranchNarrative/crossMeaning 은 계산돼 오면서도 그래프(점·라벨)만 그려져
  // 버려지고 있었다(감사 갭 #2). 교차 해석(crossMeaning)이 더 구체적이라 우선.
  const peakOf = (tone: 'good' | 'caution') =>
    [...hourSorted].filter((h) => h.tone === tone).sort((a, b) => b.strength - a.strength)[0]
  const rhythmPeaks = [peakOf('good'), peakOf('caution')]
    .filter((h): h is NonNullable<typeof h> => !!h)
    .map((h) => ({
      when: (ko ? h.when : h.whenEn).replace(/\s*\(.*\)/, '').trim(),
      tone: h.tone,
      text: ko ? (h.crossMeaning ?? h.narrative ?? '') : (h.crossMeaningEn ?? h.narrativeEn ?? ''),
    }))
    .filter((p) => p.text)
  const rhythmCoherenceNote =
    verdict.tone === 'positive' && hourDn > hourUp
      ? ko
        ? '전체는 순한 날이에요 — 아래는 그 하루 *안에서의* 상대 리듬이라 오르내림이 있어요.'
        : 'Overall a smooth day — the bars below are the relative rhythm *within* it, so they rise and fall.'
      : verdict.tone === 'caution' && hourUp > hourDn
        ? ko
          ? '전체는 조심할 날이지만, 그 안에도 트이는 시간대가 있어요.'
          : 'A careful day overall, but some hours still open up within it.'
        : ''

  // ── 타이밍 — 이달 흐름 추이선 + 다가오는 며칠. ──
  const scores = day.monthScores ?? []
  const hasFlow = scores.length >= 3
  const upcoming = day.upcoming ?? []
  const nextBig = day.nextBigDay ?? null
  const todayIdx = scores.findIndex((s) => s.today)

  // "다가오는 며칠" 칩 색 — 월 그리드와 동일한 SSOT 밴드(CALENDAR_BANDS)로 통일.
  // 예전엔 65/50/35 하드코딩이라 62점 날이 그리드=초록인데 이 칩은 중립이던 불일치(감사).
  const upBg = (s: number) =>
    s >= CALENDAR_BANDS.good
      ? 'var(--good-bg)'
      : s < CALENDAR_BANDS.caution
        ? 'var(--crimson-bg)'
        : 'var(--surface-3)'
  const weekday = (iso: string) => {
    const wd = new Date(`${iso}T00:00:00Z`).getUTCDay()
    return (ko ? DOW_KO : DOW_EN)[wd]
  }

  // ── 추이선 path. ──
  let flowPath = ''
  let flowArea = ''
  let flowDot: { x: number; y: number } | null = null
  if (hasFlow) {
    const W = 320,
      H = 60,
      pad = 6
    const n = scores.length
    const X = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad)
    const Y = (v: number) => H - 8 - (Math.max(0, Math.min(100, v)) / 100) * (H - 18)
    let d = `M ${X(0)} ${Y(scores[0].score)}`
    for (let i = 1; i < n; i++) {
      const xc = (X(i - 1) + X(i)) / 2
      d += ` C ${xc} ${Y(scores[i - 1].score)} ${xc} ${Y(scores[i].score)} ${X(i)} ${Y(scores[i].score)}`
    }
    flowPath = d
    flowArea = `${d} L ${X(n - 1)} ${H - 6} L ${X(0)} ${H - 6} Z`
    if (todayIdx >= 0) flowDot = { x: X(todayIdx), y: Y(scores[todayIdx].score) }
  }

  return (
    <div className={styles.dayRoot}>
      {/* ── S0 rise (top) ── */}
      <button type="button" className={styles.rise} onClick={onRise}>
        ↑ {ko ? '이번 달로 줌아웃' : 'Zoom out to month'}
      </button>

      {/* ── S1 eyebrow ── */}
      <div className={styles.eyebrow}>
        {ko ? (
          <>
            <span>{isToday ? '오늘' : '고른 날'}</span>
            <span className={styles.eyebrowKo}>{day.dateKo ?? day.date}</span>
          </>
        ) : (
          <>
            <span>{isToday ? 'Today · Daily' : 'Selected · Daily'}</span>
            <span className={styles.eyebrowKo}>{day.date}</span>
          </>
        )}
      </div>

      {/* ── novice 기본: 한자·용어 없는 일상어 결론 ── */}
      <header className={styles.novice}>
        {/* 연속 방문 스트릭(클라 localStorage) — 2일째부터 노출, 재방문 동기부여. */}
        <StreakChip ko={ko} />
        {/* 도발적 후크 — 열어볼 이유(재방문/클릭). 아래 차분한 결론과 별개 register. */}
        <p className={styles.novHook}>{dayHook.headline}</p>
        {dayHook.subline && <p className={styles.novHookSub}>{dayHook.subline}</p>}
        <div
          className={`${styles.novToneWord} ${
            verdict.tone === 'positive'
              ? styles.novGood
              : verdict.tone === 'caution'
                ? styles.novCare
                : ''
          }`.trim()}
        >
          {novToneWord}
        </div>
        <p className={styles.novLine}>{localizeLabel(dayOneLine, ko)}</p>
        {novWhy && <p className={styles.novWhy}>{novWhy}</p>}
        <div className={styles.novShare}>
          <ShareDayButton
            data={{
              isKo: ko,
              dateLabel: ko ? `${Number(mm)}월 ${Number(dd)}일 ${weekday(day.date)}` : titleLatin,
              score: day.score,
              tone: verdict.tone,
              // 공유 카드도 같은 후크(점수/톤 기반·본명 시드 고정) — 인앱 hero 와 일치.
              headline: dayHook.headline,
              subline: dayHook.subline,
              curve: hasFlow ? scores.map((s) => s.score) : undefined,
              markerIndex: todayIdx >= 0 ? todayIdx : undefined,
            }}
          />
        </div>
      </header>

      {/* ── 근거 사다리 — 왜 이렇게 봤나(시간층별 지배 근거). novice 표면에 노출:
          쉬운 결론 + 용어 칩 2단으로 근거를 버리지 않고 살린다. ── */}
      {dayLadder.length > 0 && (
        <section className={styles.sec}>
          <SecHead label={ko ? '왜 이렇게 봤나' : 'Why we read it this way'} latin="Evidence" />
          <p className={styles.ladderCap}>
            {ko
              ? '10년 → 올해 → 이달 → 오늘, 시간대마다 가장 센 근거 하나씩.'
              : '10-yr → year → month → today: the strongest driver at each scale.'}
          </p>
          <EvidenceLadder rungs={dayLadder} />
        </section>
      )}

      {/* ── 자세히 ① 일진·근거 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '왜 이런가요? · 일진과 근거 보기' : 'Why? · pillar & reasons'}
        </summary>
        <p className={styles.foldLede}>
          {ko
            ? `쉽게 말하면, ${dayWord} 하루에 깔린 기운을 사주로 풀어 왜 좋은·조심할 날인지 근거를 보여드려요.`
            : `In plain terms: we read the energy under ${dayWord} through Saju to show why it’s a good or careful day.`}
        </p>

        {/* ── S2 일진 간지 헤더 ── */}
        <header className={styles.header}>
          <div className={styles.ganzhi}>{day.iljin.hanja}</div>
          <div className={styles.ganzhiRead}>{ko ? `${day.iljin.kr}일` : day.iljin.en}</div>
          <div className={styles.title}>
            {titleLatin}
            <span className={styles.titleKo}>
              {ko
                ? `${isToday ? '오늘' : '이날'}의 일진`
                : isToday
                  ? "Today's pillar"
                  : "The day's pillar"}
            </span>
          </div>
          <div className={styles.sibsinTag}>
            <span className={styles.sibsinPlain}>{sibsinPlain}</span>
            <span className={styles.sibsinRaw}>{sibsinRaw}</span>
          </div>
          {day.dayMaster && (
            <div className={styles.master}>
              {ko ? '기준 일간' : 'Day master'} · {day.dayMaster.hanja}{' '}
              {ko ? day.dayMaster.kr : day.dayMaster.en}
            </div>
          )}
          <div className={styles.counts}>
            <span className={styles.cScore}>
              {ko ? '점수' : 'score'}
              <b
                className={
                  scoreBand === 'good'
                    ? styles.scoreGood
                    : scoreBand === 'low'
                      ? styles.scoreLow
                      : styles.scoreMid
                }
              >
                {day.score}
              </b>
            </span>
            <span className={styles.cTone}>
              {ko ? '바람' : 'wind'}
              <b className={styles.cToneWord}>{toneWord}</b>
            </span>
            <span className={styles.cStrength}>
              {ko ? '세기' : 'strength'}
              <b className={styles.cStrengthWord}>{ko ? strength.ko : strength.en}</b>
            </span>
          </div>
        </header>

        {/* ── S4 지금 일어나는 일 ──
            (S3 '오늘의 한 줄'은 ①결론의 한 줄과 동일 문장·간지/십신도 ②에 있어
             완전 중복이라 제거 — 펼침이 가벼워짐.) */}
        <section className={styles.sec}>
          <SecHead label={ko ? '지금 일어나는 일' : "What's happening"} latin="Now" />
          {happeningLines.length === 0 ? (
            <p className={styles.muted}>
              {ko
                ? `${dayWord}은 두드러진 신호 없이 무난한 흐름이에요.`
                : 'A steady day with no standout signals.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {happeningLines.map((line, i) => (
                <li className={styles.listItem} key={i}>
                  {line}
                </li>
              ))}
            </ul>
          )}
          {cautionLines.length > 0 && (
            <ul className={`${styles.list} ${styles.listCaution}`}>
              {cautionLines.map((line, i) => (
                <li className={styles.listItem} key={i}>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
      </details>

      {/* ── S5 이렇게 해보세요 ── */}
      {dayActions && (
        <section className={styles.sec}>
          <SecHead
            label={ko ? '이렇게 해보세요' : isToday ? 'Try this today' : 'Try this on the day'}
            latin="Try"
          />
          <div className={styles.actions}>
            <div className={styles.actionGroup}>
              <span className={`${styles.chip} ${styles.chipDo}`}>{ko ? '이렇게' : 'DO'}</span>
              <ul className={styles.chipList}>
                {(ko ? dayActions.do : dayActions.doEn).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div className={styles.actionGroup}>
              <span className={`${styles.chip} ${styles.chipEase}`}>{ko ? '살살' : 'EASE'}</span>
              <ul className={styles.chipList}>
                {(ko ? dayActions.avoid : dayActions.avoidEn).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <p className={styles.tip}>
              <span aria-hidden>💡</span> {ko ? dayActions.tip : dayActions.tipEn}
            </p>
          </div>
        </section>
      )}

      {/* ── S6 분야별 오늘 ── */}
      {dayDomains && (
        <section className={styles.sec}>
          <SecHead
            label={ko ? `분야별 ${dayWord}` : isToday ? 'Today by area' : 'The day by area'}
            latin="By area"
          />
          <div className={styles.domainNote}>
            {ko ? dayDomains.bandNote : dayDomains.bandNoteEn}
          </div>
          <div className={styles.domainGrid}>
            {dayDomains.domains.map((d) => (
              <div
                className={`${styles.domain} ${d.active ? styles.domainActive : ''}`.trim()}
                key={d.key}
              >
                <span className={styles.domainIcon} aria-hidden>
                  {d.icon}
                </span>
                <div className={styles.domainText}>
                  <span className={styles.domainLabel}>
                    {ko ? d.label : d.labelEn}
                    {d.active && (
                      <span className={styles.domainOn}>{ko ? `${dayWord} 주목` : 'in focus'}</span>
                    )}
                  </span>
                  <span className={styles.domainBody}>{ko ? d.body : d.bodyEn}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 자세히 ② 사주×별자리·타이밍 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '사주 × 별자리 · 타이밍 자세히' : 'Saju × Astro · timing'}
        </summary>
        <p className={styles.foldLede}>
          {ko
            ? `쉽게 말하면, 사주의 기운과 별자리 흐름이 ${dayWord} 어디서 맞물리는지, 언제 가장 세지는지를 보여드려요.`
            : `In plain terms: where your Saju energy and the star flows meet ${dayWord}, and when it peaks.`}
        </p>

        {/* ── S8 타이밍 ── */}
        {(hasFlow || upcoming.length > 0 || nextBig) && (
          <section className={styles.sec}>
            <SecHead label={ko ? '타이밍' : 'Timing'} latin="Timing" />
            {nextBig && (
              <div className={styles.nextBig}>
                <span className={styles.nextBigDday}>D-{nextBig.dDay}</span>
                <span className={styles.nextBigText}>
                  {ko
                    ? `다가오는 큰 날 · ${Number(nextBig.date.slice(5, 7))}월 ${Number(
                        nextBig.date.slice(8, 10)
                      )}일 (${weekday(nextBig.date)})`
                    : `Your next big day · ${Number(nextBig.date.slice(5, 7))}/${Number(
                        nextBig.date.slice(8, 10)
                      )} (${weekday(nextBig.date)})`}
                </span>
              </div>
            )}
            {hasFlow && (
              <>
                <div className={styles.flowSub}>
                  {ko
                    ? `이달 흐름 속 ${dayWord}`
                    : isToday
                      ? 'Today within the month'
                      : 'This day within the month'}
                </div>
                <svg width="100%" viewBox="0 0 320 60" className={styles.flowSvg} aria-hidden>
                  <path d={flowArea} fill="var(--good-bg)" opacity={0.6} />
                  <path d={flowPath} fill="none" stroke="var(--green)" strokeWidth={2} />
                  {flowDot && (
                    <>
                      <circle cx={flowDot.x} cy={flowDot.y} r={4.5} fill="var(--blue)" />
                      <text
                        x={flowDot.x}
                        y={flowDot.y - 7}
                        textAnchor="middle"
                        className={styles.flowToday}
                      >
                        {isToday ? (ko ? '오늘' : 'today') : `${Number(dd) || ''}${ko ? '일' : ''}`}
                      </text>
                    </>
                  )}
                </svg>
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <div className={styles.flowSub}>{ko ? '다가오는 며칠' : 'Next few days'}</div>
                <div className={styles.upRow}>
                  {upcoming.map((u) => (
                    <div key={u.date} className={styles.upCell}>
                      <div className={styles.upBox} style={{ background: upBg(u.score) }}>
                        {Number(u.date.slice(8, 10))}
                      </div>
                      <span className={styles.upWd}>{weekday(u.date)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── S9 하루 리듬 ── */}
        {hourSorted.length > 0 && (
          <section className={styles.sec}>
            <SecHead label={ko ? '하루 시간 리듬' : "The day's rhythm"} latin="Rhythm" />
            <div className={styles.rhythmNote}>
              {ko ? '가운데선 위 = 좋음 · 아래 = 주의' : 'above the line = good · below = caution'}
            </div>
            {rhythmCoherenceNote && <div className={styles.rhythmNote}>{rhythmCoherenceNote}</div>}
            <HourGraph hours={hourSorted} ko={ko} />
            {/* 절정 시각의 생활 문장 — 곡선만으론 "그래서 언제 뭘?"이 안 보인다. */}
            {rhythmPeaks.length > 0 && (
              <div className={styles.rhythmPeaks}>
                {rhythmPeaks.map((p, i) => (
                  <div className={styles.rhythmPeak} key={i}>
                    <span className={p.tone === 'good' ? styles.rpUp : styles.rpDn} aria-hidden>
                      {p.tone === 'good' ? '▲' : '▼'}
                    </span>
                    <b className={styles.rpWhen}>{p.when}</b>
                    <span className={styles.rpText}>{p.text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── S10 자세한 신호 보기 (단일 fold) ── */}
        <details className={styles.fold}>
          <summary className={styles.foldSummary}>
            {ko ? '자세한 신호 보기' : 'See the raw signals'}
          </summary>
          <p className={styles.foldLede}>
            {ko
              ? '쉽게 말하면, 위 결론을 만든 사주의 낱낱 재료를 가장 깊은 수준까지 펼쳐 둔 칸이에요.'
              : 'In plain terms: this panel lays out the raw Saju ingredients behind the read, at the deepest level.'}
          </p>
          <div className={styles.foldBody}>
            {/* 깊이 읽기 */}
            <div className={styles.foldBlock}>
              <div className={styles.foldLabel}>
                {ko ? `${dayWord} 깊이 읽기` : isToday ? 'Today in depth' : 'The day in depth'}
              </div>
              <p className={styles.deepRead}>{ko ? deepRead.ko : deepRead.en}</p>
            </div>

            {/* 오늘 기둥 */}
            <div className={styles.foldBlock}>
              <div className={styles.foldLabel}>
                {ko ? `${dayWord}의 기둥` : isToday ? "Today's pillar" : "The day's pillar"}
              </div>
              <div className={styles.chartRow}>
                <span className={styles.chartHan}>{day.iljin.hanja}</span>
                <span className={styles.chartDesc}>
                  {ko
                    ? `${dayWord}의 기운 ${day.iljin.kr} · ${sibsinPlain} (${sibsinRaw})`
                    : `${isToday ? "today's" : "the day's"} pillar ${day.iljin.en} · ${sibsinPlain} (${sibsinRaw})`}
                </span>
              </div>
              {day.dayMaster && (
                <div className={styles.chartRow}>
                  <span className={styles.chartHan}>{day.dayMaster.hanja}</span>
                  <span className={styles.chartDesc}>
                    {ko
                      ? `나의 타고난 기운 · ${day.dayMaster.kr}`
                      : `your core nature · ${day.dayMaster.en}`}
                  </span>
                </div>
              )}
            </div>

            {/* 신호와 강도 */}
            {signalRows.length > 0 && (
              <div className={styles.foldBlock}>
                <div className={styles.foldLabel}>{ko ? '신호와 강도' : 'Signals & strength'}</div>
                <div className={styles.evList}>
                  {signalRows.map((s, i) => (
                    <div className={styles.evRow} key={s.id ?? i}>
                      <span className={styles.evSrc}>{srcTag(s)}</span>
                      <span className={styles.evLabel}>{localizeLabel(s.label, ko)}</span>
                      <span className={styles.evStrength}>{strengthWord(s.weight)}</span>
                      <PolChip v={s.polarity} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 본명 풀이 */}
            {(patterns.length > 0 || jjLayers.length > 0 || stages.length > 0 || geok) && (
              <div className={styles.foldBlock}>
                <div className={styles.foldLabel}>{ko ? '본명 풀이' : 'Natal read'}</div>
                {patterns.length > 0 && (
                  <div className={styles.natalSub}>
                    {patterns.map((p, i) => {
                      const en = appliedPatternEn(String(p.id))
                      const good = p.polarity >= 0
                      return (
                        <div className={styles.natalRow} key={p.id ?? i}>
                          <span className={good ? styles.natalPos : styles.natalNeg}>
                            {ko ? p.rule : (en?.gloss ?? p.rule)}
                          </span>
                          <span className={styles.natalDesc}>
                            {ko ? p.korean : (en?.name ?? p.korean)}{' '}
                            <span className={styles.natalHan}>{p.name}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {jjLayers.length > 0 && (
                  <div className={styles.natalChips}>
                    {jjLayers.map((L, i) => (
                      <span className={styles.natalChip} key={i}>
                        {ko
                          ? `${ELEM_PLAIN_KO[L.element] ?? L.element} · ${sibsinArea(String(L.sibsin))} · ${LAYER_PLAIN_KO[L.layer] ?? L.layer}`
                          : `${elementEn(L.element)} · ${sibsinAreaEn(String(L.sibsin))} · ${jijangganLayerEn(L.layer)}`}{' '}
                        <span className={styles.natalHan}>{L.stem}</span>
                      </span>
                    ))}
                  </div>
                )}
                {stages.length > 0 && (
                  <div className={styles.natalChips}>
                    {stages.map((s, i) => (
                      <span className={styles.natalChip} key={i}>
                        {ko
                          ? `${PILLAR_PLAIN[s.pillar]?.ko ?? s.pillar} · ${twelveStagePlain(s.stage)}`
                          : `${PILLAR_PLAIN[s.pillar]?.en ?? s.pillar} · ${twelveStageEn(s.stage)}`}{' '}
                        <span className={styles.natalHan}>{s.stage}</span>
                      </span>
                    ))}
                  </div>
                )}
                {geok && (
                  <div className={styles.natalGeok}>
                    {/* 결론 일상어 먼저 — 성격/파격/반성반파는 마지막 남은 용어투였다
                        (감사 갭 #3). 원 성패 줄은 서브로 유지(아는 사람용). */}
                    {geokgukStatusPlain(geok.status, ko ? 'ko' : 'en') && (
                      <div>{geokgukStatusPlain(geok.status, ko ? 'ko' : 'en')}</div>
                    )}
                    {/* description(성패 줄)은 한국어 전용 — EN 은 이름·상태로 재구성해
                        한국어 누수 제거(요인 세부는 EN 에서 생략). */}
                    <div className={styles.natalGeokSub}>
                      {ko ? geok.description : geokgukStatusLineEn(geok.name, geok.status)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 겹치는 흐름 (사주×별자리 교차) — 표면 S7 에서 fold 로 이동.
                ④'지금 일어나는 일'이 핵심 교차를 이미 보여줘 표면 중복이라,
                상세 ▲/▼ 목록은 여기 '자세한 신호'에서 본다.
                (시간대 하늘은 ⑨ 하루 리듬과 같은 시간축이라 제거.) */}
            {crossCards.length > 0 && (
              <div className={styles.foldBlock}>
                <div className={styles.foldLabel}>
                  {ko ? '겹치는 흐름 · 사주 × 별자리' : 'Crossings · Saju × Astro'}
                </div>
                <div className={styles.crossLegend}>
                  <span className={styles.clUp}>
                    ▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}
                  </span>
                  <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
                </div>
                {crossCards.map((c, i) => {
                  const isHero = heroCross != null && c === heroCross && Math.abs(c.polarity) >= 2
                  const poleSym = c.polarity > 0 ? '▲' : c.polarity < 0 ? '▼' : '·'
                  const poleCls =
                    c.polarity > 0 ? styles.poleUp : c.polarity < 0 ? styles.poleDn : ''
                  // 도메인/행성 룩업은 *한글 키*(sajuKo/astroKo)로만 동작하므로
                  // head 계산엔 raw 한글 키를 쓰고, 화면 용어칩엔 로케일 표시명
                  // (sajuSide/astroSide — EN 에선 영문)을 쓴다. 예전엔 칩이
                  // sajuKo(항상 한글)를 렌더해 EN 로케일에서 "편관·화성"이 새어나가
                  // 같은 교차쌍을 영문 표기하는 월 티어와 언어가 어긋났다(감사).
                  const sajuKey = c.sajuKo ?? c.sajuSide
                  const astroKey = c.astroKo ?? c.astroSide
                  const sajuName = ko ? sajuKey : (c.sajuSide ?? sajuKey)
                  const astroName = ko ? astroKey : (c.astroSide ?? astroKey)
                  const head = ko
                    ? `${sibsinArea(sajuKey)} × ${planetPlain(astroKey, true)}`
                    : `${sibsinAreaEn(sajuKey)} × ${planetPlain(astroKey, false)}`
                  const body = ko ? c.meaning : (c.meaningEn ?? c.meaning)
                  return (
                    <div
                      className={`${styles.cross} ${isHero ? styles.crossHero : ''}`.trim()}
                      key={c.id ?? i}
                    >
                      <div className={styles.crossTop}>
                        <span className={`${styles.pole} ${poleCls}`.trim()} aria-hidden>
                          {poleSym}
                        </span>
                        <span className={`${styles.term} ${styles.termSaju}`}>
                          <span className={styles.termSys}>Saju</span>
                          <span className={styles.termNm}>{sajuName}</span>
                        </span>
                        <span className={styles.crossX} aria-hidden>
                          ×
                        </span>
                        <span className={`${styles.term} ${styles.termAstro}`}>
                          <span className={styles.termSys}>Astro</span>
                          <span className={styles.termNm}>{astroName}</span>
                        </span>
                        {isHero && (
                          <span className={styles.crossFlag}>
                            {ko ? '가장 센 흐름' : 'Strongest'}
                          </span>
                        )}
                      </div>
                      <div className={styles.crossHead}>{head}</div>
                      {body && <div className={styles.crossBody}>{body}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </details>
      </details>

      {/* ── S11 rise (bottom) ── */}
      <div className={styles.riseCenter}>
        <button type="button" className={`${styles.rise} ${styles.riseSmall}`} onClick={onRise}>
          ↑ {ko ? '다시 위로 — 줌아웃' : 'Zoom back out'}
        </button>
      </div>
    </div>
  )
}
