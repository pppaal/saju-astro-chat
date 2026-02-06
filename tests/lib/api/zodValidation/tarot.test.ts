/**
 * Tarot Schema Tests
 * Comprehensive testing for tarot.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  tarotCardSaveSchema,
  tarotCardInsightSchema,
  tarotCardSchema,
  tarotCardDetailedSchema,
  tarotSaveRequestSchema,
  tarotQuerySchema,
  tarotInterpretRequestSchema,
  tarotInterpretEnhancedRequestSchema,
  tarotDrawSchema,
  tarotInterpretStreamSchema,
  tarotChatRequestSchema,
  tarotChatStreamRequestSchema,
  tarotAnalyzeQuestionSchema,
  coupleTarotReadingPostSchema,
  coupleTarotReadingDeleteSchema,
  coupleTarotReadingQuerySchema,
} from '@/lib/api/zodValidation/tarot'

describe('Tarot Card Schemas', () => {
  describe('tarotCardSaveSchema', () => {
    const validCard = {
      cardId: 'the-fool',
      name: 'The Fool',
      image: '/cards/fool.jpg',
      isReversed: false,
      position: 'Past',
    }

    it('should accept valid card', () => {
      expect(tarotCardSaveSchema.safeParse(validCard).success).toBe(true)
    })

    it('should accept reversed card', () => {
      expect(tarotCardSaveSchema.safeParse({ ...validCard, isReversed: true }).success).toBe(true)
    })

    it('should reject missing cardId', () => {
      const { cardId, ...rest } = validCard
      expect(tarotCardSaveSchema.safeParse(rest).success).toBe(false)
    })

    it('should reject empty name', () => {
      expect(tarotCardSaveSchema.safeParse({ ...validCard, name: '' }).success).toBe(false)
    })

    it('should reject too long image URL', () => {
      expect(tarotCardSaveSchema.safeParse({ ...validCard, image: 'a'.repeat(501) }).success).toBe(false)
    })
  })

  describe('tarotCardInsightSchema', () => {
    const validInsight = {
      position: 'Past',
      card_name: 'The Fool',
      is_reversed: false,
      interpretation: 'A new beginning awaits you',
    }

    it('should accept valid insight', () => {
      expect(tarotCardInsightSchema.safeParse(validInsight).success).toBe(true)
    })

    it('should reject too long interpretation', () => {
      expect(tarotCardInsightSchema.safeParse({
        ...validInsight,
        interpretation: 'a'.repeat(5001),
      }).success).toBe(false)
    })
  })

  describe('tarotCardSchema', () => {
    const validCard = {
      name: 'The Fool',
      isReversed: false,
      position: 'Past',
    }

    it('should accept valid card', () => {
      expect(tarotCardSchema.safeParse(validCard).success).toBe(true)
    })

    it('should accept Korean names', () => {
      expect(tarotCardSchema.safeParse({
        ...validCard,
        nameKo: '바보',
        positionKo: '과거',
        meaningKo: '새로운 시작',
      }).success).toBe(true)
    })

    it('should accept keywords', () => {
      expect(tarotCardSchema.safeParse({
        ...validCard,
        keywords: ['freedom', 'adventure', 'innocence'],
        keywordsKo: ['자유', '모험', '순수'],
      }).success).toBe(true)
    })

    it('should reject too many keywords', () => {
      expect(tarotCardSchema.safeParse({
        ...validCard,
        keywords: Array(9).fill('keyword'),
      }).success).toBe(false)
    })
  })

  describe('tarotCardDetailedSchema', () => {
    const validCard = {
      name: 'The Fool',
      isReversed: false,
      position: 'Past',
    }

    it('should accept valid detailed card', () => {
      expect(tarotCardDetailedSchema.safeParse(validCard).success).toBe(true)
    })

    it('should trim whitespace', () => {
      const result = tarotCardDetailedSchema.safeParse({
        name: '  The Fool  ',
        isReversed: false,
        position: '  Past  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('The Fool')
        expect(result.data.position).toBe('Past')
      }
    })
  })
})

describe('Tarot Request Schemas', () => {
  describe('tarotSaveRequestSchema', () => {
    const validRequest = {
      question: 'What does my future hold?',
      spreadId: 'three-card',
      spreadTitle: 'Past-Present-Future',
      cards: [
        { cardId: 'the-fool', name: 'The Fool', image: '/fool.jpg', isReversed: false, position: 'Past' },
      ],
    }

    it('should accept valid save request', () => {
      expect(tarotSaveRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept optional fields', () => {
      expect(tarotSaveRequestSchema.safeParse({
        ...validRequest,
        theme: 'love',
        overallMessage: 'A journey of growth awaits',
        guidance: 'Follow your heart',
        affirmation: 'I am open to new beginnings',
        source: 'standalone',
        locale: 'ko',
      }).success).toBe(true)
    })

    it('should accept counselor source', () => {
      expect(tarotSaveRequestSchema.safeParse({
        ...validRequest,
        source: 'counselor',
        counselorSessionId: 'session-123',
      }).success).toBe(true)
    })

    it('should reject empty cards', () => {
      expect(tarotSaveRequestSchema.safeParse({
        ...validRequest,
        cards: [],
      }).success).toBe(false)
    })

    it('should reject too many cards', () => {
      expect(tarotSaveRequestSchema.safeParse({
        ...validRequest,
        cards: Array(21).fill(validRequest.cards[0]),
      }).success).toBe(false)
    })

    it('should trim question', () => {
      const result = tarotSaveRequestSchema.safeParse({
        ...validRequest,
        question: '  What is my fortune?  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.question).toBe('What is my fortune?')
      }
    })
  })

  describe('tarotQuerySchema', () => {
    it('should accept empty query', () => {
      expect(tarotQuerySchema.safeParse({}).success).toBe(true)
    })

    it('should use defaults', () => {
      const result = tarotQuerySchema.safeParse({})
      if (result.success) {
        expect(result.data.limit).toBe(10)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept custom values', () => {
      const result = tarotQuerySchema.safeParse({
        limit: 50,
        offset: 20,
        theme: 'career',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(20)
        expect(result.data.theme).toBe('career')
      }
    })

    it('should reject invalid limit', () => {
      expect(tarotQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
      expect(tarotQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })
  })

  describe('tarotInterpretRequestSchema', () => {
    const validRequest = {
      categoryId: 'love',
      spreadId: 'three-card',
      spreadTitle: 'Past-Present-Future',
      cards: [
        { name: 'The Fool', isReversed: false, position: 'Past' },
        { name: 'The Magician', isReversed: true, position: 'Present' },
        { name: 'The High Priestess', isReversed: false, position: 'Future' },
      ],
    }

    it('should accept valid request', () => {
      expect(tarotInterpretRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should default language to ko', () => {
      const result = tarotInterpretRequestSchema.safeParse(validRequest)
      if (result.success) {
        expect(result.data.language).toBe('ko')
      }
    })

    it('should accept en language', () => {
      const result = tarotInterpretRequestSchema.safeParse({
        ...validRequest,
        language: 'en',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional fields', () => {
      expect(tarotInterpretRequestSchema.safeParse({
        ...validRequest,
        userQuestion: 'Will I find love?',
        birthdate: '1990-05-15',
        moonPhase: 'Full Moon',
      }).success).toBe(true)
    })

    it('should reject more than 15 cards', () => {
      expect(tarotInterpretRequestSchema.safeParse({
        ...validRequest,
        cards: Array(16).fill(validRequest.cards[0]),
      }).success).toBe(false)
    })
  })

  describe('tarotInterpretEnhancedRequestSchema', () => {
    const validRequest = {
      categoryId: 'career',
      spreadId: 'celtic-cross',
      spreadTitle: 'Celtic Cross Spread',
      cards: [
        { name: 'The Emperor', isReversed: false, position: 'Present' },
      ],
    }

    it('should accept valid enhanced request', () => {
      expect(tarotInterpretEnhancedRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should trim strings', () => {
      const result = tarotInterpretEnhancedRequestSchema.safeParse({
        categoryId: '  career  ',
        spreadId: '  celtic-cross  ',
        spreadTitle: '  Celtic Cross  ',
        cards: [{ name: '  The Emperor  ', isReversed: false, position: '  Present  ' }],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.categoryId).toBe('career')
        expect(result.data.spreadId).toBe('celtic-cross')
      }
    })
  })

  describe('tarotDrawSchema', () => {
    it('should accept valid draw request', () => {
      expect(tarotDrawSchema.safeParse({
        categoryId: 'love',
        spreadId: 'three-card',
      }).success).toBe(true)
    })

    it('should reject empty categoryId', () => {
      expect(tarotDrawSchema.safeParse({
        categoryId: '',
        spreadId: 'three-card',
      }).success).toBe(false)
    })

    it('should trim values', () => {
      const result = tarotDrawSchema.safeParse({
        categoryId: '  love  ',
        spreadId: '  three-card  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.categoryId).toBe('love')
        expect(result.data.spreadId).toBe('three-card')
      }
    })
  })

  describe('tarotInterpretStreamSchema', () => {
    const validRequest = {
      categoryId: 'general',
      cards: [
        { name: 'The Sun', isReversed: false, position: 'Outcome' },
      ],
    }

    it('should accept valid stream request', () => {
      expect(tarotInterpretStreamSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept all optional fields', () => {
      expect(tarotInterpretStreamSchema.safeParse({
        ...validRequest,
        spreadId: 'single-card',
        spreadTitle: 'Daily Card',
        userQuestion: 'What should I focus on today?',
        language: 'en',
        birthdate: '1990-05-15',
        zodiacSign: 'Taurus',
        previousReadings: ['Reading 1', 'Reading 2'],
        questionMood: 'curious',
      }).success).toBe(true)
    })

    it('should accept all question moods', () => {
      const moods = ['worried', 'curious', 'hopeful', 'urgent', 'neutral']
      moods.forEach(mood => {
        expect(tarotInterpretStreamSchema.safeParse({
          ...validRequest,
          questionMood: mood,
        }).success).toBe(true)
      })
    })
  })

  describe('tarotChatRequestSchema', () => {
    const validRequest = {
      messages: [{ role: 'user', content: 'Tell me more about The Fool card' }],
      context: {
        spread_title: 'Three Card Spread',
        category: 'love',
        cards: [
          { position: 'Past', name: 'The Fool', meaning: 'New beginnings' },
        ],
        overall_message: 'A journey of love awaits',
        guidance: 'Follow your heart',
      },
    }

    it('should accept valid chat request', () => {
      expect(tarotChatRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept cards with isReversed', () => {
      expect(tarotChatRequestSchema.safeParse({
        ...validRequest,
        context: {
          ...validRequest.context,
          cards: [{ position: 'Past', name: 'The Fool', isReversed: true, meaning: 'test' }],
        },
      }).success).toBe(true)
    })

    it('should accept cards with is_reversed (snake_case)', () => {
      expect(tarotChatRequestSchema.safeParse({
        ...validRequest,
        context: {
          ...validRequest.context,
          cards: [{ position: 'Past', name: 'The Fool', is_reversed: true, meaning: 'test' }],
        },
      }).success).toBe(true)
    })

    it('should accept optional language', () => {
      expect(tarotChatRequestSchema.safeParse({
        ...validRequest,
        language: 'ko',
      }).success).toBe(true)
    })
  })

  describe('tarotChatStreamRequestSchema', () => {
    const validRequest = {
      messages: [{ role: 'user', content: 'What does this mean?' }],
      context: {
        spread_title: 'Celtic Cross',
        category: 'career',
        cards: [{ position: 'Present', name: 'The Emperor', meaning: 'Authority' }],
        overall_message: 'Leadership opportunities',
        guidance: 'Take charge',
      },
    }

    it('should accept valid stream request', () => {
      expect(tarotChatStreamRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept counselor options', () => {
      expect(tarotChatStreamRequestSchema.safeParse({
        ...validRequest,
        counselor_id: 'counselor-123',
        counselor_style: 'mystical',
      }).success).toBe(true)
    })
  })

  describe('tarotAnalyzeQuestionSchema', () => {
    it('should accept valid question', () => {
      expect(tarotAnalyzeQuestionSchema.safeParse({
        question: 'Will I find love this year?',
      }).success).toBe(true)
    })

    it('should default language to ko', () => {
      const result = tarotAnalyzeQuestionSchema.safeParse({
        question: 'Test question',
      })
      if (result.success) {
        expect(result.data.language).toBe('ko')
      }
    })

    it('should accept en language', () => {
      expect(tarotAnalyzeQuestionSchema.safeParse({
        question: 'Test',
        language: 'en',
      }).success).toBe(true)
    })

    it('should reject empty question', () => {
      expect(tarotAnalyzeQuestionSchema.safeParse({
        question: '',
      }).success).toBe(false)
    })

    it('should reject too long question', () => {
      expect(tarotAnalyzeQuestionSchema.safeParse({
        question: 'a'.repeat(501),
      }).success).toBe(false)
    })
  })
})

describe('Couple Tarot Reading Schemas', () => {
  describe('coupleTarotReadingPostSchema', () => {
    const validRequest = {
      connectionId: 'connection-123',
      spreadId: 'relationship-spread',
      cards: [
        { cardId: 'lovers', name: 'The Lovers', image: '/lovers.jpg', isReversed: false, position: 'Relationship' },
      ],
    }

    it('should accept valid couple reading', () => {
      expect(coupleTarotReadingPostSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept optional fields', () => {
      expect(coupleTarotReadingPostSchema.safeParse({
        ...validRequest,
        spreadTitle: 'Love Reading',
        question: 'How is our relationship?',
        theme: 'love',
        overallMessage: 'Strong connection',
        cardInsights: [{ position: 'Relationship', card_name: 'The Lovers', is_reversed: false, interpretation: 'Deep bond' }],
        guidance: 'Nurture your connection',
        affirmation: 'Our love grows stronger',
      }).success).toBe(true)
    })

    it('should reject empty connectionId', () => {
      expect(coupleTarotReadingPostSchema.safeParse({
        ...validRequest,
        connectionId: '',
      }).success).toBe(false)
    })
  })

  describe('coupleTarotReadingDeleteSchema', () => {
    it('should accept valid delete request', () => {
      expect(coupleTarotReadingDeleteSchema.safeParse({
        readingId: 'reading-123',
      }).success).toBe(true)
    })

    it('should reject empty readingId', () => {
      expect(coupleTarotReadingDeleteSchema.safeParse({
        readingId: '',
      }).success).toBe(false)
    })

    it('should trim readingId', () => {
      const result = coupleTarotReadingDeleteSchema.safeParse({
        readingId: '  reading-123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.readingId).toBe('reading-123')
      }
    })
  })

  describe('coupleTarotReadingQuerySchema', () => {
    it('should accept empty query', () => {
      expect(coupleTarotReadingQuerySchema.safeParse({}).success).toBe(true)
    })

    it('should accept connectionId', () => {
      expect(coupleTarotReadingQuerySchema.safeParse({
        connectionId: 'connection-123',
      }).success).toBe(true)
    })

    it('should trim connectionId', () => {
      const result = coupleTarotReadingQuerySchema.safeParse({
        connectionId: '  connection-123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.connectionId).toBe('connection-123')
      }
    })
  })
})
