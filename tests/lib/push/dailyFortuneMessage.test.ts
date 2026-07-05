/**
 * dailyFortuneMessage — 순수/결정론 보장 테스트.
 *
 * cron 발송 본문은 LLM 없이 일간×일진 십신 + 일지 충/합으로만 만들어진다.
 * 고정 입력 → 고정 출력(아래 핀 문자열)을 깨면 "어제와 다른 오늘의 운세"
 * 회귀이므로 의도된 카피 변경일 때만 핀을 갱신할 것.
 */

import { describe, it, expect } from 'vitest'
import { buildDailyFortuneMessage } from '@/lib/push/dailyFortuneMessage'

const DAY = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

describe('buildDailyFortuneMessage', () => {
  it('같은 입력이면 항상 같은 출력 (결정론)', () => {
    const opts = { birthDate: '1995-02-09', date: DAY(2026, 6, 11), locale: 'ko' as const }
    const first = buildDailyFortuneMessage(opts)
    for (let i = 0; i < 5; i += 1) {
      expect(buildDailyFortuneMessage(opts)).toEqual(first)
    }
  })

  it('고정 입력 ko — 십신(정관) 기반 한 줄 핀', () => {
    const msg = buildDailyFortuneMessage({
      birthDate: '1995-02-09',
      date: DAY(2026, 6, 11),
      locale: 'ko',
    })
    expect(msg.title).toBe('오늘의 운세')
    expect(msg.body).toBe('오늘은 신뢰가 쌓이는 날 🎯 — 원칙대로 처리하면 평판이 올라갑니다')
  })

  it('고정 입력 en — 같은 날 같은 판정, 영어 카피', () => {
    const msg = buildDailyFortuneMessage({
      birthDate: '1995-02-09',
      date: DAY(2026, 6, 11),
      locale: 'en',
    })
    expect(msg.title).toBe("Today's Fortune")
    expect(msg.body).toBe(
      'Today feels good for earning trust 🎯 — play it by the book and reputation grows'
    )
  })

  it('일지 충(冲)인 날은 주의 조언으로 교체된다 (1995-02-09 × 2026-06-08)', () => {
    const msg = buildDailyFortuneMessage({
      birthDate: '1995-02-09',
      date: DAY(2026, 6, 8),
      locale: 'ko',
    })
    expect(msg.body).toContain('중요한 결정은 하루 미루세요')
  })

  it('일지 육합(六合)인 날은 관계 조언으로 교체된다 (1995-02-09 × 2026-06-13)', () => {
    const msg = buildDailyFortuneMessage({
      birthDate: '1995-02-09',
      date: DAY(2026, 6, 13),
      locale: 'en',
    })
    expect(msg.body).toContain('connections flow smoothly')
  })

  it('생년월일이 없으면 일반 문구 (오늘 일진 오행 기반) — ko/en', () => {
    const ko = buildDailyFortuneMessage({ birthDate: null, date: DAY(2026, 6, 11), locale: 'ko' })
    const en = buildDailyFortuneMessage({ birthDate: null, date: DAY(2026, 6, 11), locale: 'en' })
    expect(ko.body).toBe('오늘은 활기가 도는 날 — 미뤄둔 일을 움직여 보세요 🔥')
    expect(en.body).toBe('Momentum is on your side today — move that task you postponed 🔥')
  })

  it('잘못된 생년월일 형식은 일반 문구로 처리 (throw 금지)', () => {
    for (const bad of ['', '95-02-09', '1995/02/09', '1995-13-01', '1700-01-01', 'abc']) {
      const msg = buildDailyFortuneMessage({ birthDate: bad, date: DAY(2026, 6, 11), locale: 'ko' })
      expect(msg.title).toBe('오늘의 운세')
      expect(msg.body.length).toBeGreaterThan(0)
    }
  })

  it('이모지는 메시지당 정확히 1개', () => {
    const emojiCount = (s: string) =>
      [...s].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length
    for (const birthDate of ['1995-02-09', '1990-03-15', null]) {
      for (const locale of ['ko', 'en'] as const) {
        const msg = buildDailyFortuneMessage({ birthDate, date: DAY(2026, 6, 11), locale })
        expect(emojiCount(msg.body)).toBe(1)
      }
    }
  })

  it('날짜가 바뀌면 메시지도 (주기적으로) 달라진다 — 10일 윈도우에 2종 이상', () => {
    const bodies = new Set<string>()
    for (let d = 1; d <= 10; d += 1) {
      bodies.add(
        buildDailyFortuneMessage({ birthDate: '1995-02-09', date: DAY(2026, 6, d), locale: 'ko' })
          .body
      )
    }
    expect(bodies.size).toBeGreaterThan(1)
  })

  describe('경고 적중 리마인드 (어제 충 → 오늘 회고 한 줄)', () => {
    // 1990-05-21 → 일지 戌, 충 대상 辰. 2026-07-05 는 辰일(충 경고 발송일),
    // 2026-07-06 은 충 아님 → 회고가 붙는다. (fixture 는 dayPillar 산식으로 산출.)
    it('어제가 충이고 오늘이 아니면 회고 한 줄을 앞에 붙인다', () => {
      const msg = buildDailyFortuneMessage({
        birthDate: '1990-05-21',
        date: DAY(2026, 7, 6),
        locale: 'ko',
      })
      expect(msg.body.startsWith('어제 조심하라던 변수, 잘 지나갔나요?')).toBe(true)
      const en = buildDailyFortuneMessage({
        birthDate: '1990-05-21',
        date: DAY(2026, 7, 6),
        locale: 'en',
      })
      expect(en.body.startsWith("Did yesterday's tricky spots pass okay?")).toBe(true)
    })

    it('오늘이 충이면(오늘 경고 우선) 회고를 붙이지 않는다', () => {
      const msg = buildDailyFortuneMessage({
        birthDate: '1990-05-21',
        date: DAY(2026, 7, 5),
        locale: 'ko',
      })
      expect(msg.body).not.toContain('어제 조심하라던')
      expect(msg.body).toContain('중요한 결정은 하루 미루세요')
    })

    it('어제도 오늘도 충이 아니면 회고 없음', () => {
      const msg = buildDailyFortuneMessage({
        birthDate: '1990-05-21',
        date: DAY(2026, 7, 10),
        locale: 'ko',
      })
      expect(msg.body).not.toContain('어제 조심하라던')
    })

    it('프로필 없으면(일반 문구) 회고 없음', () => {
      const msg = buildDailyFortuneMessage({ birthDate: null, date: DAY(2026, 7, 6), locale: 'ko' })
      expect(msg.body).not.toContain('어제 조심하라던')
    })
  })
})
