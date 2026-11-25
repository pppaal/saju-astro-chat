/* ============================================================
   calculateOuterPlanetMilestones — 외행성 회귀/각 마일스톤 실측.
   ────────────────────────────────────────────────────────────
   astroLifecycle 의 고정 나이표(토성회귀=29 등)는 평균 근사라, 실제 회귀가
   28세/31세인 사람은 인생 곡선(실 ephemeris)과 마일스톤 점이 서로 다른 해를
   가리켰다(감사 A-3). buildLifecycleTiming 의 override 훅은 처음부터 있었지만
   이 계산기가 없어 프로덕션이 항상 undefined 를 넘겼다 — 그 구현이 이 파일이다.

   방법: 이벤트별 탐색 창(평균 나이 ±수년)에서 부호 있는 편차
   f(t) = wrap180(λ_트랜짓(t) − λ_본명 − 목표각) 을 일 단위(토성·목성은 5일)로
   스캔해 *첫 번째* 0 교차를 찾고, 이분법으로 분 단위까지 좁힌다. 그 순간이
   exactDateISO, 나이는 그 순간의 만 나이(currentManAge — 출생 시간대 생일 기준).
   교차가 창 안에 없으면 그 kind 는 빠지고 평균 테이블로 폴백.

   옛 구현은 매년 7/1 샘플의 |wrap180| 에 포물선을 맞췄다 — 회귀는 |sep| 이 0 에
   접할 뿐 부호가 안 바뀌어 V 자 곡선에 포물선을 씌운 셈이라 토성 회귀가 중앙값
   155일·최대 334일 어긋나고 나이도 25명 중 10명 틀렸다(감사 ASTRO-3).

   비용: 행성 1개 황경만 swe_calc_ut 로 직접 계산(트랜짓 차트·하우스 없음).
   목표에서 먼 구간은 속도 상한으로 안전하게 건너뛰어(findFirstCrossingJD) 본명당
   약 1~2천 회, 결과는 프로세스 메모로 본명당 1회. 진행달 회귀
   (progressed_lunar_1)는 트랜짓이 아니라 여기서 다루지 않는다(테이블 유지).
   ============================================================ */

import { getSwisseph } from '@/lib/astrology/foundation/ephe'
import {
  extractSwissLongitude,
  getPlanetList,
  getSwissEphFlags,
  natalToJD,
  throwIfSwissEphError,
} from '@/lib/astrology/foundation/shared'
import { currentManAge } from '@/lib/datetime/currentAge'
import { logger } from '@/lib/logger'
import type { NatalContext } from '../context/types'
import type { AstroLifecycleEventKind, LifecycleMilestoneOverride } from './astroLifecycle'

interface Target {
  kind: AstroLifecycleEventKind
  planet: string
  /** 목표각 (트랜짓 − 본명) — 0 회귀 · 90 상현 사각 · 180 마주봄. */
  angle: 0 | 90 | 180
  /** 탐색 창(만 나이, 창 끝 해 포함). 평균 나이표 ± 여유. */
  window: [number, number]
  /** 목표각 근처 스캔 간격(일) — 토성·목성 5일, 느린 외행성 1일. */
  stepDays: number
  /** 지심 황경 속도 상한(°/일, 넉넉히) — 목표에서 먼 구간을 안전하게 건너뛰는 데 쓴다. */
  maxRate: number
}

const TARGETS: Target[] = [
  {
    kind: 'jupiter_return_1',
    planet: 'Jupiter',
    angle: 0,
    window: [9, 15],
    stepDays: 5,
    maxRate: 0.3,
  },
  {
    kind: 'jupiter_return_2',
    planet: 'Jupiter',
    angle: 0,
    window: [21, 27],
    stepDays: 5,
    maxRate: 0.3,
  },
  {
    kind: 'saturn_return_1',
    planet: 'Saturn',
    angle: 0,
    window: [26, 33],
    stepDays: 5,
    maxRate: 0.2,
  },
  {
    kind: 'jupiter_return_3',
    planet: 'Jupiter',
    angle: 0,
    window: [33, 39],
    stepDays: 5,
    maxRate: 0.3,
  },
  // 명왕성 이심률 — 세대에 따라 실제 나이가 30대 초~40대 후반까지 벌어진다.
  {
    kind: 'pluto_square_pluto',
    planet: 'Pluto',
    angle: 90,
    window: [30, 50],
    stepDays: 1,
    maxRate: 0.06,
  },
  {
    kind: 'uranus_opposition',
    planet: 'Uranus',
    angle: 180,
    window: [38, 45],
    stepDays: 1,
    maxRate: 0.1,
  },
  {
    kind: 'neptune_square',
    planet: 'Neptune',
    angle: 90,
    window: [38, 45],
    stepDays: 1,
    maxRate: 0.06,
  },
  {
    kind: 'chiron_return',
    planet: 'Chiron',
    angle: 0,
    window: [46, 54],
    stepDays: 1,
    maxRate: 0.2,
  },
  {
    kind: 'saturn_return_2',
    planet: 'Saturn',
    angle: 0,
    window: [55, 62],
    stepDays: 5,
    maxRate: 0.2,
  },
  {
    kind: 'jupiter_return_5',
    planet: 'Jupiter',
    angle: 0,
    window: [57, 63],
    stepDays: 5,
    maxRate: 0.3,
  },
  {
    kind: 'uranus_return',
    planet: 'Uranus',
    angle: 0,
    window: [80, 87],
    stepDays: 1,
    maxRate: 0.1,
  },
]

const DAYS_PER_YEAR = 365.25
/** 한 스캔 간격에 실제 0 교차라면 f 가 움직일 수 있는 최대 폭(°) — 목성 5일 ≈ 1.3°.
 *  이보다 크게 부호가 바뀌면 ±180° 감김(wrap) 점프이지 교차가 아니다. */
const MAX_STEP_JUMP_DEG = 10
/** 이분법 종료 폭(일) — 약 1분. */
const BISECT_EPS_DAYS = 1 / 1440

/** (-180, 180] 로 감싼 각도차. */
export function wrap180(deg: number): number {
  let d = deg % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

/**
 * 목표각 대비 *부호 있는* 편차 — wrap180(트랜짓 − 본명 − 목표각).
 * 트랜짓이 목표각을 지나는 순간 부호가 바뀐다(회귀도 마찬가지 — 옛 |sep| 기반
 * 편차는 회귀에서 0 에 접만 하고 부호가 안 바뀌었다).
 */
export function signedErr(transitLon: number, natalLon: number, angle: 0 | 90 | 180): number {
  return wrap180(transitLon - natalLon - angle)
}

/**
 * 순수 파트 — [startJD, endJD] 를 stepDays 간격으로 스캔해 f 의 *첫* 0 교차를
 * 찾고 이분법으로 좁힌 JD 를 돌려준다. 없으면 null.
 * 부호가 바뀌어도 |f0 − f1| 가 MAX_STEP_JUMP_DEG 를 넘으면 ±180° 감김이라 건너뛴다.
 *
 * maxRate(°/일, f 변화율 상한)를 주면 목표에서 먼 구간을 건너뛴다: |f| 가 r 이면
 * 0 에 닿기까지 최소 r/maxRate 일이 걸리므로 그 안엔 교차가 있을 수 없다(안전한
 * 건너뛰기 — 목표 근처에선 다시 stepDays 간격). 결과는 일 단위 전수 스캔과 같다.
 *
 * 에페메리스와 분리돼 합성 함수로 테스트 가능(vitest 전역 ephe 모의는 궤도 운동을
 * 내지 않는다).
 */
export function findFirstCrossingJD(
  f: (jd: number) => number,
  startJD: number,
  endJD: number,
  stepDays: number,
  maxRate?: number
): number | null {
  if (!(endJD > startJD) || !(stepDays > 0)) return null
  let jd0 = startJD
  let f0 = f(jd0)
  if (f0 === 0) return jd0
  while (jd0 < endJD) {
    const safeSkip = maxRate && maxRate > 0 ? (0.9 * Math.abs(f0)) / maxRate : 0
    const jd1 = Math.min(jd0 + Math.max(stepDays, safeSkip), endJD)
    const f1 = f(jd1)
    if (f1 === 0) return jd1
    if (Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) <= MAX_STEP_JUMP_DEG) {
      let lo = jd0
      let hi = jd1
      const loSign = Math.sign(f0)
      while (hi - lo > BISECT_EPS_DAYS) {
        const mid = (lo + hi) / 2
        const fm = f(mid)
        if (fm === 0) return mid
        if (Math.sign(fm) === loSign) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    jd0 = jd1
    f0 = f1
  }
  return null
}

const jdToMs = (jd: number) => (jd - 2440587.5) * 86_400_000

/** 순간 → 출생 시간대 달력 날짜 'YYYY-MM-DD'. */
function localDateISO(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
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
  const input = natal.input
  const birthYear = input?.year
  const loc = natal.astro?.location
  const chart = natal.astro?.chart
  if (!birthYear || !loc || !chart) return []
  const timeZone = loc.timeZone || input.timeZone
  const birthMonth = input.month ?? 1
  const birthDate = input.date ?? 1

  const lonSig = chart.planets.map((p) => `${p.name}:${Math.round(p.longitude)}`).join(',')
  const memoKey = `${birthYear}-${birthMonth}-${birthDate} ${input.hour ?? ''}:${input.minute ?? ''}|${timeZone}|${loc.latitude},${loc.longitude}|${lonSig}`
  const hit = _memo.get(memoKey)
  if (hit) return hit

  // 출생 순간(UT JD) — 차트 meta 가 있으면 그것, 없으면 본명 입력에서 환산.
  let natalJD: number
  let swisseph: ReturnType<typeof getSwisseph>
  let flags: number
  let planetIds: Record<string, number>
  try {
    swisseph = getSwisseph()
    flags = getSwissEphFlags()
    planetIds = getPlanetList()
    natalJD =
      chart.meta?.jdUT ??
      natalToJD({
        year: birthYear,
        month: birthMonth,
        date: birthDate,
        hour: input.hour ?? 12,
        minute: input.minute ?? 0,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timeZone,
      })
  } catch (err) {
    logger.warn('[outerMilestones] ephemeris or natal instant unavailable — table fallback', err)
    return []
  }

  const natalLonByPlanet = new Map(chart.planets.map((p) => [p.name, p.longitude]))
  // Chiron 은 차트 행성 목록(getPlanetList)에 없는 소행성이라 본명 위치를 여기서 직접 잰다
  // (seas_18.se1). 예전엔 목록에 없어 chiron_return 이 늘 평균 테이블(49~51세)로 떨어졌다.
  // 소행성 파일이 없으면 계산 실패 → 그 kind 만 테이블 폴백(나이 범위 표기 그대로).
  const extraIds: Record<string, number | undefined> = { Chiron: swisseph.SE_CHIRON }
  for (const [name, id] of Object.entries(extraIds)) {
    if (natalLonByPlanet.has(name) || typeof id !== 'number') continue
    try {
      const res = swisseph.swe_calc_ut(natalJD, id, flags)
      throwIfSwissEphError(res, `natal ${name} longitude`)
      natalLonByPlanet.set(name, extractSwissLongitude(res))
    } catch (err) {
      logger.warn(`[outerMilestones] natal ${name} unavailable — table fallback`, err)
    }
  }

  const out: LifecycleMilestoneOverride[] = []
  for (const t of TARGETS) {
    const natalLon = natalLonByPlanet.get(t.planet)
    const planetId = planetIds[t.planet] ?? extraIds[t.planet]
    if (natalLon == null || planetId == null) continue
    try {
      const lonAt = (jd: number) => {
        const res = swisseph.swe_calc_ut(jd, planetId, flags)
        throwIfSwissEphError(res, `${t.planet} longitude`)
        return extractSwissLongitude(res)
      }
      const exactJD = findFirstCrossingJD(
        (jd) => signedErr(lonAt(jd), natalLon, t.angle),
        natalJD + t.window[0] * DAYS_PER_YEAR,
        natalJD + (t.window[1] + 1) * DAYS_PER_YEAR,
        t.stepDays,
        t.maxRate
      )
      if (exactJD == null) continue
      const ms = jdToMs(exactJD)
      const exactDateISO = localDateISO(ms, timeZone)
      out.push({
        kind: t.kind,
        startYear: Number(exactDateISO.slice(0, 4)),
        age: currentManAge({
          birthYear,
          birthMonth,
          birthDate,
          birthTimeZone: timeZone,
          now: new Date(ms),
        }),
        exactDateISO,
      })
    } catch (err) {
      logger.warn(`[outerMilestones] ${t.kind} scan failed — table fallback`, err)
    }
  }

  if (_memo.size >= _MEMO_MAX) {
    const oldest = _memo.keys().next().value
    if (oldest !== undefined) _memo.delete(oldest)
  }
  _memo.set(memoKey, out)
  return out
}
