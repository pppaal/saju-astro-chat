import { describe, it, expect } from 'vitest'
import { findCardBySavedName } from '@/lib/tarot/findCardByName'
import { tarotDeck } from '@/lib/tarot/data'

describe('findCardBySavedName', () => {
  it('영어 이름 정확 일치로 deck 카드를 찾는다', () => {
    const card = findCardBySavedName({ name: 'The Fool' }, 0)
    expect(card.id).toBe(0)
    expect(card.name).toBe('The Fool')
    expect(card.image).toBeTruthy()
  })

  it('한국어 이름(nameKo)으로도 찾는다', () => {
    const card = findCardBySavedName({ name: 'unknown-x', nameKo: '마법사' }, 0)
    expect(card.name).toBe('The Magician')
    expect(card.id).toBe(1)
  })

  it('name 필드에 한국어가 들어 있어도 매칭한다 (교차 비교)', () => {
    const card = findCardBySavedName({ name: '여사제' }, 0)
    expect(card.name).toBe('The High Priestess')
  })

  it('대소문자/양끝 공백 차이를 무시하고 매칭한다', () => {
    const card = findCardBySavedName({ name: '  the fool  ' }, 0)
    expect(card.id).toBe(0)
    expect(card.name).toBe('The Fool')
  })

  it('매칭 실패 시 card-back placeholder 를 반환한다 (빈 슬롯 없음)', () => {
    const card = findCardBySavedName({ name: 'Nonexistent Card', nameKo: '없는 카드' }, 3)
    expect(card.name).toBe('Nonexistent Card')
    expect(card.nameKo).toBe('없는 카드')
    expect(card.image).toBe('/images/tarot/card-back.webp')
  })

  it('placeholder id 는 -1 - index 로 위치별 유니크하다 (deck id 와 충돌 없음)', () => {
    const a = findCardBySavedName({ name: 'nope' }, 0)
    const b = findCardBySavedName({ name: 'nope' }, 5)
    expect(a.id).toBe(-1)
    expect(b.id).toBe(-6)
    expect(tarotDeck.some((c) => c.id === a.id || c.id === b.id)).toBe(false)
  })

  it('placeholder 의 nameKo 가 없으면 name 으로 fallback 한다', () => {
    const card = findCardBySavedName({ name: 'Mystery' }, 0)
    expect(card.nameKo).toBe('Mystery')
  })

  it('deck 78장 전부 자기 이름으로 round-trip 매칭된다', () => {
    expect(tarotDeck).toHaveLength(78)
    for (const deckCard of tarotDeck) {
      const byEn = findCardBySavedName({ name: deckCard.name }, 0)
      expect(byEn.id).toBe(deckCard.id)
    }
  })
})
