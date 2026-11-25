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

  it('창 안에 교차가 없으면 null (테이블 폴백)', () => {
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

describe('F2: LifecycleEntry.age — 만 나이 노출', () => {
  it('override 면 실측 만 나이, 아니면 테이블 나이를 age 로 노출', () => {
    const { events } = buildLifecycleTiming(
      1990,
      2080,
      true,
      [{ kind: 'saturn_return_1', startYear: 2019, age: 28, exactDateISO: '2019-11-02' }],
      new Date('2026-07-07T00:00:00Z')
    )
    expect(events.find((e) => e.event === 'saturn_return_1')!.age).toBe(28)
    expect(events.find((e) => e.event === 'jupiter_return_1')!.age).toBe(12)
  })
})

describe('buildLifecycleTiming — override 배선', () => {
  it('override 가 있으면 그 연도로, 없으면 birthYear+표나이로', () => {
    const overrides = [
      { kind: 'saturn_return_1' as const, startYear: 2023, age: 28, exactDateISO: '2023-11-02' },
    ]
    const withOv = buildLifecycleTiming(
      BIRTH_YEAR,
      BIRTH_YEAR + 90,
      true,
      overrides,
      new Date('2026-07-06T00:00:00Z')
    )
    const withoutOv = buildLifecycleTiming(
      BIRTH_YEAR,
      BIRTH_YEAR + 90,
      true,
      undefined,
      new Date('2026-07-06T00:00:00Z')
    )
    const w = withOv.events.find((e) => e.event === 'saturn_return_1')!
    const t = withoutOv.events.find((e) => e.event === 'saturn_return_1')!
    expect(w.startYear).toBe(2023) // 실측 override
    expect(t.startYear).toBe(BIRTH_YEAR + 29) // 표 폴백(고정 29)
  })
})
