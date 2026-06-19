/**
 * pickSignatureCard — "지금 나를 닮은 카드" 대표 카드 선택 회귀 테스트.
 * 결정적(같은 뽑기 → 같은 카드)이라야 캐시·재방문에도 정체성이 흔들리지 않는다.
 */
import { describe, it, expect } from 'vitest'
import { pickSignatureCard, signatureKeywords } from '@/lib/tarot/signatureCard'
import type { Card, DrawnCard } from '@/lib/tarot/tarot.types'

function card(partial: Partial<Card> & Pick<Card, 'id' | 'arcana'>): Card {
  return {
    id: partial.id,
    name: partial.name ?? `Card ${partial.id}`,
    nameKo: partial.nameKo ?? `카드 ${partial.id}`,
    arcana: partial.arcana,
    suit: partial.suit ?? 'major',
    image: partial.image ?? `/images/tarot/${partial.id}.webp`,
    upright: partial.upright ?? {
      keywords: ['a'],
      keywordsKo: ['가', '나', '다', '라'],
      meaning: 'm',
    },
    reversed: partial.reversed ?? { keywords: ['b'], keywordsKo: ['역'], meaning: 'r' },
  }
}
const dc = (c: Card, isReversed = false): DrawnCard => ({ card: c, isReversed })

describe('pickSignatureCard', () => {
  it('빈/널이면 null', () => {
    expect(pickSignatureCard([])).toBeNull()
    expect(pickSignatureCard(null)).toBeNull()
    expect(pickSignatureCard(undefined)).toBeNull()
  })

  it('메이저 아르카나를 우선한다', () => {
    const cards = [dc(card({ id: 1, arcana: 'minor' })), dc(card({ id: 2, arcana: 'major' }))]
    expect(pickSignatureCard(cards)?.card.id).toBe(2)
  })

  it('메이저 중 정방향을 우선한다', () => {
    const cards = [
      dc(card({ id: 1, arcana: 'major' }), true), // 역방향
      dc(card({ id: 2, arcana: 'major' }), false), // 정방향
    ]
    expect(pickSignatureCard(cards)?.card.id).toBe(2)
  })

  it('동급이면 가장 먼저 뽑은 위치를 쓴다(결정적)', () => {
    const cards = [dc(card({ id: 5, arcana: 'major' })), dc(card({ id: 6, arcana: 'major' }))]
    expect(pickSignatureCard(cards)?.card.id).toBe(5)
    // 같은 입력 → 같은 결과
    expect(pickSignatureCard(cards)?.card.id).toBe(pickSignatureCard(cards)?.card.id)
  })

  it('메이저가 없으면 마이너에서 고른다', () => {
    const cards = [dc(card({ id: 1, arcana: 'minor' }), true), dc(card({ id: 2, arcana: 'minor' }))]
    expect(pickSignatureCard(cards)?.card.id).toBe(2) // 정방향 우선
  })

  it('signatureKeywords 는 정/역 키워드를 max 개수로 합친다', () => {
    const c = card({ id: 1, arcana: 'major' })
    expect(signatureKeywords(dc(c, false), true, 3)).toBe('가 · 나 · 다')
    expect(signatureKeywords(dc(c, true), true, 3)).toBe('역')
  })
})
