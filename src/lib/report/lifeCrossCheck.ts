/**
 * 인생 흐름(/destiny)의 '사주 × 별자리, 축별로' — 통합 리포트와 *같은* 교차 판정을 LLM 없이.
 *
 * /destiny 는 캘린더 엔진의 본명 컨텍스트(NatalContext, buildNatalContext · DB 캐시)를 쓰고,
 * 리포트는 buildReportContext 로 따로 만든다. 두 컨텍스트는 같은 사주 · 같은 차트에서 나오지만
 * 리포트 컨텍스트에만 있는 칸이 몇 개 있다. toCrossContext 가 그 칸을 *읽는 시점에* 채운다 —
 * 캐시 행을 바꾸지 않으므로 CALENDAR_ENGINE_VERSION 을 올리지 않는다:
 *
 *   input.gender                — 배우자성 · 자식성 분기(evalRelations · evalRomance)
 *   input.birthTimeUnknown/CityUnknown — 리포트 페이지가 ctx.input 에 싣는 미상 플래그
 *   saju.twelveStages           — getTwelveStagesForPillars(삼주면 세 기둥)
 *   saju.rooted · gongmang · johuYongsin · gwansalHonjap — collectSajuFacts(buildReportContext 와 같은 호출)
 *   astro.placeUnreliable       — 출생시각 · 출생지 미상이면 true(명시적 boolean)
 *   astro.chart(하우스 가림)     — placeUnreliable 이면 행성 하우스 0 · 커스프 [] (리포트와 같은 가림)
 *
 * 그다음 판정은 리포트의 buildCrossRows 그대로 — 다시 판정하지 않는다. 그래서 행 · 톤 · 집계가
 * 리포트와 깊은 비교로 같다(tests/lib/report/lifeCrossCheck.parity.test.ts).
 *
 * 시각 미상(QA-2): 태양 · 달 보조 줄은 별자리만(도 · 분 없음 — 정오 앵커의 도는 거짓 정밀도). 출생일
 * 현지 00:00 과 23:59 의 달 별자리가 다르면 moonSignMayDiffer 를 세워 화면이 리포트와 같은 안내를
 * 붙이게 한다. 판정(evalNeeds)과 집계는 그대로 — 달 별자리는 정오 앵커로 남긴다(CALCULATION_SPEC §6,
 * placeMask: 행성 경도는 시각 미상이어도 날짜가 맞으면 남긴다).
 *
 * 순수 · 결정론: 시계를 읽지 않는다. now 는 호출자가 주입한다(미성년 판정 · collectSajuFacts).
 */

import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { UNKNOWN_HOUSE } from '@/lib/astrology/foundation/shared'
import { bodyLongitudeAt } from '@/lib/astrology/foundation/astrologyService'
import { logger } from '@/lib/logger'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { Lang } from '@/lib/i18n/bi'
import { buildCrossRows, type CrossRowOut } from './integratedAdapter'
import { tallyCrossRows } from './natalCross'
import type { CrossTally } from './natalCrossShared'
import type { CrossToneKey } from './toneLabel'

/** 읽는 시점 보강에 필요한 사람 정보 — 본명 컨텍스트 캐시에 없는 값들. */
export interface CrossContextFlags {
  gender: 'male' | 'female'
  /** 출생시각 미상(삼주) — 정오 앵커. */
  timeUnknown: boolean
  /** 출생지 미상 — 좌표는 출생 시간대 기준점. */
  cityUnknown: boolean
  /** 요청 경계에서 한 번 읽은 '지금' — collectSajuFacts 에 그대로 넘긴다. */
  now: Date
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 본명 컨텍스트의 입력(양력 연월일 · 앵커 시각)을 'YYYY-MM-DD' · 'HH:MM' 로. */
function natalDateTime(natal: NatalContext): { birthDate: string; birthTime: string } {
  const i = natal.input
  return {
    birthDate: `${i.year}-${pad2(i.month)}-${pad2(i.date)}`,
    birthTime: `${pad2(i.hour)}:${pad2(i.minute)}`,
  }
}

/**
 * 캘린더 본명 컨텍스트 → 리포트 교차 판정용 컨텍스트(buildReportContext 와 같은 모양).
 * 입력을 바꾸지 않고 새 객체를 돌려준다.
 */
export function toCrossContext(natal: NatalContext, flags: CrossContextFlags): NatalContext {
  const { birthDate, birthTime } = natalDateTime(natal)
  const timeUnknown = flags.timeUnknown || natal.saju.timeUnknown === true
  // buildReportContext:187-190 과 같은 호출 — 같은 입력이면 calculateSajuData 캐시를 탄다.
  const facts = collectSajuFacts({
    birthDate,
    birthTime,
    birthTimeUnknown: timeUnknown,
    gender: flags.gender,
    timezone: natal.input.timeZone,
    longitude: natal.input.longitude,
    now: flags.now,
  })
  const placeUnreliable = natal.astro.placeUnreliable === true || timeUnknown || flags.cityUnknown
  // 리포트와 같은 가림 — 미상이면 폴백 하우스로 생활영역 · angularity 를 말하지 않는다.
  const chart = placeUnreliable
    ? {
        ...natal.astro.chart,
        planets: natal.astro.chart.planets.map((p) => ({ ...p, house: UNKNOWN_HOUSE })),
        houses: [],
      }
    : natal.astro.chart

  return {
    ...natal,
    input: {
      ...natal.input,
      gender: flags.gender,
      birthTimeUnknown: timeUnknown,
      birthCityUnknown: flags.cityUnknown,
    } as NatalContext['input'],
    saju: {
      ...natal.saju,
      twelveStages: getTwelveStagesForPillars(natal.saju.pillars),
      rooted: facts.dayMaster.rooted,
      gongmang: facts.gongmang,
      johuYongsin: facts.johuYongsin,
      gwansalHonjap: facts.gwansalHonjap,
    } as NatalContext['saju'],
    astro: { ...natal.astro, chart, placeUnreliable },
  }
}

// ─── Life 표시 행 ───────────────────────────────────────────────────────────

/** Life 가 보여 주는 다섯 축(디자인 순서). 나머지 축은 전체 리포트에서. */
const LIFE_CROSS_KEYS = ['identity', 'temperament', 'relations', 'fortune', 'needs'] as const
type LifeCrossKey = (typeof LIFE_CROSS_KEYS)[number]

/** 칸 하나 — 값('Water')과 둘째 줄('fluid and permeating'). */
interface LifeCrossCell {
  text: string
  w?: string
}

/** STARS 칸 보조 줄의 본명 점 — 표시 문구는 뷰모델이 언어별로 만든다. */
export interface LifeStarPoint {
  body: 'Sun' | 'Moon' | 'Ascendant'
  /** 영문 별자리 키('Aries'). */
  sign: string
  /** 별자리 안 도 · 분 — 출생시각 미상이면 없다(별자리만 말한다, QA-2). */
  deg?: number
  min?: number
}

export interface LifeCrossRow {
  key: LifeCrossKey
  /** 축 이름('Identity' / '정체성') — 리포트 행의 category. */
  axis: string
  verdict: CrossToneKey
  saju?: LifeCrossCell
  stars?: LifeCrossCell
  /** 칸이 없는 축의 한 문장 요지(평가기 gist). */
  gist?: string
  /** SAJU 칸 보조 — 정체성: 일간 한자. */
  sajuSub?: { dayMaster: string }
  /** STARS 칸 보조 — 정체성: 태양(+ 상승, 시각 · 출생지 미상이면 없음), 욕망: 달. */
  starsSub?: LifeStarPoint[]
}

export interface LifeCrossCheck {
  /** 다섯 축 행(언어별 문구). 판정이 없는 축은 빠진다. */
  rows: Record<Lang, LifeCrossRow[]>
  /** 리포트와 같은 집계(tallyCrossRows — 결핍 축 제외). */
  tally: CrossTally
  /** 전체 리포트의 축 수(결핍 축 포함 — 리포트 화면이 보여 주는 행 수). */
  reportTraitCount: number
  /** 그 사람의 전체 리포트 — /integrated-report?{출생 쿼리}. */
  fullReportHref: string
  /**
   * 출생시각 미상이고 출생일(현지) 안에 달이 별자리를 바꾼다 — 화면은 '달의 별자리도 바뀔 수
   * 있어요' 안내를 붙인다(리포트 timeUnknownBody 와 같은 말). 판정은 정오 앵커 그대로.
   */
  moonSignMayDiffer?: boolean
}

/** 리포트 링크용 출생 정보 — 로더의 본명 가드(guard.birth)와 같은 값. */
export interface ReportBirthRef {
  birthDate: string
  /** 계산 앵커 'HH:MM' — 시간 미상이면 쿼리에 싣지 않는다. */
  birthTime: string
  timeUnknown: boolean
  cityUnknown: boolean
  latitude: number
  longitude: number
  timeZone: string
  gender: 'male' | 'female'
  /** 실제 출생지 이름(기본값 · '미입력' 아님). 없으면 쿼리에 싣지 않는다. */
  place?: string
}

/**
 * 리포트 출생 쿼리 — buildReportBirthQuery(lib/birth/storage, 클라이언트 전용)와 같은 규약:
 * lang · date · time(미상이면 생략) · tu(1|0) · lat/lng(출생지 미상이면 생략) · tz · gender · place.
 * 이름은 싣지 않는다(리포트 기본값).
 */
export function reportBirthQuery(b: ReportBirthRef, lang: Lang): string {
  const p = new URLSearchParams()
  p.set('lang', lang)
  p.set('date', b.birthDate)
  if (!b.timeUnknown) p.set('time', b.birthTime)
  p.set('tu', b.timeUnknown ? '1' : '0')
  if (!b.cityUnknown) {
    p.set('lat', String(b.latitude))
    p.set('lng', String(b.longitude))
  }
  if (b.timeZone) p.set('tz', b.timeZone)
  p.set('gender', b.gender)
  if (b.place) p.set('place', b.place)
  return p.toString()
}

/** 평가기 칸 문구('Water · fluid and permeating') → 값 · 둘째 줄. toTraitRow 와 같은 규칙. */
function cellOf(s: string | undefined): LifeCrossCell | undefined {
  if (!s) return undefined
  const i = s.indexOf(' · ')
  return i < 0 ? { text: s } : { text: s.slice(0, i), w: s.slice(i + 3) }
}

function pointOf(
  body: LifeStarPoint['body'],
  p: { sign?: string; degree?: number; minute?: number } | undefined,
  signOnly = false
): LifeStarPoint | null {
  if (!p?.sign || typeof p.degree !== 'number' || typeof p.minute !== 'number') return null
  // 시각 미상 — 정오 앵커의 도 · 분은 말하지 않는다(달은 하루 ±6°, 태양도 ±30′).
  if (signOnly) return { body, sign: p.sign }
  return { body, sign: p.sign, deg: p.degree, min: p.minute }
}

const signIndex = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30)

/**
 * 출생일(본명 컨텍스트의 양력 날짜 · 출생 시간대) 현지 00:00 과 23:59 에 달의 별자리가 다른가 —
 * 본명 차트와 같은 천체력 경로(bodyLongitudeAt). 계산이 안 되면 undefined(안내를 붙이지 않는다).
 */
export function moonChangesSignOnBirthDay(natal: NatalContext): boolean | undefined {
  const { year, month, date, latitude, longitude, timeZone } = natal.input
  const moonSignAt = (hour: number, minute: number) =>
    signIndex(
      bodyLongitudeAt({ year, month, date, hour, minute, latitude, longitude, timeZone }, 'Moon')
    )
  try {
    return moonSignAt(0, 0) !== moonSignAt(23, 59)
  } catch (err) {
    logger.warn('[lifeCrossCheck] moon day-range check unavailable — no caveat', err)
    return undefined
  }
}

function lifeRows(
  rows: CrossRowOut[],
  subs: { dayMaster: string; identity: LifeStarPoint[]; needs: LifeStarPoint[] }
): LifeCrossRow[] {
  const out: LifeCrossRow[] = []
  for (const key of LIFE_CROSS_KEYS) {
    const r = rows.find((x) => x.key === key)
    if (!r) continue
    const saju = cellOf(r.left)
    const stars = cellOf(r.right)
    const row: LifeCrossRow = { key, axis: r.category, verdict: r.tone }
    if (saju) row.saju = saju
    if (stars) row.stars = stars
    if (!saju && !stars && r.gist) row.gist = r.gist
    if (key === 'identity') {
      if (subs.dayMaster) row.sajuSub = { dayMaster: subs.dayMaster }
      if (subs.identity.length) row.starsSub = subs.identity
    }
    if (key === 'needs' && subs.needs.length) row.starsSub = subs.needs
    out.push(row)
  }
  return out
}

export interface BuildLifeCrossCheckOptions extends CrossContextFlags {
  /** 페이지 언어 — 리포트 링크의 lang. */
  lang: Lang
  /** 로더의 본명(guard.birth) + 실제 출생지. 없으면 본명 컨텍스트 입력에서 만든다. */
  birth?: ReportBirthRef
}

/**
 * 인생 흐름의 축별 교차 — 리포트와 같은 판정(buildCrossRows)에서 다섯 축 · 집계 · 리포트 링크.
 */
export function buildLifeCrossCheck(
  natal: NatalContext,
  opts: BuildLifeCrossCheckOptions
): LifeCrossCheck {
  const ctx = toCrossContext(natal, opts)
  const ko = buildCrossRows(ctx, 'ko', opts.now).rows
  const en = buildCrossRows(ctx, 'en', opts.now).rows

  const chart = ctx.astro.chart
  const placeUnreliable = ctx.astro.placeUnreliable === true
  // toCrossContext 와 같은 판정 — 출생시각 미상(호출자 플래그 또는 본명의 삼주).
  const timeUnknown = opts.timeUnknown || natal.saju.timeUnknown === true
  const sun = pointOf(
    'Sun',
    chart.planets.find((p) => p.name === 'Sun'),
    timeUnknown
  )
  const moon = pointOf(
    'Moon',
    chart.planets.find((p) => p.name === 'Moon'),
    timeUnknown
  )
  // 상승궁은 출생시각 · 출생지를 알 때만 — 교차 판정(buildCrossRows)과 같은 가림.
  const asc = placeUnreliable ? null : pointOf('Ascendant', chart.ascendant)
  const subs = {
    dayMaster: natal.saju.dayMaster?.name ?? '',
    identity: [sun, asc].filter((p): p is LifeStarPoint => p !== null),
    needs: moon ? [moon] : [],
  }

  const { birthDate, birthTime } = natalDateTime(natal)
  const birth: ReportBirthRef = opts.birth ?? {
    birthDate,
    birthTime,
    timeUnknown: opts.timeUnknown,
    cityUnknown: opts.cityUnknown,
    latitude: natal.input.latitude,
    longitude: natal.input.longitude,
    timeZone: natal.input.timeZone,
    gender: opts.gender,
  }

  const out: LifeCrossCheck = {
    rows: { ko: lifeRows(ko, subs), en: lifeRows(en, subs) },
    tally: tallyCrossRows(en),
    reportTraitCount: en.length,
    fullReportHref: `/integrated-report?${reportBirthQuery(birth, opts.lang)}`,
  }
  if (timeUnknown && moon && moonChangesSignOnBirthDay(natal) === true) {
    out.moonSignMayDiffer = true
  }
  return out
}
