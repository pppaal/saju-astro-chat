// @vitest-environment node
/**
 * 외행성 마일스톤(감사 A-3) — 순수 교차 로직 + 배선 회귀.
 *
 * 실 ephemeris 통합은 vitest 전역 ephe 모의가 궤도 운동을 내지 않아(고정 위치 +
 * jd%365 잔변동) 검증 불가라, 실 swisseph 검산은 tsx 스모크로 별도 확인했고
 * (토성회귀 만28 · 목성회귀 만12/24 · 간격 ~11.86년), 여기서는 위험이 몰린
 * *순수 부분*(부호 반전 검출·선형 보간·창 밖 폴백)과 buildLifecycleTiming 배선을
 * 잠근다.
 */
import { describe, it, expect } from 'vitest'
import {
  wrap180,
  signedErr,
  resolveMilestoneFromSamples,
} from '@/lib/calendar-engine/lifecycle/outerMilestones'
import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'

const BIRTH_YEAR = 1995
// 만 나이 앵커 — 1995-02-09.
const ANCHOR = Date.UTC(1995, 1, 9)

describe('wrap180 / signedErr — 각도 math', () => {
  it('wrap180 은 (-180,180] 로 감싼다', () => {
    expect(wrap180(0)).toBe(0)
    expect(wrap180(190)).toBe(-170)
    expect(wrap180(-190)).toBe(170)
    expect(wrap180(540)).toBe(180)
  })

  it('signedErr — 회귀(0°)는 합치 시 음수→양수 반전', () => {
    // 트랜짓이 본명에 정확히 겹치면 sep=0 → err=-angle(=0). 벌어지면 양수.
    expect(signedErr(100, 100, 0)).toBe(0)
    expect(signedErr(110, 100, 0)).toBeCloseTo(10, 6)
    // 사각(90°) — 90° 벌어지면 0.
    expect(signedErr(190, 100, 90)).toBeCloseTo(0, 6)
    // 마주봄(180°) — 180° 벌어지면 0.
    expect(signedErr(280, 100, 180)).toBeCloseTo(0, 6)
  })
})

describe('resolveMilestoneFromSamples — 순수 교차 검출', () => {
  it('부호 반전 구간을 선형 보간해 회귀 나이를 잡는다(만28~29 사이 교차)', () => {
    // 토성 회귀 창(만 26~33) — err 이 28세 −2, 29세 +4 로 반전 → 보간 exact ≈ 28.33.
    const samples = [
      { age: 26, err: -8 },
      { age: 27, err: -5 },
      { age: 28, err: -2 },
      { age: 29, err: 4 },
      { age: 30, err: 9 },
    ]
    const r = resolveMilestoneFromSamples({
      kind: 'saturn_return_1',
      samples,
      yearlyMotion: 12.2,
      birthYear: BIRTH_YEAR,
      birthAnchorMs: ANCHOR,
    })
    expect(r).not.toBeNull()
    // frac = -2/(-2-4) = 0.333 → 만 나이 28.
    expect(r!.age).toBe(28)
    expect(r!.startYear).toBe(BIRTH_YEAR + 28)
    expect(r!.exactDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('반전이 없고 최소 편차가 크면 null(창 밖 → 테이블 폴백)', () => {
    // 전부 큰 양수(한 번도 각에 근접 못 함) → yearlyMotion*0.6=7.32 초과라 null.
    const samples = [
      { age: 30, err: 20 },
      { age: 31, err: 18 },
      { age: 32, err: 16 },
    ]
    const r = resolveMilestoneFromSamples({
      kind: 'saturn_return_1',
      samples,
      yearlyMotion: 12.2,
      birthYear: BIRTH_YEAR,
      birthAnchorMs: ANCHOR,
    })
    expect(r).toBeNull()
  })

  it('반전은 없지만 최소 편차가 이동량 60% 이내면 그 해를 채택', () => {
    const samples = [
      { age: 40, err: 5 },
      { age: 41, err: 1 }, // |1| < 2.4*0.6=1.44 → 채택
      { age: 42, err: 3 },
    ]
    const r = resolveMilestoneFromSamples({
      kind: 'pluto_square_pluto',
      samples,
      yearlyMotion: 2.4,
      birthYear: BIRTH_YEAR,
      birthAnchorMs: ANCHOR,
    })
    expect(r).not.toBeNull()
    expect(r!.age).toBe(41)
  })

  it('샘플 2개 미만이면 null', () => {
    expect(
      resolveMilestoneFromSamples({
        kind: 'saturn_return_1',
        samples: [{ age: 29, err: 0 }],
        yearlyMotion: 12.2,
        birthYear: BIRTH_YEAR,
        birthAnchorMs: ANCHOR,
      })
    ).toBeNull()
  })

  it('F1: 회귀(무교차)도 이웃 비대칭이면 sub-year 시점을 복원 — 항상 7/1 조작값 아님', () => {
    const samples = [
      { age: 28, err: 9 },
      { age: 29, err: 1 },
      { age: 30, err: 5 },
    ]
    const r = resolveMilestoneFromSamples({
      kind: 'saturn_return_1',
      samples,
      yearlyMotion: 12.2,
      birthYear: BIRTH_YEAR,
      birthAnchorMs: ANCHOR,
    })
    expect(r).not.toBeNull()
    expect(r!.exactDateISO!.slice(5)).not.toBe('07-01')
  })

  it('F1: 대칭 이웃이면 7/1 근처(꼭짓점 offset 0) — 회귀', () => {
    const samples = [
      { age: 28, err: 5 },
      { age: 29, err: 1 },
      { age: 30, err: 5 },
    ]
    const r = resolveMilestoneFromSamples({
      kind: 'saturn_return_1',
      samples,
      yearlyMotion: 12.2,
      birthYear: BIRTH_YEAR,
      birthAnchorMs: ANCHOR,
    })
    expect(r!.exactDateISO!.slice(5)).toBe('07-01')
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
