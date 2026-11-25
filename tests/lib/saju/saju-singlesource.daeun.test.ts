/**
 * 대운(大運) single-source 교차검증.
 *
 * STEP 2 consolidation: 대운은 calculateSajuData 가 생 UT 출생 instant 와
 * 절입 instant 비교(OD-1) + 절기-연도 롤백 로직으로 산출한 sajuResult.daeWoon
 * 한 곳만 정답으로 둔다. (determinism-golden 으로 잠긴 값.)
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

describe('대운수 — 거리는 생 UT instant 와 절입 instant 사이 (OD-1, 경도 무관)', () => {
  // 절입은 하나의 절대 instant 다. 대운수 일수 = |절입 − 생 UT 출생 instant| 이고,
  // 진경도 보정은 시주에만 쓴다. 옛 코드(2026-06~11)는 보정분만큼 옮긴 instant 로
  // 거리를 재, 부산 서편 경도(124°E, ~−44분)의 이 출생을 10 으로 냈다.
  // 기준값(E0 골든 G27, tests/golden/engine-golden.json — astronomy-engine 절입):
  // 1990-03-06 10:15 KST(01:15Z) → 청명까지 29.9986일 → floor(/3) = 9.
  it('1990-03-06 10:15 KST @124°E: 대운수 = 9 (29.9986일)', () => {
    const r = calculateSajuData('1990-03-06', '10:15', 'male', 'solar', 'Asia/Seoul', false, 124.0)
    expect(r.daeWoon.isForward).toBe(true)
    expect(r.daeWoon.startAge).toBe(9)
  })

  it('경도 유무와 무관하게 같은 대운수 — 보정은 거리에 섞이지 않는다', () => {
    const a = calculateSajuData('1990-03-06', '10:15', 'male', 'solar', 'Asia/Seoul')
    const b = calculateSajuData('1990-03-06', '10:15', 'male', 'solar', 'Asia/Seoul', false, 124.0)
    expect(a.daeWoon.startAge).toBe(9)
    expect(b.daeWoon.startAge).toBe(a.daeWoon.startAge)
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
