/**
 * Profection + ZR + SR + 세운 → destinypal `year` 객체 adapter.
 *
 * destinypal year:
 *   { year, sewoon, sewoonSibsin, headline, headlineEn,
 *     profection: { house, theme, themeEn, cusp, cuspEn, ruler, rulerEn, rulerNatal, rulerNatalEn },
 *     sajuNote, sajuNoteEn, astroNote, astroNoteEn }
 *
 * 입력:
 *   - NatalContext (대운 + 일간 → 세운 십신)
 *   - yearly 레이어 ActiveSignal 풀 (profection + zodiacal-releasing + solar-return)
 *   - 옵션 헤드라인/노트
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'
import { toGanji, type Ganji, SIGN_KO, PLANET_KO, computeSewoonGanji } from './shared'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { plainPairName } from '@/lib/calendar-engine/derivers/plainLanguage'
import { ordinalEn } from '@/lib/calendar-engine/ordinal'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { AstroPlanetName } from '@/lib/astrology/interpretations'
import type { DestinyProfectionWheelSlice, DestinyDecadeZRChapter } from '@/types/calendar'
import type { ZRPeriod, ZRStartLot } from '@/lib/astrology/foundation/zodiacalReleasing'

export interface DestinypalYearProfection {
  house: number // 1..12
  theme: string
  themeEn: string
  cusp: string // 한글 사인
  cuspEn: ZodiacKo // 영문 사인
  ruler: string // 한글 행성
  rulerEn: AstroPlanetName
  rulerNatal: string // "1궁 (물병자리)"
  rulerNatalEn: string
  /** 본명 룰러 하우스. */
  rulerNatalHouse: number
  /** 본명 룰러 sign. */
  rulerNatalSign: ZodiacKo
}

export interface DestinypalYearZRChapter {
  level: 'L1' | 'L2'
  sign: string // 한글
  signEn: string
  ruler: string // 한글
  rulerEn: string
  duration: string // "~10년 1개월" 등
}

export interface DestinypalYearSewoon {
  gz: Ganji
  sibsin: string
  score?: number
}

/**
 * 한 tier 공용 "교차" 항목 — 사주 × 점성 동시 활성 페어 한 줄.
 *  when   : 활성 구간 표시 ('3–7월' / '연중' / '지금' 등)
 *  title  : 페어 이름 ('정재 × 금성')
 *  detail : 근거 해석 한 줄 (mapping.meaning.ko)
 *  tone   : 길/흉/중립 — UI 색.
 */
export interface DestinypalCrossItem {
  when: string
  whenEn: string
  title: string
  titleEn: string
  detail?: string
  detailEn?: string
  tone: 'good' | 'caution' | 'neutral'
}

export interface DestinypalYear {
  year: number
  sewoon: DestinypalYearSewoon
  /** sewoon alias — destinypal DestinyYear.sewoonGz 와 호환. */
  sewoonGz: Ganji
  sewoonSibsin: string // 세운 천간 vs 일간 십신
  headline: string
  headlineEn: string
  profection?: DestinypalYearProfection
  /**
   * 12-슬롯 profection wheel — Asc sign 부터 whole-sign 순서로 1..12궁 cusp + ruler.
   * profection 활성 하우스만 `active=true`.
   */
  profectionWheel: DestinyProfectionWheelSlice[]
  /** ZR 챕터 (L1 + L2) Phase 3 신규 */
  zr?: { l1?: DestinypalYearZRChapter; l2?: DestinypalYearZRChapter }
  /** Solar Return Asc sign — Phase 3 신규 */
  solarReturnAsc?: { sign: string; signEn: string }
  sajuNote: string
  sajuNoteEn: string
  astroNote: string
  astroNoteEn: string
  /** 12개월 점수 스파인 (선택 — cells 또는 monthlyScores 옵션이 들어오면). */
  monthlyScores?: Array<{ month: number; score: number; bestDay?: string }>
  /** 올해 활성 사주 × 점성 교차 — 월 구간 해석 (cells 가 들어오면 자동 산출). */
  crossings: DestinypalCrossItem[]
  /** 이번 해 활성 ZR Spirit 챕터. (natal.zodiacalReleasing.spirit 에서 자동 산출). */
  zrSpiritChapters: DestinyDecadeZRChapter[]
  /** 이번 해 활성 ZR Fortune 챕터. */
  zrFortuneChapters: DestinyDecadeZRChapter[]
}

const PROFECTION_THEMES: Record<number, { theme: string; themeEn: string }> = {
  1: { theme: '자기상 · 시작', themeEn: 'Self · Beginnings' },
  2: { theme: '재산 · 가치', themeEn: 'Resources · Values' },
  3: { theme: '소통 · 단거리 이동', themeEn: 'Communication · Short trips' },
  4: { theme: '뿌리 · 가정', themeEn: 'Roots · Home' },
  5: { theme: '창조 · 자녀', themeEn: 'Creativity · Children' },
  6: { theme: '일·건강 · 일상 노동', themeEn: 'Work · Health' },
  7: { theme: '관계 · 파트너', themeEn: 'Partnership' },
  8: { theme: '변환 · 깊이 · 재구성', themeEn: 'Transformation · Depth · Rebuild' },
  9: { theme: '확장 · 멀리 가기', themeEn: 'Expansion · Far journeys' },
  10: { theme: '소명 · 사회적 자리', themeEn: 'Vocation · Status' },
  11: { theme: '집단 · 친구', themeEn: 'Community · Friends' },
  12: { theme: '뒤편 · 정리', themeEn: 'Hidden things · Release' },
}

const ZR_RULERS: Record<ZodiacKo, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

// Hellenistic 정통 sign ruler — profection wheel 12 슬롯의 cusp ruler 룩업.
const SIGN_RULER: Record<ZodiacKo, AstroPlanetName> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
const ZR_DURATION_KO: Record<ZodiacKo, string> = {
  // Spirit/Fortune 공통 — sign-walk 기본 연수
  Cancer: '25년',
  Leo: '19년',
  Virgo: '20년',
  Libra: '8년',
  Scorpio: '15년',
  Sagittarius: '12년',
  Capricorn: '27년',
  Aquarius: '30년',
  Pisces: '12년',
  Aries: '15년',
  Taurus: '8년',
  Gemini: '20년',
}

export interface ToYearOptions {
  /** 대상 연도 (보통 currentYear). */
  year: number
  /** 본명 + 현재 시점 yearly 레이어 ActiveSignal (profection / zodiacal-releasing / solar-return). */
  yearlySignals?: ActiveSignal[]
  /** 헤드라인 한 줄 (선택). */
  headline?: string
  /** 헤드라인 영문 한 줄 (선택). */
  headlineEn?: string
  /** 사주 / 점성 노트 한 줄 (선택). */
  sajuNote?: string
  sajuNoteEn?: string
  astroNote?: string
  astroNoteEn?: string
  /**
   * 한 해 12 달 cells 전체 (또는 일부) — adapter 가 datetime prefix 로 month
   * grouping 해 monthlyScores 12 슬롯 평균을 자동으로 빌드.
   * 없으면 monthlyScores 빈 배열.
   */
  cells?: CalendarCell[]
  /** 미지정 시 평균 score 계산 — fallback 빈 슬롯 점수. */
  monthlyFallbackScore?: number
  /**
   * 월별 점수 — 월운(monthly) 층 신호로 산출(deriveLayeredScores.monthly).
   * 주어지면 12 스파인을 이 값으로 (각 달을 그 달 고유 에너지로 판단). key: 1~12.
   */
  monthlyLayer?: Map<number, { score: number }>
}

export function toYear(natal: NatalContext, opts: ToYearOptions): DestinypalYear {
  const dm = natal.saju?.dayMaster?.name ?? ''
  const sewoonRaw = computeSewoonGanji(opts.year)
  const sewoon = toGanji(sewoonRaw.stem, sewoonRaw.branch)
  const sewoonSibsin = dm ? safeSibsin(dm, sewoonRaw.stem) : '—'

  // Profection signal → house + ruler 추출
  const profSignal = (opts.yearlySignals ?? []).find((s) => s.kind === 'profection')
  const profection = profSignal ? extractProfection(profSignal, natal) : undefined

  // ZR signal → L1 / L2
  const zrSignals = (opts.yearlySignals ?? []).filter((s) => s.kind === 'zodiacal-releasing')
  const zr = extractZR(zrSignals)

  // Solar Return signal → SR Asc sign
  const srSignal = (opts.yearlySignals ?? []).find((s) => s.kind === 'solar-return')
  const solarReturnAsc = srSignal ? extractSRAsc(srSignal) : undefined

  // ── Profection wheel: 12 슬롯 (Asc sign 부터 whole-sign 순서) ──
  const profectionWheel = buildProfectionWheel(natal, profection?.house)

  // ── monthlyScores: cells 가 들어오면 month grouping → 평균 score ──
  const monthlyScores = buildMonthlyScores(opts)

  // ── 이번 해 활성 ZR Spirit / Fortune 챕터 ──
  const birthYear = natal.input?.year ?? opts.year
  const zrSpiritChapters = projectYearZRChapters(
    natal.astro.zodiacalReleasing.spirit?.periods,
    'Spirit',
    birthYear,
    opts.year
  )
  const zrFortuneChapters = projectYearZRChapters(
    natal.astro.zodiacalReleasing.fortune?.periods,
    'Fortune',
    birthYear,
    opts.year
  )

  return {
    year: opts.year,
    sewoon: { gz: sewoon, sibsin: sewoonSibsin },
    sewoonGz: sewoon,
    sewoonSibsin,
    headline:
      opts.headline ??
      (profection
        ? `올해의 무게중심은 ${profection.house}번째 영역으로 기울어요.`
        : `${opts.year}년 — 흐름이 새로 짜이는 해.`),
    headlineEn:
      opts.headlineEn ??
      (profection
        ? `This year leans toward your ${ordinalEn(profection.house)} house.`
        : `${opts.year} — a year the flow gets re-drawn.`),
    profection,
    profectionWheel,
    zr,
    solarReturnAsc,
    sajuNote:
      opts.sajuNote ??
      `세운 ${sewoonRaw.stem}${sewoonRaw.branch} — 일간 ${dm} 기준 ${sewoonSibsin}.`,
    sajuNoteEn:
      opts.sajuNoteEn ??
      `Annual pillar ${sewoonRaw.stem}${sewoonRaw.branch} — ${sewoonSibsin} to day master ${dm}.`,
    astroNote:
      opts.astroNote ??
      (profection
        ? `Profection이 ${profection.house}하우스를 점등 — 룰러 ${profection.ruler}가 본명 ${profection.rulerNatal}.`
        : ''),
    astroNoteEn:
      opts.astroNoteEn ??
      (profection
        ? `Profection lights up house ${profection.house} — its ruler ${profection.rulerEn} sits in your natal ${profection.rulerNatalEn}.`
        : ''),
    monthlyScores,
    crossings: buildYearCrossings(opts.cells ?? [], opts.year),
    zrSpiritChapters,
    zrFortuneChapters,
  }
}

/**
 * 올해 cells 에서 사주 × 점성 교차(cross-activation) 신호를 모아 월 구간으로 압축.
 * yearly/monthly 층(= 해·달 스케일) 교차만 — 일 교차는 월 tier 담당.
 * 같은 페어가 여러 날 반복되므로 이름으로 dedup 하고 활성 창을 합쳐 가장 넓은
 * 구간을 그 페어의 '언제'로 쓴다.
 */
function buildYearCrossings(cells: CalendarCell[], year: number): DestinypalCrossItem[] {
  const yStart = Date.UTC(year, 0, 1)
  const yEnd = Date.UTC(year, 11, 31, 23, 59, 59)
  const agg = new Map<
    string,
    {
      title: string
      titleEn: string
      korean?: string
      english?: string
      polarity: number
      start: number
      end: number
    }
  >()
  for (const c of cells) {
    for (const s of c.signals) {
      if (s.kind !== 'cross-activation') continue
      if (s.layer !== 'yearly' && s.layer !== 'monthly') continue
      const st = Date.parse(s.active.start)
      const en = Date.parse(s.active.end)
      if (Number.isNaN(st) || Number.isNaN(en)) continue
      const cur = agg.get(s.name)
      if (!cur) {
        // 제목은 쉬운말 — "정관 × 토성" → "일·책임 × 책임·인내" (페어가 아니면 원문).
        agg.set(s.name, {
          title: plainPairName(s.name, true),
          titleEn: plainPairName(s.name, false),
          korean: s.korean,
          english: s.english,
          polarity: s.polarity,
          start: st,
          end: en,
        })
      } else {
        if (st < cur.start) cur.start = st
        if (en > cur.end) cur.end = en
        if (Math.abs(s.polarity) > Math.abs(cur.polarity)) cur.polarity = s.polarity
        if (!cur.korean && s.korean) cur.korean = s.korean
        if (!cur.english && s.english) cur.english = s.english
      }
    }
  }

  const monthOf = (ms: number) => new Date(Math.min(Math.max(ms, yStart), yEnd)).getUTCMonth() + 1
  const MABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const whenLabel = (sMs: number, eMs: number) => {
    const sM = monthOf(sMs)
    const eM = monthOf(eMs)
    if (eM - sM >= 10) return '연중'
    if (sM === eM) return `${sM}월`
    return `${sM}–${eM}월`
  }
  const whenLabelEn = (sMs: number, eMs: number) => {
    const sM = monthOf(sMs)
    const eM = monthOf(eMs)
    if (eM - sM >= 10) return 'year-round'
    if (sM === eM) return MABBR[sM - 1]
    return `${MABBR[sM - 1]}–${MABBR[eM - 1]}`
  }

  const enriched = [...agg.values()].map((v) => {
    const when = whenLabel(v.start, v.end)
    return {
      when,
      whenEn: whenLabelEn(v.start, v.end),
      title: v.title,
      titleEn: v.titleEn,
      detail: v.korean,
      detailEn: v.english,
      tone: (v.polarity > 0 ? 'good' : v.polarity < 0 ? 'caution' : 'neutral') as
        | 'good'
        | 'caution'
        | 'neutral',
      sortStart: Math.min(Math.max(v.start, yStart), yEnd),
      abs: Math.abs(v.polarity),
      yearLong: when === '연중',
    }
  })

  // '연중'(1년 내내) 교차가 다수면 화면이 안 읽힌다 → 특정 시기(월 구간) 교차를
  // 먼저 시간순으로, 연중 배경은 의미 강한 것 위주로 최대 5개만(중립 제외).
  // 같은 행성이 여러 십신과 겹쳐 도배되지 않게 행성당 최대 2줄 (예: ×목성 3연속 방지).
  const dated = enriched.filter((e) => !e.yearLong).sort((a, b) => a.sortStart - b.sortStart)
  const planetOf = (t: string) => t.split('×')[1]?.trim() ?? t
  const perPlanet = new Map<string, number>()
  const yearLong = enriched
    .filter((e) => e.yearLong && e.abs > 0)
    .sort((a, b) => b.abs - a.abs)
    .filter((e) => {
      const p = planetOf(e.title)
      const n = perPlanet.get(p) ?? 0
      if (n >= 2) return false
      perPlanet.set(p, n + 1)
      return true
    })
    .slice(0, 5)
  return [...dated, ...yearLong].map(
    ({ when, whenEn, title, titleEn, detail, detailEn, tone }) => ({
      when,
      whenEn,
      title,
      titleEn,
      detail,
      detailEn,
      tone,
    })
  )
}

/**
 * Profection wheel 12 슬롯 빌드 — whole-sign 기준.
 *
 *  1궁 = 본명 Asc sign (없으면 Aries fallback)
 *  2궁 = Asc sign + 1 (황도 순)
 *  ...
 *  12궁 = Asc sign + 11
 *
 * 각 슬롯의 ruler = SIGN_RULER[cusp sign] (Hellenistic 정통).
 * natalPlanets = 그 sign 에 위치한 본명 행성 이름들.
 * active = activeHouse (profection.house) 와 일치하는 슬롯.
 */
function buildProfectionWheel(
  natal: NatalContext,
  activeHouse: number | undefined
): DestinyProfectionWheelSlice[] {
  const ascSign: ZodiacKo = natal.astro.chart.ascendant?.sign ?? 'Aries'
  const ascIdx = ZODIAC_ORDER.indexOf(ascSign)
  const planets = natal.astro.chart.planets ?? []

  const wheel: DestinyProfectionWheelSlice[] = []
  for (let h = 1; h <= 12; h++) {
    const signIdx = (ascIdx + (h - 1)) % 12
    const cuspSign = ZODIAC_ORDER[signIdx]
    const cuspRuler = SIGN_RULER[cuspSign]
    // 그 sign 에 들어있는 본명 행성들
    const natalPlanets = planets.filter((p) => p.sign === cuspSign).map((p) => p.name)
    wheel.push({
      house: h,
      cuspSign,
      cuspRuler,
      natalPlanets,
      active: activeHouse === h,
    })
  }
  return wheel
}

/**
 * cells 가 들어오면 datetime prefix `YYYY-MM` 으로 month grouping 해 평균
 * derivedScore 를 12 슬롯 배열로 환원. cells 가 없으면 빈 배열.
 */
function buildMonthlyScores(opts: ToYearOptions): DestinypalYear['monthlyScores'] {
  // 월운 층 점수 우선 — 각 달을 그 달 고유(월운) 신호로 판단.
  if (opts.monthlyLayer) {
    const best = (m: number) => {
      const yPrefix = String(opts.year)
      const ym = `${yPrefix}-${String(m).padStart(2, '0')}`
      const mc = (opts.cells ?? []).filter((c) => c.datetime.slice(0, 7) === ym)
      return mc.length
        ? mc.reduce((a, b) => (b.derivedScore > a.derivedScore ? b : a)).datetime.slice(0, 10)
        : undefined
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      score: opts.monthlyLayer!.get(i + 1)?.score ?? opts.monthlyFallbackScore ?? 50,
      bestDay: best(i + 1),
    }))
  }
  if (!opts.cells || opts.cells.length === 0) return []
  const yPrefix = String(opts.year)
  const fallback = opts.monthlyFallbackScore ?? 50
  // 연간 스파인은 "어느 달에 큰 일이 몰리나" = 월별 최대 salience(현저도=희소×중요).
  // derivedScore 평균(우호도)은 차트별 중심 쏠림으로 변별이 약해 salience 로 대체.
  const peaks = Array.from({ length: 12 }, (_, i) => {
    const ym = `${yPrefix}-${String(i + 1).padStart(2, '0')}`
    const monthCells = opts.cells!.filter((c) => c.datetime.slice(0, 7) === ym)
    const peak = monthCells.length ? Math.max(...monthCells.map((c) => c.salience ?? 0)) : null
    // 그 달 최고 우호 날짜(여전히 유용 — bestDay 칩).
    const best = monthCells.length
      ? monthCells.reduce((a, b) => (b.derivedScore > a.derivedScore ? b : a))
      : null
    return { month: i + 1, peak, bestDay: best?.datetime.slice(0, 10) }
  })
  const valid = peaks.map((p) => p.peak).filter((n): n is number => n != null)
  const lo = valid.length ? Math.min(...valid) : 0
  const hi = valid.length ? Math.max(...valid) : 1
  const norm = (v: number) => (hi > lo ? Math.round(((v - lo) / (hi - lo)) * 100) : 50)
  return peaks.map((p) => ({
    month: p.month,
    score: p.peak == null ? fallback : norm(p.peak),
    bestDay: p.bestDay,
  }))
}

/**
 * 본명 ZR L1 period 시퀀스 → 이번 해 활성 챕터(들) 만 골라 DestinyDecadeZRChapter
 * shape 으로 변환. 같은 해에 챕터 경계가 걸치면 둘 다 포함.
 */
function projectYearZRChapters(
  periods: ZRPeriod[] | undefined,
  startLot: ZRStartLot,
  birthYear: number,
  currentYear: number
): DestinyDecadeZRChapter[] {
  if (!periods || periods.length === 0) return []
  const out: DestinyDecadeZRChapter[] = []
  for (const p of periods) {
    const calStart = birthYear + Math.round(p.startYear)
    const calEnd = birthYear + Math.round(p.endYear)
    // 이번 해와 겹치는 챕터만
    if (calEnd <= currentYear) continue
    if (calStart > currentYear) break
    out.push({
      ...p,
      startLot,
      calendarStartYear: calStart,
      calendarEndYear: calEnd,
      now: currentYear >= calStart && currentYear < calEnd,
    })
  }
  return out
}

function safeSibsin(dm: string, stem: string): string {
  try {
    return getSibsinKo(dm, stem) || '—'
  } catch {
    return '—'
  }
}

function extractProfection(
  s: ActiveSignal,
  natal: NatalContext
): DestinypalYearProfection | undefined {
  const houses = s.evidence?.houses
  const planets = s.evidence?.planets
  const detail = s.evidence?.detail ?? {}
  const house = (houses?.[0] as number | undefined) ?? Number(detail.activatedHouse)
  if (!house) return undefined
  const ruler = planets?.[0] ?? String(detail.lordOfYear ?? '')
  const cuspSign = String(detail.activatedSign ?? '') as ZodiacKo

  const theme = PROFECTION_THEMES[house] ?? { theme: '', themeEn: '' }

  // ruler natal — 본명에서 ruler 행성이 어느 하우스/사인에 있는지
  const rulerPlanet = natal.astro.chart.planets.find((p) => p.name === ruler)
  const rulerNatal = rulerPlanet
    ? `${rulerPlanet.house}궁 (${SIGN_KO[rulerPlanet.sign] ?? rulerPlanet.sign})`
    : ''
  const rulerNatalEn = rulerPlanet
    ? `${ordinalEn(rulerPlanet.house)} house · ${rulerPlanet.sign}`
    : ''

  return {
    house,
    theme: theme.theme,
    themeEn: theme.themeEn,
    cusp: cuspSign ? (SIGN_KO[cuspSign] ?? cuspSign) : '',
    cuspEn: (cuspSign || 'Aries') as ZodiacKo,
    ruler: PLANET_KO[ruler] ?? ruler,
    rulerEn: (ruler || 'Sun') as AstroPlanetName,
    rulerNatal,
    rulerNatalEn,
    rulerNatalHouse: rulerPlanet?.house ?? 0,
    rulerNatalSign: (rulerPlanet?.sign ?? 'Aries') as ZodiacKo,
  }
}

function extractZR(signals: ActiveSignal[]): DestinypalYear['zr'] {
  if (signals.length === 0) return undefined
  // ZR signal name 형식은 extractor 마다 다를 수 있으나 evidence.detail.level 가 보통 'L1'/'L2'.
  const result: { l1?: DestinypalYearZRChapter; l2?: DestinypalYearZRChapter } = {}
  for (const s of signals) {
    const detail = s.evidence?.detail ?? {}
    const level = (detail.level as 'L1' | 'L2' | undefined) ?? 'L1'
    const signEn =
      (detail.sign as ZodiacKo | undefined) ?? (s.evidence?.planets?.[0] as ZodiacKo | undefined)
    if (!signEn) continue
    const ruler = ZR_RULERS[signEn]
    const duration = ZR_DURATION_KO[signEn] ?? ''
    const chapter: DestinypalYearZRChapter = {
      level,
      sign: SIGN_KO[signEn] ?? signEn,
      signEn,
      ruler: PLANET_KO[ruler] ?? ruler,
      rulerEn: ruler,
      duration,
    }
    if (level === 'L1') result.l1 = chapter
    else result.l2 = chapter
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function extractSRAsc(s: ActiveSignal): DestinypalYear['solarReturnAsc'] {
  const detail = s.evidence?.detail ?? {}
  const sign =
    (detail.ascendantSign as ZodiacKo | undefined) ?? (detail.asc as ZodiacKo | undefined)
  if (!sign) return undefined
  return { sign: SIGN_KO[sign] ?? sign, signEn: sign }
}
