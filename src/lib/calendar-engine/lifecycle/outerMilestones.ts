/* ============================================================
   calculateOuterPlanetMilestones — 생애 마디의 실측 순간(단일 출처).
   ────────────────────────────────────────────────────────────
   목성·토성·카이런·천왕성 회귀, 외행성 상현 사각·마주봄, 진행 달 회귀 — 모든 생애 마디는
   하늘에서 잰 정확 순간이다. 인생 화면(마디·단계 카드), 캘린더 라이프사이클 신호, 그
   신호를 부모로 한 교차와 인생 '이 10년의 겹침'이 모두 이 함수의 같은 결과를 읽는다
   (G6 · 재감사 AC-1/AC-3/AC-5/CC-1). astroLifecycle 의 평균 나이표는 아래 탐색 창을
   정할 때의 씨앗일 뿐 날짜·나이로 쓰지 않는다.

   방법: kind 별 탐색 창에서 부호 있는 편차
   f(t) = wrap180(λ_트랜짓(t) − λ_본명 − 목표각) 을 일 단위(토성·목성은 5일)로
   스캔해 *첫 번째* 0 교차를 찾고, 이분법으로 분 단위까지 좁힌다. 그 순간이
   exactAt(UTC)·exactDateISO(출생지 날짜), 나이는 그 순간의 만 나이(currentManAge).
   이어 같은 역행 묶음의 나머지 통과(이전 통과에서 500일 안의 다음 교차)를 모아
   lastExactAt·passCount 를 정하고, 통과 창(window)을 잰다: 첫 통과로 이어지는 접근에서
   |f| ≤ 1° 가 된 순간 ~ 마지막 통과 뒤 |f| > 1° 가 되는 순간(LIFECYCLE_ORB_DEG).

   탐색 창(만 나이)은 1900–2050 출생 전수 스윕(G6)의 실제 범위를 넉넉히 덮는다. 명왕성
   이심률 때문에 상현 사각은 35.6세(1965–75 출생)부터 88세(2050 출생)까지 벌어져 창을
   25–100세로 둔다(예전 30–50세 창은 2000년 이후·1926년 이전 출생을 놓치고 평균표 36세로
   떨어졌다 — AC-1). 창 안(사람의 한평생 안)에 교차가 없거나 천체력이 실패하면 그 마디는
   빠진다 — 평균 나이표로 채우지 않는다.

   진행 달 회귀(progressed_lunar_1)는 2차 진행(하루 = 1년, 365.25일, progressions.ts 와
   같은 규약): 실제 시각 t 의 진행 달 = 달(출생 JD + (t − 출생 JD)/365.25). 진행 달이 본명
   달로 돌아오는 순간 = 출생 + T × 365.25일(T ≈ 27.2–27.5일) — 예전 'birthYear + 27' 은 8월
   하순 이후 출생자에게 한 해 이르렀다(AC-5).

   옛 구현은 매년 7/1 샘플의 |wrap180| 에 포물선을 맞췄다 — 회귀는 |sep| 이 0 에
   접할 뿐 부호가 안 바뀌어 V 자 곡선에 포물선을 씌운 셈이라 토성 회귀가 중앙값
   155일·최대 334일 어긋나고 나이도 25명 중 10명 틀렸다(감사 ASTRO-3).

   비용: 행성 1개 황경만 swe_calc_ut 로 직접 계산(트랜짓 차트·하우스 없음).
   목표에서 먼 구간·1° 안쪽은 속도 상한으로 안전하게 건너뛰어 본명당 약 2~3천 회(~10ms),
   결과는 프로세스 메모로 본명당 1회 — 캘린더 빌드(연·월·일)와 인생 화면이 메모를 공유한다.
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
import type { AstroLifecycleEventKind, LifecycleMilestone } from './astroLifecycle'

interface Target {
  kind: AstroLifecycleEventKind
  planet: string
  /** 목표각 (트랜짓 − 본명) — 0 회귀 · 90 상현 사각 · 180 마주봄. */
  angle: 0 | 90 | 180
  /** 탐색 창(만 나이, 창 끝 해 포함). 1900–2050 출생의 실제 범위 + 여유. */
  window: [number, number]
  /** 목표각 근처 스캔 간격(일) — 토성·목성·진행 달 5일, 느린 외행성 1일. */
  stepDays: number
  /** 지심 황경 속도 상한(°/일, 넉넉히) — 목표에서 먼 구간을 안전하게 건너뛰는 데 쓴다. */
  maxRate: number
  /** 2차 진행(하루 = 1년) — 진행 달 회귀만. f 의 시간축은 실제 시각, 천체 위치는 진행 시각. */
  progressed?: boolean
}

// 창 옆 주석 = 1900–2050 출생 스윕의 실제 첫 통과 나이 범위(G6, Swiss Ephemeris).
const TARGETS: Target[] = [
  // 11.3–12.0세
  {
    kind: 'jupiter_return_1',
    planet: 'Jupiter',
    angle: 0,
    window: [9, 15],
    stepDays: 5,
    maxRate: 0.3,
  },
  // 23.2–23.9세
  {
    kind: 'jupiter_return_2',
    planet: 'Jupiter',
    angle: 0,
    window: [21, 27],
    stepDays: 5,
    maxRate: 0.3,
  },
  // 27.2–27.5세 — 진행 달은 하루 최대 ~15.4° → 실제 하루 15.4/365.25 ≈ 0.042°.
  {
    kind: 'progressed_lunar_1',
    planet: 'Moon',
    angle: 0,
    window: [25, 29],
    stepDays: 5,
    maxRate: 0.045,
    progressed: true,
  },
  // 28.4–29.9세
  {
    kind: 'saturn_return_1',
    planet: 'Saturn',
    angle: 0,
    window: [26, 33],
    stepDays: 5,
    maxRate: 0.2,
  },
  // 35.2–35.9세
  {
    kind: 'jupiter_return_3',
    planet: 'Jupiter',
    angle: 0,
    window: [33, 39],
    stepDays: 5,
    maxRate: 0.3,
  },
  // 35.6–88.1세 — 명왕성 이심률: 근일점 근처(1965–75 출생)는 30대 중반, 느린 구간
  // (1900–1925·2000년 이후 출생)은 50~80대. 한평생(100세) 안의 첫 교차.
  {
    kind: 'pluto_square_pluto',
    planet: 'Pluto',
    angle: 90,
    window: [25, 99],
    stepDays: 1,
    maxRate: 0.06,
  },
  // 38.7–44.5세
  {
    kind: 'uranus_opposition',
    planet: 'Uranus',
    angle: 180,
    window: [33, 49],
    stepDays: 1,
    maxRate: 0.1,
  },
  // 38.7–42.1세
  {
    kind: 'neptune_square',
    planet: 'Neptune',
    angle: 90,
    window: [33, 49],
    stepDays: 1,
    maxRate: 0.06,
  },
  // 48.4–50.9세 (두 번째 회귀는 98–101세라 창 밖)
  {
    kind: 'chiron_return',
    planet: 'Chiron',
    angle: 0,
    window: [44, 55],
    stepDays: 1,
    maxRate: 0.2,
  },
  // 58.2–59.0세
  {
    kind: 'saturn_return_2',
    planet: 'Saturn',
    angle: 0,
    window: [55, 62],
    stepDays: 5,
    maxRate: 0.2,
  },
  // 58.5–59.8세
  {
    kind: 'jupiter_return_5',
    planet: 'Jupiter',
    angle: 0,
    window: [57, 63],
    stepDays: 5,
    maxRate: 0.3,
  },
  // 82.4–84.0세
  {
    kind: 'uranus_return',
    planet: 'Uranus',
    angle: 0,
    window: [76, 89],
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
/**
 * 통과 창 오브(°) — 첫 통과로 이어지는 접근에서 정확각 1° 안에 든 순간부터 마지막 통과 뒤
 * 1° 밖으로 나가는 순간까지가 마디의 활성 창이다(캘린더 신호·교차·10년 겹침).
 */
export const LIFECYCLE_ORB_DEG = 1
/** 같은 역행 묶음의 다음 통과는 이전 통과에서 이 안(일) — 합(회합) 주기 ~367–399일 + 여유.
 *  다음 회귀(목성 ~12년·진행 달 ~27년)와는 겹치지 않는다. */
const CLUSTER_GAP_DAYS = 500
/** 한 묶음의 통과 수 상한 — 명왕성 느린 구간에서 7회까지 관측(G6 스윕). */
const MAX_PASSES = 9
/** 1° 창 가장자리 탐색 한도(일) — 정류 근처 접근이라도 이 안에서 끝난다. */
const EDGE_LIMIT_DAYS = 1500

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

/**
 * 순수 파트 — 첫 통과 firstJD 에 이어지는 같은 역행 묶음의 모든 통과 JD(첫 통과 포함, 시간순).
 * 이전 통과 직후(이분법 폭 너머)부터 CLUSTER_GAP_DAYS 안의 다음 0 교차를 차례로 찾는다.
 */
export function findPassClusterJD(
  f: (jd: number) => number,
  firstJD: number,
  stepDays: number,
  maxRate?: number
): number[] {
  const passes = [firstJD]
  while (passes.length < MAX_PASSES) {
    const prev = passes[passes.length - 1]
    const from = prev + BISECT_EPS_DAYS
    const next = findFirstCrossingJD(f, from, prev + CLUSTER_GAP_DAYS, stepDays, maxRate)
    if (next == null || next <= from) break
    passes.push(next)
  }
  return passes
}

/**
 * 순수 파트 — fromJD(|f| ≤ orb 인 통과 순간)에서 direction 쪽으로 걸어 |f| 가 처음 orb 를
 * 넘는 경계를 이분법으로 찾는다. 이어진 1° 구간의 끝이다. |f| 가 r 이면 orb 까지 최소
 * (orb − r)/maxRate 일이 걸리므로 그만큼은 안전하게 건너뛴다. limitDays 안에 못 나가면 한도.
 */
export function findOrbEdgeJD(
  f: (jd: number) => number,
  fromJD: number,
  direction: 1 | -1,
  orb: number,
  stepDays: number,
  maxRate?: number,
  limitDays: number = EDGE_LIMIT_DAYS
): number {
  const limitJD = fromJD + direction * limitDays
  const beyond = (jd: number) => (direction > 0 ? jd >= limitJD : jd <= limitJD)
  let jdIn = fromJD
  let rIn = Math.abs(f(jdIn))
  while (!beyond(jdIn)) {
    const safe = maxRate && maxRate > 0 ? (0.9 * Math.max(0, orb - rIn)) / maxRate : 0
    let next = jdIn + direction * Math.max(stepDays, safe)
    if (beyond(next)) next = limitJD
    const rNext = Math.abs(f(next))
    if (rNext > orb) {
      let inside = jdIn
      let outside = next
      while (Math.abs(outside - inside) > BISECT_EPS_DAYS) {
        const mid = (inside + outside) / 2
        if (Math.abs(f(mid)) > orb) outside = mid
        else inside = mid
      }
      return (inside + outside) / 2
    }
    jdIn = next
    rIn = rNext
  }
  return limitJD
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
const _memo = new Map<string, LifecycleMilestone[]>()
const _MEMO_MAX = 256

/**
 * 본명 → 생애 마디 실측 목록(LifecycleMilestone — 첫 통과·마지막 통과·통과 창).
 * 실패(에페메리스 오류·창 안에 교차 없음·행성 없음)한 kind 는 목록에서 빠진다 — 평균
 * 나이표로 채우지 않는다(buildLifecycleTiming 도 실측 kind 만 싣는다).
 */
export async function calculateOuterPlanetMilestones(
  natal: NatalContext
): Promise<LifecycleMilestone[]> {
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
    logger.warn(
      '[outerMilestones] ephemeris or natal instant unavailable — milestones omitted',
      err
    )
    return []
  }

  const natalLonByPlanet = new Map(chart.planets.map((p) => [p.name, p.longitude]))
  // Chiron 은 차트 행성 목록(getPlanetList)에 없는 소행성이라 본명 위치를 여기서 직접 잰다
  // (seas_18.se1). 소행성 파일이 없으면 계산 실패 → 그 마디만 빠진다(평균표로 채우지 않음).
  const extraIds: Record<string, number | undefined> = { Chiron: swisseph.SE_CHIRON }
  for (const [name, id] of Object.entries(extraIds)) {
    if (natalLonByPlanet.has(name) || typeof id !== 'number') continue
    try {
      const res = swisseph.swe_calc_ut(natalJD, id, flags)
      throwIfSwissEphError(res, `natal ${name} longitude`)
      natalLonByPlanet.set(name, extractSwissLongitude(res))
    } catch (err) {
      logger.warn(`[outerMilestones] natal ${name} unavailable — milestone omitted`, err)
    }
  }

  const isoOf = (jd: number) => new Date(jdToMs(jd)).toISOString()
  const out: LifecycleMilestone[] = []
  for (const t of TARGETS) {
    const natalLon = natalLonByPlanet.get(t.planet)
    const planetId = planetIds[t.planet] ?? extraIds[t.planet]
    if (natalLon == null || planetId == null) continue
    try {
      const bodyLon = (jd: number) => {
        const res = swisseph.swe_calc_ut(jd, planetId, flags)
        throwIfSwissEphError(res, `${t.planet} longitude`)
        return extractSwissLongitude(res)
      }
      // 진행(하루 = 1년): 실제 시각 jd 의 진행 천체 = 출생 JD + 경과 연수(일).
      const lonAt = t.progressed
        ? (jd: number) => bodyLon(natalJD + (jd - natalJD) / DAYS_PER_YEAR)
        : bodyLon
      const f = (jd: number) => signedErr(lonAt(jd), natalLon, t.angle)
      const exactJD = findFirstCrossingJD(
        f,
        natalJD + t.window[0] * DAYS_PER_YEAR,
        natalJD + (t.window[1] + 1) * DAYS_PER_YEAR,
        t.stepDays,
        t.maxRate
      )
      if (exactJD == null) continue
      const passes = findPassClusterJD(f, exactJD, t.stepDays, t.maxRate)
      const lastJD = passes[passes.length - 1]
      const windowStartJD = findOrbEdgeJD(f, exactJD, -1, LIFECYCLE_ORB_DEG, t.stepDays, t.maxRate)
      const windowEndJD = findOrbEdgeJD(f, lastJD, 1, LIFECYCLE_ORB_DEG, t.stepDays, t.maxRate)
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
        exactAt: isoOf(exactJD),
        lastExactAt: isoOf(lastJD),
        passCount: passes.length,
        window: { start: isoOf(windowStartJD), end: isoOf(windowEndJD) },
      })
    } catch (err) {
      logger.warn(`[outerMilestones] ${t.kind} scan failed — milestone omitted`, err)
    }
  }

  if (_memo.size >= _MEMO_MAX) {
    const oldest = _memo.keys().next().value
    if (oldest !== undefined) _memo.delete(oldest)
  }
  _memo.set(memoKey, out)
  return out
}
