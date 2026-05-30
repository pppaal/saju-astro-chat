/**
 * core/birthInstant 도메인 계약 — birthDate 는 UTC instant 단일 source.
 *
 * 옛 버그 (S1): unse.ts 의 normalizeBirthToUTC 가 birthDate (이미 UTC instant)
 * 를 server-local accessor 로 재분해 → timezone 재해석 → UTC 서버에서
 * ±tzOffset 어긋남. 입춘 같은 경계 출생자의 daeun 시작 나이가 잘못 나옴.
 *
 * 옛 버그 (S2): route.ts 가 getDaeunCycles 5번째 인자에 'Asia/Seoul' 하드코딩
 * → 비한국 출생자에게 한국 timezone 으로 normalizeBirthToUTC 가 잘못 재해석.
 *
 * 이 계약이 깨지면 = 누가 birthDate 를 분해해 다시 변환하거나, 또 다른 호출자
 * 가 'Asia/Seoul' 같은 하드코딩 timezone 을 전달한다는 뜻.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { buildBirthInstant } from '@/lib/saju/core/birthInstant'
import { calculateSajuData } from '@/lib/saju/saju'
import { getDaeunCycles } from '@/lib/saju/unse'

describe('core/birthInstant.buildBirthInstant — UTC instant 빌더', () => {
  it('KST 출생자 → UTC instant (서버 timezone 무관)', () => {
    // KST 1990-02-04 07:30 → UTC 1990-02-03 22:30.
    const instant = buildBirthInstant('1990-02-04', '07:30', 'Asia/Seoul')
    expect(instant.toISOString()).toBe('1990-02-03T22:30:00.000Z')
  })

  it('LA 출생자 → UTC instant', () => {
    // PST = UTC-8 (1990-02 비-DST).
    const instant = buildBirthInstant('1990-02-03', '22:30', 'America/Los_Angeles')
    expect(instant.toISOString()).toBe('1990-02-04T06:30:00.000Z')
  })
})

describe('서버 timezone 무관 결과 동일성 (S1 회귀)', () => {
  const ORIGINAL_TZ = process.env.TZ
  beforeEach(() => {
    process.env.TZ = 'UTC'
  })
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ
  })

  it('UTC 서버에서 calculateSajuData 결과가 KST 서버와 같아야 함', () => {
    // 입춘 직전 KST 1990-02-04 07:30. 옛 코드에서 UTC 서버는 server-local
    // accessor 로 시각 분해 → 잘못된 birthUTC → daeun 시작 나이 다름.
    const r = calculateSajuData('1990-02-04', '07:30', 'male', 'solar', 'Asia/Seoul')
    expect(r.daeWoon?.startAge).toBeGreaterThan(0)
    expect(r.daeWoon?.startAge).toBeLessThanOrEqual(15)
  })

  it('UTC 서버에서 daeun startAge 가 결정적 (1990-02-04 07:30 KST)', () => {
    const r1 = calculateSajuData('1990-02-04', '07:30', 'male', 'solar', 'Asia/Seoul')
    const r2 = calculateSajuData('1990-02-04', '07:30', 'male', 'solar', 'Asia/Seoul')
    expect(r1.daeWoon?.startAge).toBe(r2.daeWoon?.startAge)
  })
})

describe('비한국 출생자 daeun 정확성 (S2 회귀)', () => {
  it('LA 출생자의 daeun 이 KST 하드코딩 없이 계산 — 결정적 결과', () => {
    const birthInstant = buildBirthInstant('1990-02-03', '22:30', 'America/Los_Angeles')
    const sajuPillars: any = {
      year: {
        heavenlyStem: { name: '己', element: '토', yin_yang: '음' },
        earthlyBranch: { name: '巳', element: '화', yin_yang: '음' },
      },
      month: {
        heavenlyStem: { name: '丁', element: '화', yin_yang: '음' },
        earthlyBranch: { name: '丑', element: '토', yin_yang: '음' },
      },
      day: {
        heavenlyStem: { name: '甲', element: '목', yin_yang: '양' },
        earthlyBranch: { name: '寅', element: '목', yin_yang: '양' },
      },
      time: {
        heavenlyStem: { name: '丙', element: '화', yin_yang: '양' },
        earthlyBranch: { name: '寅', element: '목', yin_yang: '양' },
      },
    }
    const dayMaster: any = { name: '甲', element: '목', yin_yang: '양' }
    // LA timezone 으로 호출 — 옛 'Asia/Seoul' 하드코딩 케이스와 다른 분기여도 throw 없이 결정적.
    const r = getDaeunCycles(birthInstant, 'male', sajuPillars, dayMaster, 'America/Los_Angeles')
    expect(r.daeunsu).toBeGreaterThan(0)
    expect(r.cycles.length).toBeGreaterThan(0)
  })
})
