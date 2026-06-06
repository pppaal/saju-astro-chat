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
