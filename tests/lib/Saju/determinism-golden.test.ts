import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

type GoldenCase = {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  timezone?: string
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
      // 만 나이 통일(2026-06): 옛 한국나이 8 → 만 나이 7.
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
      // 만 나이 통일(2026-06): 옛 한국나이 9 → 만 나이 8.
      daeunStartAge: 8,
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
      // 만 나이 통일(2026-06): 옛 한국나이 5 → 만 나이 4.
      daeunStartAge: 4,
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
      // 만 나이 통일(2026-06): 옛 한국나이 10 → 만 나이 9.
      daeunStartAge: 9,
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
      // 만 나이 통일(2026-06): 옛 한국나이 2 → 만 나이 1.
      daeunStartAge: 1,
      daeunForward: false,
    },
  },
]

// ──────────────────────────────────────────────────────────────────────
// Boundary cases — regression lock.
//
// These pin the current engine output for time-sensitive edge inputs
// (KST midnight before/after, Korean ipchun boundary, non-KST timezones).
// The expected values were captured from the current implementation; the
// purpose is *regression detection* — if any future change shifts pillars
// at these inputs, this fails and we review whether the shift is intended.
//
// They are NOT independently verified against 만세력. A separate task
// should diff these against a known manse-ryeok source and adjust any
// expected that turns out to be wrong.
// ──────────────────────────────────────────────────────────────────────
const BOUNDARY_CASES: GoldenCase[] = [
  // KST 자정 직전/직후 — 일주가 1일 진행하는 기준
  {
    birthDate: '1990-12-31',
    birthTime: '23:59',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['庚', '午'],
      month: ['戊', '子'],
      day: ['庚', '午'],
      time: ['丙', '子'],
      dayMaster: '庚',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
  {
    birthDate: '1991-01-01',
    birthTime: '00:01',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['庚', '午'],
      month: ['戊', '子'],
      day: ['辛', '未'],
      time: ['戊', '子'],
      dayMaster: '辛',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
  // 입춘 경계 — 1985 입춘은 KST 02-04 06:12 (한국 천문연 공식, PR L3 fix 후
  // KASI 데이터가 SE 와 분 단위 일치). 옛 테스트는 wrong-by-construction 옛
  // KASI 데이터 (04:12) 기반 → PR L3 으로 새 정답 갱신. 06:00 출생은 입춘
  // 12분 전이라 여전히 작년(갑자년) 으로 처리되어야 정통.
  {
    birthDate: '1985-02-04',
    birthTime: '00:30',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['甲', '子'],
      month: ['丁', '丑'],
      day: ['甲', '戌'],
      time: ['甲', '子'],
      dayMaster: '甲',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
  {
    birthDate: '1985-02-04',
    birthTime: '06:00',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['甲', '子'],
      month: ['丁', '丑'],
      day: ['甲', '戌'],
      time: ['丁', '卯'],
      dayMaster: '甲',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
  // 비KST timezone — 같은 instant가 다른 timezone에서 어떻게 보이는지
  {
    birthDate: '1990-06-15',
    birthTime: '14:30',
    gender: 'male',
    timezone: 'America/Los_Angeles',
    expected: {
      year: ['庚', '午'],
      month: ['壬', '午'],
      day: ['辛', '亥'],
      time: ['乙', '未'],
      dayMaster: '辛',
      daeunStartAge: 7,
      daeunForward: true,
    },
  },
  {
    birthDate: '1985-02-04',
    birthTime: '00:30',
    gender: 'male',
    timezone: 'Asia/Tokyo',
    expected: {
      year: ['甲', '子'],
      month: ['丁', '丑'],
      day: ['甲', '戌'],
      time: ['甲', '子'],
      dayMaster: '甲',
      daeunStartAge: 1,
      daeunForward: true,
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

  it.each(BOUNDARY_CASES)('boundary $birthDate $birthTime ($timezone) stays locked', (tc) => {
    const tz = tc.timezone ?? 'Asia/Seoul'
    const r = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tz)
    expect([r.yearPillar.heavenlyStem.name, r.yearPillar.earthlyBranch.name]).toEqual(
      tc.expected.year
    )
    expect([r.monthPillar.heavenlyStem.name, r.monthPillar.earthlyBranch.name]).toEqual(
      tc.expected.month
    )
    expect([r.dayPillar.heavenlyStem.name, r.dayPillar.earthlyBranch.name]).toEqual(tc.expected.day)
    expect([r.timePillar.heavenlyStem.name, r.timePillar.earthlyBranch.name]).toEqual(
      tc.expected.time
    )
    expect(r.dayMaster.name).toBe(tc.expected.dayMaster)
    expect(r.daeWoon.startAge).toBe(tc.expected.daeunStartAge)
    expect(r.daeWoon.isForward).toBe(tc.expected.daeunForward)
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
