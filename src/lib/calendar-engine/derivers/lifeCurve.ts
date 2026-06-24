/**
 * PROTOTYPE — 인생 굴곡 곡선(life curve) 엔진.
 *
 * 목적: 인생 티어의 "굴곡"을 거친 대운 favor(10스텝 계단)가 아니라, 주기가 다른
 * 여러 층을 *연 단위로 중첩*해 만든다. 사주·점성 두 시스템을 모두 시계열로 깔고
 * 합친 뒤 사람별 정규화 + 극값(마디)을 뽑는다.
 *
 * 층(layer):
 *   사주  ─ 대운(10년 베이스) + 세운(1년 출렁임) + 세운×원국/대운 충·합(스파이크)
 *   점성  ─ 외행성 인생 마디(토성/목성/천왕성/명왕성/카이런…)를 오브 벨커브로 연속화
 *
 * 결정론적·순수: natal 입력 + now(테스트 고정) 만. 점성층은 일단 age-table 기반
 * lifecycle 마디(buildLifecycleTiming)를 연속화한 1차 근사 — 실 트랜짓 ephemeris
 * 연동은 다음 단계.
 */
import { annualStemBranch } from '@/lib/saju/cycles'
import { getStemElement, getBranchElement } from '@/lib/saju/stemBranchUtils'
import { FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import { favorOf, type YongsinLike } from './cycleTone'
import {
  buildLifecycleTiming,
  type AstroLifecycleEventKind,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { getCachedTransitChart } from '../ephe-cache'
import { findTransitAspects } from '@/lib/astrology/foundation/transit'
import { createCache } from '../cache'
import type { NatalContext } from '../context/types'

const GEN: Record<string, string> = FIVE_ELEMENT_RELATIONS.생하는관계
const CTRL: Record<string, string> = FIVE_ELEMENT_RELATIONS.극하는관계

type SibCat = '비겁' | '식상' | '재성' | '관성' | '인성'
function categoryOf(dmEl: string, el: string): SibCat {
  if (el === dmEl) return '비겁'
  if (GEN[dmEl] === el) return '식상'
  if (CTRL[dmEl] === el) return '재성'
  if (CTRL[el] === dmEl) return '관성'
  return '인성'
}

// 지지 충(6쌍)·육합(6쌍) — 한자 기준. 세운지지 ↔ 원국 일지/대운지지 상호작용.
const CLASH: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const SIXHAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

// 외행성 인생 마디 → 길흉 방향·강도. 하드(토성회귀·천왕성대립·명왕성스퀘어)는
// 압박(−), 목성회귀는 확장(+), 카이런·해왕성스퀘어는 약한 골(−).
const ASTRO_POLARITY: Record<AstroLifecycleEventKind, number> = {
  jupiter_return_1: 0.9,
  jupiter_return_2: 0.9,
  jupiter_return_3: 0.9,
  jupiter_return_5: 0.9,
  saturn_return_1: -1.0,
  saturn_return_2: -1.0,
  pluto_square_pluto: -1.1,
  uranus_opposition: -1.1,
  neptune_square: -0.7,
  chiron_return: -0.5,
  uranus_return: 0.6,
  progressed_lunar_1: -0.2,
}
const ASTRO_SIGMA = 1.8 // 마디 벨커브 폭(년)

export interface LifeCurvePoint {
  year: number
  age: number
  saju: number // 정규화 전 raw 사주 점수
  astro: number // 정규화 전 raw 점성 점수
  sajuZ: number
  astroZ: number
  combined: number // 정규화 합성 (세운 텍스처 포함, 연 단위)
  smooth: number // 5년 이동평균(중간 스케일)
  macro: number // 넓은 평활(대운·외행성 위주 — 거시 굴곡, 마디 추출용)
  agree: boolean // 사주·점성 부호 일치
}
export interface LifeCurveExtremum {
  year: number
  age: number
  kind: 'peak' | 'trough'
  value: number
}
export interface LifeCurve {
  points: LifeCurvePoint[]
  peaks: LifeCurveExtremum[]
  troughs: LifeCurveExtremum[]
}

interface DaeunFav {
  startAge: number
  favor: number
}

function favorNum(
  dmEl: string,
  el: string,
  strength: string | undefined,
  yongsin: YongsinLike | undefined
): number {
  const cat = categoryOf(dmEl, el)
  const f = favorOf(strength, cat, el, yongsin)
  return f === 'good' ? 1 : f === 'hard' ? -1 : 0
}

function znorm(xs: number[]): { z: number[]; mean: number; std: number } {
  const n = xs.length || 1
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const std = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1
  return { z: xs.map((x) => (x - mean) / std), mean, std }
}

/** 이동평균 — half=2 → 5년창, half=4 → 9년창. */
function movingAvg(xs: number[], half: number): number[] {
  return xs.map((_, i) => {
    let s = 0
    let c = 0
    for (let k = -half; k <= half; k++) {
      const j = i + k
      if (j >= 0 && j < xs.length) {
        s += xs[j]
        c++
      }
    }
    return s / c
  })
}

export function buildLifeCurve(
  natal: NatalContext,
  opts: {
    now?: Date
    span?: number
    sajuWeight?: number
    /** 실 트랜짓 ephemeris 점성 시계열(길이 span+1). 없으면 age-table 벨 근사. */
    astroSeries?: number[]
  } = {}
): LifeCurve | null {
  const now = opts.now ?? new Date()
  const span = opts.span ?? 90
  const sajuW = opts.sajuWeight ?? 0.6
  const astroW = 1 - sajuW

  const dmName = natal.saju?.dayMaster?.name
  const birthYear = natal.input?.year
  if (!dmName || !birthYear) return null
  const dmEl = getStemElement(dmName)
  const strength = natal.saju?.strength
  const yongsin = natal.saju?.yongsin as YongsinLike | undefined
  const dayBranch = natal.saju?.pillars?.day?.earthlyBranch?.name

  // 대운 favor 시퀀스 (lifePattern 과 동일한 억부/용신 favor).
  const daeun = natal.saju?.daeun ?? []
  const daeunFav: DaeunFav[] = daeun.map((d) => ({
    startAge: d.startAge,
    favor:
      favorNum(dmEl, getStemElement(d.stem), strength, yongsin) +
      favorNum(dmEl, getBranchElement(d.branch), strength, yongsin),
  }))
  const daeunBranchByAge = (age: number): string | undefined => {
    let cur: (typeof daeun)[number] | undefined
    for (const d of daeun) if (d.startAge <= age) cur = d
    return cur?.branch
  }
  const daeunFavByAge = (age: number): number => {
    let f = 0
    for (const d of daeunFav) if (d.startAge <= age) f = d.favor
    return f
  }

  // 점성 마디 (age-table 기반) → {age, polarity}. 실 트랜짓 시계열이 주어지면 불필요.
  const astroEvents = opts.astroSeries
    ? []
    : buildLifecycleTiming(birthYear, birthYear + span, false, undefined, now)
        .events.map((e) => ({
          age: e.startYear - birthYear,
          pol: ASTRO_POLARITY[e.event] ?? 0,
        }))
        .filter((e) => e.pol !== 0)

  // ── 연 단위 raw 시계열 ──
  const sajuRaw: number[] = []
  const astroRaw: number[] = []
  for (let age = 0; age <= span; age++) {
    const year = birthYear + age
    // 사주: 대운(베이스) + 세운(출렁임) + 충·합(스파이크)
    const dae = daeunFavByAge(age)
    const sb = annualStemBranch(year)
    const seun =
      favorNum(dmEl, getStemElement(sb.stem.name), strength, yongsin) +
      favorNum(dmEl, getBranchElement(sb.branch.name), strength, yongsin)
    const seBranch = sb.branch.name
    let inter = 0
    const dB = daeunBranchByAge(age)
    for (const anchor of [dayBranch, dB]) {
      if (!anchor) continue
      if (CLASH[seBranch] === anchor) inter -= 1
      else if (SIXHAP[seBranch] === anchor) inter += 0.5
    }
    // 대운이 베이스, 세운·충합은 *텍스처*(거시 굴곡을 흔들지 않게 약하게).
    sajuRaw.push(1.0 * dae + 0.45 * seun + 0.4 * inter)

    // 점성: 실 트랜짓 시계열이 주어지면 그것, 아니면 age-table 마디 벨커브 근사.
    if (opts.astroSeries) {
      astroRaw.push(opts.astroSeries[age] ?? 0)
    } else {
      let a = 0
      for (const ev of astroEvents) {
        const d = age - ev.age
        a += ev.pol * Math.exp(-(d * d) / (2 * ASTRO_SIGMA * ASTRO_SIGMA))
      }
      astroRaw.push(a)
    }
  }

  const { z: sajuZ } = znorm(sajuRaw)
  const { z: astroZ } = znorm(astroRaw)
  const combined = sajuRaw.map((_, i) => sajuW * sajuZ[i] + astroW * astroZ[i])
  const smooth = movingAvg(combined, 2) // 5년창 — 중간 텍스처
  // 거시 굴곡 — 9년창 2회로 세운 고주파를 씻어 대운·외행성 위주 decade-scale 만 남긴다.
  const macro = movingAvg(movingAvg(combined, 4), 4)

  const points: LifeCurvePoint[] = sajuRaw.map((_, i) => ({
    year: birthYear + i,
    age: i,
    saju: sajuRaw[i],
    astro: astroRaw[i],
    sajuZ: sajuZ[i],
    astroZ: astroZ[i],
    combined: combined[i],
    smooth: smooth[i],
    macro: macro[i],
    agree: Math.sign(sajuZ[i]) === Math.sign(astroZ[i]) && sajuZ[i] !== 0,
  }))

  // 극값(마디) — macro 곡선의 국지 극값(기울기 부호 변화) 후, *floor/ceiling
  // prominence* 로 거른다. 옛 ±6년 윈도 방식은 넓은 봉우리(전역 최대도)를 진폭
  // <0.3 이라 놓쳤다(감사 B2: p47 전역최대 age16, p35 깊은 골 age40 누락). 이
  // 방식은 한쪽 바닥/천장이 전역이라 전역 극값을 항상 포함한다.
  const peaks: LifeCurveExtremum[] = []
  const troughs: LifeCurveExtremum[] = []
  const PROM = 0.3
  const minLeft: number[] = []
  const minRight: number[] = []
  const maxLeft: number[] = []
  const maxRight: number[] = []
  for (let i = 0; i < macro.length; i++) {
    minLeft[i] = i === 0 ? macro[0] : Math.min(minLeft[i - 1], macro[i])
    maxLeft[i] = i === 0 ? macro[0] : Math.max(maxLeft[i - 1], macro[i])
  }
  for (let i = macro.length - 1; i >= 0; i--) {
    minRight[i] = i === macro.length - 1 ? macro[i] : Math.min(minRight[i + 1], macro[i])
    maxRight[i] = i === macro.length - 1 ? macro[i] : Math.max(maxRight[i + 1], macro[i])
  }
  for (let i = 1; i < macro.length - 1; i++) {
    const a = macro[i - 1]
    const b = macro[i]
    const c = macro[i + 1]
    const isPeak = b > a && b >= c
    const isTrough = b < a && b <= c
    if (isPeak) {
      // 봉우리가 좌·우 바닥 중 *더 높은* 쪽보다 PROM 이상 솟았나(전역최대→바닥이 전역최소→큰 값).
      const prom = b - Math.max(minLeft[i - 1], minRight[i + 1])
      if (prom >= PROM) peaks.push({ year: birthYear + i, age: i, kind: 'peak', value: b })
    } else if (isTrough) {
      const prom = Math.min(maxLeft[i - 1], maxRight[i + 1]) - b
      if (prom >= PROM) troughs.push({ year: birthYear + i, age: i, kind: 'trough', value: b })
    }
  }

  return { points, peaks, troughs }
}

// ─────────────────────── 실 트랜짓 점성 시계열 ───────────────────────
// 외행성(목성·토성·천왕성·해왕성·명왕성·카이런)의 본명 점 대비 정밀 트랜짓을
// 연 단위로 계산해 점성 굴곡을 *근사 벨커브가 아닌 실제 각·오브*로 만든다.
// 느린 행성만 — 빠른 내행성은 연 스케일에서 노이즈.
const SLOW_TRANSIT = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])
const PLANET_W: Record<string, number> = {
  Pluto: 1.3,
  Saturn: 1.2,
  Uranus: 1.1,
  Neptune: 1.0,
  Chiron: 0.7,
  Jupiter: 0.8,
}
// 하드 각(square/opposition)=압박(−), 소프트(trine/sextile)=순(+). 합(conjunction)
// 은 행성 성격에 따라 — 목성=확장(+), 토성·명왕성=압박(−).
const ASPECT_POL: Record<string, number> = {
  square: -1,
  opposition: -1,
  trine: 1,
  sextile: 0.7,
  conjunction: 0, // 행성별로 따로
}
const CONJ_SIGN: Record<string, number> = {
  Jupiter: 1,
  Saturn: -1,
  Uranus: -0.3,
  Neptune: -0.5,
  Pluto: -1,
  Chiron: -0.5,
}

/**
 * 실 ephemeris 외행성 트랜짓 → 연 단위 점성 점수 시계열(길이 span+1).
 * buildLifeCurve(natal, { astroSeries }) 로 넘기면 벨 근사를 대체한다.
 */
// 트랜짓 시계열은 *평생 범위*라 currentYear 와 무관 — 차트마다 한 번만 계산하면
// 같은 프로세스의 재방문/다른 달 요청에서 재사용된다. 바운드 메모(LRU-ish).
const _transitMemo = new Map<string, number[]>()
const _TRANSIT_MEMO_MAX = 256

export async function computeTransitAstroSeries(
  natal: NatalContext,
  opts: { span?: number; step?: number } = {}
): Promise<number[]> {
  const span = opts.span ?? 90
  // 외행성은 느려 매년 안 떠도 envelope 가 보존된다 — step 년마다 샘플 후 선형 보간해
  // ephemeris 호출을 1/step 로 줄인다(프로덕션 비용). 기본 2년.
  const step = Math.max(1, opts.step ?? 2)
  const birthYear = natal.input?.year
  const loc = natal.astro?.location
  const natalChart = natal.astro?.chart
  if (!birthYear || !loc || !natalChart) return new Array(span + 1).fill(0)

  // 메모 키 — 위치 + 본명 행성 경도(차트 고유) + span/step.
  const lonSig = natalChart.planets.map((p) => Math.round(p.longitude)).join(',')
  const memoKey = `${loc.latitude},${loc.longitude},${birthYear},${span},${step},${lonSig}`
  const memHit = _transitMemo.get(memoKey)
  if (memHit) return memHit

  const cache = createCache()

  const sampleAt = async (age: number): Promise<number> => {
    const iso = `${birthYear + age}-07-01T12:00:00.000Z`
    let val = 0
    try {
      const transitChart = await getCachedTransitChart({
        iso,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timeZone: loc.timeZone,
        inMemoryCache: cache,
      })
      for (const a of findTransitAspects(transitChart, natalChart)) {
        if (!SLOW_TRANSIT.has(a.transitPlanet)) continue
        const w = PLANET_W[a.transitPlanet] ?? 0.5
        const pol =
          a.type === 'conjunction' ? (CONJ_SIGN[a.transitPlanet] ?? 0) : (ASPECT_POL[a.type] ?? 0)
        val += pol * w * (a.score ?? 0) // score = 1-orb/limit (tightness)
      }
    } catch {
      // ephemeris 실패 시 0
    }
    return val
  }

  // step 간격 샘플
  const sampleAges: number[] = []
  for (let age = 0; age <= span; age += step) sampleAges.push(age)
  if (sampleAges[sampleAges.length - 1] !== span) sampleAges.push(span)
  const sampled = await Promise.all(sampleAges.map((a) => sampleAt(a)))

  // 선형 보간으로 매년 채움
  const series: number[] = []
  for (let age = 0; age <= span; age++) {
    let hi = 0
    while (hi < sampleAges.length - 1 && sampleAges[hi] < age) hi++
    if (sampleAges[hi] === age) {
      series.push(sampled[hi])
    } else {
      const lo = hi - 1
      const t = (age - sampleAges[lo]) / (sampleAges[hi] - sampleAges[lo])
      series.push(sampled[lo] + t * (sampled[hi] - sampled[lo]))
    }
  }
  if (_transitMemo.size >= _TRANSIT_MEMO_MAX) {
    const oldest = _transitMemo.keys().next().value
    if (oldest !== undefined) _transitMemo.delete(oldest)
  }
  _transitMemo.set(memoKey, series)
  return series
}
