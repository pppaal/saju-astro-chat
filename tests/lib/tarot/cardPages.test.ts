/**
 * 타로 카드 의미 사전(/tarot/cards) 헬퍼 검증 — 슬러그 유일성, 조회
 * 라운드트립, suit 그룹 완전성, prev/next 순회.
 */

import { describe, it, expect } from 'vitest'
import { tarotDeck } from '@/lib/tarot/data'
import {
  ALL_CARD_SLUGS,
  cardSlug,
  cardsOfSuit,
  getCardBySlug,
  neighborCards,
  SUIT_ORDER,
} from '@/lib/tarot/cardPages'

describe('cardSlug', () => {
  it('영문 이름을 URL 세이프 kebab-case 로 만든다', () => {
    expect(cardSlug('The Fool')).toBe('the-fool')
    expect(cardSlug('Ace of Cups')).toBe('ace-of-cups')
    expect(cardSlug('Wheel of Fortune')).toBe('wheel-of-fortune')
  })

  it('78장 슬러그가 전부 유일하고 유효하다', () => {
    expect(ALL_CARD_SLUGS).toHaveLength(78)
    expect(new Set(ALL_CARD_SLUGS).size).toBe(78)
    for (const slug of ALL_CARD_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})

describe('getCardBySlug', () => {
  it('모든 카드가 슬러그로 라운드트립된다', () => {
    for (const card of tarotDeck) {
      expect(getCardBySlug(cardSlug(card.name))?.id).toBe(card.id)
    }
  })

  it('없는 슬러그는 null', () => {
    expect(getCardBySlug('not-a-card')).toBeNull()
  })
})

describe('suit 그룹', () => {
  it('5개 그룹 합이 정확히 78장(빠짐/중복 없음)', () => {
    const total = SUIT_ORDER.reduce((sum, suit) => sum + cardsOfSuit(suit).length, 0)
    expect(total).toBe(78)
    expect(cardsOfSuit('major')).toHaveLength(22)
  })
})

describe('neighborCards', () => {
  it('prev/next 로 78장을 전부 순회할 수 있다(내부 링크 메시)', () => {
    const visited = new Set<number>()
    let card = tarotDeck[0]
    for (let i = 0; i < 78; i++) {
      visited.add(card.id)
      card = neighborCards(card).next
    }
    expect(visited.size).toBe(78)
    // 한 바퀴 돌면 처음으로
    expect(card.id).toBe(tarotDeck[0].id)
  })
})
