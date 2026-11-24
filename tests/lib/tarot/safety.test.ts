// 타로 위기 가드 — 자해/자살 신호 감지 + 위기 응답 페이로드.
//
// interpret-stream 해석 직전 가드에서 쓰인다. 위기 사용자가 일반 리딩 대신
// 상담전화 안내를 반드시 받도록 하는 안전장치라, 커버리지 15% 로 둘 수 없는
// 모듈이다. 핫라인 번호와 카드 형태(정상 응답 스키마 호환)를 골든으로 잠근다.

import { describe, it, expect } from 'vitest'
import { isDangerousQuestion, buildCrisisPayload } from '@/lib/tarot/safety'

describe('isDangerousQuestion (crisis 모듈 위임)', () => {
  it.each([
    '자살하고 싶어요',
    '요즘 죽고싶다는 생각이 들어', // 띄어쓰기 없는 한국어 변형
    '죽고 싶어',
    '자해를 멈출 수가 없어',
    'I want to die',
    'should I kill myself',
  ])('위기 신호 감지: %s', (q) => {
    expect(isDangerousQuestion(q)).toBe(true)
  })

  it.each([
    '오늘 연애운 알려줘',
    '이직해도 될까요?',
    'When will I find a new job?',
    '', // 빈 입력은 위기 아님
  ])('일반 질문은 통과: %s', (q) => {
    expect(isDangerousQuestion(q)).toBe(false)
  })
})

describe('buildCrisisPayload', () => {
  it('ko: 1393 핫라인이 overall 과 advice 에 모두 들어간다', () => {
    const p = buildCrisisPayload({ language: 'ko', cardCount: 3 })
    expect(p.overall).toContain('1393')
    expect(p.advice).toContain('1393')
    expect(p.cards).toHaveLength(3)
    for (const c of p.cards) {
      expect(c.position).toBe('쉼')
      expect(c.interpretation.length).toBeGreaterThan(0)
    }
  })

  it('en: 988(US)과 1393(KR) 핫라인 안내', () => {
    const p = buildCrisisPayload({ language: 'en', cardCount: 1 })
    expect(p.overall).toContain('988')
    expect(p.overall).toContain('1393')
    expect(p.advice).toContain('988')
    expect(p.cards[0].position).toBe('Pause')
  })

  it('cardCount 0 이어도 최소 1장은 채운다 — 클라이언트 렌더 스키마 보장', () => {
    const p = buildCrisisPayload({ language: 'ko', cardCount: 0 })
    expect(p.cards).toHaveLength(1)
  })
})
