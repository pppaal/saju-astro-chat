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
// ## 이 파일의 입장
//
// 교리 결정(민용일 vs 보정 instant)은 **소유자 판단**이고 아직 안 났다. 바꾸면
// 이미 리포트를 받은 사용자 중 자정 인접 출생자의 결과가 달라진다.
//
// 그래서 여기서는 **현행 동작을 수치로 못 박는다.** 결정이 나기 전에도
// 더 이상의 드리프트는 막히고, 결정이 나면 아래 PINNED 블록의 기대값만
// 바꾸면 된다. 어느 쪽으로 가도 이 파일이 회귀를 잡는다.
//
// 결정 시 해야 할 일:
//   · 민용일 채택 → saju.ts 일주 경로만 raw Y/M/D 사용, 아래 기대값을
//     CONVENTIONS 골든과 같게 수정, SOLAR_TIME_CONVENTION.md:52 수정
//   · 보정 instant 채택 → CONVENTIONS.md:27,30,31 수정(자평파 민용일 미채택
//     선언), 아래 기대값 유지

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

describe('PINNED — 경도를 넘기면 일주 경계가 LMT 만큼 밀린다 (교리 미결정)', () => {
  it('문서 골든이 경도 경로에서는 깨진다 — 이게 미해결 모순이다', () => {
    const noLon = pillars('1991-01-01', '00:01')
    const withLon = pillars('1991-01-01', '00:01', { lon: SEOUL_LON })
    // 문서(CONVENTIONS.md:30)가 요구하는 값
    expect(noLon).toEqual({ day: '辛未', time: '戊子' })
    // 현행 동작 — 보정 -32분이 00:01 을 전날 23:29 로 밀어 전날 일주가 나온다
    expect(withLon).toEqual({ day: '庚午', time: '丙子' })
    expect(withLon.day).not.toBe(noLon.day)
  })

  it('서울: 00:00~00:31 이 전날 일주, 00:32 부터 당일 (보정 -32분)', () => {
    expect(pillars('1991-02-03', '00:00', { lon: SEOUL_LON }).day).toBe('癸卯')
    expect(pillars('1991-02-03', '00:31', { lon: SEOUL_LON }).day).toBe('癸卯')
    expect(pillars('1991-02-03', '00:32', { lon: SEOUL_LON }).day).toBe('甲辰')
    expect(pillars('1991-02-03', '01:00', { lon: SEOUL_LON }).day).toBe('甲辰')
  })

  it('경계 폭 = |LMT 보정|. 도시마다 다르다', () => {
    const widthOf = (lon: number) => {
      let n = 0
      for (let m = 0; m < 60; m++) {
        const t = `00:${String(m).padStart(2, '0')}`
        if (pillars('1991-02-03', t, { lon }).day !== pillars('1991-02-03', t).day) n++
      }
      return n
    }
    expect(widthOf(SEOUL_LON)).toBe(32)
    expect(widthOf(BUSAN_LON)).toBe(24)
    expect(widthOf(INCHEON_LON)).toBe(33)
  })

  it('표준자오선 동쪽(보정 +)은 반대로 자정 *직전*이 다음날이 된다', () => {
    const t = { tz: 'Asia/Tokyo', lon: TOKYO_LON }
    // 도쿄 보정 +19분 → 23:41 이 다음날 00:00 을 넘는다
    expect(pillars('1991-02-02', '23:40', t).day).toBe('癸卯')
    expect(pillars('1991-02-02', '23:41', t).day).toBe('甲辰')
    // 경도 없으면 민용일 그대로
    expect(pillars('1991-02-02', '23:59', { tz: 'Asia/Tokyo' }).day).toBe('癸卯')
  })

  it('경계 밖(자정에서 먼 시각)은 경도 유무와 무관하게 같은 일주', () => {
    for (const t of ['02:00', '06:40', '09:35', '12:00', '18:00', '22:00']) {
      expect(pillars('1991-02-03', t, { lon: SEOUL_LON }).day, t).toBe(pillars('1991-02-03', t).day)
    }
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
