import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardInterpretationChat } from '@/app/tarot/[categoryName]/[spreadId]/components/ChatMessages/CardInterpretationChat'
import type {
  ReadingResult,
  InterpretationResult,
} from '@/app/tarot/[categoryName]/[spreadId]/types'

function makeCard(id: number, name: string, nameKo: string) {
  return {
    id,
    name,
    nameKo,
    arcana: 'major' as const,
    suit: 'major' as const,
    image: '',
    upright: {
      keywords: ['focus'],
      keywordsKo: ['집중'],
      meaning: `${name} upright meaning`,
      meaningKo: `${nameKo} 정방향 의미`,
    },
    reversed: {
      keywords: ['delay'],
      keywordsKo: ['지연'],
      meaning: `${name} reversed meaning`,
      meaningKo: `${nameKo} 역방향 의미`,
    },
  }
}

function makeReadingResult(): ReadingResult {
  return {
    category: 'love',
    spread: {
      id: 'three-card',
      title: 'Three Card',
      titleKo: '3카드',
      cardCount: 3,
      description: '',
      descriptionKo: '',
      positions: [
        { title: 'Past', titleKo: '과거' },
        { title: 'Present', titleKo: '현재' },
        { title: 'Future', titleKo: '미래' },
      ],
    },
    drawnCards: [
      { card: makeCard(1, 'The Fool', '바보'), isReversed: false },
      { card: makeCard(2, 'The Magician', '마법사'), isReversed: true },
      { card: makeCard(3, 'The Star', '별'), isReversed: false },
    ],
  }
}

describe('CardInterpretationChat', () => {
  it('renders one card interpretation block per drawn card even when interpretation is null', () => {
    render(
      <CardInterpretationChat
        readingResult={makeReadingResult()}
        interpretation={null}
        language="ko"
      />
    )

    expect(screen.getAllByText('핵심:')).toHaveLength(3)
    expect(screen.getAllByText('설명:')).toHaveLength(3)
  })

  it('keeps full card count and mixes AI explanation with fallback explanation safely', () => {
    const interpretation: InterpretationResult = {
      overall_message: '테스트',
      guidance: '테스트',
      affirmation: '테스트',
      card_insights: [
        {
          position: '과거',
          card_name: 'The Fool',
          is_reversed: false,
          interpretation: '첫 번째 카드는 이번 주 안에 먼저 확인해야 할 변수를 말해줍니다.',
        },
      ],
      fallback: false,
    }

    render(
      <CardInterpretationChat
        readingResult={makeReadingResult()}
        interpretation={interpretation}
        language="ko"
      />
    )

    expect(screen.getAllByText('핵심:')).toHaveLength(3)
    expect(screen.getAllByText('설명:')).toHaveLength(3)
    expect(
      screen.getByText('첫 번째 카드는 이번 주 안에 먼저 확인해야 할 변수를 말해줍니다.')
    ).toBeInTheDocument()
  })
})
