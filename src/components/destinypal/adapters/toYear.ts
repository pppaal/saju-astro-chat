/**
 * Profection + ZR + SR + 세운 → destinypal `year` 객체 adapter.
 *
 * destinypal year:
 *   { year, sewoon, sewoonSibsin, headline,
 *     profection: { house, theme, themeEn, cusp, cuspEn, ruler, rulerEn, rulerNatal, rulerNatalEn },
 *     sajuNote, astroNote }
 *
 * 입력:
 *   - NatalContext (대운 + 일간 → 세운 십신)
 *   - yearly 레이어 ActiveSignal 풀 (profection + zodiacal-releasing + solar-return)
 *   - 옵션 헤드라인/노트
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ActiveSignal } from '@/lib/calendar-engine/types'
import { toGanji, type Ganji, SIGN_KO, PLANET_KO } from './shared'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'

export interface DestinypalYearProfection {
  house: number // 1..12
  theme: string
  themeEn: string
  cusp: string // 한글 사인
  cuspEn: string // 영문 사인
  ruler: string // 한글 행성
  rulerEn: string
  rulerNatal: string // "1궁 (물병자리)"
  rulerNatalEn: string
}

export interface DestinypalYearZRChapter {
  level: 'L1' | 'L2'
  sign: string // 한글
  signEn: string
  ruler: string // 한글
  rulerEn: string
  duration: string // "~10년 1개월" 등
}

export interface DestinypalYear {
  year: number
  sewoon: Ganji
  sewoonSibsin: string // 세운 천간 vs 일간 십신
  headline: string
  profection?: DestinypalYearProfection
  /** ZR 챕터 (L1 + L2) Phase 3 신규 */
  zr?: { l1?: DestinypalYearZRChapter; l2?: DestinypalYearZRChapter }
  /** Solar Return Asc sign — Phase 3 신규 */
  solarReturnAsc?: { sign: string; signEn: string }
  sajuNote: string
  astroNote: string
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
const ZR_DURATION_KO: Record<ZodiacKo, string> = {
  // Spirit/Fortune 공통 — sign-walk 기본 연수
  Cancer: '25년', Leo: '19년', Virgo: '20년', Libra: '8년',
  Scorpio: '15년', Sagittarius: '12년', Capricorn: '27년', Aquarius: '30년',
  Pisces: '12년', Aries: '15년', Taurus: '8년', Gemini: '20년',
}

export interface ToYearOptions {
  /** 대상 연도 (보통 currentYear). */
  year: number
  /** 본명 + 현재 시점 yearly 레이어 ActiveSignal (profection / zodiacal-releasing / solar-return). */
  yearlySignals?: ActiveSignal[]
  /** 헤드라인 한 줄 (선택). */
  headline?: string
  /** 사주 / 점성 노트 한 줄 (선택). */
  sajuNote?: string
  astroNote?: string
}

/**
 * 세운 ganji 계산 — birth dayMaster 와 birth year ganji 베이스 + 연도 차이.
 * 정확한 세운(立春 경계)는 데이터 측에서 따로 들어와야 함; 여기선 보정 없는 60갑자 shift.
 *
 * birthYearStem/Branch 가 없으면 fallback: target year 의 60갑자(1984=甲子 기준)로 계산.
 */
function computeSewoonGanji(year: number): { stem: string; branch: string } {
  // 1984년 = 甲子 (인덱스 0). (year - 1984) 만큼 shift.
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const offset = year - 1984
  const sIdx = ((offset % 10) + 10) % 10
  const bIdx = ((offset % 12) + 12) % 12
  return { stem: STEMS[sIdx], branch: BRANCHES[bIdx] }
}

export function toYear(
  natal: NatalContext,
  opts: ToYearOptions,
): DestinypalYear {
  const dm = natal.saju?.dayMaster?.name ?? ''
  const sewoonRaw = computeSewoonGanji(opts.year)
  const sewoon = toGanji(sewoonRaw.stem, sewoonRaw.branch)
  const sewoonSibsin = dm ? safeSibsin(dm, sewoonRaw.stem) : '—'

  // Profection signal → house + ruler 추출
  const profSignal = (opts.yearlySignals ?? []).find(
    (s) => s.kind === 'profection',
  )
  const profection = profSignal ? extractProfection(profSignal, natal) : undefined

  // ZR signal → L1 / L2
  const zrSignals = (opts.yearlySignals ?? []).filter((s) => s.kind === 'zodiacal-releasing')
  const zr = extractZR(zrSignals)

  // Solar Return signal → SR Asc sign
  const srSignal = (opts.yearlySignals ?? []).find((s) => s.kind === 'solar-return')
  const solarReturnAsc = srSignal ? extractSRAsc(srSignal) : undefined

  return {
    year: opts.year,
    sewoon,
    sewoonSibsin,
    headline:
      opts.headline ??
      (profection
        ? `올해의 무게중심은 ${profection.house}번째 영역으로 기울어요.`
        : `${opts.year}년 — 흐름이 새로 짜이는 해.`),
    profection,
    zr,
    solarReturnAsc,
    sajuNote:
      opts.sajuNote ??
      `세운 ${sewoonRaw.stem}${sewoonRaw.branch} — 일간 ${dm} 기준 ${sewoonSibsin}.`,
    astroNote:
      opts.astroNote ??
      (profection
        ? `Profection이 ${profection.house}하우스를 점등 — 룰러 ${profection.ruler}가 본명 ${profection.rulerNatal}.`
        : ''),
  }
}

function safeSibsin(dm: string, stem: string): string {
  try { return getSibsinKo(dm, stem) || '—' } catch { return '—' }
}

function extractProfection(
  s: ActiveSignal,
  natal: NatalContext,
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
  const rulerNatalEn = rulerPlanet ? `${rulerPlanet.house}th house · ${rulerPlanet.sign}` : ''

  return {
    house,
    theme: theme.theme,
    themeEn: theme.themeEn,
    cusp: cuspSign ? (SIGN_KO[cuspSign] ?? cuspSign) : '',
    cuspEn: cuspSign,
    ruler: PLANET_KO[ruler] ?? ruler,
    rulerEn: ruler,
    rulerNatal,
    rulerNatalEn,
  }
}

function extractZR(signals: ActiveSignal[]): DestinypalYear['zr'] {
  if (signals.length === 0) return undefined
  // ZR signal name 형식은 extractor 마다 다를 수 있으나 evidence.detail.level 가 보통 'L1'/'L2'.
  const result: { l1?: DestinypalYearZRChapter; l2?: DestinypalYearZRChapter } = {}
  for (const s of signals) {
    const detail = s.evidence?.detail ?? {}
    const level = (detail.level as 'L1' | 'L2' | undefined) ?? 'L1'
    const signEn = (detail.sign as ZodiacKo | undefined) ?? (s.evidence?.planets?.[0] as ZodiacKo | undefined)
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
  const sign = (detail.ascendantSign as ZodiacKo | undefined) ?? (detail.asc as ZodiacKo | undefined)
  if (!sign) return undefined
  return { sign: SIGN_KO[sign] ?? sign, signEn: sign }
}
