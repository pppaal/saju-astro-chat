/* ============================================================
   calculateOuterPlanetMilestones — 외행성 회귀/각 마일스톤 실측.
   ────────────────────────────────────────────────────────────
   astroLifecycle 의 고정 나이표(토성회귀=29 등)는 평균 근사라, 실제 회귀가
   28세/31세인 사람은 인생 곡선(실 ephemeris)과 마일스톤 점이 서로 다른 해를
   가리켰다(감사 A-3). buildLifecycleTiming 의 override 훅은 처음부터 있었지만
   이 계산기가 없어 프로덕션이 항상 undefined 를 넘겼다 — 그 구현이 이 파일이다.

   방법: 이벤트별 탐색 창(평균 나이 ±수년)을 매년 7/1 트랜짓 차트로 스캔해
   "트랜짓 행성 − 본명 행성" 각도가 목표각(회귀 0°, 사각 90°, 마주봄 180°)을
   지나는 해를 찾고, 이웃 해와의 선형 보간으로 월 단위 시점을 추정한다.
   행성 연간 이동량 대비 오차가 크면(스캔 창 밖 등) null — 평균 테이블 폴백.

   비용: 창 합집합 ~60개 연도 차트(프로세스 메모로 본명당 1회). 진행달 회귀
   (progressed_lunar_1)는 트랜짓이 아니라 여기서 다루지 않는다(테이블 유지).
   ============================================================ */

import { getCachedTransitChart } from '../ephe-cache'
import { createCache } from '../cache'
import { logger } from '@/lib/logger'
import type { NatalContext } from '../context/types'
import type { AstroLifecycleEventKind, LifecycleMilestoneOverride } from './astroLifecycle'

interface Target {
  kind: AstroLifecycleEventKind
  planet: string
  /** 목표각 — 0 회귀 · 90 사각 · 180 마주봄. */
  angle: 0 | 90 | 180
  /** 탐색 창(만 나이, inclusive). 평균 나이표 ± 여유. */
  window: [number, number]
  /** 연간 평균 이동량(°/yr) — 수용 오차 산정용. */
  yearlyMotion: number
}

const TARGETS: Target[] = [
  { kind: 'jupiter_return_1', planet: 'Jupiter', angle: 0, window: [9, 15], yearlyMotion: 30.3 },
  { kind: 'jupiter_return_2', planet: 'Jupiter', angle: 0, window: [21, 27], yearlyMotion: 30.3 },
  { kind: 'saturn_return_1', planet: 'Saturn', angle: 0, window: [26, 33], yearlyMotion: 12.2 },
  { kind: 'jupiter_return_3', planet: 'Jupiter', angle: 0, window: [33, 39], yearlyMotion: 30.3 },
  // 명왕성 이심률 — 세대에 따라 실제 나이가 30대 초~40대 후반까지 벌어진다.
  { kind: 'pluto_square_pluto', planet: 'Pluto', angle: 90, window: [30, 50], yearlyMotion: 2.4 },
  { kind: 'uranus_opposition', planet: 'Uranus', angle: 180, window: [38, 45], yearlyMotion: 4.3 },
  { kind: 'neptune_square', planet: 'Neptune', angle: 90, window: [38, 45], yearlyMotion: 2.2 },
  { kind: 'chiron_return', planet: 'Chiron', angle: 0, window: [46, 54], yearlyMotion: 7 },
  { kind: 'saturn_return_2', planet: 'Saturn', angle: 0, window: [55, 62], yearlyMotion: 12.2 },
  { kind: 'jupiter_return_5', planet: 'Jupiter', angle: 0, window: [57, 63], yearlyMotion: 30.3 },
  { kind: 'uranus_return', planet: 'Uranus', angle: 0, window: [80, 87], yearlyMotion: 4.3 },
]

/** (-180, 180] 로 감싼 각도차. */
export function wrap180(deg: number): number {
  let d = deg % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

/** 목표각 대비 부호 있는 편차 — 0 을 지나는 해가 exact. */
export function signedErr(transitLon: number, natalLon: number, angle: 0 | 90 | 180): number {
  const sep = Math.abs(wrap180(transitLon - natalLon)) // 0..180
  return sep - angle
}

/**
 * 순수 파트 — 창 안 (age, err) 샘플에서 목표각 교차 시점을 찾아 override 로.
 * err = signedErr(트랜짓, 본명, 목표각). 부호 반전(교차) 구간을 선형 보간하고,
 * 반전이 없으면 |err| 최솟값이 연간 이동량 60% 이내일 때만 채택(창 밖 → null).
 * 에페메리스와 분리돼 테스트 가능(실 ephe 는 vitest 모의가 궤도 운동을 안 냄).
 */
export function resolveMilestoneFromSamples(args: {
  kind: AstroLifecycleEventKind
  samples: ReadonlyArray<{ age: number; err: number }>
  yearlyMotion: number
  birthYear: number
  birthAnchorMs: number
}): LifecycleMilestoneOverride | null {
  const { kind, samples, yearlyMotion, birthYear, birthAnchorMs } = args
  if (samples.length < 2) return null

  let cross: { a0: number; e0: number; a1: number; e1: number } | null = null
  for (let i = 0; i < samples.length - 1; i++) {
    const s0 = samples[i]
    const s1 = samples[i + 1]
    if (s0.err === 0 || Math.sign(s0.err) !== Math.sign(s1.err)) {
      cross = { a0: s0.age, e0: s0.err, a1: s1.age, e1: s1.err }
      break
    }
  }

  // 샘플은 매년 7/1 이므로 fracYear 는 "출생 후 경과년(7/1 기준)"의 소수부.
  let baseAge: number
  let fracYear: number
  if (cross) {
    // 사각(90°) 등 부호가 실제로 뒤집히는 각 — 두 샘플 사이 err=0 지점 선형 보간.
    baseAge = cross.a0
    fracYear = cross.e0 / (cross.e0 - cross.e1 || Number.EPSILON)
  } else {
    // 회귀(0°)·마주봄(180°)은 |sep| 기반 err 이 목표에서 0 에 *접(接)* 할 뿐
    // 부호가 안 뒤집혀 교차가 없다(감사 F1). 예전엔 frac=0 → exactDateISO 가
    // *항상 YYYY-07-01* 이 되는 조작값이었다. 최소 샘플 3점 포물선 꼭짓점으로
    // sub-year 시점을 복원해 월 정밀도를 되살린다.
    const bestIdx = samples.reduce(
      (bi, s, i) => (Math.abs(s.err) < Math.abs(samples[bi].err) ? i : bi),
      0
    )
    const best = samples[bestIdx]
    if (Math.abs(best.err) > yearlyMotion * 0.6) return null
    const ep = samples[bestIdx - 1]?.err
    const en = samples[bestIdx + 1]?.err
    let vertexFrac = 0
    if (ep != null && en != null) {
      const denom = ep - 2 * best.err + en
      if (denom !== 0) vertexFrac = Math.max(-0.5, Math.min(0.5, (0.5 * (ep - en)) / denom))
    }
    baseAge = best.age
    fracYear = vertexFrac
  }

  const eventMs = Date.UTC(birthYear + baseAge, 6, 1) + fracYear * 365.25 * 86_400_000
  const eventDate = new Date(eventMs)
  const age = Math.floor((eventMs - birthAnchorMs) / (365.25 * 86_400_000))
  return {
    kind,
    startYear: eventDate.getUTCFullYear(),
    age,
    exactDateISO: eventDate.toISOString().slice(0, 10),
  }
}

// 본명당 결과 메모 — 마일스톤은 본명 순수 함수(now 무관)라 프로세스 수명 동안 유효.
const _memo = new Map<string, LifecycleMilestoneOverride[]>()
const _MEMO_MAX = 256

/**
 * 본명 → 외행성 마일스톤 실측 override 목록.
 * 실패(에페메리스 오류·창 밖·행성 없음)한 kind 는 목록에서 빠지고
 * buildLifecycleTiming 이 평균 테이블로 폴백한다(부분 오버라이드).
 */
export async function calculateOuterPlanetMilestones(
  natal: NatalContext
): Promise<LifecycleMilestoneOverride[]> {
  const birthYear = natal.input?.year
  const loc = natal.astro?.location
  const chart = natal.astro?.chart
  if (!birthYear || !loc || !chart) return []

  const lonSig = chart.planets.map((p) => `${p.name}:${Math.round(p.longitude)}`).join(',')
  const memoKey = `${birthYear}|${loc.latitude},${loc.longitude}|${lonSig}`
  const hit = _memo.get(memoKey)
  if (hit) return hit

  const natalLonByPlanet = new Map(chart.planets.map((p) => [p.name, p.longitude]))
  const cache = createCache()

  // 필요한 나이 합집합만 샘플(중복 제거) — 이벤트 창들이 겹치면 차트 공유.
  const agesNeeded = new Set<number>()
  for (const t of TARGETS) {
    if (!natalLonByPlanet.has(t.planet)) continue
    for (let a = t.window[0]; a <= t.window[1]; a++) agesNeeded.add(a)
  }

  const lonByAge = new Map<number, Map<string, number>>()
  await Promise.all(
    [...agesNeeded].map(async (age) => {
      try {
        const tc = await getCachedTransitChart({
          iso: `${birthYear + age}-07-01T12:00:00.000Z`,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timeZone: loc.timeZone,
          inMemoryCache: cache,
        })
        lonByAge.set(age, new Map(tc.planets.map((p) => [p.name, p.longitude])))
      } catch (err) {
        logger.warn(`[outerMilestones] transit chart failed at age ${age} — skipping sample`, err)
      }
    })
  )

  // 만 나이 앵커 — 실제 생일. 이벤트 시각(연 실수) → 만 나이/연도 환산에 사용.
  const birthAnchorMs = Date.UTC(birthYear, (natal.input?.month ?? 1) - 1, natal.input?.date ?? 1)

  const out: LifecycleMilestoneOverride[] = []
  for (const t of TARGETS) {
    const natalLon = natalLonByPlanet.get(t.planet)
    if (natalLon == null) continue

    // 창 안 매년의 부호 편차 — 0 교차(부호 반전) 구간을 찾는다.
    const samples: Array<{ age: number; err: number }> = []
    for (let a = t.window[0]; a <= t.window[1]; a++) {
      const lons = lonByAge.get(a)
      const lon = lons?.get(t.planet)
      if (lon == null) continue
      samples.push({ age: a, err: signedErr(lon, natalLon, t.angle) })
    }
    const resolved = resolveMilestoneFromSamples({
      kind: t.kind,
      samples,
      yearlyMotion: t.yearlyMotion,
      birthYear,
      birthAnchorMs,
    })
    if (resolved) out.push(resolved)
  }

  if (_memo.size >= _MEMO_MAX) {
    const oldest = _memo.keys().next().value
    if (oldest !== undefined) _memo.delete(oldest)
  }
  _memo.set(memoKey, out)
  return out
}
