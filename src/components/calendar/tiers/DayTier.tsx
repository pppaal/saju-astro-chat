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
} from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayDomains } from '@/lib/calendar-engine/derivers/dayDomains'
import { deriveDayActions } from '@/lib/calendar-engine/derivers/dayActions'
import { deriveDayDeepRead } from '@/lib/calendar-engine/derivers/dayDeepRead'
import { dayStrength } from '@/lib/calendar-engine/derivers/dayStrength'
import { reconcileDayTone, type DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import styles from './DayTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { localizeLabel } from '@/components/calendar/adapters/localizeLabel'
import {
  shinsalEn,
  elementEn,
  jijangganLayerEn,
  twelveStageEn,
  appliedPatternEn,
} from '@/components/calendar/adapters/dayTierEnMaps'

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

// ── fold 전용 극성 칩(표면엔 ± 노출 X). ──
function PolChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? styles.polPos : v < 0 ? styles.polNeg : styles.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? String(v) : '·'
  return <span className={`${styles.pol} ${cls}`.trim()}>{txt}</span>
}

// ============================================================================
// DayTier (main).
// ============================================================================
export function DayTier({ day, onRise, sex = '남' }: DayTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'

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

  const toneWord = ko
    ? verdict.tone === 'positive'
      ? '순풍'
      : verdict.tone === 'caution'
        ? '역풍'
        : '평이'
    : verdict.tone === 'positive'
      ? 'Tailwind'
      : verdict.tone === 'caution'
        ? 'Headwind'
        : 'Steady'

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
  // 교차 meaning 은 이미 plain 이라 항상 합류 → 리스트가 비지 않는다. 전문 사유는
  // '자세한 신호' 폴드에서 따로 본다.
  const plainHappening = dayReasons
    .map((r) => plainReason(stripMarker(r), ko))
    .filter(isPlainReason)
    .map((r) => localizeLabel(r, ko))
  const happeningLines = [
    ...plainHappening.slice(0, 2),
    ...(strongestCrossMeaning && isPlainReason(strongestCrossMeaning)
      ? [localizeLabel(plainReason(strongestCrossMeaning, ko), ko)]
      : []),
  ].slice(0, 3)
  const cautionLines = dayCautions
    .map((c) => plainReason(stripMarker(c), ko))
    .filter(isPlainReason)
    .slice(0, 2)
    .map((c) => localizeLabel(c, ko))

  // ── novice hero: 톤 워드는 결론(oneLine)과 어긋나지 않게, 중립이면 '기복 있는 날'. ──
  const novTone = day.dayTone?.tone
  const novToneWord = ko
    ? novTone === 'positive'
      ? '좋은 날'
      : novTone === 'caution'
        ? '조심할 날'
        : '기복 있는 날'
    : novTone === 'positive'
      ? 'A good day'
      : novTone === 'caution'
        ? 'A careful day'
        : 'A mixed day'

  // ── novice hero "왜?" 한 줄 — 기존 평이 근거(받쳐줌/부딪힘)에서만 합성, 용어 0. ──
  const hasSupport = happeningLines.length > 0
  const hasFriction = cautionLines.length > 0
  const novWhy = ko
    ? hasSupport && hasFriction
      ? '부딪히는 기운이 좀 있지만 받쳐주는 흐름도 같이 와요.'
      : hasFriction
        ? '오늘은 살짝 거스르는 기운이 깔려 있어요.'
        : hasSupport
          ? '받쳐주는 흐름이 같이 와요.'
          : ''
    : hasSupport && hasFriction
      ? 'A bit of friction, but a supporting flow comes with it.'
      : hasFriction
        ? "There's a slightly rough current underneath today."
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
    crosses: (day.crossActivations ?? [])
      .filter((c) => c.sajuKo && c.astroKo)
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
  const rhythmCoherenceNote =
    verdict.tone === 'positive' && hourDn > hourUp
      ? ko
        ? '전체는 순한 날이에요 — 아래는 그 하루 *안에서의* 상대 리듬이라 오르내림이 있어요.'
        : "Overall a smooth day — the bars below are the relative rhythm *within* it, so they rise and fall."
      : verdict.tone === 'caution' && hourUp > hourDn
        ? ko
          ? '전체는 조심할 날이지만, 그 안에도 트이는 시간대가 있어요.'
          : 'A careful day overall, but some hours still open up within it.'
        : ''

  // ── 타이밍 — 이달 흐름 추이선 + 다가오는 며칠. ──
  const scores = day.monthScores ?? []
  const hasFlow = scores.length >= 3
  const upcoming = day.upcoming ?? []
  const todayIdx = scores.findIndex((s) => s.today)

  const upBg = (s: number) =>
    s >= 65
      ? 'var(--good-bg)'
      : s <= 35
        ? 'var(--crimson-bg)'
        : s >= 50
          ? 'var(--gold-bg)'
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
            <span>오늘</span>
            <span className={styles.eyebrowKo}>{day.dateKo ?? day.date}</span>
          </>
        ) : (
          <>
            <span>Today · Daily</span>
            <span className={styles.eyebrowKo}>{day.date}</span>
          </>
        )}
      </div>

      {/* ── novice 기본: 한자·용어 없는 일상어 결론 ── */}
      <header className={styles.novice}>
        <div
          className={`${styles.novToneWord} ${
            day.dayTone?.tone === 'positive'
              ? styles.novGood
              : day.dayTone?.tone === 'caution'
                ? styles.novCare
                : ''
          }`.trim()}
        >
          {novToneWord}
        </div>
        <p className={styles.novLine}>{localizeLabel(dayOneLine, ko)}</p>
        {novWhy && <p className={styles.novWhy}>{novWhy}</p>}
      </header>

      {/* ── 자세히 ① 일진·근거 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '왜 이런가요? · 일진과 근거 보기' : 'Why? · pillar & reasons'}
        </summary>
        <p className={styles.foldLede}>
          {ko
            ? '쉽게 말하면, 오늘 하루에 깔린 기운을 사주로 풀어 왜 좋은·조심할 날인지 근거를 보여드려요.'
            : 'In plain terms: we read the energy under today through Saju to show why it’s a good or careful day.'}
        </p>

        {/* ── S2 일진 간지 헤더 ── */}
        <header className={styles.header}>
          <div className={styles.ganzhi}>{day.iljin.hanja}</div>
          <div className={styles.ganzhiRead}>{ko ? `${day.iljin.kr}일` : day.iljin.en}</div>
          <div className={styles.title}>
            {titleLatin}
            <span className={styles.titleKo}>{ko ? '오늘의 일진' : "Today's pillar"}</span>
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
                  dayBand === 'good'
                    ? styles.scoreGood
                    : dayBand === 'low'
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
                ? '오늘은 두드러진 신호 없이 무난한 흐름이에요.'
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
          <SecHead label={ko ? '이렇게 해보세요' : 'Try this today'} latin="Try" />
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
          <SecHead label={ko ? '분야별 오늘' : 'Today by area'} latin="By area" />
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
                      <span className={styles.domainOn}>{ko ? '오늘 주목' : 'in focus'}</span>
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
            ? '쉽게 말하면, 사주의 기운과 별자리 흐름이 오늘 어디서 맞물리는지, 언제 가장 세지는지를 보여드려요.'
            : 'In plain terms: where your Saju energy and the star flows meet today, and when it peaks.'}
        </p>


        {/* ── S8 타이밍 ── */}
        {(hasFlow || upcoming.length > 0) && (
          <section className={styles.sec}>
            <SecHead label={ko ? '타이밍' : 'Timing'} latin="Timing" />
            {hasFlow && (
              <>
                <div className={styles.flowSub}>
                  {ko ? '이달 흐름 속 오늘' : 'Today within the month'}
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
                        {ko ? '오늘' : 'today'}
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
              {ko ? '좋음 ↑ 쪽빛 · 주의 ↓ 주황' : 'good ↑ indigo · caution ↓ amber'}
            </div>
            {rhythmCoherenceNote && (
              <div className={styles.rhythmNote}>{rhythmCoherenceNote}</div>
            )}
            <div className={styles.rhythmRow}>
              {hourSorted.map((h, i) => {
                const up = h.tone === 'good'
                const mag = Math.max(0.4, Math.min(1, h.strength / 2))
                const label = ko ? h.when : h.whenEn
                const time = label.replace(/\s*\(.*\)/, '').trim()
                return (
                  <div className={styles.rhythmCol} key={i} title={label}>
                    <div className={styles.rhythmTrack}>
                      <span className={styles.rhythmMid} />
                      <span
                        className={`${styles.rhythmBar} ${up ? styles.rhythmUp : styles.rhythmDn}`}
                        style={{ height: `${mag * 50}%`, [up ? 'bottom' : 'top']: '50%' }}
                      />
                    </div>
                    <span className={styles.rhythmTime}>{time}</span>
                  </div>
                )
              })}
            </div>
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
              <div className={styles.foldLabel}>{ko ? '오늘 깊이 읽기' : 'Today in depth'}</div>
              <p className={styles.deepRead}>{ko ? deepRead.ko : deepRead.en}</p>
            </div>

            {/* 오늘 기둥 */}
            <div className={styles.foldBlock}>
              <div className={styles.foldLabel}>{ko ? '오늘의 기둥' : "Today's pillar"}</div>
              <div className={styles.chartRow}>
                <span className={styles.chartHan}>{day.iljin.hanja}</span>
                <span className={styles.chartDesc}>
                  {ko
                    ? `오늘의 기운 ${day.iljin.kr} · ${sibsinPlain} (${sibsinRaw})`
                    : `today's pillar ${day.iljin.en} · ${sibsinPlain} (${sibsinRaw})`}
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
                {geok && <div className={styles.natalGeok}>{geok.description}</div>}
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
                  <span className={styles.clUp}>▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}</span>
                  <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
                </div>
                {crossCards.map((c, i) => {
                  const isHero = heroCross != null && c === heroCross && Math.abs(c.polarity) >= 2
                  const poleSym = c.polarity > 0 ? '▲' : c.polarity < 0 ? '▼' : '·'
                  const poleCls = c.polarity > 0 ? styles.poleUp : c.polarity < 0 ? styles.poleDn : ''
                  const sajuName = c.sajuKo ?? c.sajuSide
                  const astroName = c.astroKo ?? c.astroSide
                  const head = ko
                    ? `${sibsinArea(sajuName)} × ${planetPlain(astroName, true)}`
                    : `${sibsinAreaEn(sajuName)} × ${planetPlain(astroName, false)}`
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
