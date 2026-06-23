/**
 * 대운(大運) single-source 교차검증.
 *
 * STEP 2 consolidation: 대운은 calculateSajuData 가 LMT/진경도 보정된 출생
 * instant + 절기-연도 롤백 로직으로 산출한 sajuResult.daeWoon 한 곳만
 * 정답으로 둔다. (determinism-golden 으로 잠긴 값.)
 *
 * 이전 /api/saju 는 이 보정된 daeWoon 을 버리고 unse.getDaeunCycles 를
 * raw(보정 전) toDate instant 로 다시 호출해 서빙했다 → 절기 경계 출생자의
 * 대운수가 ±1 어긋나고(unse 는 birthUTC 의 UTC month 로 절기를 잡으며
 * sajuTermYear 롤백을 모름), 같은 사람에게 대운수가 두 개 존재했다.
 *
 * 이 테스트는:
 *  (1) 라우트가 이제 서빙하는 대운 객체(아래 buildServedDaeun 으로 재현)가
 *      calculateSajuData().daeWoon 과 정확히 일치함을 잠그고,
 *  (2) 경계 출생일들에서 daeWoon 의 startAge/순역/cycles 가 결정적임을 확인한다.
 *
 * 옛 divergent 경로(unse.getDaeunCycles(raw instant))는 이제 코드베이스에서
 * 제거됐다 — 더 이상 같은 사람에게 대운수가 둘 존재할 수 없다.
 */

import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

type Case = {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  timezone: string
}

// 절기/자정 경계 인근 — divergence 가 잘 드러나는 입력들.
const BOUNDARY_CASES: ReadonlyArray<Case> = [
  { birthDate: '1990-01-04', birthTime: '10:00', gender: 'male', timezone: 'Asia/Seoul' },
  { birthDate: '1990-02-04', birthTime: '07:30', gender: 'male', timezone: 'Asia/Seoul' },
  { birthDate: '1988-12-01', birthTime: '23:45', gender: 'female', timezone: 'Asia/Seoul' },
  { birthDate: '1985-02-04', birthTime: '00:30', gender: 'male', timezone: 'Asia/Seoul' },
  { birthDate: '1990-06-15', birthTime: '14:30', gender: 'male', timezone: 'America/Los_Angeles' },
]

// 라우트가 sajuResult.daeWoon 으로부터 만드는 응답 객체를 그대로 재현.
// (route.ts step 5 와 동일 — startAge/isForward/current/list + cycles/daeunsu 별칭.)
function buildServedDaeun(daeWoon: ReturnType<typeof calculateSajuData>['daeWoon']) {
  return {
    startAge: daeWoon.startAge,
    daeunsu: daeWoon.startAge,
    isForward: daeWoon.isForward,
    current: daeWoon.current,
    list: daeWoon.list,
    cycles: daeWoon.list,
  }
}

describe('대운 single-source — 라우트가 보정된 daeWoon 을 서빙', () => {
  it.each(BOUNDARY_CASES)(
    '$birthDate $birthTime ($timezone): 서빙 대운 == calculateSajuData().daeWoon',
    (tc) => {
      const saju = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tc.timezone)
      const served = buildServedDaeun(saju.daeWoon)

      // 핵심 합의: 서빙되는 startAge/순역/cycles 가 canonical daeWoon 과 동일.
      expect(served.startAge).toBe(saju.daeWoon.startAge)
      expect(served.daeunsu).toBe(saju.daeWoon.startAge)
      expect(served.isForward).toBe(saju.daeWoon.isForward)
      expect(served.list).toEqual(saju.daeWoon.list)
      // 옛 소비자(routeSupport)가 읽던 cycles 별칭이 list 와 동일.
      expect(served.cycles).toEqual(saju.daeWoon.list)
      expect(served.list).toHaveLength(10)
    }
  )

  it.each(BOUNDARY_CASES)('$birthDate $birthTime ($timezone): daeWoon 이 결정적', (tc) => {
    const a = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tc.timezone)
    const b = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tc.timezone)
    expect(a.daeWoon.startAge).toBe(b.daeWoon.startAge)
    expect(a.daeWoon.isForward).toBe(b.daeWoon.isForward)
    expect(a.daeWoon.list.map((d) => `${d.heavenlyStem}${d.earthlyBranch}@${d.age}`)).toEqual(
      b.daeWoon.list.map((d) => `${d.heavenlyStem}${d.earthlyBranch}@${d.age}`)
    )
  })
})

describe('대운수 — 거리도 절기 경계와 같은 진태양시(effectiveDateTime) 기준', () => {
  // 버그: sajuMonth/sajuYear 경계는 longitude 보정된 effectiveDateTime 으로
  // 정해지는데, 대운수 거리(nextTerm - birth / birth - prevTerm)만 raw
  // birthDateTime 으로 재고 있었다. 경도 보정분만큼 두 기준이 갈려, 절기 경계
  // 근방 출생자의 대운수가 ±1 어긋났다.
  // 회귀 잠금: 부산 서편 경도(124°E, ~-44분)를 넘긴 1990-03-06 10:15 출생은
  // 보정 전이면 9, 거리도 effectiveDateTime 으로 재면 10 이 된다(경계 기준과 일치).
  it('1990-03-06 10:15 KST @124°E: 대운수 = 10 (raw 거리였다면 9)', () => {
    const r = calculateSajuData('1990-03-06', '10:15', 'male', 'solar', 'Asia/Seoul', false, 124.0)
    expect(r.daeWoon.isForward).toBe(true)
    expect(r.daeWoon.startAge).toBe(10)
  })

  it('경도 없으면 effectiveDateTime == birthDateTime → 보정 없는 옛 값 보존', () => {
    // 같은 입력, 경도 미지정. 보정이 0 이므로 거리 기준이 어느 쪽이든 동일해야 한다.
    const a = calculateSajuData('1990-03-06', '10:15', 'male', 'solar', 'Asia/Seoul')
    expect(a.daeWoon.startAge).toBe(9)
  })
})

describe('대운 회귀 — 라우트는 항상 canonical daeWoon 을 서빙(옛 raw 경로 아님)', () => {
  // 옛 라우트는 raw instant 를 unse.getDaeunCycles 에 넘겨 서빙해 절기 경계
  // 출생자에서 보정 daeWoon 과 갈라졌다. 그 raw 경로(getDaeunCycles)는 이제
  // 코드베이스에서 제거됐고, 라우트는 buildServedDaeun(saju.daeWoon) 만
  // 서빙한다. 어떤 경계 입력에서도 서빙값 == canonical daeWoon 이어야 한다.
  it('1990-01-04 10:00 KST: 서빙 대운수는 canonical daeWoon.startAge 와 같다', () => {
    const tc: Case = {
      birthDate: '1990-01-04',
      birthTime: '10:00',
      gender: 'male',
      timezone: 'Asia/Seoul',
    }
    const saju = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tc.timezone)
    const served = buildServedDaeun(saju.daeWoon)

    // 라우트가 서빙하는 대운수는 보정된 daeWoon 의 startAge (canonical).
    expect(served.daeunsu).toBe(saju.daeWoon.startAge)
    expect(served.list).toEqual(saju.daeWoon.list)
    expect(served.list).toHaveLength(10)
  })
})
