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
import { ganjiToKorean, ganjiToRoman, STEM_KO } from '@/lib/saju/ganjiKo'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { plainPairName } from '@/lib/calendar-engine/derivers/plainLanguage'
import { ordinalEn } from '@/lib/calendar-engine/ordinal'
import { getHouseRich, type HouseNumber } from '@/lib/chart-dictionary'
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
  /**
   * 활성 하우스의 평이한 풀이 한 문단 — astro-house-rich.json `meaning` 에서.
   * 2단어 암호 테마(theme) 를 novice 가 읽히는 진짜 설명으로 풀어 주는 hero 보조줄.
   * 누락/null 이면 빈 문자열 → 컴포넌트는 theme 로 폴백.
   */
  houseMeaning: string
  houseMeaningEn: string
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

export const PROFECTION_THEMES: Record<number, { theme: string; themeEn: string }> = {
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
   * 일진층 일점수(deriveLayeredScores.daily) — key: "YYYY-MM-DD". 세운 12달 띠와
   * 월 티어가 *같은 일점수*로 칠해지도록(척도 일치) monthlyScores 를 이 값으로 빌드.
   * 각 달 score = 그 달 일점수 평균, bestDay = 그 달 일점수 최고일. 없으면
   * cell.derivedScore 폴백.
   */
  dayScores?: Map<string, { score: number }>
  /**
   * 현재 세운 연주(입춘 기준 활성 간지). 주면 이 값으로 세운 칩을 표기하고,
   * 없으면 computeSewoonGanji(year) 그레고리 근사로 폴백(하위호환). 세운은 1/1 이
   * 아니라 입춘에 바뀌므로, 1/1~입춘 구간엔 이 SSOT 값이 그레고리 근사와 달라진다.
   */
  sewoonPillar?: { stem: string; branch: string }
}

export function toYear(natal: NatalContext, opts: ToYearOptions): DestinypalYear {
  const dm = natal.saju?.dayMaster?.name ?? ''
  const sewoonRaw = opts.sewoonPillar ?? computeSewoonGanji(opts.year)
  const sewoon = toGanji(sewoonRaw.stem, sewoonRaw.branch)
  const sewoonSibsin = dm ? safeSibsin(dm, sewoonRaw.stem) : '—'

  // Profection signal → house + ruler 추출
  const profSignal = (opts.yearlySignals ?? []).find((s) => s.kind === 'profection')
  const profection = profSignal ? extractProfection(profSignal, natal) : undefined

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
    sajuNote:
      opts.sajuNote ??
      `올해 세운은 ${ganjiToKorean(`${sewoonRaw.stem}${sewoonRaw.branch}`)}이고, 일간 ${STEM_KO[dm] ?? dm}을 기준으로 보면 ${sewoonSibsin}에 해당해요.`,
    sajuNoteEn:
      opts.sajuNoteEn ??
      `This year's pillar is ${ganjiToRoman(sewoonRaw.stem, sewoonRaw.branch)} — it reads as ${SIBSIN_EN[sewoonSibsin] ?? sewoonSibsin} to your day master.`,
    astroNote:
      opts.astroNote ??
      (profection
        ? profection.rulerNatal
          ? `올해 무대인 ${profection.house}하우스를 이끄는 별은 ${profection.ruler}이에요. 본명에서는 ${profection.rulerNatal}에 자리해요.`
          : `올해 무대인 ${profection.house}하우스를 이끄는 별은 ${profection.ruler}이에요.`
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
 * 세운 12달 띠 — 각 달 score = 그 달 *일점수 평균*. 월 그리드가 칠해지는 바로 그
 * 일점수(deriveLayeredScores.daily)를 달 단위로 평균내, 세운(1년)→월 줌인 시 띠 색과
 * 그리드 색이 *구조적으로* 일치한다(이전엔 띠=월운층, 그리드=일진층이라 ~50% 어긋남).
 *
 * 척도 분리(Option Y): 일·월·세운12달은 모두 '기간 내 상대'(일진 분포 정규화)로 한 축에
 * 두고, 대운·인생만 '인생 절대'(곡선 백분위)를 쓴다 — 줌 레벨끼리 같은 척도라 모순 없음.
 *
 * - 같은 날 여러 cell(시진 등)이 있어도 날짜로 묶어 하루당 1점(중복 가중 방지).
 * - bestDay = 그 달 일점수 최고일(월 티어와 같은 점수 → 연·월 bestDay 일치, 감사 C1).
 * - cells 없으면 빈 배열. 점수 없는 달은 fallback.
 * - 결정론: 순수 산술. 클록·랜덤 없음.
 */
function buildMonthlyScores(opts: ToYearOptions): DestinypalYear['monthlyScores'] {
  if (!opts.cells || opts.cells.length === 0) return []
  const dayScore = (c: CalendarCell) =>
    opts.dayScores?.get(c.datetime.slice(0, 10))?.score ?? c.derivedScore
  const yPrefix = String(opts.year)
  const fallback = opts.monthlyFallbackScore ?? 50
  return Array.from({ length: 12 }, (_, i) => {
    const ym = `${yPrefix}-${String(i + 1).padStart(2, '0')}`
    // 하루당 1점으로 묶기(같은 날 첫 cell 점수). datetime 정렬 가정 없이 first-wins.
    const byDay = new Map<string, number>()
    for (const c of opts.cells!) {
      if (c.datetime.slice(0, 7) !== ym) continue
      const d = c.datetime.slice(0, 10)
      if (!byDay.has(d)) byDay.set(d, dayScore(c))
    }
    if (byDay.size === 0) return { month: i + 1, score: fallback, bestDay: undefined }
    let sum = 0
    let bestDay: string | undefined
    let bestScore = -Infinity
    for (const [d, s] of byDay) {
      sum += s
      if (s > bestScore) {
        bestScore = s
        bestDay = d
      }
    }
    return { month: i + 1, score: Math.round(sum / byDay.size), bestDay }
  })
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

  // 활성 하우스의 평이한 풀이 한 문단 (리포트 전용 DB → 캘린더 hero 로 surface).
  // house 는 1..12 정수. getHouseRich 키는 "1".."12". 범위 밖이면 가드로 빈 문자열.
  const inRange = house >= 1 && house <= 12
  const houseMeaning = inRange ? (getHouseRich(house as HouseNumber, 'ko')?.meaning ?? '') : ''
  const houseMeaningEn = inRange ? (getHouseRich(house as HouseNumber, 'en')?.meaning ?? '') : ''

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
    houseMeaning,
    houseMeaningEn,
  }
}
