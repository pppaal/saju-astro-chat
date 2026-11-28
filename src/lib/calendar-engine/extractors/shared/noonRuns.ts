/**
 * 정오 샘플 '연속 구간(run)' 을 빌드 범위 밖까지 이어 찾는 공용 도구 (엔진 감사 X1).
 *
 * 트랜짓·품위·달 위상 추출기는 매일 현지 정오 차트로 상태를 보고, 같은 상태가 이어지는
 * 날들을 한 신호(창 = 첫 정오 ~ 마지막 정오)로 묶는다. 예전엔 그 날들을 *빌드 범위 안*
 * 에서만 봐서 창과 weight(가장 타이트한 orb)가 범위에 따라 달라졌다 — 1일 빌드(포커스
 * 셀)는 한 달 짜리 트랜짓을 정오 한 순간으로 잘라, 같은 날의 교차가 월 빌드와 갈렸다.
 *
 * 규칙: 셀의 신호·교차는 (본명, 날짜) 만의 함수다(CLAUDE.md 결정론). 그래서 범위 가장
 * 자리에 닿은 run 은 천체력으로 범위 밖까지 이어서 *진짜* 시작·끝 정오를 찾는다.
 *   · 행성 위치는 calculateTransitChart 와 같은 JD(isoToJD(현지 정오))·같은 플래그로
 *     swe_calc_ut 한 번 — 값이 차트와 비트 단위로 같다(Redis 차트 캐시를 거치지 않는다).
 *   · 건너뛰기: 하루 최대 이동량(MAX_DAILY_MOTION, 1900–2100 실측 × 1.25)으로, 경계까지
 *     남은 각도 / 최대 이동량 일수 안에는 상태가 못 바뀐다는 것을 이용해 그만큼 한 번에
 *     건너뛴다(격자 없음 — 어느 범위에서 시작해도 같은 날을 경계로 찾는다).
 *   · 최소 orb 는 분기 한정(branch and bound): 두 샘플 사이 날들의 orb 하한
 *     (a + b − v·간격)/2 이 지금 최소보다 크면 건너뛰고, 아니면 가운데를 잰다 — 정오
 *     격자 위의 정확한 최소.
 *   · 상한 RUN_CAP_DAYS — 외행성 합(오브 8.4°)은 10년 가까이 이어져 400일 상한이면
 *     weight 가 범위 따라 달라진다. 건너뛰기 덕에 긴 상한도 평가 수십 번이면 끝난다.
 */

import { getSwisseph } from '@/lib/astrology/foundation/ephe'
import {
  getPlanetList,
  isoToJD,
  extractSwissLongitude,
  extractLongitudeSpeed,
} from '@/lib/astrology/foundation/shared'

const DAY_MS = 86_400_000

/** run 을 범위 밖으로 잇는 최대 일수(한쪽). 외행성 합의 연속 오브 구간(≈ 10년)을 덮는다. */
const RUN_CAP_DAYS = 4400

/**
 * 하루 최대 황경 이동(°/일) — 1900–2100 Swiss Ephemeris 실측 최대 × 1.25 여유.
 * (Sun 1.02 · Moon 15.39 · Mercury 2.20 · Venus 1.26 · Mars 0.79 · Jupiter 0.24 ·
 *  Saturn 0.13 · Uranus 0.065 · Neptune 0.041 · Pluto 0.041 · True Node 0.26)
 * 모르는 천체는 MAX_DAILY_MOTION_FALLBACK — 사실상 하루씩 걷는다.
 */
const MAX_DAILY_MOTION: Record<string, number> = {
  Sun: 1.3,
  Moon: 19.5,
  Mercury: 2.8,
  Venus: 1.6,
  Mars: 1.0,
  Jupiter: 0.31,
  Saturn: 0.17,
  Uranus: 0.085,
  Neptune: 0.055,
  Pluto: 0.055,
  'True Node': 0.33,
  'Mean Node': 0.33,
}
const MAX_DAILY_MOTION_FALLBACK = 360

export function maxDailyMotion(planet: string): number {
  return MAX_DAILY_MOTION[planet] ?? MAX_DAILY_MOTION_FALLBACK
}

/** 'YYYY-MM-DD' ± n 일. */
export function shiftDay(dayIso: string, n: number): string {
  return new Date(Date.parse(`${dayIso}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

/** 두 'YYYY-MM-DD' 사이 일수(b − a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY_MS)
}

/** 빌드 범위가 샘플하는 날들 — 추출기들이 쓰는 'range.start 부터 하루씩' 그대로. */
export function rangeDays(range: { start: string; end: string }): string[] {
  const out: string[] = []
  const start = new Date(range.start).getTime()
  const end = new Date(range.end).getTime()
  for (let t = start; t <= end; t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

export interface NoonPosition {
  longitude: number
  speed?: number
}

/**
 * 정오 위치 메모 — (행성, 날, 타임존) 은 사용자와 무관한 결정적 값이라 프로세스 단위로
 * 공유한다(같은 타임존 사용자의 다음 빌드는 천체력을 다시 부르지 않는다). 상한을 넘으면
 * 통째로 비운다 — 메모일 뿐 정합성 의존이 아니다.
 */
const NOON_MEMO_LIMIT = 60_000
const noonMemo = new Map<string, NoonPosition | null>()
const noonJdMemo = new Map<string, number>()

function memoSet<V>(memo: Map<string, V>, key: string, value: V): void {
  if (memo.size >= NOON_MEMO_LIMIT) memo.clear()
  memo.set(key, value)
}

/**
 * 그 날 현지 정오의 행성 위치 — calculateTransitChart 와 같은 계산(같은 JD·플래그 →
 * 값 동일). 실패하면 null.
 */
export function noonPlanetPosition(
  planet: string,
  dayIso: string,
  timeZone: string
): NoonPosition | null {
  const key = `${planet}|${dayIso}|${timeZone}`
  const hit = noonMemo.get(key)
  if (hit !== undefined) return hit
  let value: NoonPosition | null = null
  try {
    const id = getPlanetList()[planet]
    if (typeof id === 'number') {
      const sw = getSwisseph()
      const jdKey = `${dayIso}|${timeZone}`
      let jd = noonJdMemo.get(jdKey)
      if (jd === undefined) {
        jd = isoToJD(`${dayIso}T12:00:00`, timeZone)
        memoSet(noonJdMemo, jdKey, jd)
      }
      const res = sw.swe_calc_ut(jd, id, sw.SEFLG_SPEED)
      if (!('error' in res)) {
        value = { longitude: extractSwissLongitude(res), speed: extractLongitudeSpeed(res) }
      }
    }
  } catch {
    value = null
  }
  memoSet(noonMemo, key, value)
  return value
}

/** run 위 한 정오 샘플 — value = 판정값(orb 등), lon = 그 날 황경(있으면 하한을 조인다). */
export interface RunSample {
  day: string
  value: number
  lon?: number
}

export interface RunEdge {
  /** run 의 끝(방향 쪽) 정오 날짜. */
  edgeDay: string
  /** 잰 샘플들 — 최소 orb 탐색용. 앵커 포함. */
  samples: RunSample[]
}

/**
 * 앵커(상태가 켜진 날)에서 direction 쪽으로 run 의 마지막 날을 찾는다.
 *
 * @param sampleOn 그 날의 샘플 — 상태가 꺼졌으면 null.
 * @param marginOf 샘플 → 경계까지 남은 각도(°). 그 각도 / vmax 일 안에는 못 꺼진다.
 * @param vmax     하루 최대 이동(°).
 */
export function extendRun(args: {
  anchor: RunSample
  direction: -1 | 1
  vmax: number
  sampleOn: (dayIso: string) => RunSample | null
  marginOf: (sample: RunSample) => number
  capDays?: number
}): RunEdge {
  const { anchor, direction, vmax, sampleOn, marginOf } = args
  const cap = args.capDays ?? RUN_CAP_DAYS
  const samples: RunSample[] = [anchor]
  let off = 0
  let cur = anchor
  while (off < cap) {
    // k 일 안에는 경계를 못 넘는다 — 그 사이 날들은 전부 켜져 있다.
    let k = vmax > 0 ? Math.floor(marginOf(cur) / vmax) : 0
    if (k < 1) k = 1
    k = Math.min(k, cap - off)
    const next = sampleOn(shiftDay(anchor.day, direction * (off + k)))
    if (next !== null) {
      off += k
      cur = next
      samples.push(next)
      continue
    }
    if (k === 1) break // 바로 다음 날이 꺼짐 → off 가 run 의 끝
    // 최대 이동 가정이 깨진 경우(모의 천체력 등) — 켜진 off 와 꺼진 off+k 사이를 이분.
    let lo = off
    let hi = off + k
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      const v = sampleOn(shiftDay(anchor.day, direction * mid))
      if (v !== null) {
        lo = mid
        samples.push(v)
      } else hi = mid
    }
    off = lo
    break
  }
  return { edgeDay: shiftDay(anchor.day, direction * off), samples }
}

/**
 * 하루 황경 2차 차분 최대(°/일²) — 1900–2100 실측 × 1.5. 두 샘플 사이 실제 황경은 직선
 * 보간에서 acc·x·y/2 이상 벗어나지 못한다(x, y = 양 끝까지 일수) — 분기 한정의 하한을
 * 조여, 느린 행성의 수년짜리 run 도 최소 근처 며칠만 잰다.
 * (Sun 0.00067 · Moon 0.51 · Mercury 0.20 · Venus 0.042 · Mars 0.015 · Jupiter 0.0035 ·
 *  Saturn 0.0019 · Uranus 0.0017 · Neptune 0.0015 · Pluto 0.0011 · True Node 0.053)
 */
const MAX_DAILY_ACCEL: Record<string, number> = {
  Sun: 0.001,
  Moon: 0.77,
  Mercury: 0.3,
  Venus: 0.064,
  Mars: 0.023,
  Jupiter: 0.0053,
  Saturn: 0.0029,
  Uranus: 0.0025,
  Neptune: 0.0023,
  Pluto: 0.0016,
  'True Node': 0.08,
}

export function maxDailyAccel(planet: string): number | undefined {
  return MAX_DAILY_ACCEL[planet]
}

/**
 * 연속 run 위 정오 샘플의 최소값(orb) 과 그 날 — 분기 한정으로 정확히(동점은 이른 날).
 * known 은 이미 잰 run 안 샘플들. 사이 날은 전부 run 안이라 sampleOn 이 null 을 주지
 * 않는다(extendRun 이 보장).
 *
 * 두 샘플 a·b(간격 g일) 사이 날의 하한:
 *   · (a + b − vmax·g) / 2                          — 값이 하루 vmax 넘게 못 변한다.
 *   · orbOfLon(직선 보간 황경) − acc·x·(g−x)/2        — lon·acc·orbOfLon 이 있을 때.
 * 하한이 지금 최소 이하인 틈만 가운데를 잰다.
 */
export function minOverRun(
  known: RunSample[],
  bound: { vmax: number; acc?: number; orbOfLon?: (lon: number) => number },
  sampleOn: (dayIso: string) => RunSample | null
): RunSample {
  const byDay = new Map<string, RunSample>()
  for (const k of known) byDay.set(k.day, k)
  const pts = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  const better = (a: RunSample, b: RunSample) =>
    a.value < b.value || (a.value === b.value && a.day < b.day)
  let best = pts.reduce((acc, x) => (better(x, acc) ? x : acc))
  const { vmax, acc, orbOfLon } = bound

  const lowerBound = (a: RunSample, b: RunSample, gap: number): number => {
    const base = Math.max(0, (a.value + b.value - vmax * gap) / 2)
    if (base > best.value) return base
    if (acc === undefined || !orbOfLon || a.lon === undefined || b.lon === undefined) return base
    if (vmax * gap >= 180) return base // 보간 방향이 모호 — 기본 하한만
    const delta = ((b.lon - a.lon + 540) % 360) - 180
    let lb = Number.POSITIVE_INFINITY
    for (let x = 1; x < gap; x++) {
      const v = orbOfLon(a.lon + (delta * x) / gap) - (acc * x * (gap - x)) / 2
      if (v < lb) lb = v
      if (lb <= best.value) break // 이미 쪼개야 한다
    }
    return Math.max(base, lb)
  }

  const stack: Array<[RunSample, RunSample, number]> = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const g = dayDiff(pts[i].day, pts[i + 1].day)
    if (g > 1) stack.push([pts[i], pts[i + 1], g])
  }
  for (let guard = 0; stack.length > 0 && guard < 20_000; guard++) {
    const [a, b, gap] = stack.pop()!
    if (lowerBound(a, b, gap) > best.value) continue
    const half = Math.floor(gap / 2)
    const midDay = shiftDay(a.day, half)
    // run 안이라 null 이면 안 되지만, 방어적으로 그 날은 무한대로 막는다.
    const mid = sampleOn(midDay) ?? { day: midDay, value: Number.POSITIVE_INFINITY }
    if (better(mid, best)) best = mid
    if (half > 1) stack.push([a, mid, half])
    if (gap - half > 1) stack.push([mid, b, gap - half])
  }
  return best
}
