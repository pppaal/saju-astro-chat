// tests/components/calendar/v9/calendarCopy.parity.test.ts
//
// 운세 달력 화면 문구 — 모든 항목이 ko/en 한 쌍, 빈 문자열 없음, 영어엔 한글 없음, 이모지 없음,
// '{자리}' 표시가 두 언어에서 같다.

import { describe, it, expect } from 'vitest'
import { CAL_COPY } from '@/components/calendar/v9/calendarCopy'

const HANGUL = /[ㄱ-ㆎ가-힣]/
// 이모지 표시 문자(그림 문자 + 이모지 변형 선택자). ↔ · ▲ · ✦ 같은 기호는 대상이 아니다.
const EMOJI = /\p{Emoji_Presentation}|\u{FE0F}/u
const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('CAL_COPY — ko/en parity', () => {
  for (const [key, pair] of Object.entries(CAL_COPY)) {
    it(key, () => {
      expect(Object.keys(pair).sort()).toEqual(['en', 'ko'])
      expect(pair.ko.trim().length).toBeGreaterThan(0)
      expect(pair.en.trim().length).toBeGreaterThan(0)
      expect(pair.en).not.toMatch(HANGUL)
      expect(pair.ko).not.toMatch(EMOJI)
      expect(pair.en).not.toMatch(EMOJI)
      expect(slots(pair.ko)).toEqual(slots(pair.en))
    })
  }

  it('AI 라벨이 없다 — 날 문구는 엔진 템플릿(FIX9b E8)', () => {
    for (const pair of Object.values(CAL_COPY)) {
      expect(pair.en).not.toMatch(/\bAI\b/)
      expect(pair.ko).not.toMatch(/\bAI\b/)
    }
  })
})
