// @vitest-environment node
/**
 * 외행성 마일스톤(감사 A-3 · 엔진 감사 E5 ASTRO-3) — 순수 교차 로직 + 배선 회귀.
 *
 * vitest 전역 ephe 모의는 궤도 운동을 내지 않아(고정 위치 + jd%365 잔변동) 실
 * 회귀 시점을 검증할 수 없다. 실 swisseph 대 astronomy-engine 검산은
 * tests/lib/calendar-engine/outerMilestones.real.node.test.ts 가 맡고, 여기서는
 * 위험이 몰린 *순수 부분*(부호 있는 편차·첫 교차 스캔·감김 점프 무시·이분법)과
 * buildLifecycleTiming 배선을 잠근다.
 */
import { describe, it, expect } from 'vitest'
import {
  wrap180,
  signedErr,
  findFirstCrossingJD,
  findPassClusterJD,
  findOrbEdgeJD,
  LIFECYCLE_ORB_DEG,
} from '@/lib/calendar-engine/lifecycle/outerMilestones'
import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'

const BIRTH_YEAR = 1995

describe('wrap180 / signedErr — 각도 math', () => {
  it('wrap180 은 (-180,180] 로 감싼다', () => {
    expect(wrap180(0)).toBe(0)
    expect(wrap180(190)).toBe(-170)
    expect(wrap180(-190)).toBe(170)
    expect(wrap180(540)).toBe(180)
  })

  it('signedErr — 회귀(0°)는 합치 전 음수, 지나면 양수 (부호가 실제로 바뀐다)', () => {
    expect(signedErr(100, 100, 0)).toBe(0)
    expect(signedErr(99, 100, 0)).toBeCloseTo(-1, 6)
    expect(signedErr(110, 100, 0)).toBeCloseTo(10, 6)
    // 0°/360° 경계를 넘어도 연속 — 본명 359°, 트랜짓 1° → +2.
    expect(signedErr(1, 359, 0)).toBeCloseTo(2, 6)
  })

  it('signedErr — 사각(90°)은 트랜짓이 본명보다 90° 앞설 때 0, 마주봄(180°)은 180°', () => {
    expect(signedErr(190, 100, 90)).toBeCloseTo(0, 6)
    expect(signedErr(185, 100, 90)).toBeCloseTo(-5, 6)
    expect(signedErr(280, 100, 180)).toBeCloseTo(0, 6)
    expect(signedErr(282, 100, 180)).toBeCloseTo(2, 6)
  })
})

describe('findFirstCrossingJD — 첫 0 교차 스캔 + 이분법', () => {
  it('단조 증가 함수의 근을 1분 이내로 잡는다', () => {
    // f(jd) = 0.3 × (jd − 1000.37) — 근 1000.37
    const jd = findFirstCrossingJD((x) => 0.3 * (x - 1000.37), 900, 1100, 5)
    expect(jd).not.toBeNull()
    expect(Math.abs(jd! - 1000.37)).toBeLessThan(1 / 1440)
  })

  it('역행 루프의 여러 교차 중 *첫* 교차를 고른다', () => {
    // 근 3개(역행으로 세 번 통과) — 10, 40, 70. 첫 통과 10 을 돌려야 한다.
    const f = (x: number) => (x - 10) * (x - 40) * (x - 70) * 1e-4
    const jd = findFirstCrossingJD(f, 0, 100, 1)
    expect(jd).not.toBeNull()
    expect(Math.abs(jd! - 10)).toBeLessThan(1 / 1440)
  })

  it('±180° 감김 점프는 교차가 아니다 — wrap180 의 +180→-180 를 건너뛴다', () => {
    // 트랜짓이 본명 반대편(+180)을 지나는 순간 signedErr 는 +179.x → -179.x 로 뛴다.
    // 실제 합(0 교차)은 그 뒤 jd 300 에서 일어난다.
    const transitLon = (jd: number) => 100 + 180 * ((jd - 100) / 200) // jd 100 → 반대편, 300 → 합
    const natal = 280 // jd 100 에서 transit=100 → sep 180, jd 300 에서 transit=280 → 합
    const jd = findFirstCrossingJD((x) => signedErr(transitLon(x), natal, 0), 50, 400, 5)
    expect(jd).not.toBeNull()
    expect(Math.abs(jd! - 300)).toBeLessThan(1 / 1440)
  })

  it('창 안에 교차가 없으면 null (그 마디는 빠진다)', () => {
    expect(findFirstCrossingJD(() => 5, 0, 100, 5)).toBeNull()
    expect(findFirstCrossingJD((x) => x + 1, 0, 100, 5)).toBeNull()
  })

  it('잘못된 창·간격은 null', () => {
    expect(findFirstCrossingJD((x) => x - 50, 100, 0, 5)).toBeNull()
    expect(findFirstCrossingJD((x) => x - 50, 0, 100, 0)).toBeNull()
  })

  it('창 시작에서 정확히 0 이면 그 시점', () => {
    expect(findFirstCrossingJD((x) => x - 10, 10, 100, 5)).toBe(10)
  })

  it('maxRate 건너뛰기는 전수 스캔과 같은 첫 교차를 더 적은 평가로 찾는다', () => {
    // 역행 루프가 있는 합성 황경 — 평균 0.1°/일 + 진폭 3° 주기 400일 흔들림(속도 상한 ≈0.15°/일).
    const lon = (jd: number) => 0.1 * jd + 3 * Math.sin((2 * Math.PI * jd) / 400)
    const natal = 1234.5 % 360
    let fullCalls = 0
    let skipCalls = 0
    const full = findFirstCrossingJD((x) => (fullCalls++, signedErr(lon(x), natal, 0)), 0, 8000, 1)
    const skip = findFirstCrossingJD(
      (x) => (skipCalls++, signedErr(lon(x), natal, 0)),
      0,
      8000,
      1,
      0.2
    )
    expect(full).not.toBeNull()
    expect(Math.abs(skip! - full!)).toBeLessThan(1 / 1440) // same crossing, to bisection width
    expect(skipCalls).toBeLessThan(fullCalls / 5)
  })
})

describe('findPassClusterJD — 같은 역행 묶음의 모든 통과', () => {
  it('역행 루프의 세 통과(10, 40, 70)를 첫 통과에서 모두 모은다', () => {
    const f = (x: number) => (x - 10) * (x - 40) * (x - 70) * 1e-4
    const first = findFirstCrossingJD(f, 0, 100, 1)!
    const passes = findPassClusterJD(f, first, 1)
    expect(passes).toHaveLength(3)
    expect(passes.map((p) => Math.round(p))).toEqual([10, 40, 70])
  })

  it('다음 통과가 500일 넘게 떨어지면 다른 묶음(다음 회귀)이라 모으지 않는다', () => {
    // 근 10, 40 (한 묶음) 과 900 (다음 회귀) — 40 뒤로는 음수로 머물다 900 에서 교차.
    const f = (x: number) => (x < 60 ? Math.sin((Math.PI * (x - 10)) / 30) : (x - 900) * 1e-3)
    const passes = findPassClusterJD(f, 10, 1)
    expect(passes.map((p) => Math.round(p))).toEqual([10, 40])
  })

  it('한 번만 지나면 [첫 통과]', () => {
    const passes = findPassClusterJD((x) => 0.3 * (x - 1000.37), 1000.37, 5)
    expect(passes).toHaveLength(1)
  })
})

describe('findOrbEdgeJD — 1° 통과 창 가장자리', () => {
  it('통과 창 오브는 1°', () => {
    expect(LIFECYCLE_ORB_DEG).toBe(1)
  })

  it('하루 0.1° 로 움직이면 통과 ±10일이 1° 경계(1분 이내)', () => {
    const f = (x: number) => 0.1 * (x - 500)
    expect(Math.abs(findOrbEdgeJD(f, 500, -1, 1, 1) - 490)).toBeLessThan(1 / 1440)
    expect(Math.abs(findOrbEdgeJD(f, 500, 1, 1, 1, 0.15) - 510)).toBeLessThan(1 / 1440)
  })

  it('이어진 1° 구간의 끝 — 앞선 접근이 1° 를 스쳤다 물러난 것은 창에 넣지 않는다', () => {
    // x<300: 0.5° 까지 다가왔다 물러남(|f|≥0.5), 300~400: 1° 밖, 400 이후 다시 접근해 500 통과.
    const f = (x: number) =>
      x < 300 ? 0.5 + Math.abs(x - 200) * 0.01 : x < 400 ? 2 : 0.1 * (x - 500)
    const start = findOrbEdgeJD(f, 500, -1, 1, 1)
    expect(start).toBeGreaterThan(400)
    expect(Math.abs(start - 490)).toBeLessThan(1 / 1440)
  })

  it('한도 안에 1° 밖으로 못 나가면 한도', () => {
    expect(findOrbEdgeJD(() => 0.2, 0, 1, 1, 1, undefined, 50)).toBe(50)
  })
})

describe('buildLifecycleTiming — 실측 배선(평균표 폴백 없음)', () => {
  it('실측 kind 는 실측 연도·만 나이, 실측이 없는 kind 는 빠진다', () => {
    const { events } = buildLifecycleTiming(
      [{ kind: 'saturn_return_1', startYear: 2023, age: 28, exactDateISO: '2023-11-02' }],
      { endYear: BIRTH_YEAR + 90, isKo: true, now: new Date('2026-07-06T00:00:00Z') }
    )
    expect(events.map((e) => [e.event, e.startYear, e.age])).toEqual([
      ['saturn_return_1', 2023, 28],
    ])
    expect(events.find((e) => e.event === 'jupiter_return_1')).toBeUndefined()
  })
})
