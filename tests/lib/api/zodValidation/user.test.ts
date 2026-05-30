/**
 * User Schema Tests
 * Comprehensive testing for user.ts validation schemas
 * (Auth, Profile, Notification, Feedback, Personality, ICP, Consultation, etc.)
 */
import { describe, it, expect } from 'vitest'
import {
  userRegistrationRequestSchema,
  userProfileUpdateSchema,
  userBirthInfoUpdateSchema,
  feedbackRequestSchema,
  sectionFeedbackRequestSchema,
  feedbackGetQuerySchema,
  feedbackRecordsQuerySchema,
  personalityAnalysisDataSchema,
  personalityAnswersSchema,
  personalitySaveRequestSchema,
  icpOctantSchema,
  icpScoreSchema,
  icpSaveRequestSchema,
  personalityCompatibilitySaveRequestSchema,
  personalityCompatibilitySchema,
  icpRequestSchema,
  jungQuoteSchema,
  consultationSignalSchema,
  consultationSaveSchema,
  consultationGetQuerySchema,
  chatHistorySaveRequestSchema,
  counselorSessionSaveRequestSchema,
  counselorSessionLoadQuerySchema,
  counselorSessionListQuerySchema,
  contentAccessSchema,
  shareImageRequestSchema,
  shareResultRequestSchema,
  readingsSaveSchema,
  readingsGetQuerySchema,
  fortuneSaveSchema,
  dailyFortuneSchema,
  referralClaimRequestSchema,
  referralLinkRequestSchema,
  referralValidateQuerySchema,
  meHistoryQuerySchema,
  cronAuthSchema,
  cspReportSchema,
} from '@/lib/api/zodValidation/user'

describe('Auth Schema Tests', () => {
  describe('userRegistrationRequestSchema', () => {
    it('should accept valid registration', () => {
      expect(userRegistrationRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass123',
      }).success).toBe(true)
    })

    it('should accept with name and referral code', () => {
      expect(userRegistrationRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'John Doe',
        referralCode: 'REFER123',
      }).success).toBe(true)
    })

    it('should accept valid email without whitespace', () => {
      const result = userRegistrationRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'John',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.name).toBe('John')
      }
    })

    it('should reject invalid email', () => {
      expect(userRegistrationRequestSchema.safeParse({
        email: 'invalid-email',
        password: 'SecurePass123',
      }).success).toBe(false)
    })

    it('should reject short password', () => {
      expect(userRegistrationRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      }).success).toBe(false)
    })

    it('should reject too long password', () => {
      expect(userRegistrationRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'a'.repeat(129),
      }).success).toBe(false)
    })
  })
})

describe('Profile Schema Tests', () => {
  describe('userProfileUpdateSchema', () => {
    it('should accept valid profile update', () => {
      expect(userProfileUpdateSchema.safeParse({
        name: 'John Doe',
        preferredLanguage: 'ko',
      }).success).toBe(true)
    })

    it('should accept tone and reading preferences', () => {
      expect(userProfileUpdateSchema.safeParse({
        tonePreference: 'mystical',
        readingLength: 'detailed',
      }).success).toBe(true)
    })

    it('should accept birth info', () => {
      expect(userProfileUpdateSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'male',
        birthCity: 'Seoul',
        tzId: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should accept nullable image', () => {
      expect(userProfileUpdateSchema.safeParse({
        image: null,
      }).success).toBe(true)
    })

    it('should accept allowlisted image URL', () => {
      // example.com is no longer accepted — must be on the photo-host
      // allowlist (see photoHostAllowlist.ts). Vercel Blob URL is a typical
      // value produced by /api/me/upload-photo.
      expect(userProfileUpdateSchema.safeParse({
        image: 'https://abc.public.blob.vercel-storage.com/profile-photos/u1/x.jpg',
      }).success).toBe(true)
    })

    it('should accept Google avatar URL (NextAuth provider)', () => {
      expect(userProfileUpdateSchema.safeParse({
        image: 'https://lh3.googleusercontent.com/a/AHcGUjC=s96-c',
      }).success).toBe(true)
    })

    it('should reject arbitrary attacker URL as image', () => {
      expect(userProfileUpdateSchema.safeParse({
        image: 'https://example.com/avatar.jpg',
      }).success).toBe(false)
    })

    it('should reject javascript: URL as image', () => {
      expect(userProfileUpdateSchema.safeParse({
        image: 'javascript:alert(1)',
      }).success).toBe(false)
    })
  })

  describe('userBirthInfoUpdateSchema', () => {
    it('should accept valid birth info', () => {
      expect(userBirthInfoUpdateSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should accept full birth info', () => {
      expect(userBirthInfoUpdateSchema.safeParse({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'female',
        birthCity: 'Tokyo',
        tzId: 'Asia/Tokyo',
      }).success).toBe(true)
    })
  })
})

// Persona Memory Schema Tests — birthChartMemorySchema / sajuProfileMemorySchema /
// personaMemory* 스키마는 이 브랜치에 존재하지 않음 (feature 브랜치에서 추가 예정).

describe('Feedback Schema Tests', () => {
  describe('feedbackRequestSchema', () => {
    it('should accept valid feedback', () => {
      expect(feedbackRequestSchema.safeParse({
        type: 'bug',
        subject: 'Login issue',
        message: 'I cannot login to my account. Please help resolve this issue.',
      }).success).toBe(true)
    })

    it('should accept all types', () => {
      const types = ['bug', 'feature', 'improvement', 'other']
      types.forEach(type => {
        expect(feedbackRequestSchema.safeParse({
          type,
          subject: 'Test',
          message: 'Test message with enough length',
        }).success).toBe(true)
      })
    })

    it('should accept optional fields', () => {
      expect(feedbackRequestSchema.safeParse({
        type: 'feature',
        subject: 'New feature',
        message: 'Please add dark mode support',
        email: 'user@example.com',
        page: '/settings',
        severity: 'medium',
      }).success).toBe(true)
    })

    it('should reject short message', () => {
      expect(feedbackRequestSchema.safeParse({
        type: 'bug',
        subject: 'Test',
        message: 'short',
      }).success).toBe(false)
    })
  })

  describe('sectionFeedbackRequestSchema', () => {
    it('should accept valid section feedback', () => {
      expect(sectionFeedbackRequestSchema.safeParse({
        service: 'tarot',
        theme: 'love',
        sectionId: 'card-interpretation',
        helpful: true,
      }).success).toBe(true)
    })

    it('should accept with additional context', () => {
      expect(sectionFeedbackRequestSchema.safeParse({
        service: 'saju',
        theme: 'career',
        sectionId: 'fortune-analysis',
        helpful: false,
        dayMaster: '갑',
        sunSign: 'Leo',
        locale: 'ko',
        rating: 4,
        feedbackText: 'Very insightful',
      }).success).toBe(true)
    })
  })
})

describe('Personality & ICP Schema Tests', () => {
  describe('personalitySaveRequestSchema', () => {
    it('should accept valid personality save', () => {
      expect(personalitySaveRequestSchema.safeParse({
        typeCode: 'RVLA',
        personaName: 'The Visionary',
        avatarGender: 'M',
        energyScore: 75,
        cognitionScore: 80,
        decisionScore: 65,
        rhythmScore: 70,
        analysisData: {
          description: 'A creative and intuitive personality',
          strengths: ['Creativity', 'Intuition'],
        },
      }).success).toBe(true)
    })

    it('should validate typeCode format', () => {
      expect(personalitySaveRequestSchema.safeParse({
        typeCode: 'GSHF',
        personaName: 'Test',
        avatarGender: 'F',
        energyScore: 50,
        cognitionScore: 50,
        decisionScore: 50,
        rhythmScore: 50,
        analysisData: { description: 'Test', strengths: ['Test'] },
      }).success).toBe(true)

      expect(personalitySaveRequestSchema.safeParse({
        typeCode: 'XXXX',
        personaName: 'Test',
        avatarGender: 'M',
        energyScore: 50,
        cognitionScore: 50,
        decisionScore: 50,
        rhythmScore: 50,
        analysisData: { description: 'Test', strengths: ['Test'] },
      }).success).toBe(false)
    })
  })

  describe('icpOctantSchema', () => {
    it('should accept all octants', () => {
      const octants = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO']
      octants.forEach(octant => {
        expect(icpOctantSchema.safeParse(octant).success).toBe(true)
      })
    })
  })

  describe('icpSaveRequestSchema', () => {
    it('should accept valid ICP save', () => {
      expect(icpSaveRequestSchema.safeParse({
        primaryStyle: 'PA',
        dominanceScore: 50,
        affiliationScore: 30,
        octantScores: { PA: 80, BC: 60, DE: 40, FG: 30, HI: 20, JK: 25, LM: 35, NO: 45 },
        analysisData: {
          description: 'Dominant and assertive',
          strengths: ['Leadership'],
          challenges: ['Flexibility'],
        },
      }).success).toBe(true)
    })

    it('should accept secondary style', () => {
      expect(icpSaveRequestSchema.safeParse({
        primaryStyle: 'PA',
        secondaryStyle: 'BC',
        dominanceScore: 50,
        affiliationScore: 30,
        octantScores: { PA: 80, BC: 60, DE: 40, FG: 30, HI: 20, JK: 25, LM: 35, NO: 45 },
        analysisData: {
          description: 'Test',
          strengths: ['Test'],
          challenges: ['Test'],
        },
      }).success).toBe(true)
    })
  })

  describe('personalityCompatibilitySchema', () => {
    it('should accept valid compatibility request', () => {
      expect(personalityCompatibilitySchema.safeParse({
        person1: {
          typeCode: 'RVLA',
          energyScore: 70,
          cognitionScore: 80,
          decisionScore: 60,
          rhythmScore: 75,
        },
        person2: {
          typeCode: 'GSHF',
          energyScore: 65,
          cognitionScore: 55,
          decisionScore: 80,
          rhythmScore: 60,
        },
      }).success).toBe(true)
    })
  })
})

describe('Consultation Schema Tests', () => {
  describe('jungQuoteSchema', () => {
    it('should accept valid quote', () => {
      expect(jungQuoteSchema.safeParse({
        quote: 'The meeting of two personalities is like the contact of two chemical substances.',
        source: 'Modern Man in Search of a Soul',
        archetype: 'The Self',
      }).success).toBe(true)
    })
  })

  describe('consultationSignalSchema', () => {
    it('should accept valid signal', () => {
      expect(consultationSignalSchema.safeParse({
        type: 'positive',
        category: 'career',
        message: 'Good timing for career moves',
        strength: 85,
      }).success).toBe(true)
    })

    it('should accept all signal types', () => {
      const types = ['positive', 'negative', 'neutral', 'warning', 'opportunity']
      types.forEach(type => {
        expect(consultationSignalSchema.safeParse({ type, message: 'Test' }).success).toBe(true)
      })
    })
  })

  describe('consultationSaveSchema', () => {
    it('should accept valid consultation', () => {
      expect(consultationSaveSchema.safeParse({
        theme: 'career',
        summary: 'Career guidance consultation',
        fullReport: 'Detailed analysis...',
      }).success).toBe(true)
    })

    it('should accept with Jung quotes and signals', () => {
      expect(consultationSaveSchema.safeParse({
        theme: 'general',
        jungQuotes: [{ quote: 'Test quote', relevance: 'Relevant to situation' }],
        signals: [{ type: 'opportunity', message: 'Good timing' }],
      }).success).toBe(true)
    })
  })
})

describe('Chat History & Counselor Schema Tests', () => {
  describe('chatHistorySaveRequestSchema', () => {
    it('should accept valid chat history', () => {
      expect(chatHistorySaveRequestSchema.safeParse({
        sessionId: 'session-123',
        messages: [{ role: 'user', content: 'Hello' }],
      }).success).toBe(true)
    })

    it('should accept with theme and summary', () => {
      expect(chatHistorySaveRequestSchema.safeParse({
        sessionId: 'session-123',
        theme: 'career',
        messages: [{ role: 'user', content: 'Career advice' }],
        summary: 'Career consultation',
        keyTopics: ['job change', 'salary negotiation'],
      }).success).toBe(true)
    })
  })

  describe('counselorSessionSaveRequestSchema', () => {
    it('should accept valid counselor session', () => {
      expect(counselorSessionSaveRequestSchema.safeParse({
        sessionId: 'counselor-session-123',
        messages: [{ role: 'user', content: 'I need guidance' }],
      }).success).toBe(true)
    })
  })

  describe('counselorSessionLoadQuerySchema', () => {
    it('parses empty input successfully (no required fields)', () => {
      // `theme` field removed from schema.
      const result = counselorSessionLoadQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})

describe('Content & Share Schema Tests', () => {
  describe('contentAccessSchema', () => {
    it('should accept valid content access', () => {
      expect(contentAccessSchema.safeParse({
        service: 'tarot',
        contentType: 'reading',
      }).success).toBe(true)
    })

    it('should accept with metadata', () => {
      expect(contentAccessSchema.safeParse({
        service: 'astrology',
        contentType: 'chart',
        metadata: {
          source: 'web',
          deviceType: 'mobile',
          feature: 'birth-chart',
        },
      }).success).toBe(true)
    })
  })

  describe('shareImageRequestSchema', () => {
    it('should accept valid share request', () => {
      expect(shareImageRequestSchema.safeParse({
        type: 'tarot',
        title: 'My Tarot Reading',
        content: 'The Fool represents new beginnings',
      }).success).toBe(true)
    })

    it('should accept all types', () => {
      // 'dream' type removed from schema.
      const types = ['tarot', 'astrology', 'saju', 'compatibility']
      types.forEach(type => {
        expect(shareImageRequestSchema.safeParse({
          type,
          title: 'Test',
          content: 'Test content',
        }).success).toBe(true)
      })
    })
  })

  describe('shareResultRequestSchema', () => {
    it('should accept valid share result', () => {
      expect(shareResultRequestSchema.safeParse({
        title: 'My Fortune',
        resultType: 'saju',
      }).success).toBe(true)
    })

    it('should accept with result data', () => {
      expect(shareResultRequestSchema.safeParse({
        title: 'Compatibility',
        resultType: 'compatibility',
        resultData: {
          score: 85,
          grade: 'A',
          highlights: ['Strong connection', 'Complementary elements'],
        },
      }).success).toBe(true)
    })
  })
})

describe('Readings & Fortune Schema Tests', () => {
  describe('readingsSaveSchema', () => {
    it('should accept valid reading', () => {
      expect(readingsSaveSchema.safeParse({
        type: 'tarot',
        content: 'Your reading reveals...',
      }).success).toBe(true)
    })

    it('should accept with metadata', () => {
      expect(readingsSaveSchema.safeParse({
        type: 'iching',
        title: 'I Ching Reading',
        content: 'Hexagram 1 - The Creative',
        metadata: {
          hexagram: 1,
          question: 'What should I focus on?',
        },
      }).success).toBe(true)
    })
  })

  describe('fortuneSaveSchema', () => {
    it('should accept valid fortune', () => {
      expect(fortuneSaveSchema.safeParse({
        date: '2024-06-15',
        content: 'Today brings opportunities...',
      }).success).toBe(true)
    })

    it('should accept all kinds', () => {
      const kinds = ['daily', 'weekly', 'monthly', 'yearly']
      kinds.forEach(kind => {
        expect(fortuneSaveSchema.safeParse({
          date: '2024-06-15',
          kind,
          content: 'Fortune content',
        }).success).toBe(true)
      })
    })
  })

  describe('dailyFortuneSchema', () => {
    it('should accept valid daily fortune request', () => {
      expect(dailyFortuneSchema.safeParse({
        birthDate: '1990-05-15',
      }).success).toBe(true)
    })

    it('should default sendEmail to false', () => {
      const result = dailyFortuneSchema.safeParse({ birthDate: '1990-05-15' })
      if (result.success) {
        expect(result.data.sendEmail).toBe(false)
      }
    })
  })
})

describe('Referral Schema Tests', () => {
  describe('referralClaimRequestSchema', () => {
    it('should accept valid claim', () => {
      expect(referralClaimRequestSchema.safeParse({
        code: 'REFER123',
      }).success).toBe(true)
    })

    it('should trim code', () => {
      const result = referralClaimRequestSchema.safeParse({
        code: '  REFER123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('REFER123')
      }
    })
  })

  describe('referralLinkRequestSchema', () => {
    it('should accept empty request', () => {
      expect(referralLinkRequestSchema.safeParse({}).success).toBe(true)
    })

    it('should accept valid custom code', () => {
      expect(referralLinkRequestSchema.safeParse({
        customCode: 'my-code-123',
      }).success).toBe(true)
    })

    it('should reject invalid custom code', () => {
      expect(referralLinkRequestSchema.safeParse({
        customCode: 'invalid code!',
      }).success).toBe(false)
    })
  })

  describe('referralValidateQuerySchema', () => {
    it('should accept valid code', () => {
      expect(referralValidateQuerySchema.safeParse({
        code: 'VALID123',
      }).success).toBe(true)
    })
  })
})

describe('System Schema Tests', () => {
  describe('cronAuthSchema', () => {
    it('should accept valid token', () => {
      expect(cronAuthSchema.safeParse({
        token: 'secret-token',
      }).success).toBe(true)
    })

    it('should reject empty token', () => {
      expect(cronAuthSchema.safeParse({
        token: '',
      }).success).toBe(false)
    })
  })

  describe('cspReportSchema', () => {
    it('should accept valid CSP report', () => {
      expect(cspReportSchema.safeParse({
        'csp-report': {
          'document-uri': 'https://example.com/page',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js',
        },
      }).success).toBe(true)
    })

    it('should accept empty csp-report', () => {
      expect(cspReportSchema.safeParse({}).success).toBe(true)
    })
  })
})
