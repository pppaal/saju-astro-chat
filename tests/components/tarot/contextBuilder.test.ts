import { describe, expect, it } from 'vitest'
import { buildContextWithNewCard } from '@/components/tarot/utils/contextBuilder'

describe('contextBuilder', () => {
  it('caps follow-up card context and deduplicates identical cards', () => {
    const baseContext: any = {
      spread_title: 'Three Card',
      category: 'love',
      overall_message: 'base',
      guidance: 'guide',
      cards: Array.from({ length: 10 }, (_, idx) => ({
        position: idx < 2 ? 'Card for this question' : `Pos-${idx}`,
        name: idx < 2 ? 'The Sun' : `Card-${idx}`,
        is_reversed: false,
        meaning: `Meaning-${idx}`,
        keywords: [],
      })),
    }

    const newCard: any = {
      isReversed: false,
      card: {
        name: 'The Sun',
        nameKo: '태양',
        upright: { meaning: 'Light', meaningKo: '빛', keywords: ['joy'], keywordsKo: ['기쁨'] },
        reversed: { meaning: 'Delay', meaningKo: '지연', keywords: ['delay'], keywordsKo: ['지연'] },
      },
    }

    const updated = buildContextWithNewCard(baseContext, newCard, 'en')

    expect(updated.cards.length).toBeLessThanOrEqual(8)
    const duplicateCount = updated.cards.filter(
      (c: any) => c.position === 'Card for this question' && c.name === 'The Sun'
    ).length
    expect(duplicateCount).toBe(1)
  })
})
