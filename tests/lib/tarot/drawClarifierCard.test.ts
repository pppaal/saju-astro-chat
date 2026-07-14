import { describe, it, expect } from 'vitest'
import { drawClarifierCard } from '@/lib/tarot/drawClarifierCard'
import tarotDeck from '@/lib/tarot/data'

// 회귀: 클래리파이어("한 장 더")가 스프레드에 이미 깔린 카드와 겹치던 버그.
// 같은 리딩에 The Fool 이 두 번(스프레드 + 보충) 나오는 물리 덱 불가능한 중복을
// exclude 필터로 막는다.
describe('drawClarifierCard — 중복 제외(exclude)', () => {
  it('exclude 에 든 카드는 절대 뽑지 않는다', () => {
    // 78장 중 1장만 남기고 전부 제외 → 남은 그 카드만 나와야 한다(1000회 반복).
    const keep = tarotDeck[0].name
    const exclude = tarotDeck.slice(1).map((c) => c.name)
    for (let i = 0; i < 1000; i++) {
      const card = drawClarifierCard(exclude)
      expect(card.name).toBe(keep)
    }
  })

  it('exclude 를 안 주면 전체 덱에서 뽑는다(기존 동작 보존)', () => {
    const card = drawClarifierCard()
    expect(tarotDeck.some((c) => c.name === card.name)).toBe(true)
  })

  it('제외 목록이 덱을 다 덮는 비정상 입력이면 전체 덱으로 안전 폴백(빈 결과 방지)', () => {
    const all = tarotDeck.map((c) => c.name)
    const card = drawClarifierCard(all)
    // 빈 카드가 아니라 유효한 덱 카드가 나와야 한다.
    expect(card.name).toBeTruthy()
    expect(tarotDeck.some((c) => c.name === card.name)).toBe(true)
  })
})
