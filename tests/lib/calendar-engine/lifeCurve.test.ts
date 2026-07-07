import { describe, it, expect } from 'vitest'
import { buildLifeCurve } from '@/lib/calendar-engine/derivers/lifeCurve'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

// buildLifeCurve 의 sync(벨 근사) 경로만 — 실 트랜짓(ephemeris)은 별도.
function makeNatal(over: Partial<{ strength: string }> = {}): NatalContext {
  return {
    input: { year: 1990, month: 5, date: 15, timeZone: 'Asia/Seoul' },
    saju: {
      dayMaster: { name: '辛' },
      strength: over.strength ?? 'weak',
      yongsin: { primary: '토', secondary: undefined, avoid: ['목'] },
      pillars: { day: { earthlyBranch: { name: '酉' } } },
      daeun: [
        { startAge: 5, startYear: 1995, stem: '丁', branch: '丑' },
        { startAge: 15, startYear: 2005, stem: '丙', branch: '子' },
        { startAge: 25, startYear: 2015, stem: '乙', branch: '亥' },
        { startAge: 35, startYear: 2025, stem: '甲', branch: '戌' },
        { startAge: 45, startYear: 2035, stem: '癸', branch: '酉' },
        { startAge: 55, startYear: 2045, stem: '壬', branch: '申' },
        { startAge: 65, startYear: 2055, stem: '辛', branch: '未' },
      ],
    },
  } as unknown as NatalContext
}

const NOW = new Date('2026-06-15T00:00:00Z')

describe('buildLifeCurve (벨 근사 경로)', () => {
  it('span+1 개 연 단위 점을 낸다', () => {
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90 })
    expect(c).not.toBeNull()
    expect(c!.points).toHaveLength(91)
    expect(c!.points[0].age).toBe(0)
    expect(c!.points[90].age).toBe(90)
  })

  it('거시 곡선이 실제로 출렁인다(분산 > 0, 단조 아님)', () => {
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90 })!
    const macro = c.points.map((p) => p.macro)
    const mean = macro.reduce((a, b) => a + b, 0) / macro.length
    const std = Math.sqrt(macro.reduce((a, b) => a + (b - mean) ** 2, 0) / macro.length)
    expect(std).toBeGreaterThan(0.1)
    // 방향 전환이 한 번 이상 — 계단(단조)이 아니라 곡선.
    let turns = 0
    for (let i = 1; i < macro.length - 1; i++) {
      const d1 = Math.sign(macro[i] - macro[i - 1])
      const d2 = Math.sign(macro[i + 1] - macro[i])
      if (d1 && d2 && d1 !== d2) turns++
    }
    expect(turns).toBeGreaterThanOrEqual(2)
  })

  it('초년기 고생이 곡선에 드러난다(유년 성숙 엔벨로프 제거 회귀)', () => {
    // 0~8세에 강한 압박(점성 −3) → 곡선이 그 시기를 *명확히* 저점으로 그려야 한다.
    // 예전엔 0~16세를 평균 쪽으로 당기는 엔벨로프가 초년 굴곡을 지워, 초년이
    // 성인 구간과 비슷한 수준으로 납작해졌다. 이제 엔벨로프가 없어 초년 고생이
    // 그대로 보인다.
    const series = new Array(91).fill(0)
    for (let a = 0; a <= 8; a++) series[a] = -3
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90, astroSeries: series })!
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const childMacro = avg(c.points.slice(0, 7).map((p) => p.macro))
    const adultMacro = avg(c.points.slice(20, 40).map((p) => p.macro))
    // 초년이 성인 구간보다 뚜렷하게 낮다(엔벨로프였다면 평균 쪽으로 눌려 차이 사라짐).
    expect(childMacro).toBeLessThan(adultMacro - 0.3)
  })

  it('마디(peak/trough)를 추출한다', () => {
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90 })!
    expect(c.peaks.length + c.troughs.length).toBeGreaterThan(0)
    for (const e of [...c.peaks, ...c.troughs]) {
      expect(e.age).toBeGreaterThanOrEqual(0)
      expect(e.age).toBeLessThanOrEqual(90)
    }
  })

  it('데이터 결손(일간/대운 없음)이면 null', () => {
    expect(buildLifeCurve({ input: { year: 1990 }, saju: {} } as never, { now: NOW })).toBeNull()
  })

  it('F5: 양 끝(경계) 전역 극값도 마디로 잡는다(단조 상승 → 말년 봉우리·유년 골)', () => {
    // 강한 단조 상승 점성 시계열 → 내부 국지 극값이 없어도 경계가 전역 극값.
    // 옛 루프(i=1..len-2)는 이를 통째로 놓쳐 peaks/troughs 가 비었다.
    const rising = Array.from({ length: 91 }, (_, a) => (a - 45) / 15) // -3..+3
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90, astroSeries: rising })!
    expect(c.peaks.some((p) => p.age >= 85)).toBe(true) // 말년 경계 봉우리
    // 경계(age 0 또는 90)가 마디로 잡힌다 — 옛 i=1..len-2 는 못 잡았다.
    expect([...c.peaks, ...c.troughs].some((e) => e.age === 0 || e.age === 90)).toBe(true)
  })

  it('astroSeries 를 주면 그 점성 시계열을 쓴다(벨 무시)', () => {
    const flat = new Array(91).fill(0)
    const c = buildLifeCurve(makeNatal(), { now: NOW, span: 90, astroSeries: flat })!
    // 점성이 평탄이면 astro raw 가 전부 0.
    expect(c.points.every((p) => p.astro === 0)).toBe(true)
  })
})

import { deriveLifePattern } from '@/lib/calendar-engine/derivers/lifePattern'

describe('deriveLifePattern × lifeCurve 정합(B1)', () => {
  const saju = {
    dayMaster: { name: '辛' },
    strength: 'medium',
    yongsin: { primary: '토', secondary: undefined, avoid: ['목'] },
    daeun: [
      { startAge: 5, startYear: 1995, stem: '丁', branch: '丑' },
      { startAge: 15, startYear: 2005, stem: '丙', branch: '子' },
      { startAge: 25, startYear: 2015, stem: '乙', branch: '亥' },
      { startAge: 35, startYear: 2025, stem: '甲', branch: '戌' },
      { startAge: 45, startYear: 2035, stem: '癸', branch: '酉' },
      { startAge: 55, startYear: 2045, stem: '壬', branch: '申' },
      { startAge: 65, startYear: 2055, stem: '辛', branch: '未' },
    ],
  }
  // 말년 상승 곡선(macro 가 나이와 함께 증가) → late-bloomer/steady-rise 류 + 정점 후반.
  const risingCurve = {
    points: Array.from({ length: 86 }, (_, age) => ({ age, macro: age / 85 })),
  }
  it('말년 상승 곡선이면 유형이 후반 지향, 정점이 후반', () => {
    const lp = deriveLifePattern(saju as never, 30, risingCurve)!
    expect(['late-bloomer', 'steady-rise']).toContain(lp.key)
    const m = lp.line.match(/\((\d+)세\)/)
    if (m) expect(Number(m[1])).toBeGreaterThanOrEqual(50) // 정점 후반(곡선 일치)
  })
  it('초년 정점 후 하강 곡선이면 early-peak + 정점 전반', () => {
    const fallingCurve = {
      points: Array.from({ length: 86 }, (_, age) => ({ age, macro: (85 - age) / 85 })),
    }
    const lp = deriveLifePattern(saju as never, 30, fallingCurve)!
    expect(lp.key).toBe('early-peak')
    const m = lp.line.match(/\((\d+)세\)/)
    if (m) expect(Number(m[1])).toBeLessThan(40)
  })
  it('curve 미지정이면 기존 daeun-favor 분류(하위호환)', () => {
    const lp = deriveLifePattern(saju as never, 30)!
    expect(lp.key).toBeTruthy()
    expect(lp.daeun.length).toBe(7)
  })

  it('F3: 실 음수 favor 가 없으면 V자 곡선이어도 undulating("힘든 때") 안 붙는다', () => {
    // 대운 오행이 전부 용신/한신(음수 favor 0) → hasRealDip=false. 옛 곡선 경로는
    // 이 가드를 무시해 얕은 V 잔물결에 "힘든 때가 번갈아" 거짓 카피를 붙였다.
    const noDipSaju = {
      dayMaster: { name: '辛' },
      strength: 'medium',
      yongsin: { primary: '수', secondary: '금', avoid: ['목'] }, // 목 대운 없음
      daeun: [
        { startAge: 5, startYear: 1995, stem: '庚', branch: '申' },
        { startAge: 15, startYear: 2005, stem: '辛', branch: '酉' },
        { startAge: 25, startYear: 2015, stem: '戊', branch: '戌' },
        { startAge: 35, startYear: 2025, stem: '己', branch: '丑' },
        { startAge: 45, startYear: 2035, stem: '壬', branch: '子' },
        { startAge: 55, startYear: 2045, stem: '癸', branch: '亥' },
        { startAge: 65, startYear: 2055, stem: '庚', branch: '辰' },
      ],
    }
    // 중년이 꺼진 V자 (양끝 높고 age42 최저).
    const vCurve = {
      points: Array.from({ length: 86 }, (_, age) => ({ age, macro: Math.abs(age - 42) / 42 })),
    }
    const lp = deriveLifePattern(noDipSaju as never, 30, vCurve)!
    expect(lp.key).not.toBe('undulating')
  })
})
