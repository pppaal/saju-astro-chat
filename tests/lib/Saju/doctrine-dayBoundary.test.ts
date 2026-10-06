// tests/lib/Saju/doctrine-dayBoundary.test.ts
//
// 일주(日柱) 경계 교리 가드 — **문서와 코드가 조용히 갈라지는 걸 막는다.**
//
// ## 왜 이 파일이 있나
//
// 같은 버그 클래스가 이 레포에서 12번 반복됐다: "A 에서 맞는 규칙을 B 에
// 복붙했는데 B 에선 전제가 깨짐", 그리고 **틀려도 결과가 그럴듯해서** 테스트도
// 사람도 못 본다. 12번 중 하나가 일주 경계였고, 기존 골든
// (`determinism-golden.test.ts`)이 **longitude 인자를 한 번도 넘기지 않아서**
// 4개월간 아무도 몰랐다.
//
// ## 지금 문서 두 개가 서로 모순이다
//
//   src/lib/saju/CONVENTIONS.md:27,31
//     "일주(日柱)는 자정(00:00, 민용일 civil day) 경계로 바뀐다."
//     "한국: LMT 보정 → 子 *시진* 경계 = 23:30–01:30.
//      (시진 경계일 뿐, 일주는 위처럼 민용일 기준.)"
//     골든: 1990-12-31 23:59 KST → 日 庚午 · 時 丙子
//           1991-01-01 00:01 KST → 日 辛未 · 時 戊子
//
//   docs/SOLAR_TIME_CONVENTION.md:52
//     "보정은 *시(時)만*이 아니라 출생 instant 자체를 옮긴다. 그래서 자정·입춘·
//      절기 경계 출생자는 일주·월주·년주까지 올바르게 이동한다." (2026-06-06)
//
// 코드(`saju.ts:328` effectiveDateTime → Y/M/D → 일주 JDN)는 후자를 따르고
// **전자의 골든을 깨뜨린다.** 경도를 넘기면 1991-01-01 00:01 이 日 庚午(전날)로
// 나온다.
//
// ## 결정 (2026-10): 민용일 채택
//
// 일주는 60갑자 **달력 순환**이고 입춘·절기는 **천문 사건**이다. 2026-06-06 에
// "네 기둥 모두 보정된 instant 기준" 으로 통일한 건 절기 경계에선 옳았지만
// 일주까지 끌고 와 민용일 규칙을 깼다. `saju.ts` 가 일주만 민용일 Y/M/D
// (`civilY/M/D`)를 쓰도록 분리했고, 년·월·시는 보정된 instant 를 유지한다.
//
// 그래서 아래 테스트는 **경도 유무와 무관하게 민용일 일주**를 요구한다.
// 부수 효과: 시간 미상 정오 앵커의 근거 절반(자정 앵커가 일주를 전날로
// 밀던 것)이 사라졌다 — 그건 버그였고, 지금은 앵커와 무관하게 일주가 같다
// (`birthTimeAnchor.test.ts`). 정오 앵커는 절입일 월주·ASC 중간값 근거로 유지.

import { describe, expect, it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'

// 결정론 고정 — 대운/세운이 "지금"에 의존하므로 시계를 핀으로 박는다.
const NOW = new Date('2026-10-06T00:00:00+09:00')

const SEOUL_LON = 126.978 // 보정 -32분
const BUSAN_LON = 129.075 // 보정 -24분
const INCHEON_LON = 126.705 // 보정 -33분
const TOKYO_LON = 139.69 // 보정 +19분

type Pillars = { day: string; time: string }

function pillars(date: string, time: string, opts: { lon?: number; tz?: string } = {}): Pillars {
  const r = calculateSajuData(
    date,
    time,
    'male',
    'solar',
    opts.tz ?? 'Asia/Seoul',
    false,
    opts.lon,
    NOW
  )
  return {
    day: `${r.dayPillar.heavenlyStem.name}${r.dayPillar.earthlyBranch.name}`,
    time: `${r.timePillar.heavenlyStem.name}${r.timePillar.earthlyBranch.name}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) 문서화된 골든 — 경도 없는 경로. 이쪽은 CONVENTIONS.md 와 일치한다.
// ─────────────────────────────────────────────────────────────────────────────

describe('CONVENTIONS.md:30 골든 — 경도 없는 경로 (문서와 일치)', () => {
  it('1990-12-31 23:59 KST → 日 庚午 · 時 丙子 (그날 일주 유지 + 子時)', () => {
    expect(pillars('1990-12-31', '23:59')).toEqual({ day: '庚午', time: '丙子' })
  })

  it('1991-01-01 00:01 KST → 日 辛未 · 時 戊子 (다음날 일주 + 子時)', () => {
    expect(pillars('1991-01-01', '00:01')).toEqual({ day: '辛未', time: '戊子' })
  })

  it('자정을 넘으면 일주가 60갑자 +1 한다', () => {
    const before = pillars('1990-12-31', '23:59')
    const after = pillars('1991-01-01', '00:01')
    expect(before.day).toBe('庚午')
    expect(after.day).toBe('辛未') // 庚午 → 辛未
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) 경도 있는 경로 — **기존 골든이 덮지 않던 구멍.** 현행 동작을 핀으로 박는다.
//    PINNED: 교리 결정 전까지 "현행"을 고정. 결정 나면 여기만 고친다.
// ─────────────────────────────────────────────────────────────────────────────

describe('일주는 경도와 무관하게 민용일 기준 (2026-10 수정)', () => {
  it('문서 골든이 경도 경로에서도 성립한다 — 모순 해소', () => {
    const noLon = pillars('1991-01-01', '00:01')
    const withLon = pillars('1991-01-01', '00:01', { lon: SEOUL_LON })
    expect(noLon).toEqual({ day: '辛未', time: '戊子' })
    // 예전엔 여기가 日 庚午(전날)였다 — LMT -32분이 00:01 을 전날로 밀었다.
    expect(withLon.day).toBe('辛未')
    expect(withLon.day).toBe(noLon.day)
  })

  it('서울: 자정 직후도 당일 일주 (보정 -32분이 일주를 밀지 않는다)', () => {
    for (const t of ['00:00', '00:01', '00:31', '00:32', '01:00']) {
      expect(pillars('1991-02-03', t, { lon: SEOUL_LON }).day, t).toBe('甲辰')
    }
  })

  it('경계 폭 0 — 어느 도시도 일주가 밀리지 않는다', () => {
    const widthOf = (lon: number) => {
      let n = 0
      for (let m = 0; m < 60; m++) {
        const t = `00:${String(m).padStart(2, '0')}`
        if (pillars('1991-02-03', t, { lon }).day !== pillars('1991-02-03', t).day) n++
      }
      return n
    }
    // 수정 전: 서울 32 · 부산 24 · 인천 33 분
    expect(widthOf(SEOUL_LON)).toBe(0)
    expect(widthOf(BUSAN_LON)).toBe(0)
    expect(widthOf(INCHEON_LON)).toBe(0)
  })

  it('표준자오선 동쪽(보정 +)도 밀리지 않는다 — 수정 전엔 23:41 부터 다음날이었다', () => {
    const t = { tz: 'Asia/Tokyo', lon: TOKYO_LON }
    for (const time of ['23:40', '23:41', '23:59']) {
      expect(pillars('1991-02-02', time, t).day, time).toBe('癸卯')
    }
    expect(pillars('1991-02-02', '23:59', { tz: 'Asia/Tokyo' }).day).toBe('癸卯')
  })

  it('하루 전체에서 경도 유무가 일주를 바꾸지 않는다 (전수)', () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 31, 32, 45, 59]) {
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        expect(pillars('1991-02-03', t, { lon: SEOUL_LON }).day, t).toBe(
          pillars('1991-02-03', t).day
        )
      }
    }
  })

  it('년·월주는 보정된 instant 를 그대로 쓴다 — 절기는 천문 사건이므로', () => {
    // 1988-07-07 은 소서(未월 절입)일. 자정 -32분이면 절입 전(戊午월).
    const month = (time: string, lon?: number) => {
      const r = calculateSajuData(
        '1988-07-07',
        time,
        'male',
        'solar',
        'Asia/Seoul',
        false,
        lon,
        NOW
      )
      return `${r.monthPillar.heavenlyStem.name}${r.monthPillar.earthlyBranch.name}`
    }
    expect(month('12:00', SEOUL_LON)).toBe('己未')
    expect(month('00:00', SEOUL_LON)).toBe('戊午') // 보정이 월주는 밀어야 한다
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) 경도 경로의 결정론 — 교리와 무관하게 항상 참이어야 한다.
// ─────────────────────────────────────────────────────────────────────────────

describe('경도 경로 결정론 (교리와 무관)', () => {
  it('같은 입력은 항상 같은 네 기둥을 준다', () => {
    const a = calculateSajuData(
      '1991-02-03',
      '00:35',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      NOW
    )
    const b = calculateSajuData(
      '1991-02-03',
      '00:35',
      'female',
      'solar',
      'Asia/Seoul',
      false,
      SEOUL_LON,
      NOW
    )
    for (const k of ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const) {
      expect(a[k].heavenlyStem.name).toBe(b[k].heavenlyStem.name)
      expect(a[k].earthlyBranch.name).toBe(b[k].earthlyBranch.name)
    }
    expect(a.daeWoon.startAge).toBe(b.daeWoon.startAge)
  })

  it('시주는 경도 보정된 시진 경계를 따른다 — 이건 양쪽 교리가 합의한 부분', () => {
    // CONVENTIONS.md:31 "한국: LMT 보정 → 子 시진 경계 = 23:30–01:30"
    // 보정 -32분이면 시계 23:32 부터 子時.
    expect(pillars('1991-02-02', '23:31', { lon: SEOUL_LON }).time).toMatch(/亥$/)
    expect(pillars('1991-02-02', '23:32', { lon: SEOUL_LON }).time).toMatch(/子$/)
  })

  it('경도 없으면 한국 LMT(+30) 기존 동작 — 子時 = 23:30~', () => {
    expect(pillars('1991-02-02', '23:29').time).toMatch(/亥$/)
    expect(pillars('1991-02-02', '23:30').time).toMatch(/子$/)
  })
})
