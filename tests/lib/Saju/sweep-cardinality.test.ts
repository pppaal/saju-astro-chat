// tests/lib/Saju/sweep-cardinality.test.ts
//
// 스윕 가드 — **파라미터 공간을 쓸어서 출력의 개수·분포가 말이 되는지 센다.**
//
// ## 왜 이 방식인가
//
// 이 레포에서 같은 버그 클래스가 12번 반복됐다. 전부 예시 테스트로는 안 잡혔고,
// **쓸어서 세어보니** 드러났다:
//
//   일주 경계 버그   24시간 스윕 → "시주가 왜 13가지?" (지지는 12개뿐)
//   개인화 48%→5%    6인 스윕 → 문장의 48%가 전원 동일
//   일간 쌍 15/55    55쌍 전수 → 사실집합이 15개로 수렴
//   USD 수수료       팩 크기 스윕 → 수수료가 결제액의 33%
//
// 예시 테스트는 **내가 생각한 걸** 확인한다. 스윕은 **내가 못 본 걸** 드러낸다.
// 그리고 이 엔진은 틀려도 결과가 그럴듯해서(따뜻한 리포트가 멀쩡히 나온다)
// 사람 눈으로는 못 본다 — 숫자로만 보인다.
//
// ## 두 가지 실패 모드를 모두 잡는다
//
//   너무 균일 → 엔진이 입력을 무시하고 있다 (개인화 48%, 일간 쌍 15/55)
//   너무 다양 → 엔진이 틀린 입력을 섞고 있다 (시주 13가지, 수수료 33%)
//
// 그래서 "상한만" 이나 "하한만" 보지 않고 **정확한 기수(cardinality)** 를 못 박는다.

import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

// 결정론 고정 — 대운/세운이 "지금"에 의존한다.
const NOW = new Date('2026-10-06T00:00:00+09:00')
const SEOUL_LON = 126.978
const TZ = 'Asia/Seoul'

type Four = { year: string; month: string; day: string; time: string }

function four(
  date: string,
  time: string,
  gender: 'male' | 'female' = 'male',
  lon = SEOUL_LON
): Four {
  const r = calculateSajuData(date, time, gender, 'solar', TZ, false, lon, NOW)
  const g = (p: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }) =>
    `${p.heavenlyStem.name}${p.earthlyBranch.name}`
  return {
    year: g(r.yearPillar),
    month: g(r.monthPillar),
    day: g(r.dayPillar),
    time: g(r.timePillar),
  }
}

const distinct = <T>(xs: T[]) => new Set(xs).size

// ─────────────────────────────────────────────────────────────────────────────
// 시주 — 하루 안에서 정확히 12가지. 이 가드가 일주 경계 버그를 바로 잡는다.
// ─────────────────────────────────────────────────────────────────────────────

describe('시주 기수 — 하루 = 12지지, 그 이상도 이하도 아니다', () => {
  it('하루를 분 단위로 쓸어도 시주는 정확히 12가지', () => {
    // 지지는 12개이고 일간이 하루 안에서 고정이므로 시주 간지도 12개여야 한다.
    // 13가지가 나왔다면 일간이 하루 안에서 바뀐 것이다 = 일 경계 버그.
    const times: string[] = []
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 1, 29, 30, 31, 32, 59]) {
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    const hours = times.map((t) => four('1991-02-03', t).time)
    expect(distinct(hours)).toBe(12)
  })

  it('여러 날짜에서 모두 12가지 (특정 날짜 우연이 아니다)', () => {
    const dates = ['1985-06-15', '1991-02-03', '1995-02-09', '2000-12-31', '2024-02-29']
    for (const d of dates) {
      const hours = Array.from(
        { length: 24 },
        (_, h) => four(d, `${String(h).padStart(2, '0')}:30`).time
      )
      expect(distinct(hours), d).toBe(12)
    }
  })

  it('하루 안에서 일주는 1가지 — 민용일 경계 (CONVENTIONS.md §1)', () => {
    const days = Array.from(
      { length: 24 },
      (_, h) => four('1991-02-03', `${String(h).padStart(2, '0')}:00`).day
    )
    expect(distinct(days)).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 일주 — 연속 60일에 60갑자가 정확히 한 바퀴.
// ─────────────────────────────────────────────────────────────────────────────

describe('일주 기수 — 연속 60일 = 60갑자 한 바퀴', () => {
  it('60일 연속이 전부 다르고, 61일째에 처음으로 돌아온다', () => {
    const base = new Date(Date.UTC(1991, 0, 1))
    const seq: string[] = []
    for (let i = 0; i < 61; i++) {
      const d = new Date(base.getTime() + i * 86400_000)
      const iso = d.toISOString().slice(0, 10)
      seq.push(four(iso, '12:00').day)
    }
    expect(distinct(seq.slice(0, 60))).toBe(60)
    expect(seq[60]).toBe(seq[0]) // 60갑자 주기
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 년주 — 1년에 정확히 2가지(입춘 전/후), 입춘에서만 바뀐다.
// ─────────────────────────────────────────────────────────────────────────────

describe('년주 기수 — 한 해에 2가지, 전환점은 입춘 하나뿐', () => {
  it('1991년 전체를 쓸면 년주가 2가지이고 전환이 1번만 일어난다', () => {
    const seq: { date: string; year: string }[] = []
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 10, 20, 28]) {
        const iso = `1991-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        seq.push({ date: iso, year: four(iso, '12:00').year })
      }
    }
    expect(distinct(seq.map((x) => x.year))).toBe(2)
    // 전환 횟수 = 1 (입춘). 2 이상이면 어딘가 잘못 판정하고 있다.
    let flips = 0
    for (let i = 1; i < seq.length; i++) if (seq[i].year !== seq[i - 1].year) flips++
    expect(flips).toBe(1)
  })

  it('입춘 경계가 2월 초에 있다 — 1/1 도 12/31 도 아니다', () => {
    const jan = four('1991-01-15', '12:00').year
    const mar = four('1991-03-15', '12:00').year
    expect(jan).not.toBe(mar)
    expect(jan).toBe(four('1990-12-15', '12:00').year) // 입춘 전은 전년
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 월주 — 1년에 정확히 12가지, 절기에서만 바뀐다.
// ─────────────────────────────────────────────────────────────────────────────

describe('월주 기수 — 월지 12가지 · 전환 12번, 월간은 년간을 따른다', () => {
  const monthBranch = (iso: string) =>
    calculateSajuData(iso, '12:00', 'male', 'solar', TZ, false, SEOUL_LON, NOW).monthPillar
      .earthlyBranch.name

  // 입춘(1991-02-05) ~ 다음 입춘 넘김(1992-02-10). 윈도우가 다음 입춘을 넘지
  // 않으면 마지막 丑→寅 전환이 안 잡혀 11번만 세진다(엔진이 아니라 윈도우 문제).
  const WINDOW = (() => {
    const base = Date.UTC(1991, 1, 5)
    return Array.from({ length: 75 }, (_, i) =>
      new Date(base + i * 5 * 86400_000).toISOString().slice(0, 10)
    )
  })()

  it('월지는 정확히 12가지 — 12지지 한 바퀴', () => {
    expect(distinct(WINDOW.map(monthBranch))).toBe(12)
  })

  it('월지 전환은 정확히 12번 — 그 이상이면 절기 오판정', () => {
    const seq = WINDOW.map(monthBranch)
    let flips = 0
    for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) flips++
    expect(flips).toBe(12)
    expect(seq[seq.length - 1]).toBe(seq[0]) // 한 바퀴 돌아 같은 월지(寅)
  })

  it('월간은 년간에서 도출된다 (오호둔) — 년 경계를 넘으면 같은 월지라도 간지가 다르다', () => {
    // 1991 사주년 辛未 → 丙辛년 庚寅월두 → 寅월 = 庚寅
    // 1992 사주년 壬申 → 丁壬년 壬寅월두 → 寅월 = 壬寅
    const g = (iso: string) => {
      const r = calculateSajuData(iso, '12:00', 'male', 'solar', TZ, false, SEOUL_LON, NOW)
      return {
        year: `${r.yearPillar.heavenlyStem.name}${r.yearPillar.earthlyBranch.name}`,
        month: `${r.monthPillar.heavenlyStem.name}${r.monthPillar.earthlyBranch.name}`,
      }
    }
    expect(g('1991-02-05')).toEqual({ year: '辛未', month: '庚寅' })
    expect(g('1992-02-10')).toEqual({ year: '壬申', month: '壬寅' })
    // 같은 월지(寅)인데 월간이 다르다 — 그래서 간지 기수는 13 이 된다.
    expect(distinct(WINDOW.map((d) => g(d).month))).toBe(13)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 대운 — 양남음녀 순행. 성별만 바꿨을 때 방향이 반드시 뒤집힌다.
// ─────────────────────────────────────────────────────────────────────────────

describe('대운 순역 — 양남음녀, 성별로 반드시 뒤집힌다', () => {
  const direction = (date: string, gender: 'male' | 'female') =>
    calculateSajuData(date, '12:00', gender, 'solar', TZ, false, SEOUL_LON, NOW).daeWoon.isForward

  it('같은 생일에서 남/녀 방향이 항상 반대', () => {
    const dates = ['1985-06-15', '1990-05-15', '1991-02-03', '1995-02-09', '2001-11-20']
    for (const d of dates) {
      expect(direction(d, 'male'), d).not.toBe(direction(d, 'female'))
    }
  })

  it('년간 음양과 성별로 방향이 결정된다 (양남·음녀=순행)', () => {
    // 1991-06(사주년 辛未, 음간) → 음녀 순행 / 음남 역행
    expect(direction('1991-06-15', 'female')).toBe(true)
    expect(direction('1991-06-15', 'male')).toBe(false)
    // 1990-06(庚午, 양간) → 양남 순행 / 양녀 역행
    expect(direction('1990-06-15', 'male')).toBe(true)
    expect(direction('1990-06-15', 'female')).toBe(false)
  })

  it('대운 목록은 항상 10개, 간격 10년', () => {
    for (const d of ['1985-06-15', '1991-02-03', '1995-02-09']) {
      const list = calculateSajuData(d, '12:00', 'male', 'solar', TZ, false, SEOUL_LON, NOW).daeWoon
        .list
      expect(list, d).toHaveLength(10)
      for (let i = 1; i < list.length; i++) {
        expect(list[i].age - list[i - 1].age, d).toBe(10)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 오행 — 네 기둥 8글자의 합은 언제나 8. 스윕해도 깨지지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

describe('오행 합계 — 항상 8 (천간 4 + 지지 4)', () => {
  it('날짜·시각·성별을 쓸어도 합이 8', () => {
    for (const d of ['1985-06-15', '1991-02-03', '1995-04-22', '2000-12-31']) {
      for (const t of ['00:00', '06:40', '12:00', '23:59']) {
        for (const g of ['male', 'female'] as const) {
          const r = calculateSajuData(d, t, g, 'solar', TZ, false, SEOUL_LON, NOW)
          const sum = Object.values(r.fiveElements).reduce((a, n) => a + n, 0)
          expect(sum, `${d} ${t} ${g}`).toBe(8)
        }
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 경도 — 일주는 불변, 시주는 보정을 따른다. 두 성질을 한 스윕에서 동시에 본다.
// ─────────────────────────────────────────────────────────────────────────────

describe('경도 스윕 — 일주는 불변 / 시주는 보정을 따른다', () => {
  const CITIES = [
    ['서울', 126.978],
    ['부산', 129.075],
    ['인천', 126.705],
    ['제주', 126.531],
  ] as const

  it('도시를 바꿔도 일주는 같다 (민용일)', () => {
    for (const t of ['00:00', '00:31', '00:32', '12:00', '23:59']) {
      const days = CITIES.map(([, lon]) => four('1991-02-03', t, 'male', lon).day)
      expect(distinct(days), t).toBe(1)
    }
  })

  it('경계 시각의 시주는 도시마다 갈릴 수 있다 — 보정폭이 다르므로', () => {
    // 23:3x 는 보정폭(-24~-33분)에 따라 亥時/子時 가 갈린다.
    const hours = CITIES.map(([, lon]) => four('1991-02-02', '23:30', 'male', lon).time)
    expect(distinct(hours)).toBeGreaterThan(1)
  })

  it('낮 시각은 도시가 달라도 같은 시주 — 보정폭이 시진 안에서 흡수된다', () => {
    for (const t of ['09:00', '12:00', '15:00']) {
      const hours = CITIES.map(([, lon]) => four('1991-02-03', t, 'male', lon).time)
      expect(distinct(hours), t).toBe(1)
    }
  })
})
