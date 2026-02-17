import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/Saju/saju'

type GoldenCase = {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  expected: {
    year: [string, string]
    month: [string, string]
    day: [string, string]
    time: [string, string]
    dayMaster: string
    daeunStartAge: number
    daeunForward: boolean
  }
}

const GOLDEN_CASES: GoldenCase[] = [
  {
    birthDate: '1990-05-15',
    birthTime: '10:30',
    gender: 'male',
    expected: {
      year: ['庚', '午'],
      month: ['辛', '巳'],
      day: ['庚', '辰'],
      time: ['辛', '巳'],
      dayMaster: '庚',
      daeunStartAge: 7,
      daeunForward: true,
    },
  },
  {
    birthDate: '1988-12-01',
    birthTime: '23:45',
    gender: 'female',
    expected: {
      year: ['戊', '辰'],
      month: ['癸', '亥'],
      day: ['庚', '寅'],
      time: ['丙', '子'],
      dayMaster: '庚',
      daeunStartAge: 18,
      daeunForward: false,
    },
  },
  {
    birthDate: '2001-07-22',
    birthTime: '04:10',
    gender: 'male',
    expected: {
      year: ['辛', '巳'],
      month: ['乙', '未'],
      day: ['丙', '戌'],
      time: ['庚', '寅'],
      dayMaster: '丙',
      daeunStartAge: 15,
      daeunForward: false,
    },
  },
  {
    birthDate: '1979-02-04',
    birthTime: '00:05',
    gender: 'female',
    expected: {
      year: ['戊', '午'],
      month: ['乙', '丑'],
      day: ['壬', '寅'],
      time: ['庚', '子'],
      dayMaster: '壬',
      daeunStartAge: 20,
      daeunForward: false,
    },
  },
  {
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    expected: {
      year: ['乙', '亥'],
      month: ['戊', '寅'],
      day: ['辛', '未'],
      time: ['辛', '卯'],
      dayMaster: '辛',
      daeunStartAge: 11,
      daeunForward: false,
    },
  },
]

describe('Saju deterministic golden cases', () => {
  it.each(GOLDEN_CASES)('$birthDate $birthTime stays deterministic for core pillars', (tc) => {
    const first = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', 'Asia/Seoul')
    const second = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', 'Asia/Seoul')

    expect([first.yearPillar.heavenlyStem.name, first.yearPillar.earthlyBranch.name]).toEqual(
      tc.expected.year
    )
    expect([first.monthPillar.heavenlyStem.name, first.monthPillar.earthlyBranch.name]).toEqual(
      tc.expected.month
    )
    expect([first.dayPillar.heavenlyStem.name, first.dayPillar.earthlyBranch.name]).toEqual(
      tc.expected.day
    )
    expect([first.timePillar.heavenlyStem.name, first.timePillar.earthlyBranch.name]).toEqual(
      tc.expected.time
    )
    expect(first.dayMaster.name).toBe(tc.expected.dayMaster)
    expect(first.daeWoon.startAge).toBe(tc.expected.daeunStartAge)
    expect(first.daeWoon.isForward).toBe(tc.expected.daeunForward)

    // Determinism across repeated execution
    expect(first.dayPillar.heavenlyStem.name).toBe(second.dayPillar.heavenlyStem.name)
    expect(first.dayPillar.earthlyBranch.name).toBe(second.dayPillar.earthlyBranch.name)
    expect(first.daeWoon.startAge).toBe(second.daeWoon.startAge)
  })

  it('keeps daeun sequence shape and five-element invariants stable', () => {
    const result = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul')
    expect(result.daeWoon.list).toHaveLength(10)
    for (let i = 1; i < result.daeWoon.list.length; i += 1) {
      expect(result.daeWoon.list[i].age - result.daeWoon.list[i - 1].age).toBe(10)
    }
    const totalElements = Object.values(result.fiveElements).reduce((sum, n) => sum + n, 0)
    expect(totalElements).toBe(8)
  })
})
