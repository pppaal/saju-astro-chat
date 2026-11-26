/**
 * 일 뷰모델 — v9.2 캘린더 Daily 탭의 화면 데이터(순수). 월 뷰모델(monthViewModel)과 같은
 * 부품을 쓴다: 히어로(dayHero), '왜 오늘' 교차 행(day.reason), 근거 사다리(구조 칸), 해 볼 것
 * (DO / EASE), 분야별, 교차 행 목록.
 *
 * 이 파일의 행 빌더(toTimingRow · toLadderRows · buildTodaySection)는 월 뷰모델도 쓴다 —
 * 같은 날의 '왜'·사다리가 두 탭에서 같은 모양이다. 문구는 모두 엔진 템플릿(LLM 아님).
 *
 * 결정론: 시계를 읽지 않는다. 날짜·오늘 여부는 페이로드(서버가 주입된 now 로 정한 값)에서.
 * 미성년이면 화면 문구 전체를 minorSafe 로 한 번 더 정화한다(서버 정화 + 표시 층 방어선).
 */

import type { DestinyDay } from '@/types/calendar'
import type { DestinyDayReason, ReasonAstroDetail } from '@/types/calendar/month'
import type {
  EvidenceRung,
  LadderScale,
  RungAstro,
} from '@/lib/calendar-engine/derivers/evidenceLadder'
import { ASPECT_SYMBOL } from '@/lib/calendar-engine/derivers/evidenceLadder'
import { deepMinorSafe } from '@/lib/calendar-engine/minorSafe'
import type { PlanetGlyph } from '@/components/v9/Glyph'
import { buildDayHero, buildDayDomains, retimeDayText, type DayCross } from './dayHero'
import { astroDetailSub, DIGNITY_WORD, planetGlyph, planetLabel, signLabel } from './astroDetail'
import {
  dotDate,
  dotMonthDay,
  mdLabel,
  monthName,
  monthYearShort,
  weekdayLong,
  weekdayShort,
  type Lang,
} from './dateLabels'
import { SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import { SIGN_RULERS_BY_SIGN } from '@/lib/astrology/foundation/dignities'
// 교차 사주 키 EN — 일 페이로드의 sajuSide 는 서버 언어로 구워져 있어 로케일 토글 시 원어 키에서
// 월·일 교차 카드와 같은 함수로 다시 고른다.
import { crossSajuEn } from '@/lib/calendar-engine/derivers/signalI18n'
import { PLANET_KO } from './shared'

/** 행성 한글 → 영문 키(교차 행 ko 표기에서 기호를 고를 때). */
const PLANET_EN_BY_KO: Record<string, string> = Object.fromEntries(
  Object.entries(PLANET_KO).map(([en, k]) => [k, en])
)

// ─── 칸 모양 — v9 CrossCheckRow 의 SajuCell · StarsCell 과 같은 구조 ───

export interface SajuCellVM {
  hanja?: string
  text: string
}

export interface StarsCellVM {
  glyph?: PlanetGlyph
  text: string
  sub?: string
  /**
   * 보조 줄을 줄 단위로 — 줄마다 글 + 행성 기호 + 꼬리(조디악 릴리싱 '영혼 황소자리 ♀ 2024–32',
   * FIX9b F7 · QA VC-9). 있으면 화면은 sub 대신 이것을 그린다(sub 는 같은 글, 기호 없이).
   */
  subLines?: Array<{ text: string; glyph?: PlanetGlyph; tail?: string }>
}

/** 타이밍 교차 행 — 두 부모가 같은 부호일 때만 mark(E11). 0 이면 mark 없음. */
export interface TimingRowVM {
  saju: SajuCellVM
  stars: StarsCellVM
  mark?: 'up' | 'down'
  /** 행 아래 엔진 문장(첫 글자 대문자). */
  note: string
  /** 점성 구조(기호를 그리는 화면용) — 없으면 생략. */
  astroDetail?: ReasonAstroDetail
}

export interface LadderRowVM {
  scale: LadderScale
  /** '10-yr cycle' / '10년 대운'. */
  label: string
  /** '2021–2030' · '2026' · 'Nov 2026' · '11.19'. */
  range: string
  /** 엔진 결론 한 줄. */
  sentence: string
  polarity: number
  saju: SajuCellVM | null
  stars: StarsCellVM | null
  /** 오늘 칸 — daily 이고 그날이 오늘일 때만(빨간 NOW 점, SPEC9 규칙 3). */
  now: boolean
}

const capitalize = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

const markOf = (polarity: number): 'up' | 'down' | undefined =>
  polarity > 0 ? 'up' : polarity < 0 ? 'down' : undefined

/** '왜' 근거 → 타이밍 교차 행. */
export function toTimingRow(reason: DestinyDayReason, lang: Lang): TimingRowVM {
  const ko = lang === 'ko'
  const detail = reason.astroDetail
  const planet = detail?.transitPlanet ?? reason.astroEn
  const row: TimingRowVM = {
    saju: {
      ...(reason.sajuHanja ? { hanja: reason.sajuHanja } : {}),
      text: ko ? reason.saju : reason.sajuEn,
    },
    stars: {
      ...(planetGlyph(planet) ? { glyph: planetGlyph(planet) } : {}),
      text: ko ? reason.astro : reason.astroEn,
      ...(detail ? { sub: astroDetailSub(detail, lang) } : {}),
    },
    note: ko ? reason.meaning : capitalize(reason.meaningEn || reason.meaning),
  }
  const mark = markOf(reason.polarity)
  if (mark) row.mark = mark
  if (detail) row.astroDetail = detail
  return row
}

/** 일 교차 카드 행(day.crossActivations) → 타이밍 교차 행(원어 키에서 요청 로케일로). */
function crossToTimingRow(c: DayCross, lang: Lang): TimingRowVM {
  const ko = lang === 'ko'
  const sajuKo = c.sajuKo ?? c.sajuSide
  const astroKo = c.astroKo ?? c.astroSide
  const planetEn = PLANET_EN_BY_KO[astroKo] ?? astroKo
  const hanja = SIBSIN_HANJA[sajuKo]
  const glyph = planetGlyph(planetEn)
  // STARS 보조 줄 — 교차의 점성 부모 구조 + 그날 정오 위치·같은 순간의 orb(QA VC-5, '왜' 행과 같은
  // astroDetailSub). 구조가 없으면(구 페이로드) 보조 줄 없이.
  const detail = c.astroDetail
  const row: TimingRowVM = {
    saju: { ...(hanja ? { hanja } : {}), text: ko ? sajuKo : crossSajuEn(sajuKo) },
    stars: {
      ...(glyph ? { glyph } : {}),
      text: ko ? astroKo : planetEn,
      ...(detail ? { sub: astroDetailSub(detail, lang) } : {}),
    },
    note: ko ? c.meaning : capitalize(c.meaningEn || c.meaning),
  }
  const mark = markOf(c.polarity)
  if (mark) row.mark = mark
  if (detail) row.astroDetail = detail
  return row
}

// ─── 근거 사다리 칸 ───

const SCALE_LABEL: Record<Lang, Record<LadderScale, string>> = {
  en: { decadal: '10-yr cycle', yearly: 'This year', monthly: 'This month', daily: 'Today' },
  ko: { decadal: '10년 대운', yearly: '올해', monthly: '이달', daily: '오늘' },
}

/** 오늘이 아닌 날의 일 칸 라벨(QA VC-3) — 일간 화면에서 지난 날·다가올 날을 열었을 때. */
const OTHER_DAY_LABEL: Record<Lang, string> = { en: 'This day', ko: '이날' }

/** 줄바꿈 없는 공백 — 값 한 덩어리('1° Sagittarius', 'natal Mars') 안에서 줄이 갈리지 않게(VC-8). */
const NBSP = '\u00A0'
const glue = (t: string) => t.replace(/ /g, NBSP)

/** 사다리 위 한 줄(FIX9b F7). */
export const LADDER_CAPTION: Record<Lang, string> = {
  en: 'Each scale has its own driver — a rough month can still hold a favorable day.',
  ko: '시간대마다 가장 센 근거가 따로 있어요 — 거친 달에도 좋은 날은 있어요.',
}

/** '2024-03-21'~'2032-03-21' → '2024–32'. */
function shortYears(start: string, end: string): string {
  const a = start.slice(0, 4)
  const b = end.slice(0, 4)
  return a === b ? a : `${a}–${b.slice(2)}`
}

/**
 * 칸 기간 라벨. 10년 = 대운이 시작하는 해부터 열 해('2021–2030' — 실제 창 끝 2031-03-20 은
 * range.end), 올해 = 세운 사주년(立春 이 든 해), 이달 = 월운이 열린 달, 오늘 = '11.19'.
 */
export function ladderRangeLabel(rung: EvidenceRung, lang: Lang): string {
  const r = rung.range
  if (!r) return ''
  switch (rung.scale) {
    case 'decadal': {
      const y = Number(r.start.slice(0, 4))
      return `${y}–${y + 9}`
    }
    case 'yearly':
      return r.start.slice(0, 4)
    case 'monthly':
      return monthYearShort(r.start.slice(0, 7), lang)
    case 'daily':
      return dotMonthDay(r.start)
  }
}

function eventSuffix(astro: RungAstro, lang: Lang): string {
  return astro.event ? (lang === 'ko' ? astro.event.ko : astro.event.en) : ''
}

/** 점성 칸 구조 → STARS 칸. 칩 문구(chipText)는 구조가 모르는 kind 의 폴백. */
function starsOf(astro: RungAstro, chipText: string, lang: Lang): StarsCellVM {
  const ko = lang === 'ko'
  const P = astro.planet ? planetLabel(astro.planet, lang) : ''
  const glyph = planetGlyph(astro.planet)
  const join = (...xs: string[]) => xs.filter(Boolean).join(' · ')
  const cell = (text: string, sub: string): StarsCellVM => ({
    ...(glyph ? { glyph } : {}),
    text,
    ...(sub ? { sub } : {}),
  })
  switch (astro.kind) {
    case 'transit': {
      const N = astro.natalPoint ? planetLabel(astro.natalPoint, lang) : ''
      const sym = astro.aspect ? (ASPECT_SYMBOL[astro.aspect] ?? '') : ''
      const text = [P, sym, N].filter(Boolean).join(' ')
      // 짧은 값 조각('Transit Moon', 'natal Mars') 안은 줄바꿈 없는 공백 — ' · ' 만 줄이 갈린다(VC-8).
      const sub = ko
        ? join(glue(`트랜짓 ${P}`), N && glue(`본명 ${N}`))
        : join(glue(`Transit ${P}`), N && glue(`natal ${N}`))
      return cell(text || chipText, join(sub, eventSuffix(astro, lang)))
    }
    case 'dignity': {
      const dig = astro.dignity ? (DIGNITY_WORD[lang][astro.dignity] ?? astro.dignity) : ''
      const sign = astro.sign ? signLabel(astro.sign, lang) : ''
      const sub = ko ? join(glue(dig), glue(sign)) : join(glue(dig), sign && glue(`in ${sign}`))
      return cell(P || chipText, join(sub, eventSuffix(astro, lang)))
    }
    case 'zodiacal-releasing': {
      // 랏마다 한 줄 — 별자리 뒤에 그 별자리의 전통 지배 행성 기호(FIX9b F7 'SPIRIT IN TAURUS ♀
      // 2024–32', QA VC-9). 문자열 sub 는 같은 글(기호 없이).
      const lines = (astro.lots ?? []).map((l) => {
        const sign = signLabel(l.sign, lang)
        const yrs = shortYears(l.range.start, l.range.end)
        // 랏 이름 · 별자리는 한 덩어리(줄바꿈 없는 공백, VC-8) — 줄이 갈리면 기호 뒤 기간 앞에서.
        const text = glue(
          ko
            ? `${l.lot === 'spirit' ? '영혼' : '운명'} ${sign}`
            : `${l.lot === 'spirit' ? 'Spirit' : 'Fortune'} in ${sign}`
        )
        const ruler = planetGlyph(SIGN_RULERS_BY_SIGN[l.sign])
        return { text, ...(ruler ? { glyph: ruler } : {}), tail: yrs }
      })
      const lotsText = lines.map((x) => `${x.text} ${x.tail}`)
      const chapter = astro.sign ? join(signLabel(astro.sign, lang), P) : ''
      const event = eventSuffix(astro, lang)
      const sub = join(lotsText.length ? lotsText.join(' · ') : chapter, event)
      return {
        text: ko ? '조디악 릴리싱' : 'Zodiacal releasing',
        ...(sub ? { sub } : {}),
        ...(lines.length && !event ? { subLines: lines } : {}),
      }
    }
    case 'lifecycle':
      return cell(P || chipText, eventSuffix(astro, lang))
    default:
      return cell(chipText || P, eventSuffix(astro, lang))
  }
}

/**
 * 근거 사다리 칸 → 화면 행(라벨·기간·결론·SAJU·STARS). isToday=false(일간에서 지난 날·다가올 날을
 * 연 경우)면 일 칸이 '이날'/'This day', NOW 점 없음, 결론의 '오늘'은 그날 말로(QA VC-3 · CODE-3).
 */
export function toLadderRows(
  rungs: readonly EvidenceRung[],
  lang: Lang,
  opts: { isToday?: boolean } = {}
): LadderRowVM[] {
  const ko = lang === 'ko'
  const isToday = opts.isToday ?? true
  return rungs.map((r) => {
    const astroChip = r.chips.find((c) => c.source === 'astro')?.text ?? ''
    const sajuChip = r.chips.find((c) => c.source === 'saju')?.text ?? ''
    const saju: SajuCellVM | null = r.saju
      ? {
          ...(r.saju.hanja ? { hanja: r.saju.hanja } : {}),
          text: ko ? r.saju.ko : r.saju.en || sajuChip,
        }
      : sajuChip
        ? { text: sajuChip }
        : null
    const stars: StarsCellVM | null = r.astro
      ? starsOf(r.astro, astroChip, lang)
      : astroChip
        ? { text: astroChip }
        : null
    const otherDay = r.scale === 'daily' && !isToday
    return {
      scale: r.scale,
      label: otherDay ? OTHER_DAY_LABEL[lang] : SCALE_LABEL[lang][r.scale],
      range: ladderRangeLabel(r, lang),
      sentence: otherDay ? retimeDayText(r.conclusion, ko) : r.conclusion,
      polarity: r.polarity,
      saju,
      stars,
      now: r.scale === 'daily' && isToday,
    }
  })
}

// ─── 오늘 단면(월 뷰모델의 '03 / Today' · 일 뷰모델 히어로) ───

export interface TodaySectionVM {
  /** 'YYYY-MM-DD'. */
  iso: string
  /** 'Today · Thursday' / '오늘 · 목요일' (오늘이 아니면 요일만). */
  label: string
  /** '2026.11.19'. */
  dateLabel: string
  /** '11.19' — '왜' 머리 오른쪽. */
  shortDate: string
  /** 후크(공유 카드와 같은 소스). */
  headline: string
  subline?: string
  /** 까치 한 줄 — 행동 처방의 한 끗(tip). */
  voice?: string
  /** 히어로 톤 단어 — 'A steady day'. */
  toneWord: string
  /** 화해된 한 줄 + '왜' 한 줄. */
  line: string
  why: string
  /** '왜 오늘' 교차 행 — day.reason 이 없으면 null. */
  reason: TimingRowVM | null
  /** 하루 공유 링크 재료(ShareDayButton) — 점수·톤·후크·이달 곡선. 원국은 싣지 않는다. */
  share: DayShareVM
}

/** 하루 공유 링크 재료 — /api/calendar/day/share 본문 그대로(점수·요약·곡선 숫자만). */
interface DayShareVM {
  /** 'November 19 2026' / '11월 19일 목'. */
  dateLabel: string
  score: number
  tone: 'positive' | 'mixed' | 'caution'
  headline: string
  subline?: string
  /** 이달 일별 점수(3일 이상일 때만). */
  curve?: number[]
  /** 곡선에서 그날의 자리. */
  markerIndex?: number
  /** 공유 시트 제목의 짧은 날짜 — 'Nov 24' / '11월 24일'(오늘이 아닌 날 제목). */
  shortDate: string
}

function dayShareOf(
  day: DestinyDay,
  lang: Lang,
  hero: ReturnType<typeof buildDayHero>
): DayShareVM {
  const iso = day.date
  const d = Number(iso.slice(8, 10))
  const dateLabel =
    lang === 'ko'
      ? `${mdLabel(iso, 'ko')} ${weekdayShort(iso, 'ko')}`
      : `${monthName(iso.slice(0, 7), 'en')} ${d} ${iso.slice(0, 4)}`
  const scores = day.monthScores ?? []
  const markerIndex = scores.findIndex((s) => s.today)
  return {
    dateLabel,
    shortDate: mdLabel(iso, lang),
    score: day.score,
    tone: hero.verdict.tone,
    headline: hero.hook.headline,
    ...(hero.hook.subline ? { subline: hero.hook.subline } : {}),
    ...(scores.length >= 3 ? { curve: scores.map((s) => s.score) } : {}),
    ...(scores.length >= 3 && markerIndex >= 0 ? { markerIndex } : {}),
  }
}

export function buildTodaySection(
  day: DestinyDay,
  lang: Lang,
  opts: { isToday?: boolean } = {}
): TodaySectionVM {
  const ko = lang === 'ko'
  const isToday = opts.isToday ?? true
  const hero = buildDayHero(day, { lang, isToday })
  const wd = weekdayLong(day.date, lang)
  const tip = hero.actions ? (ko ? hero.actions.tip : hero.actions.tipEn) : ''
  return {
    iso: day.date,
    label: isToday ? (ko ? `오늘 · ${wd}` : `Today · ${wd}`) : wd,
    dateLabel: dotDate(day.date),
    shortDate: dotMonthDay(day.date),
    headline: hero.hook.headline,
    ...(hero.hook.subline ? { subline: hero.hook.subline } : {}),
    ...(tip ? { voice: tip } : {}),
    toneWord: hero.heroToneWord,
    line: hero.oneLine,
    why: hero.why,
    reason: day.reason ? retimeRow(toTimingRow(day.reason, lang), lang, isToday) : null,
    share: dayShareOf(day, lang, hero),
  }
}

/** 오늘이 아닌 날 — 교차 행 엔진 문장의 '오늘'을 그날 말로(QA COPY-1). */
function retimeRow(row: TimingRowVM, lang: Lang, isToday: boolean): TimingRowVM {
  return isToday ? row : { ...row, note: retimeDayText(row.note, lang === 'ko') }
}

// ─── 시진 줄(결정 19) — 시진 창과 그 한가운데 상승궁을 나란히. 교차가 아니다(배지·교차 톤 없음). ───

interface HourRowVM {
  /** 실제 시진 창 '07:15–09:15'(엔진 창 그대로 — 평균태양시, G5). */
  window: string
  /** 시진 이름 — 'Rabbit hour' / '묘시'. */
  name: string
  /** 그 창 한가운데의 상승궁 — 'Leo rising' / '상승궁 사자자리'. 출생지를 모르면 ''. */
  rising: string
  /**
   * 그 시진의 사주 결(십신) — 좋음/조심/중립. 교차 방향이 아니다. 중립 시진도 줄로 남긴다 — 12 시진
   * 전부(결정 QA-4). 엔진 점수는 여전히 결이 있는 시진만 센다(sajuHourExtractor).
   */
  tone: 'good' | 'caution' | 'neutral'
  /** 그날 가장 센 좋은 시진·조심 시진(같으면 이른 시각). */
  peak: boolean
  /** 생활 문장 — 절정 시진에만. */
  narrative: string
}

/** '07:15–09:15 (묘시)' → '묘시'. */
const hourNameOf = (when: string) => /\(([^)]+)\)/.exec(when)?.[1] ?? ''

function hourRows(day: DestinyDay, lang: Lang): HourRowVM[] {
  const ko = lang === 'ko'
  const hours = day.hourCrossings ?? []
  // 절정 = 같은 결 중 가장 센 시진(같은 세기면 이른 시각 — 어댑터가 이미 시각순).
  const peakOf = (tone: 'good' | 'caution') => {
    let best = -1
    hours.forEach((h, i) => {
      if (h.tone === tone && (best < 0 || h.strength > hours[best].strength)) best = i
    })
    return best
  }
  const peaks = new Set([peakOf('good'), peakOf('caution')].filter((i) => i >= 0))
  return hours.map((h, i) => {
    const peak = peaks.has(i)
    const rising = ko
      ? h.risingSignKo
        ? `상승궁 ${h.risingSignKo}`
        : ''
      : h.risingSignEn
        ? `${h.risingSignEn} rising`
        : ''
    return {
      window:
        h.clockStart && h.clockEnd
          ? `${h.clockStart}–${h.clockEnd}`
          : (ko ? h.when : h.whenEn).replace(/\s*\(.*\)/, '').trim(),
      name: hourNameOf(ko ? h.when : h.whenEn),
      rising,
      tone: h.tone,
      peak,
      narrative: peak ? (ko ? (h.narrative ?? '') : (h.narrativeEn ?? '')) : '',
    }
  })
}

/** 상담사에게 이어 물을 질문 — 그날(오늘이면 '오늘'). */
function dayCtaQuestion(day: DestinyDay, lang: Lang, isToday: boolean): string {
  if (lang === 'ko')
    return isToday
      ? '오늘 제 운 흐름을 더 자세히 봐주세요.'
      : `${mdLabel(day.date, 'ko')}의 운 흐름을 더 자세히 봐주세요.`
  return isToday
    ? 'Help me read today in more detail.'
    : `Help me read ${mdLabel(day.date, 'en')} in more detail.`
}

// ─── 일 뷰모델 ───

export interface DayViewModel {
  lang: Lang
  iso: string
  isToday: boolean
  /** 히어로 — 후크·톤 단어·바람 단어·한 줄·'왜'. */
  hero: TodaySectionVM & {
    /** 바람 단어 — Tailwind/Headwind/Shifting/Calm. */
    windWord: string
    tone: 'positive' | 'mixed' | 'caution'
    /** 점수 색 밴드(월 그리드와 같은 축). */
    scoreBand: 'good' | 'mid' | 'low'
  }
  /** '왜 오늘' 행(= day.reason). */
  why: TimingRowVM | null
  ladderCaption: string
  ladder: LadderRowVM[]
  /** 해 볼 것 — DO / EASE + 한 끗. */
  tryThis: { do: string[]; ease: string[]; tip: string } | null
  /** 분야별 — 머리말 + 분야 6개. */
  byArea: {
    note: string
    areas: Array<{ key: string; icon: string; label: string; body: string; active: boolean }>
  } | null
  /** 교차 행(최대 4) — 맨 위가 '왜' 근거. */
  crossings: TimingRowVM[]
  /** 시진 줄(시각순) — 시진 × 상승궁은 교차가 아니다(결정 19). */
  hours: HourRowVM[]
  /** 상담사에게 이어 물을 질문(입력창 미리 채움). */
  cta: { question: string }
}

export interface DayViewModelOptions {
  lang: Lang
  /** 미성년 — 화면 문구 정화. 기본 day.isMinor. */
  isMinor?: boolean
  /** 오늘을 연 경우 true(페이로드의 오늘과 같은 날). 기본 true. */
  isToday?: boolean
  /** 연애 분야 배우자성 분기 — '남' | '여'. 기본 '남'. */
  sex?: string
}

export function buildDayViewModel(day: DestinyDay, opts: DayViewModelOptions): DayViewModel {
  const { lang } = opts
  const ko = lang === 'ko'
  const isToday = opts.isToday ?? true
  const hero = buildDayHero(day, { lang, isToday })
  const today = buildTodaySection(day, lang, { isToday })
  // 분야 본문 — 달 절정 시각 클로즈 없이(결정 QA-4: 같은 화면의 '시진별' 줄과 다른 한 체계라 같은
  // 창에 반대 동사가 붙었다). 오늘이 아닌 날은 '오늘'을 그날 말로.
  const domains = buildDayDomains(day, {
    lang,
    sex: opts.sex ?? '남',
    dayBand: hero.dayBand,
    isToday,
    moonTime: false,
  })
  const rungs = (ko ? day.evidenceLadder : day.evidenceLadderEn) ?? day.evidenceLadder ?? []

  const vm: DayViewModel = {
    lang,
    iso: day.date,
    isToday,
    hero: {
      ...today,
      windWord: hero.toneWord,
      tone: hero.verdict.tone,
      scoreBand: hero.scoreBand,
    },
    why: today.reason,
    ladderCaption: LADDER_CAPTION[lang],
    ladder: toLadderRows(rungs, lang, { isToday }),
    tryThis: hero.actions
      ? {
          do: ko ? hero.actions.do : hero.actions.doEn,
          ease: ko ? hero.actions.avoid : hero.actions.avoidEn,
          tip: ko ? hero.actions.tip : hero.actions.tipEn,
        }
      : null,
    byArea: domains
      ? {
          note: ko ? domains.bandNote : domains.bandNoteEn,
          areas: domains.domains.map((d) => ({
            key: d.key,
            icon: d.icon,
            label: ko ? d.label : d.labelEn,
            body: ko ? d.body : d.bodyEn,
            active: d.active,
          })),
        }
      : null,
    crossings: hero.crossRows
      .slice(0, 4)
      .map((c, i) =>
        retimeRow(
          i === 0 && hero.reasonRow && c === hero.reasonRow && day.reason
            ? toTimingRow(day.reason, lang)
            : crossToTimingRow(c, lang),
          lang,
          isToday
        )
      ),
    hours: hourRows(day, lang),
    cta: { question: dayCtaQuestion(day, lang, isToday) },
  }
  const isMinor = opts.isMinor ?? !!day.isMinor
  return isMinor ? deepMinorSafe(vm, !ko) : vm
}
