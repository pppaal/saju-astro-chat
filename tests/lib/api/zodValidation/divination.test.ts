/**
 * Divination Schema Tests
 * Comprehensive testing for divination.ts validation schemas
 * (I Ching, Dream, Numerology, Past Life, Life Prediction)
 */
import { describe, it, expect } from 'vitest'
import {
  iChingRequestSchema,
  iChingChangingLineSchema,
  iChingResultingHexagramSchema,
  iChingStreamRequestSchema,
  iChingAnalysisSchema,
  dreamAnalysisSchema,
  dreamChatSaveRequestSchema,
  celestialContextSchema,
  previousConsultationSchema,
  personaMemoryContextSchema,
  dreamChatRequestSchema,
  sajuInfluenceSchema,
  dreamStreamSchema,
  dreamHistoryQuerySchema,
  dreamHistoryDeleteQuerySchema,
  dreamChatSaveGetQuerySchema,
  numerologyRequestSchema,
  numerologyGetQuerySchema,
  pastLifeRequestSchema,
  soulPatternSchema,
  pastLifeInfoSchema,
  soulJourneySchema,
  karmicDebtSchema,
  lifeMissionSchema,
  saturnLessonSchema,
  pastLifeSaveRequestSchema,
  eventTypeSchema,
  eventTypeExtendedSchema,
  basePredictionInputSchema,
  multiYearPredictionRequestSchema,
  pastAnalysisPredictionRequestSchema,
  eventTimingPredictionRequestSchema,
  weeklyTimingPredictionRequestSchema,
  comprehensivePredictionRequestSchema,
  lifePredictionRequestSchema,
  lifePredictionBasicRequestSchema,
  lifePredictionMultiYearSaveSchema,
  lifePredictionSaveRequestSchema,
  timingResultSchema,
  lifePredictionSaveTimingSchema,
  optimalPeriodSchema,
  lifePredictionExplainResultsSchema,
  lifePredictionAnalyzeQuestionSchema,
  lifePredictionBackendPredictSchema,
  lifePredictionAdvisorChatRequestSchema,
} from '@/lib/api/zodValidation/divination'

describe('I Ching Schema Tests', () => {
  describe('iChingRequestSchema', () => {
    it('should accept valid question', () => {
      expect(iChingRequestSchema.safeParse({
        question: 'What should I focus on?',
      }).success).toBe(true)
    })

    it('should trim question', () => {
      const result = iChingRequestSchema.safeParse({
        question: '  What path should I take?  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.question).toBe('What path should I take?')
      }
    })

    it('should accept all methods', () => {
      const methods = ['coins', 'yarrow', 'digital']
      methods.forEach(method => {
        expect(iChingRequestSchema.safeParse({
          question: 'Test',
          method,
        }).success).toBe(true)
      })
    })

    it('should accept valid hexagram numbers 1-64', () => {
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 1 }).success).toBe(true)
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 64 }).success).toBe(true)
    })

    it('should reject invalid hexagram numbers', () => {
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 0 }).success).toBe(false)
      expect(iChingRequestSchema.safeParse({ question: 'Test', hexagramNumber: 65 }).success).toBe(false)
    })

    it('should accept changing lines 1-6', () => {
      expect(iChingRequestSchema.safeParse({
        question: 'Test',
        changingLines: [1, 3, 6],
      }).success).toBe(true)
    })

    it('should reject invalid changing lines', () => {
      expect(iChingRequestSchema.safeParse({
        question: 'Test',
        changingLines: [0, 7],
      }).success).toBe(false)
    })

    it('should reject too many changing lines', () => {
      expect(iChingRequestSchema.safeParse({
        question: 'Test',
        changingLines: [1, 2, 3, 4, 5, 6, 1],
      }).success).toBe(false)
    })
  })

  describe('iChingStreamRequestSchema', () => {
    const validRequest = {
      hexagramNumber: 1,
      hexagramName: 'The Creative',
      hexagramSymbol: '☰',
      judgment: 'Great success',
      image: 'Heaven above heaven',
    }

    it('should accept valid stream request', () => {
      expect(iChingStreamRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept with changing lines', () => {
      expect(iChingStreamRequestSchema.safeParse({
        ...validRequest,
        changingLines: [{ index: 1, text: 'Hidden dragon' }],
      }).success).toBe(true)
    })

    it('should accept with resulting hexagram', () => {
      expect(iChingStreamRequestSchema.safeParse({
        ...validRequest,
        resultingHexagram: {
          number: 2,
          name: 'The Receptive',
          symbol: '☷',
        },
      }).success).toBe(true)
    })

    it('should accept with themes', () => {
      expect(iChingStreamRequestSchema.safeParse({
        ...validRequest,
        themes: {
          career: 'Success in leadership',
          love: 'Strong connections',
          health: 'Vital energy',
          wealth: 'Prosperity',
          timing: 'Act now',
        },
      }).success).toBe(true)
    })
  })

  describe('iChingAnalysisSchema', () => {
    it('should accept valid analysis request', () => {
      expect(iChingAnalysisSchema.safeParse({
        question: 'What guidance do you offer?',
      }).success).toBe(true)
    })

    it('should accept with birthInfo', () => {
      expect(iChingAnalysisSchema.safeParse({
        question: 'Test',
        birthInfo: {
          birthDate: '1990-05-15',
          birthTime: '10:30',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
      }).success).toBe(true)
    })
  })
})

describe('Dream Schema Tests', () => {
  describe('dreamAnalysisSchema', () => {
    it('should accept valid dream', () => {
      expect(dreamAnalysisSchema.safeParse({
        dream: 'I dreamed about flying over mountains',
      }).success).toBe(true)
    })

    it('should trim dream text', () => {
      const result = dreamAnalysisSchema.safeParse({
        dream: '  I was flying in the sky  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dream).toBe('I was flying in the sky')
      }
    })

    it('should reject too short dream', () => {
      expect(dreamAnalysisSchema.safeParse({ dream: 'short' }).success).toBe(false)
    })

    it('should reject too long dream', () => {
      expect(dreamAnalysisSchema.safeParse({ dream: 'a'.repeat(10001) }).success).toBe(false)
    })

    it('should accept with birthInfo', () => {
      expect(dreamAnalysisSchema.safeParse({
        dream: 'A mysterious dream about water',
        birthInfo: {
          birthDate: '1990-05-15',
          birthTime: '10:30',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
      }).success).toBe(true)
    })
  })

  describe('dreamChatSaveRequestSchema', () => {
    it('should accept valid save request', () => {
      expect(dreamChatSaveRequestSchema.safeParse({
        dreamText: 'I dreamed about flying',
        messages: [{ role: 'user', content: 'What does this mean?' }],
      }).success).toBe(true)
    })

    it('should accept optional dreamId', () => {
      expect(dreamChatSaveRequestSchema.safeParse({
        dreamId: 'dream-123',
        dreamText: 'Flying dream',
        messages: [{ role: 'user', content: 'test' }],
      }).success).toBe(true)
    })
  })

  describe('celestialContextSchema', () => {
    it('should accept valid celestial context', () => {
      expect(celestialContextSchema.safeParse({
        moonPhase: 'full',
        moonSign: 'Cancer',
        sunSign: 'Leo',
        mercuryRetrograde: true,
        dominantElement: 'water',
      }).success).toBe(true)
    })

    it('should accept all moon phases', () => {
      const phases = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent']
      phases.forEach(phase => {
        expect(celestialContextSchema.safeParse({ moonPhase: phase }).success).toBe(true)
      })
    })
  })

  describe('dreamChatRequestSchema', () => {
    const validRequest = {
      messages: [{ role: 'user', content: 'Tell me about my dream' }],
      dreamContext: {
        dreamText: 'I was flying over the ocean',
      },
    }

    it('should accept valid chat request', () => {
      expect(dreamChatRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should accept with symbols and emotions', () => {
      expect(dreamChatRequestSchema.safeParse({
        ...validRequest,
        dreamContext: {
          ...validRequest.dreamContext,
          symbols: ['water', 'flight', 'ocean'],
          emotions: ['freedom', 'joy'],
          themes: ['transformation'],
        },
      }).success).toBe(true)
    })

    it('should accept without cultural notes', () => {
      // cultural_notes is optional, so request without it should pass
      expect(dreamChatRequestSchema.safeParse({
        ...validRequest,
      }).success).toBe(true)
    })

    it('should accept cultural notes with all valid cultures', () => {
      // z.record(z.enum([...]), ...) requires all enum keys
      expect(dreamChatRequestSchema.safeParse({
        ...validRequest,
        dreamContext: {
          ...validRequest.dreamContext,
          cultural_notes: {
            korean: 'Korean interpretation',
            chinese: 'Chinese interpretation',
            western: 'Western interpretation',
            islamic: 'Islamic interpretation',
            hindu: 'Hindu interpretation',
            japanese: 'Japanese interpretation',
          },
        },
      }).success).toBe(true)
    })
  })

  describe('dreamStreamSchema', () => {
    it('should accept valid stream request', () => {
      expect(dreamStreamSchema.safeParse({
        dreamText: 'A vivid dream about a garden',
      }).success).toBe(true)
    })

    it('should accept with all optional fields', () => {
      expect(dreamStreamSchema.safeParse({
        dreamText: 'Dream about water',
        symbols: ['water', 'fish'],
        emotions: ['peace', 'curiosity'],
        themes: ['transformation'],
        context: ['recent stress'],
        locale: 'ko',
        koreanTypes: ['吉夢'],
        koreanLucky: ['lottery'],
        chinese: ['water element'],
        islamicTypes: ['prophetic'],
        western: ['unconscious'],
        hindu: ['karma'],
        japanese: ['yume'],
        birth: {
          date: '1990-05-15',
          time: '10:30',
          timezone: 'Asia/Seoul',
        },
        sajuInfluence: {
          dayMaster: '갑',
          dayMasterElement: '목',
        },
      }).success).toBe(true)
    })
  })

  describe('dreamHistoryQuerySchema', () => {
    it('should use defaults', () => {
      const result = dreamHistoryQuerySchema.safeParse({})
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept custom values', () => {
      const result = dreamHistoryQuerySchema.safeParse({ limit: 50, offset: 10 })
      expect(result.success).toBe(true)
    })
  })
})

describe('Numerology Schema Tests', () => {
  describe('numerologyRequestSchema', () => {
    it('should accept valid analyze request', () => {
      expect(numerologyRequestSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept with names', () => {
      expect(numerologyRequestSchema.safeParse({
        birthDate: '1990-05-15',
        englishName: 'John Doe',
        koreanName: '홍길동',
      }).success).toBe(true)
    })

    it('should accept compatibility action', () => {
      expect(numerologyRequestSchema.safeParse({
        action: 'compatibility',
        birthDate: '1990-05-15',
        person1: { birthDate: '1990-05-15' },
        person2: { birthDate: '1992-08-20' },
      }).success).toBe(true)
    })

    it('should default action to analyze', () => {
      const result = numerologyRequestSchema.safeParse({ birthDate: '1990-05-15' })
      if (result.success) {
        expect(result.data.action).toBe('analyze')
      }
    })
  })

  describe('numerologyGetQuerySchema', () => {
    it('should accept valid query', () => {
      expect(numerologyGetQuerySchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should default locale to ko', () => {
      const result = numerologyGetQuerySchema.safeParse({ birthDate: '1990-05-15' })
      if (result.success) {
        expect(result.data.locale).toBe('ko')
      }
    })
  })
})

describe('Past Life Schema Tests', () => {
  describe('pastLifeRequestSchema', () => {
    it('should accept valid request', () => {
      expect(pastLifeRequestSchema.safeParse({
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
      }).success).toBe(true)
    })

    it('should accept with optional fields', () => {
      expect(pastLifeRequestSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        locale: 'en',
      }).success).toBe(true)
    })
  })

  describe('soulPatternSchema', () => {
    it('should accept valid soul pattern', () => {
      expect(soulPatternSchema.safeParse({
        archetype: 'The Healer',
        primaryElement: 'water',
        soulAge: 'mature',
        description: 'A soul focused on healing and transformation',
      }).success).toBe(true)
    })

    it('should accept all soul ages', () => {
      const ages = ['infant', 'baby', 'young', 'mature', 'old']
      ages.forEach(age => {
        expect(soulPatternSchema.safeParse({
          archetype: 'Test',
          soulAge: age,
          description: 'Test description',
        }).success).toBe(true)
      })
    })
  })

  describe('pastLifeSaveRequestSchema', () => {
    it('should accept valid save request', () => {
      expect(pastLifeSaveRequestSchema.safeParse({
        birthDate: '1990-05-15',
        karmaScore: 75,
        analysisData: {
          soulPattern: {
            archetype: 'The Healer',
            description: 'Focused on healing',
          },
          pastLife: {
            era: '18th Century',
            role: 'Physician',
            description: 'A life dedicated to medicine',
          },
          soulJourney: {
            stage: 'Growth',
            theme: 'Learning compassion',
            description: 'Current journey focus',
          },
          karmicDebts: [
            {
              type: 'Relationship',
              currentManifestation: 'Difficulty trusting',
              resolutionPath: 'Practice vulnerability',
            },
          ],
          thisLifeMission: {
            primary: 'Healing others',
            description: 'Life purpose description',
          },
          talentsCarried: ['Intuition', 'Empathy'],
          saturnLesson: {
            theme: 'Responsibility',
            lesson: 'Learning to set boundaries',
          },
        },
      }).success).toBe(true)
    })
  })
})

describe('Life Prediction Schema Tests', () => {
  describe('eventTypeSchema', () => {
    it('should accept all event types', () => {
      const types = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship']
      types.forEach(type => {
        expect(eventTypeSchema.safeParse(type).success).toBe(true)
      })
    })
  })

  describe('basePredictionInputSchema', () => {
    const validInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '사',
      yearBranch: '오',
    }

    it('should accept valid input', () => {
      expect(basePredictionInputSchema.safeParse(validInput).success).toBe(true)
    })

    it('should accept both gender formats', () => {
      expect(basePredictionInputSchema.safeParse({ ...validInput, gender: 'M' }).success).toBe(true)
      expect(basePredictionInputSchema.safeParse({ ...validInput, gender: 'F' }).success).toBe(true)
      expect(basePredictionInputSchema.safeParse({ ...validInput, gender: 'female' }).success).toBe(true)
    })
  })

  describe('multiYearPredictionRequestSchema', () => {
    const validRequest = {
      type: 'multi-year',
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '사',
      yearBranch: '오',
      startYear: 2024,
      endYear: 2030,
    }

    it('should accept valid multi-year request', () => {
      expect(multiYearPredictionRequestSchema.safeParse(validRequest).success).toBe(true)
    })

    it('should reject endYear <= startYear', () => {
      expect(multiYearPredictionRequestSchema.safeParse({
        ...validRequest,
        endYear: 2024,
      }).success).toBe(false)
    })
  })

  describe('eventTimingPredictionRequestSchema', () => {
    const validRequest = {
      type: 'event-timing',
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'female',
      dayStem: '을',
      dayBranch: '축',
      monthBranch: '인',
      yearBranch: '묘',
      eventType: 'marriage',
      startYear: 2024,
      endYear: 2030,
    }

    it('should accept valid event timing request', () => {
      expect(eventTimingPredictionRequestSchema.safeParse(validRequest).success).toBe(true)
    })
  })

  describe('lifePredictionRequestSchema (discriminated union)', () => {
    it('should accept multi-year type', () => {
      expect(lifePredictionRequestSchema.safeParse({
        type: 'multi-year',
        birthYear: 1990,
        birthMonth: 5,
        birthDay: 15,
        gender: 'male',
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '사',
        yearBranch: '오',
        startYear: 2024,
        endYear: 2030,
      }).success).toBe(true)
    })

    it('should accept comprehensive type', () => {
      expect(lifePredictionRequestSchema.safeParse({
        type: 'comprehensive',
        birthYear: 1990,
        birthMonth: 5,
        birthDay: 15,
        gender: 'male',
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '사',
        yearBranch: '오',
      }).success).toBe(true)
    })
  })

  describe('lifePredictionBasicRequestSchema', () => {
    it('should accept valid basic request', () => {
      expect(lifePredictionBasicRequestSchema.safeParse({
        question: 'When should I change careers?',
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should accept optional analysisDepth', () => {
      expect(lifePredictionBasicRequestSchema.safeParse({
        question: 'Test',
        birthDate: '1990-05-15',
        birthTime: '10:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        analysisDepth: 'comprehensive',
      }).success).toBe(true)
    })
  })

  describe('lifePredictionSaveRequestSchema', () => {
    it('should accept valid save request', () => {
      expect(lifePredictionSaveRequestSchema.safeParse({
        question: 'When is best for marriage?',
        prediction: 'Analysis shows favorable timing in 2025',
        category: 'love',
      }).success).toBe(true)
    })

    it('should accept with metadata', () => {
      expect(lifePredictionSaveRequestSchema.safeParse({
        question: 'Career timing?',
        prediction: 'Good timing ahead',
        metadata: {
          eventType: 'career',
          analysisDepth: 'detailed',
          confidence: 85,
          sources: ['saju', 'astro'],
        },
      }).success).toBe(true)
    })
  })

  describe('lifePredictionExplainResultsSchema', () => {
    it('should accept valid explain request', () => {
      expect(lifePredictionExplainResultsSchema.safeParse({
        question: 'Best time for investment?',
        eventType: 'investment',
        eventLabel: 'Investment Timing',
        optimalPeriods: [
          {
            startDate: '2024-06-01',
            endDate: '2024-08-31',
            score: 85,
            grade: 'A',
            reasons: ['Favorable transit', 'Strong financial sector'],
          },
        ],
      }).success).toBe(true)
    })
  })

  describe('lifePredictionAnalyzeQuestionSchema', () => {
    it('should accept valid question', () => {
      expect(lifePredictionAnalyzeQuestionSchema.safeParse({
        question: 'When should I start a business?',
      }).success).toBe(true)
    })

    it('should trim question', () => {
      const result = lifePredictionAnalyzeQuestionSchema.safeParse({
        question: '  When is best?  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.question).toBe('When is best?')
      }
    })
  })

  describe('lifePredictionBackendPredictSchema', () => {
    it('should accept valid backend predict request', () => {
      expect(lifePredictionBackendPredictSchema.safeParse({
        question: 'Future career prospects?',
        birthYear: 1990,
        birthMonth: 5,
      }).success).toBe(true)
    })

    it('should accept all prediction types', () => {
      const types = ['timing', 'forecast', 'luck']
      types.forEach(type => {
        expect(lifePredictionBackendPredictSchema.safeParse({
          question: 'Test',
          birthYear: 1990,
          birthMonth: 5,
          type,
        }).success).toBe(true)
      })
    })
  })

  describe('lifePredictionAdvisorChatRequestSchema', () => {
    it('should accept valid advisor chat request', () => {
      expect(lifePredictionAdvisorChatRequestSchema.safeParse({
        message: 'Can you explain the first period in more detail?',
        context: {
          question: 'When to marry?',
          eventType: 'marriage',
          results: [
            {
              startDate: '2024-06-01',
              endDate: '2024-08-31',
              score: 85,
              grade: 'A',
              reasons: ['Good timing'],
            },
          ],
          birthDate: '1990-05-15',
          gender: 'M',
        },
        history: [{ role: 'user', content: 'Previous message' }],
        locale: 'ko',
      }).success).toBe(true)
    })
  })
})
