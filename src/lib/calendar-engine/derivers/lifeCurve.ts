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
import { logger } from '@/lib/logger'
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
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}
const SIXHAP: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}

// 외행성 인생 마디 → *인생-호(arc)* 방향·강도.
//
// **뿌리 수정(2026-07, 성숙 트랜짓 재평가):** 예전 표는 토성회귀·천왕성대립·
// 명왕성/해왕성 스퀘어·카이런회귀를 모두 순(純)압박(−)으로 찍었다. 이 마디들은
// 29~60세 구간에 몰려 있어 *중·말년을 체계적으로 눌러* 사주가 대기만성이라 읽는
// 차트도 곡선이 초년발복/굴곡으로 뒤집혔다(사용자 지적: 950209). 서양 인생-호
// 정통(헬레니즘·심층 점성 — Hand/Astrodienst/Rudhyar, docs/운흐름 §0.5 채택 노선)은
// 이들을 *쇠퇴가 아니라 성숙(maturation)* 으로 본다:
//   · 토성 1회귀(~29) 성인기 진입·토대 확립 / 2회귀(~59) 수확·원로 권위
//   · 카이런 회귀(~50) 상처→지혜 통합, 천왕성 대립(~42) 중년 각성·해방
//   · 명왕성/해왕성 스퀘어 붕괴 *또는* 돌파 — 순손실 아님(양가 → 중립)
// 성숙 마디는 곡선 *레벨* 에 ≈0(중립±약)만 실어 하강 슬로프를 만들지 않게 하고,
// 확장(목성회귀·천왕성회귀)만 뚜렷한 +. 단조 90년 하강은 점성 정통에 근거가 없다.
const ASTRO_POLARITY: Record<AstroLifecycleEventKind, number> = {
  jupiter_return_1: 0.9,
  jupiter_return_2: 0.9,
  jupiter_return_3: 0.9,
  jupiter_return_5: 0.9,
  saturn_return_1: 0.2, // 성인기 토대(성숙, 약한 +)
  saturn_return_2: 0.4, // 수확·원로 권위(길)
  pluto_square_pluto: 0.0, // 변형 — 붕괴 또는 돌파(중립)
  uranus_opposition: 0.2, // 중년 각성·해방(약한 +)
  neptune_square: 0.0, // 양가 — 혼란 또는 영적 각성(중립)
  chiron_return: 0.4, // 지혜·치유 통합(길)
  uranus_return: 0.5, // 자유의 수확
  progressed_lunar_1: 0.0, // 위상 의존(중립)
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
  // 사주-단독 거시 곡선(점성 0 가중, z-정규화 후 7년 평활). 인생유형(대기만성/
  // 초년발복…)은 *사주* 개념이므로 라벨 분류는 이 신호로 한다 — 점성 텍스처가
  // 라벨을 뒤집지 못하게(감사: 950209 사주는 대기만성인데 점성 성숙-골이 굴곡으로
  // 뒤집던 문제). 화면 곡선·마디는 blended macro 를 그대로 쓴다.
  sajuMacro: number
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
          // 만 나이 SSOT — LifecycleEntry.age(감사 F2 parity). 지금은 overrides
          // 미주입이라 startYear−birthYear 와 같지만, 향후 override 배선 시 다른
          // 티어(만 나이)와 곡선 Gaussian 중심이 어긋나지 않도록 e.age 로 통일.
          age: e.age,
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
  // 거시 굴곡 — 7년창(±3) 1회. **뿌리 수정**: 예전엔 9년창 2회(≈13년 평활) + 0~16세
  // 성숙 엔벨로프(편차를 평균 쪽으로 당김)를 *곡선에만* 덧칠해 macro 를 만들었다.
  // 그 결과 (1) 초년기 굴곡(고생/호황)이 통째로 지워지고, (2) macro 가 combined 와
  // 부호가 어긋나(평생 ~1/6 해) — *대운·세운 티어는 combined 를 쓰는데 인생곡선만
  // macro 를 써서* 같은 해를 반대로 그리는 모순이 났다. 이제 곡선·마디·대운밴드가
  // 모두 combined 를 가볍게(7년) 평활한 *같은 신호* 를 본다. 엔벨로프 없음 →
  // 초년기 고생/호황이 그대로 드러나고, 티어 간 부호가 일치한다.
  const macro = movingAvg(combined, 3)
  // 사주-단독 거시 — combined 와 같은 7년창을 sajuZ 에만 적용. 인생유형 라벨 분류
  // 전용(점성 텍스처 격리). z-정규화라 미세한 대운 favor 차도 뚜렷한 마루/골로 살아
  // 나 favor-path 원시 임계(±0.5)로는 못 잡던 은근한 대기만성도 곡선에서 분류된다.
  const sajuMacro = movingAvg(sajuZ, 3)

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
    sajuMacro: sajuMacro[i],
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
  // 경계(0세·마지막 나이)도 극값 후보로 본다(감사 F5) — 옛 `i=1..len-2` 는 유년/
  // 말년이 전역 정점·저점인 인생(예: age0 이 전 생애 최댓값)을 통째로 놓쳐 peaks[]·
  // "다음 마루"가 비었다. 경계는 존재하는 한쪽 이웃만으로 판정하고 prominence 도
  // 그 방향으로만 잰다.
  const last = macro.length - 1
  for (let i = 0; i < macro.length; i++) {
    const b = macro[i]
    const hasL = i > 0
    const hasR = i < last
    if (!hasL && !hasR) continue
    // 존재하는 이웃 모두보다 높으면(같으면 우측 허용) 봉우리, 낮으면 골.
    const isPeak = (!hasL || b > macro[i - 1]) && (!hasR || b >= macro[i + 1])
    const isTrough = (!hasL || b < macro[i - 1]) && (!hasR || b <= macro[i + 1])
    if (isPeak && !isTrough) {
      const floors: number[] = []
      if (hasL) floors.push(minLeft[i - 1])
      if (hasR) floors.push(minRight[i + 1])
      const prom = b - Math.max(...floors) // 존재하는 쪽 바닥 중 더 높은 쪽 기준
      if (prom >= PROM) peaks.push({ year: birthYear + i, age: i, kind: 'peak', value: b })
    } else if (isTrough && !isPeak) {
      const ceils: number[] = []
      if (hasL) ceils.push(maxLeft[i - 1])
      if (hasR) ceils.push(maxRight[i + 1])
      const prom = Math.min(...ceils) - b
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
// 인생-호 스케일의 각/합 값(ASTRO_POLARITY 와 같은 성숙 재평가 노선).
//
// **뿌리 수정(2026-07):** 예전엔 하드 각(square/opposition)을 평-1 로 찍었는데,
// 외행성은 나이가 들수록 본명 점에 하드 각을 *더 많이* 맺어(휠을 더 돈다) 평-1
// 누적이 곧 말년 하강 슬로프가 됐다. 90년 호에서 지나가는 토성 스퀘어는 −1 재앙이
// 아니라 성장 마찰 — 크기를 줄여(−0.3) 텍스처만 남기고 슬로프를 안 만든다. 소프트
// 각도 과승 방지로 낮춘다. 합(conjunction)은 인생 마디로 재평가: 성숙 회귀(토성·
// 명왕성·해왕성)는 중립(0), 확장(목성)·각성(천왕성·카이런)만 +.
const ASPECT_POL: Record<string, number> = {
  square: -0.3,
  opposition: -0.3,
  trine: 0.6,
  sextile: 0.4,
  conjunction: 0, // 행성별로 따로
}
const CONJ_SIGN: Record<string, number> = {
  Jupiter: 1, // 확장·기회
  Saturn: 0.0, // 성숙·토대(쇠퇴 아님)
  Uranus: 0.2, // 각성·해방
  Neptune: 0.0, // 양가
  Pluto: 0.0, // 변형(붕괴 또는 돌파)
  Chiron: 0.3, // 지혜 통합
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

  // 부분 실패는 0 이 아니라 null(결측) — 0 으로 삼키면 step 보간 때문에 ±step 년
  // 구간이 0 으로 눌린 *가짜 골*이 생긴다(감사 B5). 결측 샘플은 보간에서 건너뛰고
  // 이웃 성공 샘플끼리 잇는다. 로그도 남겨 조용한 왜곡을 없앤다.
  const sampleAt = async (age: number): Promise<number | null> => {
    const iso = `${birthYear + age}-07-01T12:00:00.000Z`
    try {
      const transitChart = await getCachedTransitChart({
        iso,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timeZone: loc.timeZone,
        inMemoryCache: cache,
      })
      let val = 0
      for (const a of findTransitAspects(transitChart, natalChart)) {
        if (!SLOW_TRANSIT.has(a.transitPlanet)) continue
        const w = PLANET_W[a.transitPlanet] ?? 0.5
        const pol =
          a.type === 'conjunction' ? (CONJ_SIGN[a.transitPlanet] ?? 0) : (ASPECT_POL[a.type] ?? 0)
        val += pol * w * (a.score ?? 0) // score = 1-orb/limit (tightness)
      }
      return val
    } catch (err) {
      logger.warn(`[lifeCurve] transit sample failed at age ${age} — treating as missing`, err)
      return null
    }
  }

  // step 간격 샘플
  const sampleAges: number[] = []
  for (let age = 0; age <= span; age += step) sampleAges.push(age)
  if (sampleAges[sampleAges.length - 1] !== span) sampleAges.push(span)
  const sampledRaw = await Promise.all(sampleAges.map((a) => sampleAt(a)))
  // 결측 제거 — 성공 샘플만으로 보간 골격을 만든다. 전부 실패면 0 시계열(종전 동일).
  const okAges: number[] = []
  const okVals: number[] = []
  for (let k = 0; k < sampleAges.length; k++) {
    if (sampledRaw[k] != null) {
      okAges.push(sampleAges[k])
      okVals.push(sampledRaw[k] as number)
    }
  }
  if (okAges.length === 0) return new Array(span + 1).fill(0)

  // 선형 보간으로 매년 채움(결측 구간은 이웃 성공 샘플로 이어짐, 양끝은 평탄 연장)
  const series: number[] = []
  for (let age = 0; age <= span; age++) {
    if (age <= okAges[0]) {
      series.push(okVals[0])
      continue
    }
    if (age >= okAges[okAges.length - 1]) {
      series.push(okVals[okVals.length - 1])
      continue
    }
    let hi = 0
    while (hi < okAges.length - 1 && okAges[hi] < age) hi++
    if (okAges[hi] === age) {
      series.push(okVals[hi])
    } else {
      const lo = hi - 1
      const t = (age - okAges[lo]) / (okAges[hi] - okAges[lo])
      series.push(okVals[lo] + t * (okVals[hi] - okVals[lo]))
    }
  }
  if (_transitMemo.size >= _TRANSIT_MEMO_MAX) {
    const oldest = _transitMemo.keys().next().value
    if (oldest !== undefined) _transitMemo.delete(oldest)
  }
  _transitMemo.set(memoKey, series)
  return series
}
