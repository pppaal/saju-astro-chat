/**
 * 대운 목록이 만 나이를 덮는다 — 100세+ 의 현재 대운 (재감사 SP-1 · SI-5, CONVENTIONS §14).
 *
 * 대운은 시작 나이부터 10년씩 끝없이 이어진다. 예전엔 목록이 10칸에서 끊겨 currentDaeun 이
 * 마지막 칸(이미 끝난 91~100세 대운)을 '현재'라 했다.
 *
 * 기대값(엔진 코드 미사용 — 재감사 판정 스크립트의 독립 도출):
 *  1920-03-01 10:00 서울 남자 — 1920 庚申년(입춘 후), 驚蟄 전이라 月 戊寅(乙庚 → 戊寅).
 *  庚 양간 + 남자 → 순행. 驚蟄(astronomy-engine 1920-03-05T20:50:53Z)까지 4.83일 → 대운수
 *  floor(4.83/3)=1. 2026-11-24 만 106세(생일 3/1 지남) → 11번째 대운 = 戊寅에서 11칸 순행 =
 *  己丑@101 (101~110세). 10번째 戊子@91 은 91~100세로 이미 끝났다.
 */
import { describe, expect, it } from 'vitest'
import { calculateSajuData, daeunSeedOf, resolveDaeunAt } from '@/lib/saju/saju'
import {
  currentDaeun,
  daeunCellsToCover,
  daeunIndexAtAge,
  daeunListLength,
  runningDaeunIndex,
  DAEUN_LIST_MIN_LENGTH,
} from '@/lib/saju/daeunAge'
import { stepStemBranch } from '@/lib/saju/cycles'

const gz = (d: { age: number; heavenlyStem: string; earthlyBranch: string } | null) =>
  d ? `${d.heavenlyStem}${d.earthlyBranch}@${d.age}` : null

const NOW = new Date('2026-11-24T03:00:00Z')
const run = (now: Date) =>
  calculateSajuData('1920-03-01', '10:00', 'male', 'solar', 'Asia/Seoul', false, undefined, now)

describe('daeunAge — 칸 산술 (목록 길이와 무관)', () => {
  it('daeunIndexAtAge: 첫 대운 전 −1, 그 뒤 floor((age − start)/10)', () => {
    expect(daeunIndexAtAge(7, 4)).toBe(-1)
    expect(daeunIndexAtAge(7, 7)).toBe(0)
    expect(daeunIndexAtAge(7, 16)).toBe(0)
    expect(daeunIndexAtAge(7, 17)).toBe(1)
    expect(daeunIndexAtAge(1, 106)).toBe(10)
    expect(daeunIndexAtAge(1, 126)).toBe(12)
  })

  it('daeunListLength: 최소 10칸, 시작 나이 + 100 이상이면 지금 대운까지', () => {
    expect(DAEUN_LIST_MIN_LENGTH).toBe(10)
    expect(daeunListLength(1, 0)).toBe(10)
    expect(daeunListLength(1, 100)).toBe(10) // 戊子@91 이 91~100 을 덮는다
    expect(daeunListLength(1, 101)).toBe(11)
    expect(daeunListLength(1, 126)).toBe(13)
    expect(daeunListLength(10, 109)).toBe(10)
    expect(daeunListLength(10, 110)).toBe(11)
  })

  it('runningDaeunIndex: 칸 i 는 [start_i, start_{i+1}) — 마지막 칸은 10년만, 그 너머는 null', () => {
    const ages = [3, 13, 23]
    expect(runningDaeunIndex(ages, 2)).toBe(-1)
    expect(runningDaeunIndex(ages, 3)).toBe(0)
    expect(runningDaeunIndex(ages, 22)).toBe(1)
    expect(runningDaeunIndex(ages, 32)).toBe(2)
    expect(runningDaeunIndex(ages, 33)).toBeNull()
    expect(runningDaeunIndex([], 10)).toBeNull()
  })

  it('stepStemBranch: 60갑자 순행·역행 (음수 칸 포함)', () => {
    const at = (s: string, b: string, n: number) => {
      const r = stepStemBranch(s, b, n)
      return r ? r.stem.name + r.branch.name : null
    }
    expect(at('戊', '寅', 1)).toBe('己卯')
    expect(at('戊', '寅', 11)).toBe('己丑')
    expect(at('戊', '寅', -1)).toBe('丁丑')
    expect(at('甲', '子', 60)).toBe('甲子')
    expect(at('X', '寅', 1)).toBeNull()
  })

  it('daeunCellsToCover: 첫 두 칸에서 방향을 읽고 같은 순서열을 10년 간격으로 잇는다', () => {
    const fwd = [
      { startAge: 1, stem: '己', branch: '卯' },
      { startAge: 11, stem: '庚', branch: '辰' },
    ]
    expect(daeunCellsToCover(fwd, 15)).toEqual([])
    expect(daeunCellsToCover(fwd, 21)).toEqual([{ startAge: 21, stem: '辛', branch: '巳' }])
    const back = [
      { startAge: 5, stem: '丁', branch: '丑' },
      { startAge: 15, stem: '丙', branch: '子' },
    ]
    expect(daeunCellsToCover(back, 35)).toEqual([
      { startAge: 25, stem: '乙', branch: '亥' },
      { startAge: 35, stem: '甲', branch: '戌' },
    ])
    // 한 칸뿐이거나 순서열이 아니면 잇지 않는다.
    expect(daeunCellsToCover(fwd.slice(0, 1), 50)).toEqual([])
    expect(
      daeunCellsToCover(
        [
          { startAge: 1, stem: '己', branch: '卯' },
          { startAge: 11, stem: '甲', branch: '子' },
        ],
        50
      )
    ).toEqual([])
  })
})

describe('calculateSajuData — 100세+ 의 현재 대운 (SP-1: 1920-03-01 10:00 M 서울)', () => {
  it('2026-11-24 만 106세: 목록 11칸, current = 己丑@101 (끝난 戊子@91 아님)', () => {
    const dw = run(NOW).daeWoon
    expect(dw.startAge).toBe(1)
    expect(dw.isForward).toBe(true)
    expect(dw.list.map(gz)).toEqual([
      '己卯@1',
      '庚辰@11',
      '辛巳@21',
      '壬午@31',
      '癸未@41',
      '甲申@51',
      '乙酉@61',
      '丙戌@71',
      '丁亥@81',
      '戊子@91',
      '己丑@101',
    ])
    expect(gz(dw.current)).toBe('己丑@101')
    expect(dw.preDaeun).toBeNull()
  })

  it('경도 유무와 무관 (대운은 생 UT instant 기준)', () => {
    const withLon = calculateSajuData(
      '1920-03-01',
      '10:00',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      126.978,
      NOW
    )
    expect(gz(withLon.daeWoon.current)).toBe('己丑@101')
  })

  it('만 100세 이전에는 목록이 그대로 10칸 — 다른 출생의 출력은 바뀌지 않는다', () => {
    // 2020-02-28 서울: 생일 전이라 만 99세 → 戊子@91(91~100) 이 현재, 목록 10칸.
    const dw = run(new Date('2020-02-28T03:00:00Z')).daeWoon
    expect(dw.list).toHaveLength(10)
    expect(gz(dw.current)).toBe('戊子@91')
    // 1990 출생도 10칸.
    const young = calculateSajuData(
      '1990-05-15',
      '10:30',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      undefined,
      NOW
    )
    expect(young.daeWoon.list).toHaveLength(10)
    expect(young.unse.daeun).toHaveLength(10)
  })

  it('resolveDaeunAt: 캐시된(만 99세 때) 10칸 결과를 지금 시각으로 다시 맞추면 11칸 + 己丑@101', () => {
    const cached = run(new Date('2020-02-28T03:00:00Z'))
    const civil = { year: 1920, month: 3, day: 1 }
    // 짧은 목록에 currentDaeun 만 다시 적용하면 끝난 대운을 고르지 않고 null 이다.
    expect(currentDaeun(cached.daeWoon.list, civil, 'Asia/Seoul', NOW)).toEqual({
      current: null,
      preDaeun: null,
    })
    const re = resolveDaeunAt(daeunSeedOf(cached), civil, 'Asia/Seoul', NOW)
    expect(re.list).toHaveLength(11)
    expect(re.list.slice(0, 10)).toEqual(cached.daeWoon.list)
    expect(gz(re.current)).toBe('己丑@101')
    expect(re.current?.sibsin).toEqual(run(NOW).daeWoon.current?.sibsin)
  })

  it('역행 + 100세+: 1916-08-08 F 서울 — 지금 대운까지 이어진다', () => {
    const dw = calculateSajuData(
      '1916-08-08',
      '10:00',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      undefined,
      NOW
    ).daeWoon
    const age = 110 // 2026-11-24 서울, 생일 8/8 지남
    const idx = daeunIndexAtAge(dw.startAge, age)
    expect(dw.list).toHaveLength(idx + 1)
    expect(dw.current).toBe(dw.list[idx])
    expect(dw.current!.age).toBeLessThanOrEqual(age)
    expect(dw.current!.age + 10).toBeGreaterThan(age)
  })
})
