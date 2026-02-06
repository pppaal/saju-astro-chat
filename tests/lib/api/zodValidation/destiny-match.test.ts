/**
 * Destiny Match (Dating) Schema Tests
 * Comprehensive testing for destiny-match.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  destinyMatchSwipeSchema,
  destinyMatchSwipeUndoSchema,
  destinyMatchBlockSchema,
  destinyMatchProfileSchema,
  destinyMatchChatSchema,
  destinyMatchReportSchema,
  destinyMatchMatchesQuerySchema,
  destinyMatchUnmatchSchema,
  destinyMatchDiscoverQuerySchema,
  destinyMatchChatGetQuerySchema,
} from '@/lib/api/zodValidation/destiny-match'

describe('Destiny Match Swipe Schema Tests', () => {
  describe('destinyMatchSwipeSchema', () => {
    it('should accept valid like swipe', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'like',
      }).success).toBe(true)
    })

    it('should accept valid pass swipe', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-456',
        action: 'pass',
      }).success).toBe(true)
    })

    it('should accept super_like action', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-789',
        action: 'super_like',
      }).success).toBe(true)
    })

    it('should accept optional compatibilityScore', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'like',
        compatibilityScore: 85,
      }).success).toBe(true)
    })

    it('should accept null compatibilityScore', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'like',
        compatibilityScore: null,
      }).success).toBe(true)
    })

    it('should reject empty targetProfileId', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: '',
        action: 'like',
      }).success).toBe(false)
    })

    it('should reject invalid action', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'skip',
      }).success).toBe(false)
    })

    it('should reject invalid compatibilityScore', () => {
      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'like',
        compatibilityScore: 101,
      }).success).toBe(false)

      expect(destinyMatchSwipeSchema.safeParse({
        targetProfileId: 'profile-123',
        action: 'like',
        compatibilityScore: -1,
      }).success).toBe(false)
    })

    it('should trim targetProfileId', () => {
      const result = destinyMatchSwipeSchema.safeParse({
        targetProfileId: '  profile-123  ',
        action: 'like',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.targetProfileId).toBe('profile-123')
      }
    })
  })

  describe('destinyMatchSwipeUndoSchema', () => {
    it('should accept valid undo request', () => {
      expect(destinyMatchSwipeUndoSchema.safeParse({
        swipeId: 'swipe-123',
      }).success).toBe(true)
    })

    it('should reject empty swipeId', () => {
      expect(destinyMatchSwipeUndoSchema.safeParse({
        swipeId: '',
      }).success).toBe(false)
    })

    it('should trim swipeId', () => {
      const result = destinyMatchSwipeUndoSchema.safeParse({
        swipeId: '  swipe-123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.swipeId).toBe('swipe-123')
      }
    })

    it('should reject too long swipeId', () => {
      expect(destinyMatchSwipeUndoSchema.safeParse({
        swipeId: 'a'.repeat(201),
      }).success).toBe(false)
    })
  })
})

describe('Destiny Match Block Schema Tests', () => {
  describe('destinyMatchBlockSchema', () => {
    it('should accept valid block request', () => {
      expect(destinyMatchBlockSchema.safeParse({
        blockedUserId: 'user-123',
      }).success).toBe(true)
    })

    it('should accept with reason', () => {
      expect(destinyMatchBlockSchema.safeParse({
        blockedUserId: 'user-123',
        reason: 'Inappropriate behavior',
      }).success).toBe(true)
    })

    it('should reject empty blockedUserId', () => {
      expect(destinyMatchBlockSchema.safeParse({
        blockedUserId: '',
      }).success).toBe(false)
    })

    it('should reject too long reason', () => {
      expect(destinyMatchBlockSchema.safeParse({
        blockedUserId: 'user-123',
        reason: 'a'.repeat(501),
      }).success).toBe(false)
    })

    it('should trim blockedUserId and reason', () => {
      const result = destinyMatchBlockSchema.safeParse({
        blockedUserId: '  user-123  ',
        reason: '  Bad behavior  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.blockedUserId).toBe('user-123')
        expect(result.data.reason).toBe('Bad behavior')
      }
    })
  })
})

describe('Destiny Match Profile Schema Tests', () => {
  describe('destinyMatchProfileSchema', () => {
    it('should accept valid profile', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John Doe',
      }).success).toBe(true)
    })

    it('should accept full profile', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'Jane Smith',
        bio: 'Love traveling and hiking',
        occupation: 'Software Engineer',
        photos: ['/photo1.jpg', '/photo2.jpg'],
        city: 'Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        interests: ['hiking', 'reading', 'cooking'],
        ageMin: 25,
        ageMax: 35,
        maxDistance: 50,
        genderPreference: 'F',
        isActive: true,
        isVisible: true,
      }).success).toBe(true)
    })

    it('should reject too short displayName', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'J',
      }).success).toBe(false)
    })

    it('should reject too long displayName', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'a'.repeat(65),
      }).success).toBe(false)
    })

    it('should accept nullable bio and occupation', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        bio: null,
        occupation: null,
      }).success).toBe(true)
    })

    it('should reject too many photos', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        photos: Array(11).fill('/photo.jpg'),
      }).success).toBe(false)
    })

    it('should reject too many interests', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        interests: Array(31).fill('interest'),
      }).success).toBe(false)
    })

    it('should reject invalid age range', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        ageMin: 17,
      }).success).toBe(false)

      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        ageMax: 101,
      }).success).toBe(false)
    })

    it('should accept valid coordinate range', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        latitude: -90,
        longitude: -180,
      }).success).toBe(true)

      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        latitude: 90,
        longitude: 180,
      }).success).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        latitude: 91,
      }).success).toBe(false)

      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        longitude: 181,
      }).success).toBe(false)
    })

    it('should reject too large maxDistance', () => {
      expect(destinyMatchProfileSchema.safeParse({
        displayName: 'John',
        maxDistance: 501,
      }).success).toBe(false)
    })

    it('should trim displayName', () => {
      const result = destinyMatchProfileSchema.safeParse({
        displayName: '  John Doe  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayName).toBe('John Doe')
      }
    })
  })
})

describe('Destiny Match Chat Schema Tests', () => {
  describe('destinyMatchChatSchema', () => {
    it('should accept valid chat message', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: 'Hello! How are you?',
      }).success).toBe(true)
    })

    it('should accept text message type', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: 'Nice to meet you',
        messageType: 'text',
      }).success).toBe(true)
    })

    it('should accept image message type', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: '/image.jpg',
        messageType: 'image',
      }).success).toBe(true)
    })

    it('should accept emoji message type', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: '😊',
        messageType: 'emoji',
      }).success).toBe(true)
    })

    it('should default messageType to text', () => {
      const result = destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: 'Hello',
      })
      if (result.success) {
        expect(result.data.messageType).toBe('text')
      }
    })

    it('should reject empty connectionId', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: '',
        content: 'Hello',
      }).success).toBe(false)
    })

    it('should reject empty content', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: '',
      }).success).toBe(false)
    })

    it('should reject too long content', () => {
      expect(destinyMatchChatSchema.safeParse({
        connectionId: 'conn-123',
        content: 'a'.repeat(2001),
      }).success).toBe(false)
    })

    it('should trim connectionId and content', () => {
      const result = destinyMatchChatSchema.safeParse({
        connectionId: '  conn-123  ',
        content: '  Hello  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.connectionId).toBe('conn-123')
        expect(result.data.content).toBe('Hello')
      }
    })
  })
})

describe('Destiny Match Report Schema Tests', () => {
  describe('destinyMatchReportSchema', () => {
    it('should accept valid report', () => {
      expect(destinyMatchReportSchema.safeParse({
        reportedUserId: 'user-123',
        category: 'inappropriate',
      }).success).toBe(true)
    })

    it('should accept all categories', () => {
      const categories = ['inappropriate', 'spam', 'fake', 'harassment', 'other']
      categories.forEach(category => {
        expect(destinyMatchReportSchema.safeParse({
          reportedUserId: 'user-123',
          category,
        }).success).toBe(true)
      })
    })

    it('should accept optional description', () => {
      expect(destinyMatchReportSchema.safeParse({
        reportedUserId: 'user-123',
        category: 'harassment',
        description: 'Sent threatening messages',
      }).success).toBe(true)
    })

    it('should reject empty reportedUserId', () => {
      expect(destinyMatchReportSchema.safeParse({
        reportedUserId: '',
        category: 'spam',
      }).success).toBe(false)
    })

    it('should reject invalid category', () => {
      expect(destinyMatchReportSchema.safeParse({
        reportedUserId: 'user-123',
        category: 'invalid',
      }).success).toBe(false)
    })

    it('should reject too long description', () => {
      expect(destinyMatchReportSchema.safeParse({
        reportedUserId: 'user-123',
        category: 'other',
        description: 'a'.repeat(1001),
      }).success).toBe(false)
    })
  })
})

describe('Destiny Match Query Schema Tests', () => {
  describe('destinyMatchMatchesQuerySchema', () => {
    it('should accept empty query', () => {
      expect(destinyMatchMatchesQuerySchema.safeParse({}).success).toBe(true)
    })

    it('should use defaults', () => {
      const result = destinyMatchMatchesQuerySchema.safeParse({})
      if (result.success) {
        expect(result.data.status).toBe('active')
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept all statuses', () => {
      const statuses = ['active', 'blocked', 'all']
      statuses.forEach(status => {
        expect(destinyMatchMatchesQuerySchema.safeParse({ status }).success).toBe(true)
      })
    })

    it('should accept connectionId filter', () => {
      expect(destinyMatchMatchesQuerySchema.safeParse({
        connectionId: 'conn-123',
      }).success).toBe(true)
    })

    it('should accept custom limit', () => {
      const result = destinyMatchMatchesQuerySchema.safeParse({ limit: 25 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
      }
    })

    it('should reject limit over 100', () => {
      expect(destinyMatchMatchesQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })
  })

  describe('destinyMatchUnmatchSchema', () => {
    it('should accept valid unmatch request', () => {
      expect(destinyMatchUnmatchSchema.safeParse({
        connectionId: 'conn-123',
      }).success).toBe(true)
    })

    it('should reject empty connectionId', () => {
      expect(destinyMatchUnmatchSchema.safeParse({
        connectionId: '',
      }).success).toBe(false)
    })

    it('should reject too long connectionId', () => {
      expect(destinyMatchUnmatchSchema.safeParse({
        connectionId: 'a'.repeat(101),
      }).success).toBe(false)
    })
  })

  describe('destinyMatchDiscoverQuerySchema', () => {
    it('should accept empty query', () => {
      expect(destinyMatchDiscoverQuerySchema.safeParse({}).success).toBe(true)
    })

    it('should use defaults', () => {
      const result = destinyMatchDiscoverQuerySchema.safeParse({})
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept filters', () => {
      expect(destinyMatchDiscoverQuerySchema.safeParse({
        limit: 10,
        offset: 20,
        gender: 'F',
        ageMin: 25,
        ageMax: 35,
        city: 'Seoul',
      }).success).toBe(true)
    })

    it('should accept all gender options', () => {
      const genders = ['M', 'F', 'all']
      genders.forEach(gender => {
        expect(destinyMatchDiscoverQuerySchema.safeParse({ gender }).success).toBe(true)
      })
    })

    it('should reject invalid age range', () => {
      expect(destinyMatchDiscoverQuerySchema.safeParse({ ageMin: 17 }).success).toBe(false)
      expect(destinyMatchDiscoverQuerySchema.safeParse({ ageMax: 101 }).success).toBe(false)
    })

    it('should reject limit over 50', () => {
      expect(destinyMatchDiscoverQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
    })
  })

  describe('destinyMatchChatGetQuerySchema', () => {
    it('should accept valid query', () => {
      expect(destinyMatchChatGetQuerySchema.safeParse({
        connectionId: 'conn-123',
      }).success).toBe(true)
    })

    it('should accept with cursor and limit', () => {
      expect(destinyMatchChatGetQuerySchema.safeParse({
        connectionId: 'conn-123',
        cursor: 'cursor-abc',
        limit: 25,
      }).success).toBe(true)
    })

    it('should use default limit', () => {
      const result = destinyMatchChatGetQuerySchema.safeParse({
        connectionId: 'conn-123',
      })
      if (result.success) {
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject empty connectionId', () => {
      expect(destinyMatchChatGetQuerySchema.safeParse({
        connectionId: '',
      }).success).toBe(false)
    })

    it('should reject limit over 100', () => {
      expect(destinyMatchChatGetQuerySchema.safeParse({
        connectionId: 'conn-123',
        limit: 101,
      }).success).toBe(false)
    })
  })
})
