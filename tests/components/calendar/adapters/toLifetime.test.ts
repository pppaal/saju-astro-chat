// @vitest-environment node
/**
 * toLifetime — 만 나이 SSOT(감사 B1) 회귀.
 *
 * 곡선 nowAge·대운/ZR now 플래그·lifePattern 시제가 전부 manAge 를 따라야 한다.
 * 예전엔 toLifetime 이 연차 나이(currentYear−birthYear)를 자체 계산해, 생일 전
 * 사용자에게 "지금" 위치가 milestones(만 나이)보다 1살 앞섰다.
 */
import { describe, it, expect } from 'vitest'
import { toLifetime } from '@/components/calendar/adapters/toLifetime'
import { makeNatal } from './_fixtures'
import type { LifeCurve } from '@/lib/calendar-engine/derivers/lifeCurve'

// 대운 스파인 — 21세부터 10년 단위(간지·startAge 만 쓰인다).
const natal = makeNatal({
  daeun: [
    { stem: '乙', branch: '亥', startAge: 21 },
    { stem: '甲', branch: '戌', startAge: 31 },
    { stem: '癸', branch: '酉', startAge: 41 },
  ] as never,
})

// macro 곡선 — 진폭 충분(게이트 통과), 나이축 0..90.
const curve: LifeCurve = {
  points: Array.from({ length: 91 }, (_, age) => ({
    age,
    year: 1995 + age,
    macro: 0.1 + ((age % 30) / 30) * 0.8,
    combined: 0,
  })) as never,
  peaks: [{ age: 34, year: 2029 }] as never,
  troughs: [{ age: 27, year: 2022 }] as never,
  nowAge: 0,
}

describe('toLifetime — 만 나이 SSOT', () => {
  it('lifeCurve.nowAge 는 manAge 를 쓴다(연차 나이 아님)', () => {
    // 생일 전: currentYear−birthYear = 31 이지만 manAge = 30.
    const lt = toLifetime(natal, {
      birthYear: 1995,
      currentYear: 2026,
      manAge: 30,
      lifeCurve: curve,
    })
    expect(lt.lifeCurve?.nowAge).toBe(30)
  })

  it('대운 now 플래그가 manAge 로 판정 — 31세 대운이 아니라 30세는 21세 대운', () => {
    // manAge 30 → 21~31 구간(乙亥)이 지금. 연차 나이 31 이면 甲戌(31~41)로 어긋났다.
    const lt = toLifetime(natal, {
      birthYear: 1995,
      currentYear: 2026,
      manAge: 30,
      lifeCurve: curve,
    })
    const nowDw = lt.daewoon.find((d) => d.now)
    expect(nowDw?.gz.hanja).toBe('乙亥')
    expect(nowDw?.startAge).toBe(21)
  })

  it('manAge 미지정 시 연차 나이 폴백(하위호환)', () => {
    const lt = toLifetime(natal, {
      birthYear: 1995,
      currentYear: 2026,
      lifeCurve: curve,
    })
    expect(lt.lifeCurve?.nowAge).toBe(31)
  })
})
