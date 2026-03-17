import { describe, expect, it } from 'vitest'
import {
  buildTarotSaveRequest,
  flattenTarotGuidance,
  normalizeTarotQuestionText,
} from '@/lib/Tarot/tarot-save-request'
import type { DrawnCard, Spread } from '@/lib/Tarot/tarot.types'

const spread: Spread = {
  id: 'quick-reading',
  title: 'Quick Reading',
  titleKo: '빠른 리딩',
  description: 'Quick spread',
  descriptionKo: '빠른 스프레드',
  cardCount: 1,
  positions: [
    {
      title: 'Present',
      titleKo: '현재',
      description: 'Current energy',
      descriptionKo: '현재 에너지',
    },
  ],
}

const drawnCards: DrawnCard[] = [
  {
    card: {
      id: 0,
      name: 'The Fool',
      nameKo: '광대',
      arcana: 'major',
      suit: null,
      image: '/images/tarot/the-fool.png',
      upright: {
        keywords: ['new'],
        keywordsKo: ['새로움'],
        meaning: 'Beginnings',
        meaningKo: '시작',
      },
      reversed: {
        keywords: ['delay'],
        keywordsKo: ['지연'],
        meaning: 'Delay',
        meaningKo: '지연',
      },
    },
    isReversed: false,
  },
]

describe('tarot-save-request', () => {
  it('normalizes blank question text by spread and locale', () => {
    expect(normalizeTarotQuestionText('   ', spread, 'ko')).toBe('빠른 리딩 리딩')
    expect(normalizeTarotQuestionText('', spread, 'en')).toBe('Quick Reading reading')
  })

  it('flattens structured guidance into a single string', () => {
    expect(
      flattenTarotGuidance([
        { title: 'Step 1', detail: 'Pause first' },
        { title: 'Step 2', detail: 'Ask again tomorrow' },
      ])
    ).toBe('Step 1: Pause first\nStep 2: Ask again tomorrow')
  })

  it('builds a stable save payload for authenticated tarot saves', () => {
    const payload = buildTarotSaveRequest({
      question: '',
      spreadInfo: spread,
      readingResult: {
        drawnCards,
        spread: { positions: spread.positions },
        questionContext: {
          question_summary: 'Current flow in love',
        },
      },
      interpretation: {
        overall_message: 'Move slower than you want.',
        guidance: [{ title: 'Check', detail: 'Validate intent first.' }],
        affirmation: 'I can move with clarity.',
        card_insights: [
          {
            position: 'Present',
            card_name: 'The Fool',
            is_reversed: false,
            interpretation: 'A new cycle starts carefully.',
          },
        ],
      },
      categoryName: 'general-insight',
      spreadId: 'quick-reading',
      selectedDeckStyle: 'classic',
      language: 'ko',
      questionAnalysis: {
        question_summary: 'Current flow in love',
      },
    })

    expect(payload.question).toBe('빠른 리딩 리딩')
    expect(payload.spreadId).toBe('quick-reading')
    expect(payload.spreadTitle).toBe('빠른 리딩')
    expect(payload.guidance).toBe('Check: Validate intent first.')
    expect(payload.cards[0]).toMatchObject({
      cardId: '0',
      name: '광대',
      isReversed: false,
      position: '현재',
    })
    expect(payload.questionContext).toEqual({
      question_summary: 'Current flow in love',
    })
  })
})
