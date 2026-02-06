/**
 * User Schema Tests
 * Comprehensive testing for user.ts validation schemas
 * (Auth, Profile, Notification, Feedback, Personality, ICP, Consultation, etc.)
 */
import { describe, it, expect } from 'vitest'
import {
  userRegistrationRequestSchema,
  notificationSettingsSchema,
  userProfileUpdateSchema,
  userBirthInfoUpdateSchema,
  birthChartMemorySchema,
  sajuProfileMemorySchema,
  personaMemoryPostSchema,
  personaMemoryPatchSchema,
  personaMemoryUpdateSchema,
  notificationSendRequestSchema,
  notificationSendSchema,
  pushSendRequestSchema,
  pushSubscribeSchema,
  pushUnsubscribeSchema,
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
  cronNotificationsTriggerSchema,
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
  describe('notificationSettingsSchema', () => {
    it('should accept valid settings', () => {
      expect(notificationSettingsSchema.safeParse({
        dailyFortune: true,
        weeklyFortune: false,
        monthlyFortune: true,
        specialEvents: true,
        promotions: false,
      }).success).toBe(true)
    })

    it('should accept preferredTime', () => {
      expect(notificationSettingsSchema.safeParse({
        preferredTime: '09:00',
      }).success).toBe(true)
    })

    it('should reject invalid preferredTime', () => {
      expect(notificationSettingsSchema.safeParse({
        preferredTime: '25:00',
      }).success).toBe(false)
    })

    it('should accept timezone', () => {
      expect(notificationSettingsSchema.safeParse({
        timezone: 'Asia/Seoul',
      }).success).toBe(true)
    })
  })

  describe('userProfileUpdateSchema', () => {
    it('should accept valid profile update', () => {
      expect(userProfileUpdateSchema.safeParse({
        name: 'John Doe',
        emailNotifications: true,
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

    it('should accept valid image URL', () => {
      expect(userProfileUpdateSchema.safeParse({
        image: 'https://example.com/avatar.jpg',
      }).success).toBe(true)
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

describe('Persona Memory Schema Tests', () => {
  describe('birthChartMemorySchema', () => {
    it('should accept valid birth chart', () => {
      expect(birthChartMemorySchema.safeParse({
        sunSign: 'Aries',
        moonSign: 'Cancer',
        ascendant: 'Leo',
        dominantElement: 'fire',
        dominantModality: 'cardinal',
      }).success).toBe(true)
    })
  })

  describe('sajuProfileMemorySchema', () => {
    it('should accept valid saju profile', () => {
      expect(sajuProfileMemorySchema.safeParse({
        dayMaster: '갑',
        dayMasterElement: '목',
        yongsin: '수',
        geokguk: '건록격',
      }).success).toBe(true)
    })

    it('should accept pillars', () => {
      expect(sajuProfileMemorySchema.safeParse({
        pillars: {
          year: { stem: '갑', branch: '자' },
          month: { stem: '을', branch: '축' },
          day: { stem: '병', branch: '인' },
          time: { stem: '정', branch: '묘' },
        },
      }).success).toBe(true)
    })
  })

  describe('personaMemoryPostSchema', () => {
    it('should accept valid memory data', () => {
      expect(personaMemoryPostSchema.safeParse({
        dominantThemes: ['career', 'love'],
        keyInsights: ['Strong leadership potential'],
        emotionalTone: 'hopeful',
        growthAreas: ['Communication', 'Patience'],
        lastTopics: ['Career change'],
      }).success).toBe(true)
    })

    it('should accept all emotional tones', () => {
      const tones = ['positive', 'negative', 'neutral', 'mixed', 'anxious', 'hopeful']
      tones.forEach(tone => {
        expect(personaMemoryPostSchema.safeParse({ emotionalTone: tone }).success).toBe(true)
      })
    })
  })

  describe('personaMemoryPatchSchema', () => {
    it('should accept add_insight action', () => {
      expect(personaMemoryPatchSchema.safeParse({
        action: 'add_insight',
        data: { insight: 'New insight' },
      }).success).toBe(true)
    })

    it('should accept update_emotional_tone action', () => {
      expect(personaMemoryPatchSchema.safeParse({
        action: 'update_emotional_tone',
        data: { emotionalTone: 'positive' },
      }).success).toBe(true)
    })

    it('should accept increment_session action', () => {
      expect(personaMemoryPatchSchema.safeParse({
        action: 'increment_session',
      }).success).toBe(true)
    })
  })

  describe('personaMemoryUpdateSchema', () => {
    it('should accept valid update', () => {
      expect(personaMemoryUpdateSchema.safeParse({
        sessionId: 'session-123',
        theme: 'career',
        locale: 'ko',
        messages: [{ role: 'user', content: 'Test message' }],
      }).success).toBe(true)
    })

    it('should accept saju and astro context', () => {
      expect(personaMemoryUpdateSchema.safeParse({
        sessionId: 'session-123',
        theme: 'general',
        locale: 'en',
        messages: [{ role: 'user', content: 'Test' }],
        saju: { dayMaster: '갑' },
        astro: { sunSign: 'Aries', dominantElement: 'fire' },
      }).success).toBe(true)
    })
  })
})

describe('Notification Schema Tests', () => {
  describe('notificationSendRequestSchema', () => {
    it('should accept valid notification', () => {
      expect(notificationSendRequestSchema.safeParse({
        title: 'Daily Fortune',
        message: 'Your daily fortune is ready!',
      }).success).toBe(true)
    })

    it('should accept with userId and type', () => {
      expect(notificationSendRequestSchema.safeParse({
        userId: 'user-123',
        title: 'Alert',
        message: 'Important update',
        type: 'warning',
        priority: 'high',
      }).success).toBe(true)
    })
  })

  describe('pushSendRequestSchema', () => {
    it('should accept valid push notification', () => {
      expect(pushSendRequestSchema.safeParse({
        title: 'New Reading',
        message: 'Your tarot reading is complete',
      }).success).toBe(true)
    })

    it('should accept with all options', () => {
      expect(pushSendRequestSchema.safeParse({
        targetUserId: 'user-123',
        title: 'Fortune',
        message: 'Check your fortune',
        icon: '/icon.png',
        url: '/fortune',
        tag: 'fortune',
        test: true,
      }).success).toBe(true)
    })
  })

  describe('pushSubscribeSchema', () => {
    it('should accept valid subscription', () => {
      expect(pushSubscribeSchema.safeParse({
        endpoint: 'https://fcm.googleapis.com/fcm/send/example',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM=',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
        },
      }).success).toBe(true)
    })

    it('should reject missing keys', () => {
      expect(pushSubscribeSchema.safeParse({
        endpoint: 'https://example.com',
        keys: {
          p256dh: '',
          auth: 'test',
        },
      }).success).toBe(false)
    })
  })

  describe('pushUnsubscribeSchema', () => {
    it('should accept valid unsubscribe', () => {
      expect(pushUnsubscribeSchema.safeParse({
        endpoint: 'https://fcm.googleapis.com/fcm/send/example',
      }).success).toBe(true)
    })
  })
})

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
    it('should use default theme', () => {
      const result = counselorSessionLoadQuerySchema.safeParse({})
      if (result.success) {
        expect(result.data.theme).toBe('chat')
      }
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
      const types = ['tarot', 'astrology', 'saju', 'compatibility', 'dream']
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

  describe('cronNotificationsTriggerSchema', () => {
    it('should accept valid hour', () => {
      expect(cronNotificationsTriggerSchema.safeParse({
        hour: 9,
      }).success).toBe(true)
    })

    it('should accept hour range 0-23', () => {
      expect(cronNotificationsTriggerSchema.safeParse({ hour: 0 }).success).toBe(true)
      expect(cronNotificationsTriggerSchema.safeParse({ hour: 23 }).success).toBe(true)
    })

    it('should reject invalid hour', () => {
      expect(cronNotificationsTriggerSchema.safeParse({ hour: 24 }).success).toBe(false)
      expect(cronNotificationsTriggerSchema.safeParse({ hour: -1 }).success).toBe(false)
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
