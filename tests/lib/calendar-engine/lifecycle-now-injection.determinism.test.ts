import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { deriveLifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'

/**
 * 결정성 회귀 — lifecycle/lifetime-pivot 체인이 벽시계(`new Date()`)를 계산
 * 깊숙이 읽지 않고 주입된 `now` 만 사용하는지 잠근다.
 *
 * 옛 상태: buildLifecycleTiming 이 `new Date().getUTCFullYear()` 를, deriveLifetimePivots
 * 가 `currentManAge(now 미주입)` 를 직접 읽어 같은 입력이라도 실행 시점(연도/생일
 * 통과 여부)에 따라 isPast/isCurrent/isUpcoming·phase 가 달라졌다. 이제 `now` 가
 * 주입 가능(기본값 new Date())이라 고정하면 출력이 완전히 재현된다.
 */
const P = {
  birthDate: '1990-05-15',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('lifecycle now-injection 결정성', () => {
  it('buildLifecycleTiming: 같은 now → 동일 출력, 다른 now → 플래그만 결정론적으로 이동', () => {
    const birthYear = 1990

    const at2020a = buildLifecycleTiming(
      birthYear,
      birthYear + 90,
      true,
      undefined,
      new Date('2020-06-15T00:00:00Z')
    )
    const at2020b = buildLifecycleTiming(
      birthYear,
      birthYear + 90,
      true,
      undefined,
      new Date('2020-12-31T23:59:59Z')
    )
    // 같은 기준 연도(2020) → isPast/isCurrent/isUpcoming 까지 완전 동일
    expect(at2020a).toEqual(at2020b)

    const at2050 = buildLifecycleTiming(
      birthYear,
      birthYear + 90,
      true,
      undefined,
      new Date('2050-06-15T00:00:00Z')
    )
    // 30년 뒤 기준이면 더 많은 마일스톤이 과거가 되어 있어야 한다 (시점에 따라 결정론적으로 이동).
    const pastAt2020 = at2020a.events.filter((e) => e.isPast).length
    const pastAt2050 = at2050.events.filter((e) => e.isPast).length
    expect(pastAt2050).toBeGreaterThan(pastAt2020)

    // 이벤트 정의(연도/라벨) 자체는 now 와 무관 — 동일해야 한다.
    expect(at2050.events.map((e) => e.startYear)).toEqual(at2020a.events.map((e) => e.startYear))
  })

  it('buildLifecycleTiming: now 미지정 시에도 프로덕션 동작(기본 new Date()) 유지', () => {
    const birthYear = 1990
    const withDefault = buildLifecycleTiming(birthYear, birthYear + 90)
    const withExplicitNow = buildLifecycleTiming(
      birthYear,
      birthYear + 90,
      true,
      undefined,
      new Date()
    )
    // 기본값 경로와 명시 now=오늘 경로의 연/라벨 정의는 동일.
    expect(withDefault.events.map((e) => [e.event, e.startYear])).toEqual(
      withExplicitNow.events.map((e) => [e.event, e.startYear])
    )
  })

  it('deriveLifetimePivots: 같은 now 면 완전 재현, 다른 now 면 phase 가 결정론적으로 변함', async () => {
    const saju = calculateSajuData(P.birthDate, P.birthTime, P.gender, 'solar', P.timeZone)
    const natal = await buildNatalContext(P, { saju })

    const now2020 = new Date('2020-06-15T12:00:00Z')
    const a = deriveLifetimePivots(natal, 'ko', undefined, now2020)
    const b = deriveLifetimePivots(natal, 'ko', undefined, now2020)
    // 동일 now → 비트 단위로 재현 (clock 누수 없음)
    expect(a).toEqual(b)

    const now2055 = new Date('2055-06-15T12:00:00Z')
    const c = deriveLifetimePivots(natal, 'ko', undefined, now2055)
    // pivot 정의(나이/연도/라벨)는 now 무관 — 동일
    expect(c.pivots.map((p) => [p.age, p.year])).toEqual(a.pivots.map((p) => [p.age, p.year]))
    // 2055 기준이면 2020 기준보다 'past' phase pivot 이 더 많아야 한다 (35년 경과).
    const pastA = a.pivots.filter((p) => p.phase === 'past').length
    const pastC = c.pivots.filter((p) => p.phase === 'past').length
    expect(pastC).toBeGreaterThan(pastA)
  })
})
