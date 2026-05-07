/**
 * 천기력 엔진 (CheonGi-ryeok Engine) v1.0
 * ────────────────────────────────────────
 * 서양 점성 정통 + 만세력 톤 + 8차원 컴퓨터 분석
 *
 * 자평력(saju-engine) 의 짝. 한 본명에 대해 가능한 모든 점성 계산을 하나의
 * 함수 `runAstroEngine()` 로 묶음. 사주·교차는 별도 진입점.
 *
 * ── 8차원 점성 분석 ──
 *   1. natalChart       — 본명 차트 (10행성 + ASC/MC/IC/DSC + 12 하우스)
 *   2. bigThree         — 태양·달·상승 (정체성·감정·외모)
 *   3. elementBalance   — 4원소 분포 (불·흙·바람·물)
 *   4. modalityBalance  — 3양태 분포 (활동·고정·변통)
 *   5. natalAspects     — 본명 행성 간 어스펙트
 *   6. transits         — 현재 트랜짓이 본명에 미치는 영향
 *   7. progressions     — 2차 프로그레션 (1년 = 1일)
 *   8. solarReturn      — 솔라 리턴 (생일 기점 한 해)
 */

import {
  calculateNatalChart,
  toChart,
  type NatalChartData,
  type NatalChartInput,
} from './astrology/foundation/astrologyService'
import {
  calculateTransitChart,
  findTransitAspects,
  findMajorTransits,
  type TransitAspect,
} from './astrology/foundation/transit'
import {
  calculateSecondaryProgressions,
  findProgressedToNatalAspects,
  getProgressedMoonPhase,
} from './astrology/foundation/progressions'
import {
  calculateSolarReturn,
  getSolarReturnSummary,
} from './astrology/foundation/returns'
import { findNatalAspects } from './astrology/foundation/aspects'
import type { Chart, NatalInput, ProgressedChart } from './astrology/foundation/types'

export const ASTRO_ENGINE_META = {
  name: '천기력',
  nameEn: 'CheonGi-ryeok',
  version: '1.0',
  tradition: '서양 점성 정통',
  dimensions: 8,
  tagline: '8차원 정통 점성 분석 엔진',
} as const

// ─────────────────────────────────────────────────────────────────
// 4원소 / 3양태 매핑
// ─────────────────────────────────────────────────────────────────

const SIGN_ELEMENT: Record<string, '불' | '흙' | '바람' | '물'> = {
  Aries: '불', Leo: '불', Sagittarius: '불',
  Taurus: '흙', Virgo: '흙', Capricorn: '흙',
  Gemini: '바람', Libra: '바람', Aquarius: '바람',
  Cancer: '물', Scorpio: '물', Pisces: '물',
  // 한국어 라벨 호환
  양자리: '불', 사자자리: '불', 사수자리: '불',
  황소자리: '흙', 처녀자리: '흙', 염소자리: '흙',
  쌍둥이자리: '바람', 천칭자리: '바람', 물병자리: '바람',
  게자리: '물', 전갈자리: '물', 물고기자리: '물',
}

const SIGN_MODALITY: Record<string, '활동' | '고정' | '변통'> = {
  Aries: '활동', Cancer: '활동', Libra: '활동', Capricorn: '활동',
  Taurus: '고정', Leo: '고정', Scorpio: '고정', Aquarius: '고정',
  Gemini: '변통', Virgo: '변통', Sagittarius: '변통', Pisces: '변통',
  양자리: '활동', 게자리: '활동', 천칭자리: '활동', 염소자리: '활동',
  황소자리: '고정', 사자자리: '고정', 전갈자리: '고정', 물병자리: '고정',
  쌍둥이자리: '변통', 처녀자리: '변통', 사수자리: '변통', 물고기자리: '변통',
}

// 행성 가중치 (분포 계산용)
const PLANET_WEIGHT: Record<string, number> = {
  Sun: 4, Moon: 4, Mercury: 2, Venus: 2, Mars: 2,
  Jupiter: 2, Saturn: 2, Uranus: 1, Neptune: 1, Pluto: 1,
}

// ─────────────────────────────────────────────────────────────────
// 입력 / 출력 타입
// ─────────────────────────────────────────────────────────────────

export interface AstroEngineInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  latitude: number
  longitude: number
  timezone?: string
  targetDate?: Date
}

export interface BigThree {
  sun: { sign: string; degree: number; house: number }
  moon: { sign: string; degree: number; house: number }
  ascendant: { sign: string; degree: number }
  mc: { sign: string; degree: number }
}

export interface ElementBalance {
  fire: number // 0-100
  earth: number
  air: number
  water: number
  dominant: '불' | '흙' | '바람' | '물'
  weakest: '불' | '흙' | '바람' | '물'
}

export interface ModalityBalance {
  cardinal: number
  fixed: number
  mutable: number
  dominant: '활동' | '고정' | '변통'
}

export interface AstroEngineOutput {
  engine: typeof ASTRO_ENGINE_META
  /** 본명 차트 — 10행성 + 4앵글 + 12하우스 */
  natal: NatalChartData
  /** 빅3 — 태양·달·상승·MC */
  bigThree: BigThree
  /** 4원소 분포 */
  elementBalance: ElementBalance
  /** 3양태 분포 */
  modalityBalance: ModalityBalance
  /** 본명 행성 간 주요 어스펙트 */
  natalAspects: ReturnType<typeof findNatalAspects>
  /** 현재 트랜짓 분석 */
  current: {
    /** target date 기준 트랜짓 차트 */
    transitChart: Chart
    /** 본명에 닿는 트랜짓 어스펙트 */
    transitToNatal: TransitAspect[]
    /** 주요 트랜짓 (외행성 위주) */
    majorTransits: TransitAspect[]
  }
  /** 2차 프로그레션 (target year 기준) */
  progressions?: {
    progressedChart: ProgressedChart
    progressedToNatal: ReturnType<typeof findProgressedToNatalAspects>
    progressedMoonPhase: ReturnType<typeof getProgressedMoonPhase> | undefined
  }
  /** 솔라 리턴 (현재 해의 생일 기점) */
  solarReturn?: {
    chart: unknown
    summary: ReturnType<typeof getSolarReturnSummary>
  }
  /** 입력 정보 */
  input: AstroEngineInput
}

// ─────────────────────────────────────────────────────────────────
// 메인 진입점
// ─────────────────────────────────────────────────────────────────

export async function runAstroEngine(input: AstroEngineInput): Promise<AstroEngineOutput> {
  const tz = input.timezone || 'Asia/Seoul'
  const target = input.targetDate || new Date()

  // ── 1) 본명 차트
  const [year, month, day] = input.birthDate.split('-').map(Number)
  const [hour, minute] = input.birthTime.split(':').map(Number)
  const natalInput: NatalChartInput = {
    year, month, date: day,
    hour, minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: tz,
  }
  const natal = await calculateNatalChart(natalInput)

  // ── 2) Big Three
  const sun = natal.planets.find((p) => p.name === 'Sun')
  const moon = natal.planets.find((p) => p.name === 'Moon')
  const bigThree: BigThree = {
    sun: { sign: sun?.sign || '?', degree: sun?.degree || 0, house: sun?.house || 0 },
    moon: { sign: moon?.sign || '?', degree: moon?.degree || 0, house: moon?.house || 0 },
    ascendant: { sign: natal.ascendant.sign, degree: natal.ascendant.degree },
    mc: { sign: natal.mc.sign, degree: natal.mc.degree },
  }

  // ── 3) Element / Modality 분포
  const elementBalance = computeElementBalance(natal)
  const modalityBalance = computeModalityBalance(natal)

  // ── 4) 본명 어스펙트
  const natalChart = toChart(natal)
  const natalAspects = findNatalAspects(natalChart)

  // ── 5) 현재 트랜짓
  const pad = (n: number) => String(n).padStart(2, '0')
  const transitIso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T12:00:00`
  const transitChart = await calculateTransitChart({
    iso: transitIso,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: tz,
  })
  const transitToNatal = findTransitAspects(transitChart, natalChart)
  const majorTransits = findMajorTransits(transitChart, natalChart)

  // ── 6) 프로그레션 (옵션)
  const natalForProg: NatalInput = {
    year, month, date: day,
    hour, minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: tz,
  }
  let progressions: AstroEngineOutput['progressions']
  try {
    const targetIso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
    const progressedChart = await calculateSecondaryProgressions({
      natal: natalForProg,
      targetDate: targetIso,
    })
    const progressedToNatal = findProgressedToNatalAspects(progressedChart, natalChart)
    const progSun = progressedChart.planets.find((p) => p.name === 'Sun')
    const progMoon = progressedChart.planets.find((p) => p.name === 'Moon')
    const progressedMoonPhase =
      progSun && progMoon
        ? getProgressedMoonPhase(progMoon.longitude, progSun.longitude)
        : undefined
    progressions = {
      progressedChart,
      progressedToNatal,
      progressedMoonPhase,
    }
  } catch {
    // ignore
  }

  // ── 7) 솔라 리턴 (옵션)
  let solarReturn: AstroEngineOutput['solarReturn']
  try {
    const srChart = await calculateSolarReturn({
      natal: natalForProg,
      year: target.getFullYear(),
    })
    solarReturn = {
      chart: srChart,
      summary: getSolarReturnSummary(srChart),
    }
  } catch {
    // ignore
  }

  return {
    engine: ASTRO_ENGINE_META,
    natal,
    bigThree,
    elementBalance,
    modalityBalance,
    natalAspects,
    current: {
      transitChart,
      transitToNatal,
      majorTransits,
    },
    progressions,
    solarReturn,
    input: { ...input, timezone: tz, targetDate: target },
  }
}

// ─────────────────────────────────────────────────────────────────
// 분포 계산
// ─────────────────────────────────────────────────────────────────

function computeElementBalance(natal: NatalChartData): ElementBalance {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 }
  let total = 0
  for (const p of natal.planets) {
    const el = SIGN_ELEMENT[p.sign]
    const w = PLANET_WEIGHT[p.name] ?? 1
    if (!el) continue
    if (el === '불') counts.fire += w
    else if (el === '흙') counts.earth += w
    else if (el === '바람') counts.air += w
    else if (el === '물') counts.water += w
    total += w
  }
  // ASC, MC도 추가 (가중치 2)
  const ascEl = SIGN_ELEMENT[natal.ascendant.sign]
  const mcEl = SIGN_ELEMENT[natal.mc.sign]
  for (const el of [ascEl, mcEl]) {
    if (!el) continue
    if (el === '불') counts.fire += 2
    else if (el === '흙') counts.earth += 2
    else if (el === '바람') counts.air += 2
    else if (el === '물') counts.water += 2
    total += 2
  }
  const pct = (n: number) => Math.round((n / Math.max(1, total)) * 100)
  const result = {
    fire: pct(counts.fire),
    earth: pct(counts.earth),
    air: pct(counts.air),
    water: pct(counts.water),
  }
  const entries: Array<['불' | '흙' | '바람' | '물', number]> = [
    ['불', result.fire], ['흙', result.earth], ['바람', result.air], ['물', result.water],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return { ...result, dominant: entries[0][0], weakest: entries[entries.length - 1][0] }
}

function computeModalityBalance(natal: NatalChartData): ModalityBalance {
  const counts = { cardinal: 0, fixed: 0, mutable: 0 }
  let total = 0
  for (const p of natal.planets) {
    const m = SIGN_MODALITY[p.sign]
    const w = PLANET_WEIGHT[p.name] ?? 1
    if (!m) continue
    if (m === '활동') counts.cardinal += w
    else if (m === '고정') counts.fixed += w
    else if (m === '변통') counts.mutable += w
    total += w
  }
  const pct = (n: number) => Math.round((n / Math.max(1, total)) * 100)
  const result = {
    cardinal: pct(counts.cardinal),
    fixed: pct(counts.fixed),
    mutable: pct(counts.mutable),
  }
  const entries: Array<['활동' | '고정' | '변통', number]> = [
    ['활동', result.cardinal], ['고정', result.fixed], ['변통', result.mutable],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return { ...result, dominant: entries[0][0] }
}
