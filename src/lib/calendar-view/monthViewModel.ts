/**
 * 월 뷰모델 — v9.2 캘린더 Monthly 탭의 화면 데이터(순수). 페이로드(DestinyMonth + 오늘의
 * DestinyDay)만 읽고 화면이 그대로 그릴 구조를 낸다: 히어로, 한 달 읽기, 날 수, 해 볼 것,
 * 30일 막대, 달력 그리드, 범례, 큰 날, 섹션 제목, 오늘, 근거 사다리, 상담 질문.
 *
 * ── 단일 권위(바꾸지 않는다) ──
 *  · 날 수 = month.verdict(reconcileMonthTone — 좋음·조심·피함·잔잔 calmN). 그리드 밴드 카운트라
 *    여는 날짜와 무관(B1 #2). 잔잔 = 엔진의 중립 단어 Calm(FIX9b E5).
 *  · 톤·후크 = verdict.tone / verdict.shareTone → monthShareHook(MonthTier 와 같은 소스).
 *  · 해 볼 것 = pickTryThis(B1 — 오늘 이후만, HOLD 는 avoid-first).
 *  · 큰 날 = keyDays.ts(그리드 마크 라벨 — FIX9b E5 · 오너 결정).
 *  · 오늘·지난 날 = 서버가 주입된 now 로 실은 cell.isToday / cell.past / month.todayDay.
 *  · 사다리 = 이번 달이면 오늘의 4칸 사다리(focusDayCell — day.evidenceLadder), 다른 달이면
 *    month.evidenceLadder(15일 대표 셀 3칸).
 *
 * 결정론: 시계를 읽지 않는다. opts.nowIso 는 페이로드에 오늘 표지가 없을 때(구 캐시)만
 * 기준일로 쓴다. 미성년이면 화면 문구 전체를 minorSafe 로 정화한다.
 */

import type { DestinyDay, DestinyMonth } from '@/types/calendar'
import { reconcileMonthTone, type MonthVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import { pickTryThis, toMMDD } from '@/lib/calendar-engine/derivers/tryThis'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { deepMinorSafe } from '@/lib/calendar-engine/minorSafe'
import { monthShareHook } from '@/lib/share/shareHook'
import {
  buildKeyDayItems,
  cellIsToday,
  cellPast,
  dayKindOf,
  keyDayMeaning,
  verdictPrefix,
  type KeyDayItem,
  type KeyDayMark,
} from './keyDays'
import {
  firstWeekdayOfMonth,
  mdLabel,
  monthName,
  monthYearLong,
  monthYearShort,
  numberWordEn,
  ordinal,
  weekdayInitials,
  weekdayShort,
  type Lang,
} from './dateLabels'
import {
  LADDER_CAPTION,
  buildTodaySection,
  toLadderRows,
  toTimingRow,
  type LadderRowVM,
  type TimingRowVM,
  type TodaySectionVM,
} from './dayViewModel'

export interface MonthViewModelOptions {
  lang: Lang
  /** 미성년 — 화면 문구 정화. 기본 today?.isMinor. */
  isMinor?: boolean
  /**
   * 기준 시각(ISO — 앞 10자리 'YYYY-MM-DD' 를 출생지 민용 날짜로 읽는다). 페이로드에
   * isToday/past/todayDay 가 없을 때만(구 캐시) 오늘을 정하는 데 쓴다.
   */
  nowIso?: string
}

export interface MonthBarVM {
  d: number
  ds: string
  /** 0..1 — 막대 높이(그날 점수/100). */
  height: number
  mark: KeyDayMark
  past: boolean
  isToday: boolean
  keyDay: boolean
}

/**
 * 그리드에서 고른 날의 읽기('Tap a date for its read') — 큰 날 행과 같은 규칙(그리드 마크의
 * 판정 단어 + 같은 엔진 풀의 한 줄 + 그날 '왜' 교차 행). 큰 날을 고르면 목록 행과 같은 말이다.
 */
export interface MonthCellReadVM {
  /** 'Nov 24 · Tue' / '11월 24일 · 화'. */
  label: string
  /** 판정 단어 — verdictPrefix(mark). */
  verdict: string
  /** 그날 한 줄 — keyDayMeaning(mark, d, lang, 월 시드). */
  meaning: string
  /** 그날 '왜' 교차 행 — 근거가 없으면 null. */
  why: TimingRowVM | null
}

export interface MonthGridCellVM {
  d: number
  ds: string
  mark: KeyDayMark
  past: boolean
  isToday: boolean
  keyDay: boolean
  /** 그리드 최고의 날 — 'Best' 표지. */
  best: boolean
  /** 고른 날의 읽기. */
  read: MonthCellReadVM
}

/** 큰 날 행 — keyDays.ts 의 구조 행에서 원본 근거(ko/en 쌍) 대신 요청 로케일의 교차 행. */
export type KeyDayRowVM = Omit<KeyDayItem, 'reason'> & {
  /** 'Nov 5' / '11월 5일'. */
  label: string
  /** 펼쳤을 때의 '왜' 교차 행 — 근거가 없으면 null. */
  why: TimingRowVM | null
}

/** 이달 공유 링크 재료(ShareCalendarButton) — 요약 문구·큰 날 몇 줄·이달 곡선 숫자만(원국 미전송). */
export interface MonthShareVM {
  /** 'November 2026' / '2026년 11월'. */
  periodLabel: string
  headline: string
  /** 큰 날 최대 5줄 — 'Nov 24 · Best day'. */
  highlights: string[]
  /** 일별 막대 높이 0..100. */
  curve: number[]
  /** 곡선에서 오늘의 자리 — 이번 달이 아니면 없음. */
  markerIndex?: number
}

export type LegendKey = 'good' | 'best' | 'caution' | 'avoid' | 'calm' | 'keyDay' | 'today' | 'past'

export interface MonthViewModel {
  lang: Lang
  ym: string
  /** 'November 2026' / '2026년 11월'. */
  monthLabel: string
  /** 'Nov 2026' / '2026년 11월'. */
  monthShort: string
  hero: {
    headline: string
    subline?: string
    /** 'A mixed month' / '기복 있는 달'. */
    toneWord: string
    tone: MonthVerdict['tone']
    /** '9 days flow · 7 to ease off'. */
    countsLine: string
  }
  /** 한 달 읽기 — 'A mixed month · toward duty & standing'. */
  read: { tone: string; area: string; line: string }
  counts: { good: number; caution: number; avoid: number; calm: number }
  tryThis: {
    push: { ds: string; label: string; note: string } | null
    hold: { ds: string; label: string; note: string } | null
  }
  bars: MonthBarVM[]
  /** 'BEST · 24' — 최고의 날이 없으면 null. */
  bestAnnotation: { d: number; label: string } | null
  /** 축 눈금 — 1 · 8 · 15 · 오늘 · 최고 · 마지막(중복 제거, 오름차순). */
  axisTicks: Array<{ d: number; today: boolean; best: boolean }>
  grid: {
    /** 1일 앞 빈칸 수(0=일요일). */
    offset: number
    weekdays: readonly string[]
    cells: MonthGridCellVM[]
  }
  legend: Array<{ key: LegendKey; label: string }>
  keyDays: KeyDayRowVM[]
  /** '01 / Day by day' 제목 — 'Six key days.' + 'The 24th is the best.'(최고의 날 없으면 ''). */
  h2: { lead: string; best: string }
  /** 오늘 — 이번 달이고 일 티어가 있을 때만. */
  today: TodaySectionVM | null
  ladderCaption: string
  /** 'day' = 오늘의 4칸 사다리(이번 달), 'month' = 15일 대표 셀 3칸(다른 달). */
  ladderSource: 'day' | 'month'
  ladder: LadderRowVM[]
  /**
   * 상담사에게 이어 물을 질문(입력창 미리 채움). question 은 이 차트의 PUSH · HOLD 날짜를 담고,
   * generic 은 날짜 판단이 없는 같은 달 질문 — 화면의 본명이 저장된 본명과 다를 때 쓴다(QA-8).
   */
  cta: { question: string; generic: string }
  /** 이달 공유 링크 재료. */
  share: MonthShareVM
}

// ─── 문구(ko/en 짝) ───

const TONE_WORD: Record<Lang, Record<MonthVerdict['tone'], string>> = {
  en: {
    good: 'A favorable month',
    care: 'A careful month',
    flat: 'An even month',
    volatile: 'A mixed month',
  },
  ko: {
    good: '잘 풀리는 달',
    care: '조심스러운 달',
    flat: '고르게 흐르는 달',
    volatile: '기복 있는 달',
  },
}

const LEGEND_LABEL: Record<Lang, Record<LegendKey, string>> = {
  en: {
    good: 'Good',
    best: 'Best',
    caution: 'Caution',
    avoid: 'Avoid',
    calm: 'Calm',
    keyDay: 'Key day',
    today: 'Today',
    past: 'Past',
  },
  ko: {
    good: '좋은 날',
    best: '최고의 날',
    caution: '조심할 날',
    avoid: '피할 날',
    calm: '잔잔한 날',
    keyDay: '큰 날',
    today: '오늘',
    past: '지난 날',
  },
}

const LEGEND_ORDER: readonly LegendKey[] = [
  'good',
  'best',
  'caution',
  'avoid',
  'calm',
  'keyDay',
  'today',
  'past',
]

/** 한 달 읽기의 영역 절 — 'toward duty & standing' / '일·책임 쪽으로'. */
function areaClause(sibsin: string, lang: Lang): string {
  if (!sibsin) return ''
  const area = lang === 'ko' ? sibsinArea(sibsin) : sibsinAreaEn(sibsin)
  if (!area) return ''
  return lang === 'ko' ? `${area} 쪽으로` : `toward ${area}`
}

function countsLine(goodN: number, careN: number, lang: Lang): string {
  return lang === 'ko'
    ? `일이 잘 풀리는 날 ${goodN}일 · 한 박자 쉬어갈 날 ${careN}일`
    : `${goodN} day${goodN === 1 ? '' : 's'} flow · ${careN} to ease off`
}

function h2Lead(n: number, lang: Lang): string {
  if (lang === 'ko') return `큰 날 ${n}일.`
  return n === 1 ? 'One key day.' : `${numberWordEn(n)} key days.`
}

function h2Best(bestDay: number, lang: Lang): string {
  if (!bestDay) return ''
  return lang === 'ko'
    ? `${ordinal(bestDay, lang)}이 가장 좋아요.`
    : `The ${ordinal(bestDay, lang)} is the best.`
}

function pushNote(isBest: boolean, lang: Lang): string {
  if (lang === 'ko')
    return isBest
      ? '가장 좋은 날 무렵, 미뤄둔 일을 밀어붙이세요.'
      : '이 좋은 날 무렵, 미뤄둔 일을 밀어붙이세요.'
  return isBest
    ? 'Push waiting tasks around your best day.'
    : 'Push waiting tasks around this good day.'
}

function holdNote(lang: Lang): string {
  return lang === 'ko'
    ? '이날 무렵엔 큰 결정·이동을 미루세요.'
    : 'Hold big decisions and moves near this day.'
}

function ctaQuestion(ym: string, push: string | null, hold: string | null, lang: Lang): string {
  if (lang === 'ko') {
    if (push && hold)
      return `${mdLabel(push, 'ko')}에 무엇을 밀어붙이고, ${mdLabel(hold, 'ko')}엔 무엇을 조심하면 좋을까요?`
    if (push) return `${mdLabel(push, 'ko')}에 무엇을 밀어붙이면 좋을까요?`
    if (hold) return `${mdLabel(hold, 'ko')}엔 무엇을 조심하면 좋을까요?`
    return `${monthName(ym, 'ko')}을 어떻게 보내면 좋을까요?`
  }
  if (push && hold)
    return `What should I push on ${mdLabel(push, 'en')}, and what should I watch on ${mdLabel(hold, 'en')}?`
  if (push) return `What should I push on ${mdLabel(push, 'en')}?`
  if (hold) return `What should I watch on ${mdLabel(hold, 'en')}?`
  return `How should I spend ${monthName(ym, 'en')}?`
}

/** 이미 선택된 날을 다시 누르면 그날로 들어간다(재탭 줌인) — 잎 모듈 gridTap 이 SSOT. */
export { gridTapIntent } from './gridTap'

/**
 * 월 뷰모델. today = 오늘의 일 티어(DestinyDay) — 이번 달이면 오늘 단면과 4칸 사다리를
 * 거기서 읽는다(없으면 null 로 생략).
 */
export function buildMonthViewModel(
  month: DestinyMonth,
  today: DestinyDay | null,
  opts: MonthViewModelOptions
): MonthViewModel {
  const { lang } = opts
  const ko = lang === 'ko'
  const ym = month.ym
  const calendar = month.calendar ?? []

  // 기준일 — 서버 표지(todayDay) → 구 캐시면 nowIso 가 이 달일 때 그 날 → 없음(0).
  const nowIsoDate = opts.nowIso?.slice(0, 10) ?? ''
  const refDay =
    month.todayDay ?? (nowIsoDate.slice(0, 7) === ym ? Number(nowIsoDate.slice(8, 10)) : 0)
  const isCurrentMonth = refDay > 0

  // ── 날 수 — verdict 단일 권위(없으면 같은 함수로 폴백). ──
  const verdict =
    month.verdict ??
    reconcileMonthTone({
      goodN: month.goodDays?.length ?? 0,
      cautionN: month.cautionDays?.length ?? 0,
      avoidN: month.avoidDays?.length ?? 0,
      totalN: calendar.length,
    })
  const counts = {
    good: verdict.goodN,
    caution: verdict.cautionN,
    avoid: verdict.avoidN,
    calm: verdict.calmN,
  }

  // ── 히어로 — 공유 후크와 같은 소스. ──
  const ymM = Number(ym.slice(5, 7)) || 0
  const hook = monthShareHook({
    tone: verdict.shareTone,
    seed: month.seed ?? 0,
    monthSalt: ymM,
    ko,
  })
  const toneWord = TONE_WORD[lang][verdict.tone]
  const area = areaClause(String(month.woolunSibsin ?? ''), lang)

  // ── 해 볼 것 — pickTryThis(오늘 이후만, HOLD avoid-first). ──
  const bestDs = month.bestDay?.date || ''
  const { push, hold } = pickTryThis(
    {
      bestDay: bestDs,
      goodDays: month.goodDays,
      cautionDays: month.cautionDays,
      avoidDays: month.avoidDays,
    },
    toMMDD(ym, isCurrentMonth ? refDay : month.focusDay)
  )

  // ── 큰 날·막대·그리드 ──
  const year = ym.slice(0, 4)
  const keyDays: KeyDayRowVM[] = buildKeyDayItems(
    { ...month, ...(month.todayDay == null && refDay ? { todayDay: refDay } : {}) },
    lang
  ).map(({ reason, ...k }) => ({
    ...k,
    label: mdLabel(`${year}-${k.ds}`, lang),
    why: reason ? toTimingRow(reason, lang) : null,
  }))
  const keyDs = new Set(keyDays.map((k) => k.ds))
  const bestD = bestDs ? Number(bestDs.slice(-2)) : 0
  const flags = (c: (typeof calendar)[number]) => ({
    past: cellPast(c, refDay),
    isToday: isCurrentMonth ? cellIsToday(c, refDay) : false,
  })
  const bars: MonthBarVM[] = calendar.map((c) => ({
    d: c.d,
    ds: c.ds,
    height: Math.max(0, Math.min(1, c.intensity ?? 0)),
    mark: dayKindOf(c.mark),
    ...flags(c),
    keyDay: keyDs.has(c.ds),
  }))
  const seed = month.seed ?? 0
  const gridCells: MonthGridCellVM[] = calendar.map((c) => {
    // 큰 날 행과 같은 규칙(keyDays.ts) — 셀 마크, 마크가 비면 최고의 날만 best.
    const rawMark = c.mark ?? (c.ds === bestDs ? 'best' : null)
    const iso = `${year}-${c.ds}`
    return {
      d: c.d,
      ds: c.ds,
      mark: dayKindOf(c.mark),
      ...flags(c),
      keyDay: keyDs.has(c.ds),
      best: c.ds === bestDs,
      read: {
        label: `${mdLabel(iso, lang)} · ${weekdayShort(iso, lang)}`,
        verdict: verdictPrefix(rawMark, lang),
        meaning: keyDayMeaning(rawMark, c.d, lang, seed),
        why: c.reason ? toTimingRow(c.reason, lang) : null,
      },
    }
  })
  const lastDay = calendar.length ? calendar[calendar.length - 1].d : 0
  const tickDays = [1, 8, 15, isCurrentMonth ? refDay : 0, bestD, lastDay].filter(
    (d) => d > 0 && d <= lastDay
  )
  const axisTicks = [...new Set(tickDays)]
    .sort((a, b) => a - b)
    .map((d) => ({ d, today: isCurrentMonth && d === refDay, best: d === bestD }))

  // ── 오늘·사다리 — 이번 달이고 오늘의 일 티어가 그 날이면 그 4칸 사다리. ──
  const todayIso = isCurrentMonth ? `${ym}-${String(refDay).padStart(2, '0')}` : ''
  const todayDay = today && todayIso && today.date === todayIso ? today : null
  const dayRungs = todayDay
    ? ((ko ? todayDay.evidenceLadder : todayDay.evidenceLadderEn) ?? todayDay.evidenceLadder ?? [])
    : []
  const monthRungs =
    (ko ? month.evidenceLadder : month.evidenceLadderEn) ?? month.evidenceLadder ?? []
  const ladderSource: 'day' | 'month' = todayDay && dayRungs.length > 0 ? 'day' : 'month'

  const vm: MonthViewModel = {
    lang,
    ym,
    monthLabel: monthYearLong(ym, lang),
    monthShort: monthYearShort(ym, lang),
    hero: {
      headline: hook.headline,
      ...(hook.subline ? { subline: hook.subline } : {}),
      toneWord,
      tone: verdict.tone,
      countsLine: countsLine(verdict.goodN, verdict.careN, lang),
    },
    read: { tone: toneWord, area, line: area ? `${toneWord} · ${area}` : toneWord },
    counts,
    tryThis: {
      push: push
        ? { ds: push, label: mdLabel(push, lang), note: pushNote(push === bestDs, lang) }
        : null,
      hold: hold ? { ds: hold, label: mdLabel(hold, lang), note: holdNote(lang) } : null,
    },
    bars,
    bestAnnotation: bestD ? { d: bestD, label: ko ? `최고 · ${bestD}` : `BEST · ${bestD}` } : null,
    axisTicks,
    grid: { offset: firstWeekdayOfMonth(ym), weekdays: weekdayInitials(lang), cells: gridCells },
    legend: LEGEND_ORDER.map((key) => ({ key, label: LEGEND_LABEL[lang][key] })),
    keyDays,
    h2: { lead: h2Lead(keyDays.length, lang), best: h2Best(bestD, lang) },
    today: todayDay ? buildTodaySection(todayDay, lang) : null,
    ladderCaption: LADDER_CAPTION[lang],
    ladderSource,
    ladder: toLadderRows(ladderSource === 'day' ? dayRungs : monthRungs, lang),
    cta: {
      question: ctaQuestion(ym, push, hold, lang),
      generic: ctaQuestion(ym, null, null, lang),
    },
    share: {
      periodLabel: monthYearLong(ym, lang),
      headline: hook.headline,
      highlights: keyDays.slice(0, 5).map((k) => `${k.label} · ${k.verdict}`),
      curve: bars.map((b) => Math.round(b.height * 100)),
      ...(isCurrentMonth && bars.some((b) => b.isToday)
        ? { markerIndex: bars.findIndex((b) => b.isToday) }
        : {}),
    },
  }
  const isMinor = opts.isMinor ?? !!today?.isMinor
  return isMinor ? deepMinorSafe(vm, !ko) : vm
}
