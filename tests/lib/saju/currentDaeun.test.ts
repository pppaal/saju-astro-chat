/**
 * 현재 대운 — 첫 대운 전에는 없다 (엔진 감사 E14 · SAJU-7, OD-12).
 *
 * 첫 대운 전에는 월주(月柱)가 그 시기를 맡으므로 대운을 '현재'로 부르지 않는다:
 * daeWoon.current = null, preDaeun = { startsAtAge }. 예전엔 `|| list[0]` 폴백으로
 * 만 4세 아이에게 7세 대운을 현재 대운이라 했다.
 *
 * 기대값: 대운 목록·대운수는 E0 골든 G22(tests/golden/engine-golden.json — astronomy-engine
 * 절입, floor(days/3))에서, 만 나이는 출생지 민용 생일(CONVENTIONS §14)에서 직접 도출한다.
 */
import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { currentDaeun, parseCivilDate } from '@/lib/saju/daeunAge'
import golden from '../../golden/engine-golden.json'

type GoldenCase = {
  id: string
  input: { date: string; time: string; tz: string; lon: number; gender: 'male' | 'female' }
  proposed: { daeun: { startAge: number; first3: string[] } }
}
const G22 = (golden.saju.cases as unknown as GoldenCase[]).find((c) => c.id === 'G22')!

const ganji = (d: { heavenlyStem: string; earthlyBranch: string } | null) =>
  d ? d.heavenlyStem + d.earthlyBranch : null

function g22At(nowIso: string, lon: number | undefined = G22.input.lon) {
  const { date, time, gender, tz } = G22.input
  return calculateSajuData(date, time, gender, 'solar', tz, false, lon, new Date(nowIso)).daeWoon
}

describe('calculateSajuData — 첫 대운 전 current = null + preDaeun (G22 2022-06-15 10:00 M 서울)', () => {
  it('골든 전제: 대운수 7, 첫 대운 丁未', () => {
    expect(G22.proposed.daeun.startAge).toBe(7)
    expect(G22.proposed.daeun.first3[0]).toBe('丁未')
  })

  it('2026-11-24 (만 4세): current null, preDaeun.startsAtAge 7', () => {
    for (const lon of [G22.input.lon, undefined]) {
      const dw = g22At('2026-11-24T03:00:00Z', lon)
      expect(dw.current).toBeNull()
      expect(dw.preDaeun).toEqual({ startsAtAge: 7 })
      // 목록은 그대로 — 첫 대운 丁未@7.
      expect(dw.list[0].age).toBe(7)
      expect(ganji(dw.list[0])).toBe('丁未')
    }
  })

  it('7번째 생일 전날(2029-06-14 서울)까지는 대운 전, 생일(2029-06-15 서울)부터 丁未@7', () => {
    // 2029-06-14 23:59 KST = 14:59Z, 2029-06-15 00:00 KST = 2029-06-14T15:00Z.
    const before = g22At('2029-06-14T14:59:00Z')
    expect(before.current).toBeNull()
    expect(before.preDaeun).toEqual({ startsAtAge: 7 })
    const onBirthday = g22At('2029-06-14T15:00:00Z')
    expect(ganji(onBirthday.current)).toBe('丁未')
    expect(onBirthday.current?.age).toBe(7)
    expect(onBirthday.preDaeun).toBeNull()
  })

  it('2029-07-01 (만 7세): current 丁未@7, preDaeun null', () => {
    const dw = g22At('2029-07-01T03:00:00Z')
    expect(ganji(dw.current)).toBe('丁未')
    expect(dw.current?.age).toBe(7)
    expect(dw.preDaeun).toBeNull()
  })

  it('2025-12-01 10:00 F (대운수 1) — 2026-11-24 만 0세: current null, startsAtAge 1', () => {
    const dw = calculateSajuData(
      '2025-12-01',
      '10:00',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      126.978,
      new Date('2026-11-24T03:00:00Z')
    ).daeWoon
    expect(dw.startAge).toBe(1)
    expect(dw.current).toBeNull()
    expect(dw.preDaeun).toEqual({ startsAtAge: 1 })
  })

  it('meta 에 민용 생일(양력)·타임존 — 음력 입력은 변환된 양력', () => {
    const solar = calculateSajuData('2022-06-15', '10:00', 'male', 'solar', 'Asia/Seoul')
    expect(solar.meta?.civilBirthDate).toBe('2022-06-15')
    expect(solar.meta?.timeZone).toBe('Asia/Seoul')
    // 음력 2022-05-17 = 양력 2022-06-15.
    const lunar = calculateSajuData('2022-05-17', '10:00', 'male', 'lunar', 'Asia/Seoul')
    expect(lunar.meta?.civilBirthDate).toBe('2022-06-15')
  })
})

describe('currentDaeun — 순수 함수', () => {
  const list = [
    { age: 3, gz: 'A' },
    { age: 13, gz: 'B' },
    { age: 23, gz: 'C' },
  ]
  const birth = { year: 2000, month: 3, day: 10 }
  const at = (iso: string) => currentDaeun(list, birth, 'Asia/Seoul', new Date(iso))

  it('첫 대운 전 → current null, preDaeun = 첫 대운 나이', () => {
    expect(at('2003-03-09T12:00:00Z')).toEqual({ current: null, preDaeun: { startsAtAge: 3 } })
  })

  it('대운 경계 생일에 바뀐다 (출생지 민용 생일 기준)', () => {
    // 2013-03-10 00:00 KST = 2013-03-09T15:00Z.
    expect(at('2013-03-09T14:59:00Z').current?.gz).toBe('A')
    expect(at('2013-03-09T15:00:00Z').current?.gz).toBe('B')
    expect(at('2013-03-09T15:00:00Z').preDaeun).toBeNull()
  })

  it('마지막 대운 이후에도 마지막 대운', () => {
    expect(at('2060-01-01T00:00:00Z').current?.gz).toBe('C')
  })

  it('빈 목록 → current·preDaeun 모두 null', () => {
    expect(currentDaeun([], birth, 'Asia/Seoul', new Date('2020-01-01T00:00:00Z'))).toEqual({
      current: null,
      preDaeun: null,
    })
  })

  it('parseCivilDate', () => {
    expect(parseCivilDate('1935-05-05')).toEqual({ year: 1935, month: 5, day: 5 })
    expect(parseCivilDate('1990-5-7')).toEqual({ year: 1990, month: 5, day: 7 })
    expect(parseCivilDate('')).toBeNull()
    expect(parseCivilDate('not-a-date')).toBeNull()
  })
})
