// tests/lib/Saju/edge-cases.test.ts
//
// CONVENTIONS.md 컴플라이언스 + 회귀 갭 메우는 케이스들. 2026-06 audit 에서
// 다음 분기가 *unfreezing* 임이 확인돼 fixture 로 잠근다:
//
//  - 시간 미상 (birthTime === '') — saju.ts:315 에서 '00:00:00' 폴백. 이전엔
//    이 경로 자체에 회귀 테스트 0개라 호출자가 빈 문자열 / undefined 를
//    넘기는 흐름이 깨져도 다음 commit 까지 안 보였음.
//  - 윤년 2/29 출생 — 대운 lookup 이 birthDate +N년 식으로 비윤년에 떨어질
//    때(2089-02-29 부재) 어떻게 처리되는지.
//  - 자정 정확 (00:00:00) — 일주 전환선이 같은 instant 의 이쪽/저쪽 중
//    어디로 떨어지는지 결정적으로 잠금.
//
// fixture 값은 *현재 엔진 출력* 을 캡쳐한 것 — 컨벤션 위반이 아니라 회귀
// 감지용. 미래에 값이 바뀌면 *의도된 변경인지 검토* 한다.

import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

type EdgeCase = {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  timezone: string
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

// ───────────────────────────────────────────────────────────────────────
// C. 시간 미상 (birthTime === '')
//
// saju.ts:312-329 의 safeTime 가 빈 문자열을 '00:00:00' 으로 폴백. 즉 시주
// = 子時 (자정 1분), 일주는 입력 날짜의 KST 자정 기준. 호출자가 사용자가
// "시간 모름" 옵션을 골랐을 때 빈 문자열만 넘기면 안전하게 계산된다.
// ───────────────────────────────────────────────────────────────────────
const TIME_UNKNOWN_CASES: EdgeCase[] = [
  {
    label: 'C1: 시간 미상 (평일)',
    birthDate: '1990-05-15',
    birthTime: '',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['庚', '午'],
      month: ['辛', '巳'],
      day: ['庚', '辰'],
      // 자정 폴백 → 子時. LMT 보정으로 23:30-01:30 子라 00:00 도 子.
      time: ['丙', '子'],
      dayMaster: '庚',
      daeunStartAge: 7,
      daeunForward: true,
    },
  },
  {
    label: 'C2: 시간 미상 + 입춘 경계 (1985-02-04 02:00 입춘 통과 전)',
    birthDate: '1985-02-04',
    birthTime: '',
    gender: 'female',
    timezone: 'Asia/Seoul',
    expected: {
      // 입춘(06:12 KST) 전이라 작년 사주년 = 甲子. 시간 미상이어도 boundary
      // 룰은 그대로 지켜진다 (00:00 < 06:12).
      year: ['甲', '子'],
      month: ['丁', '丑'],
      day: ['甲', '戌'],
      time: ['甲', '子'],
      dayMaster: '甲',
      daeunStartAge: 9,
      daeunForward: false,
    },
  },
]

// ───────────────────────────────────────────────────────────────────────
// D. 윤년 2/29 출생
//
// 사주 자체 계산은 윤년에 영향 안 받지만(절기·간지 산술은 일수 기반),
// 대운 시작 나이 lookup·UI 표시 등 downstream 에서 birthDate +N년 식으로
// 비윤년에 떨어질 때(2089-02-29 부재) 어떻게 처리되는지 검증.
// ───────────────────────────────────────────────────────────────────────
const LEAP_YEAR_CASES: EdgeCase[] = [
  {
    label: 'D1: 윤년 1984-02-29 출생',
    birthDate: '1984-02-29',
    birthTime: '10:00',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      // 1984년 입춘은 02-04 — 02-29 는 입춘 후, 사주년 1984 = 甲子.
      year: ['甲', '子'],
      month: ['丙', '寅'],
      day: ['癸', '巳'],
      time: ['丁', '巳'],
      dayMaster: '癸',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
  {
    label: 'D2: 현대 윤년 2020-02-29 출생',
    birthDate: '2020-02-29',
    birthTime: '12:00',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      year: ['庚', '子'],
      month: ['戊', '寅'],
      day: ['壬', '寅'],
      time: ['丙', '午'],
      dayMaster: '壬',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
]

// ───────────────────────────────────────────────────────────────────────
// A. 자정 정확 — 일주 전환선 결정적 잠금
//
// 기존 determinism-golden.test.ts 가 23:59 / 00:01 의 양쪽 결과는 잡지만,
// *정확히 00:00:00* 인 인스턴트가 어느 쪽으로 떨어지는지는 잠금이 없다.
// 자정의 ":00:00" 표기가 새 날 첫 분으로 계산되는 현 동작을 박는다.
// ───────────────────────────────────────────────────────────────────────
const EXACT_MIDNIGHT_CASES: EdgeCase[] = [
  {
    label: 'A1: 정확 자정 1990-01-01 00:00:00 KST (입춘 전이라 사주년 1989)',
    birthDate: '1990-01-01',
    birthTime: '00:00',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      // 1990 입춘(02-04) 전 → 사주년 1989 = 己巳.
      year: ['己', '巳'],
      month: ['丙', '子'],
      day: ['丙', '寅'],
      // LMT 자시 (23:30-01:30) 정확 자정 → 子時.
      time: ['戊', '子'],
      dayMaster: '丙',
      daeunStartAge: 8,
      daeunForward: false,
    },
  },
  {
    label: 'A2: 자정 1초 전 1990-12-31 23:59:59 KST (분 단위 절단 일관성)',
    birthDate: '1990-12-31',
    birthTime: '23:59:59',
    gender: 'male',
    timezone: 'Asia/Seoul',
    expected: {
      // 1990년 (입춘 한참 후). 기존 23:59 fixture 와 동일 결과여야 함 — 분
      // 단위가 같으면 :00 / :59 초의 차이로 일주가 흔들리지 않는다.
      year: ['庚', '午'],
      month: ['戊', '子'],
      day: ['庚', '午'],
      time: ['丙', '子'],
      dayMaster: '庚',
      daeunStartAge: 1,
      daeunForward: true,
    },
  },
]

const ALL_CASES = [...TIME_UNKNOWN_CASES, ...LEAP_YEAR_CASES, ...EXACT_MIDNIGHT_CASES]

describe('Saju edge cases — time unknown / leap year / exact midnight', () => {
  it.each(ALL_CASES)('$label', (tc) => {
    const r = calculateSajuData(tc.birthDate, tc.birthTime, tc.gender, 'solar', tc.timezone)
    expect([r.yearPillar.heavenlyStem.name, r.yearPillar.earthlyBranch.name]).toEqual(
      tc.expected.year
    )
    expect([r.monthPillar.heavenlyStem.name, r.monthPillar.earthlyBranch.name]).toEqual(
      tc.expected.month
    )
    expect([r.dayPillar.heavenlyStem.name, r.dayPillar.earthlyBranch.name]).toEqual(
      tc.expected.day
    )
    expect([r.timePillar.heavenlyStem.name, r.timePillar.earthlyBranch.name]).toEqual(
      tc.expected.time
    )
    expect(r.dayPillar.heavenlyStem.name).toBe(tc.expected.dayMaster)
    expect(r.daeWoon.startAge).toBe(tc.expected.daeunStartAge)
    expect(r.daeWoon.isForward).toBe(tc.expected.daeunForward)
  })

  it('시간 미상 — 호출이 throw 하지 않고 10개 대운 사이클 반환', () => {
    const r = calculateSajuData('1990-05-15', '', 'male', 'solar', 'Asia/Seoul')
    expect(r.daeWoon.list).toHaveLength(10)
    // 각 대운 사이클의 만 나이는 단조 증가(10년 간격).
    for (let i = 1; i < r.daeWoon.list.length; i++) {
      expect(r.daeWoon.list[i].age).toBe(r.daeWoon.list[i - 1].age + 10)
    }
  })

  it('윤년 2/29 출생 — 대운 사이클 10개가 모두 유효한 간지 보유', () => {
    const r = calculateSajuData('1984-02-29', '10:00', 'male', 'solar', 'Asia/Seoul')
    expect(r.daeWoon.list).toHaveLength(10)
    for (const d of r.daeWoon.list) {
      // 60갑자 안의 정상 간지여야 함 (10천간 × 12지지).
      expect(d.heavenlyStem).toMatch(/^[甲乙丙丁戊己庚辛壬癸]$/)
      expect(d.earthlyBranch).toMatch(/^[子丑寅卯辰巳午未申酉戌亥]$/)
    }
  })
})
