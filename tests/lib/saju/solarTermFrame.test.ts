/**
 * 절입(節入) 판정 프레임 — OD-1 (엔진 감사 E1 · SAJU-1 · F14 · SAJU-5).
 *
 * 절입은 태양 시황경이 315°+30k° 에 닿는 *하나의 절대 instant* 다. 년주·월주·대운수는
 * 생 UT 출생 instant 를 KASI_SOLAR_TERMS instant 와 비교해 정하고, 진경도(평균태양시)
 * 보정은 시주 lookup 에만 쓴다 (CONVENTIONS.md §1·§2, docs/SOLAR_TIME_CONVENTION.md).
 *
 * 기대값은 엔진 출력이 아니라 절기표 instant 와 간지 산술에서 직접 도출한다:
 *  - 표의 절입 instant + 5분 출생 = 절입 후 → 그 절기의 사주월 (입춘이면 그 해 사주년)
 *  - 표의 절입 instant − 5분 출생 = 절입 전 → 직전 사주월 (1·2월이면 전년 사주년)
 * KASI 표는 astronomy-engine 과 ≤90초로 교차검증돼 있어(tests/golden, kasiSolarTerms
 * .crosscheck) ±5분 출생의 전/후 판정은 천문학적으로도 확정이다.
 */
import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { KASI_SOLAR_TERMS, KASI_START_YEAR, KASI_END_YEAR } from '@/lib/saju/constants'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
/** 양력 m월의 절기가 여는 사주월 지지 — 1월 소한=丑 … 2월 입춘=寅 … 12월 대설=子. */
const TERM_BRANCH = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子']

const SEOUL_LON = 126.978 // 프로덕션 기본 경도 (진경도 보정 ≈ −32분)
const TOKYO_LON = 139.69 // 진경도 보정 ≈ +19분
const NOW = new Date('2026-11-24T03:00:00Z')

/** 표의 "YYYY-MM-DD HH:mm"(KST=UTC+9 고정) → UTC epoch ms. */
function termUtcMs(s: string): number {
  const [d, t] = s.split(' ')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, m] = t.split(':').map(Number)
  return Date.UTC(Y, M - 1, D, h - 9, m)
}

/** instant → 출생지 벽시계 (date, time). 역사적 offset(KMT·DST)은 tz DB 가 처리. */
function wallClock(ms: number, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/** 사주년 → 연주 간지 (甲子=1984 기준 60갑자 산술). */
function yearGanji(sajuYear: number): string {
  const i = (((sajuYear - 4) % 60) + 60) % 60
  return STEMS[i % 10] + BRANCHES[i % 12]
}

/** 五虎遁 — 연간에서 寅월 천간을 정하고 지지 순서대로 진행. */
function monthGanji(yearStem: string, monthBranch: string): string {
  const firstStem = ((STEMS.indexOf(yearStem) % 5) * 2 + 2) % 10 // 甲己→丙, 乙庚→戊, …
  const offset = (BRANCHES.indexOf(monthBranch) - BRANCHES.indexOf('寅') + 12) % 12
  return STEMS[(firstStem + offset) % 10] + monthBranch
}

/** 표의 (year, month) 절입 기준 ±5분 출생의 기대 연주·월주. */
function expectedPillars(year: number, month: number, side: 'post' | 'pre') {
  const branch = side === 'post' ? TERM_BRANCH[month - 1] : TERM_BRANCH[(month + 10) % 12]
  // 사주년: 입춘(2월 절기) 이후면 그 해. 1월(소한 전후 모두)과 입춘 전은 전년.
  const sajuYear = month >= 3 || (month === 2 && side === 'post') ? year : year - 1
  const y = yearGanji(sajuYear)
  return { year: y, month: monthGanji(y[0], branch) }
}

type Saju = ReturnType<typeof calculateSajuData>
const ganji = (p: Saju['yearPillar']) => p.heavenlyStem.name + p.earthlyBranch.name
const frame = (r: Saju) => ({
  year: ganji(r.yearPillar),
  month: ganji(r.monthPillar),
  forward: r.daeWoon.isForward,
  startAge: r.daeWoon.startAge,
  list: r.daeWoon.list.map((d) => d.heavenlyStem + d.earthlyBranch + '@' + d.age),
})

const TERMS: Array<{ year: number; month: number; ms: number }> = []
for (let year = KASI_START_YEAR; year <= KASI_END_YEAR; year++) {
  for (let month = 1; month <= 12; month++) {
    TERMS.push({ year, month, ms: termUtcMs(KASI_SOLAR_TERMS[year][month]) })
  }
}

describe('절입 판정 = 생 UT instant vs 절입 instant (OD-1) — 1940–2050 전 절기', () => {
  it(`표 범위 전체(${(KASI_END_YEAR - KASI_START_YEAR + 1) * 12}개 절기)를 순회한다`, () => {
    expect(TERMS).toHaveLength(1332)
  })

  it('서울 절입 +5분 출생 (lon 126.978): 절입 후 기둥이고, 무경도 결과와 같다', () => {
    const bad: string[] = []
    for (const t of TERMS) {
      const { date, time } = wallClock(t.ms + 5 * 60_000, 'Asia/Seoul')
      const withLon = frame(
        calculateSajuData(date, time, 'male', 'solar', 'Asia/Seoul', false, SEOUL_LON, NOW)
      )
      const noLon = frame(
        calculateSajuData(date, time, 'male', 'solar', 'Asia/Seoul', false, undefined, NOW)
      )
      const exp = expectedPillars(t.year, t.month, 'post')
      if (withLon.year !== exp.year || withLon.month !== exp.month) {
        bad.push(`${date} ${time} lon: ${withLon.year}/${withLon.month} ≠ ${exp.year}/${exp.month}`)
      }
      if (JSON.stringify(withLon) !== JSON.stringify(noLon)) {
        bad.push(`${date} ${time}: lon ${JSON.stringify(withLon)} ≠ noLon ${JSON.stringify(noLon)}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('도쿄 절입 −5분 출생 (lon 139.69): 절입 전 기둥이고, 무경도 결과와 같다', () => {
    const bad: string[] = []
    for (const t of TERMS) {
      const { date, time } = wallClock(t.ms - 5 * 60_000, 'Asia/Tokyo')
      const withLon = frame(
        calculateSajuData(date, time, 'female', 'solar', 'Asia/Tokyo', false, TOKYO_LON, NOW)
      )
      const noLon = frame(
        calculateSajuData(date, time, 'female', 'solar', 'Asia/Tokyo', false, undefined, NOW)
      )
      const exp = expectedPillars(t.year, t.month, 'pre')
      if (withLon.year !== exp.year || withLon.month !== exp.month) {
        bad.push(`${date} ${time} lon: ${withLon.year}/${withLon.month} ≠ ${exp.year}/${exp.month}`)
      }
      if (JSON.stringify(withLon) !== JSON.stringify(noLon)) {
        bad.push(`${date} ${time}: lon ${JSON.stringify(withLon)} ≠ noLon ${JSON.stringify(noLon)}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('절입 판정은 timezone 라벨에 의존하지 않는다', () => {
  it('같은 instant 2020-02-04T11:00Z · lon 75.99 — Asia/Shanghai 와 Asia/Urumqi 가 같은 연·월주', () => {
    // 입춘 2020 = 2020-02-04 18:03 KST (09:03Z) → 11:00Z 는 약 2시간 뒤 → 庚子년 戊寅월.
    const sh = calculateSajuData(
      '2020-02-04',
      '19:00',
      'male',
      'solar',
      'Asia/Shanghai',
      false,
      75.99,
      NOW
    )
    const ur = calculateSajuData(
      '2020-02-04',
      '17:00',
      'male',
      'solar',
      'Asia/Urumqi',
      false,
      75.99,
      NOW
    )
    expect([ganji(sh.yearPillar), ganji(sh.monthPillar)]).toEqual(['庚子', '戊寅'])
    expect(frame(ur)).toEqual(frame(sh))
  })
})

describe('엔진 감사 E1 재현 케이스', () => {
  it('SAJU-1: 2024-02-04 17:40 서울 F lon 126.978 (입춘 17:27 + 13분) → 甲辰/丙寅, 역행, 첫 대운 乙丑', () => {
    const r = calculateSajuData(
      '2024-02-04',
      '17:40',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      NOW
    )
    expect([ganji(r.yearPillar), ganji(r.monthPillar)]).toEqual(['甲辰', '丙寅'])
    expect(r.daeWoon.isForward).toBe(false)
    expect(r.daeWoon.list[0].heavenlyStem + r.daeWoon.list[0].earthlyBranch).toBe('乙丑')
  })

  it('SAJU-5: 1940-01-01 00:10 서울 lon 126.978 은 throw 없이 무경도와 같은 연·월주(己卯/丙子)', () => {
    const withLon = calculateSajuData(
      '1940-01-01',
      '00:10',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      NOW
    )
    const noLon = calculateSajuData(
      '1940-01-01',
      '00:10',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      undefined,
      NOW
    )
    expect([ganji(withLon.yearPillar), ganji(withLon.monthPillar)]).toEqual(['己卯', '丙子'])
    expect(frame(withLon)).toEqual(frame(noLon))
  })

  it('F14: 1962-01-01 00:10 서울 lon — 1979-12-31 엔 만 17세라 현재 대운 己亥@8 (민용 생일)', () => {
    const r = calculateSajuData(
      '1962-01-01',
      '00:10',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      new Date('1979-12-31T12:00:00+09:00')
    )
    const cur = r.daeWoon.current
    expect(cur && `${cur.heavenlyStem}${cur.earthlyBranch}@${cur.age}`).toBe('己亥@8')
  })

  it('F14: 1990-05-17 00:10 서울 lon — 생일 전날(2026-05-16)은 만 35세라 현재 대운 甲申@26', () => {
    const r = calculateSajuData(
      '1990-05-17',
      '00:10',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      new Date('2026-05-16T03:00:00Z')
    )
    const cur = r.daeWoon.current
    expect(cur && `${cur.heavenlyStem}${cur.earthlyBranch}@${cur.age}`).toBe('甲申@26')
  })
})
