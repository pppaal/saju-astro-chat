/**
 * 일 히어로 — 하루 화면 머리(후크·톤 단어·한 줄·'왜'·행동)의 순수 파생.
 *
 * 옛 DayTier(v9.2 에서 삭제)가 컴포넌트 안에서 하던 계산(톤 권위 폴백·바람 단어·히어로 톤 단어·
 * 후크·평이 근거 두 목록·'왜' 한 줄·행동 처방)을 여기로 뺐다. v9 뷰모델(monthViewModel 의
 * 오늘 · dayViewModel)이 같은 함수를 읽어, 같은 날의 히어로가 화면마다 다를 수 없다.
 *
 * 규칙(옛 DayTier 에서 옮김):
 *  · 톤 권위 = day.dayTone, 없으면(구 캐시) reconcileDayTone 폴백. 점수 색은 verdict.band.
 *  · mixed 는 결(flavor)로 — volatile=기복 / 평이=잔잔·무난(감사 U1).
 *  · 맨 위 교차 = day.reason(월 리드아웃 '왜'와 같은 근거), 같은 페어의 다른 층 행은 뺀다(B1 #4).
 *  · 교차 meaning 은 부호에 맞는 목록으로 — 흉(−)이면 조심 목록(감사 #8).
 *  · 행동 처방은 미성년이면 정화(minorSafeAll).
 *
 * 순수 함수 — 시계를 읽지 않는다.
 */

import type { DestinyDay, Polarity } from '@/types/calendar'
import { plainReason, isPlainReason } from '@/lib/calendar-engine/derivers/plainLanguage'
import { deriveDayActions, type DayActions } from '@/lib/calendar-engine/derivers/dayActions'
import { deriveDayDomains, type DayDomainsResult } from '@/lib/calendar-engine/derivers/dayDomains'
import {
  reconcileDayTone,
  type DayBand,
  type DayVerdict,
} from '@/lib/calendar-engine/derivers/reconcile'
import { minorSafeAll } from '@/lib/calendar-engine/minorSafe'
import { dayShareHook, type ShareHook } from '@/lib/share/shareHook'
import { localizeLabel } from './localizeLabel'

export type DayCross = DestinyDay['crossActivations'][number]

export interface DayHero {
  /** 톤 권위 — day.dayTone 또는 폴백. */
  verdict: DayVerdict
  /** 행동·분야 deriver 밴드 — 톤에서(positive=good · caution=low · 그 밖 mid). */
  dayBand: 'good' | 'mid' | 'low'
  /** 점수 색 밴드 — verdict.band(월 그리드와 같은 축). */
  scoreBand: DayBand
  /** mixed 중 변동성 결. */
  volatile: boolean
  /** 바람 단어 — 순풍/역풍/변덕/잔잔 · Tailwind/Headwind/Shifting/Calm. */
  toneWord: string
  /** 히어로 톤 단어 — 좋은 날/조심할 날/기복 있는 날/무난한 날 · A good day … */
  heroToneWord: string
  /** 후크(공유 카드와 같은 소스). */
  hook: ShareHook
  /** 그날의 화해된 한 줄(로케일). */
  oneLine: string
  /** 교차 행 — 맨 위가 '왜' 근거(있으면), 나머지는 |polarity| 순. */
  crossRows: DayCross[]
  /** '왜' 근거 행 — day.reason 이 없으면 null. */
  reasonRow: DayCross | null
  /** 뜻이 있는 맨 위 교차. */
  strongestCross: DayCross | undefined
  /** 받쳐 주는 흐름(쉬운 말, 최대 3). */
  happeningLines: string[]
  /** 조심할 흐름(쉬운 말, 최대 2). */
  cautionLines: string[]
  /** '왜' 한 줄 — 받쳐 줌/부딪힘에서만 합성, 둘 다 없으면 ''. */
  why: string
  /** 행동 처방(미성년 정화) — 십신을 모르면 null. */
  actions: DayActions | null
}

export interface DayHeroOptions {
  lang: 'ko' | 'en'
  /** 오늘이 아닌 날을 연 경우 '이날'/'this day'. 기본 true. */
  isToday?: boolean
}

/**
 * 오늘이 아닌 날의 엔진 문장 — '오늘 · 내일 · 어제'를 그날 기준 말로(QA COPY-1 · CODE-3).
 * 엔진 템플릿(행동 처방 · 분야 본문 · 한 줄 · 교차 뜻 · 사다리 결론)은 오늘 화면 기준으로 적혀 있어,
 * 지난 날·다가올 날 일간 화면에서 '11.24' 옆에 '오늘'이 찍혔다. 표시 층에서만 바꾼다 — 캐시된 셀과
 * 판단(점수·톤·신호)은 그대로. KO '오늘'→'이날'(받침이 같아 조사가 그대로 맞는다), '내일'→'다음 날',
 * '어제'→'전날'. EN 'today'→'this day' — 라벨 · 리드 · 사다리('WHY THIS DAY', '10-yr → this day',
 * dayWord)와 같은 말이라 한 칸에 'this day' · 'that day' 가 섞이지 않는다(QA R-CA-8). 부사('money
 * slips out this day')로도 명사('this day’s skill')로도 맞는다. 'tomorrow'→'the next day',
 * 'yesterday'→'the day before', 'tonight'→'that night', 'tomorrow-you'→'future you'.
 * KO '어제'→'전날'은 받침이 생겨 뒤 조사도 고친다.
 */
export function retimeDayText(text: string, ko: boolean): string {
  if (!text) return text
  if (ko) {
    // '어제'(받침 없음) → '전날'(ㄹ 받침) — 바로 뒤 조사도 받침에 맞춘다('어제와' → '전날과').
    const AFTER_BATCHIM: Record<string, string> = { 와: '과', 는: '은', 가: '이', 를: '을' }
    return text
      .replace(/오늘/g, '이날')
      .replace(/내일/g, '다음 날')
      .replace(/어제(와|는|가|를)?/g, (_m, p?: string) => `전날${p ? AFTER_BATCHIM[p] : ''}`)
  }
  const cap = (lower: string) => (first: string) =>
    first === first.toUpperCase() ? lower[0].toUpperCase() + lower.slice(1) : lower
  return text
    .replace(/\btomorrow-you\b/g, 'future you')
    .replace(/\b([Tt])onight\b/g, (_m, t: string) => cap('that night')(t))
    .replace(/\b([Tt])omorrow morning\b/g, (_m, t: string) => cap('the next morning')(t))
    .replace(/\b([Tt])oday\b/g, (_m, t: string) => cap('this day')(t))
    .replace(/\b([Tt])omorrow\b/g, (_m, t: string) => cap('the next day')(t))
    .replace(/\b([Yy])esterday\b/g, (_m, t: string) => cap('the day before')(t))
}

/** 인라인 마커("↑ 이달 · " / "↓ 오늘 · ")를 걷어내 쉬운말만 남긴다. */
const stripMarker = (s: string) => s.replace(/^[↑↓▲▼]\s*[^·]*·\s*/, '').trim()

/** 첫 글자 대문자 — 목록 항목(DO · EASE)이 문장처럼 읽히게. */
const capitalizeFirst = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

export function buildDayHero(day: DestinyDay, opts: DayHeroOptions): DayHero {
  const ko = opts.lang === 'ko'
  const isToday = opts.isToday ?? true
  const dayWord = ko ? (isToday ? '오늘' : '이날') : isToday ? 'today' : 'this day'
  const retime = (t: string, k: boolean) => (isToday ? t : retimeDayText(t, k))

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
  const heroToneWord = ko
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

  const sibsinRaw = String(day.iljinSibsin)
  const dayReasons = ko ? (day.topReasons ?? []) : (day.topReasonsEn ?? day.topReasons ?? [])
  const dayCautions = ko ? (day.cautions ?? []) : (day.cautionsEn ?? day.cautions ?? [])

  // ── 맨 위 교차 — 그날 '왜' 근거(day.reason)가 있으면 그 근거 자체를 맨 앞에. ──
  const crossByAbs = [...(day.crossActivations ?? [])].sort(
    (a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)
  )
  const reason = day.reason
  const samePair = (c: DayCross) =>
    !!reason &&
    (c.sajuKo ?? c.sajuSide) === reason.saju &&
    (c.astroKo ?? c.astroSide) === reason.astro
  const reasonRow: DayCross | null = reason
    ? {
        id: `reason:${reason.saju}|${reason.astro}`,
        sajuSide: ko ? reason.saju : reason.sajuEn,
        astroSide: ko ? reason.astro : reason.astroEn,
        sajuKo: reason.saju,
        astroKo: reason.astro,
        meaning: reason.meaning,
        meaningEn: reason.meaningEn,
        polarity: reason.polarity as Polarity,
        weight: crossByAbs.find(samePair)?.weight ?? 0,
      }
    : null
  const crossRows = reasonRow ? [reasonRow, ...crossByAbs.filter((c) => !samePair(c))] : crossByAbs
  const strongestCross = crossRows.find((c) => (ko ? c.meaning : (c.meaningEn ?? c.meaning)))
  const strongestCrossMeaning = strongestCross
    ? ko
      ? strongestCross.meaning
      : (strongestCross.meaningEn ?? strongestCross.meaning)
    : ''

  // ── 평이 근거 — 교차 meaning 은 *부호에 맞는 목록*에(감사 #8). ──
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

  // ── 후크 — 점수/톤에서만(공유 카드와 같은 소스, 본명 시드 + 일-of-month). ──
  const hook = dayShareHook({
    tone: verdict.tone,
    score: verdict.score,
    seed: day.seed ?? 0,
    daySalt: Number(day.date?.slice(8, 10)) || 0,
    // 오늘이 아닌 날은 날짜 중립 풀(QA COPY-1) — 히어로 H1 과 '이날 공유' 카드가 같은 후크.
    isToday,
    ko,
  })

  // ── '왜' 한 줄 — 평이 근거(받쳐줌/부딪힘)에서만 합성, 용어 0. ──
  const hasSupport = happeningLines.length > 0
  const hasFriction = cautionLines.length > 0
  const why = ko
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

  // ── 행동 처방(미성년이면 성인 도메인 카피 정화 — 감사 C3-hole). ──
  // 오늘이 아닌 날은 '오늘'을 그날 말로(retimeDayText). 문장 첫 글자는 대문자(QA COPY-12 — 엔진
  // 풀의 EN 항목은 소문자로 시작한다).
  const rawActions = minorSafeAll(
    deriveDayActions({ iljinSibsin: sibsinRaw, scoreBand: dayBand, seed: day.seed ?? 0 }),
    !!day.isMinor
  )
  const actions: DayActions | null = rawActions
    ? {
        do: rawActions.do.map((t) => retime(t, true)),
        doEn: rawActions.doEn.map((t) => capitalizeFirst(retime(t, false))),
        avoid: rawActions.avoid.map((t) => retime(t, true)),
        avoidEn: rawActions.avoidEn.map((t) => capitalizeFirst(retime(t, false))),
        tip: retime(rawActions.tip, true),
        tipEn: capitalizeFirst(retime(rawActions.tipEn, false)),
      }
    : null

  const oneLineRaw = ko ? day.oneLine : (day.oneLineEn ?? day.oneLine)

  return {
    verdict,
    dayBand,
    scoreBand: verdict.band,
    volatile,
    toneWord,
    heroToneWord,
    hook,
    oneLine: retime(localizeLabel(oneLineRaw, ko), ko),
    crossRows,
    reasonRow,
    strongestCross,
    happeningLines,
    cautionLines,
    why,
    actions,
  }
}

/**
 * 분야별 하루 — 그날 실제 신호(트랜짓·신살·교차·시진 달)를 근거로 분야 조언(deriveDayDomains).
 * 미성년이면 정화. 십신을 모르면 null. dayViewModel 이 읽는다.
 * sex 는 연애 조언의 배우자성 분기(남=재성, 여=관성).
 */
export function buildDayDomains(
  day: DestinyDay,
  opts: {
    lang: 'ko' | 'en'
    sex: string
    dayBand: 'good' | 'mid' | 'low'
    /** 오늘이 아닌 날 — 본문의 '오늘'을 그날 말로(retimeDayText). 기본 true. */
    isToday?: boolean
    /** 본문에 달 절정 시각 클로즈를 엮을지(deriveDayDomains moonTime). 기본 true. */
    moonTime?: boolean
  }
): DayDomainsResult | null {
  const result = minorSafeAll(
    deriveDayDomains({
      iljinSibsin: String(day.iljinSibsin),
      sex: opts.sex,
      scoreBand: opts.dayBand,
      ko: opts.lang === 'ko',
      seed: day.seed ?? 0,
      ...(opts.moonTime === false ? { moonTime: false } : {}),
      evidence: {
        transits: (day.transits ?? []).map((t) => ({
          body: (t as { body?: string }).body,
          aspect: (t as { aspect?: string }).aspect,
          target: (t as { target?: string }).target,
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
    }),
    !!day.isMinor
  )
  if (!result || opts.isToday !== false) return result
  // 오늘이 아닌 날 — 머리말·본문의 '오늘'을 그날 말로(QA COPY-1).
  return {
    ...result,
    bandNote: retimeDayText(result.bandNote, true),
    bandNoteEn: retimeDayText(result.bandNoteEn, false),
    domains: result.domains.map((d) => ({
      ...d,
      body: retimeDayText(d.body, true),
      bodyEn: retimeDayText(d.bodyEn, false),
    })),
  }
}
