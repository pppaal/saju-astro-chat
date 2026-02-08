/**
 * User Profile Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 프로필 관리
 * - 프로필 사진 및 정보 업데이트
 * - 프로필 완성도 추적
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: User Profile', () => {
  if (!hasTestDb) {
    return
  }

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await cleanupAllTestUsers()
    await disconnectTestDb()
  })

  afterEach(async () => {
    await cleanupAllTestUsers()
  })

  describe('Profile Creation', () => {
    it('creates user with basic profile', async () => {
      const user = await createTestUserInDb()

      expect(user).toBeDefined()
      expect(user.email).toContain('test_')
    })

    it('creates user with full profile data', async () => {
      const email = `test_full_${Date.now()}@example.com`

      const user = await testPrisma.user.create({
        data: {
          email,
          name: '김철수',
          image: 'https://example.com/avatar.jpg',
          birthDate: new Date('1990-05-15'),
          birthTime: '14:30',
          birthPlace: '서울',
          gender: 'male',
          isLunar: false,
        },
      })

      expect(user.name).toBe('김철수')
      expect(user.birthDate).toBeDefined()
      expect(user.birthTime).toBe('14:30')
    })

    it('creates user with lunar birth date', async () => {
      const email = `test_lunar_${Date.now()}@example.com`

      const user = await testPrisma.user.create({
        data: {
          email,
          name: '이영희',
          birthDate: new Date('1985-03-20'),
          isLunar: true,
        },
      })

      expect(user.isLunar).toBe(true)
    })
  })

  describe('Profile Updates', () => {
    it('updates user name', async () => {
      const user = await createTestUserInDb()

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: { name: '새로운이름' },
      })

      expect(updated.name).toBe('새로운이름')
    })

    it('updates birth information', async () => {
      const user = await createTestUserInDb()

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: {
          birthDate: new Date('1992-08-25'),
          birthTime: '09:15',
          birthPlace: '부산',
          isLunar: false,
        },
      })

      expect(updated.birthTime).toBe('09:15')
      expect(updated.birthPlace).toBe('부산')
    })

    it('updates profile image', async () => {
      const user = await createTestUserInDb()

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: { image: 'https://example.com/new-avatar.jpg' },
      })

      expect(updated.image).toContain('new-avatar')
    })

    it('updates gender', async () => {
      const user = await createTestUserInDb()

      const updated = await testPrisma.user.update({
        where: { id: user.id },
        data: { gender: 'female' },
      })

      expect(updated.gender).toBe('female')
    })
  })

  describe('Profile Retrieval', () => {
    it('retrieves user by email', async () => {
      const user = await createTestUserInDb()

      const found = await testPrisma.user.findUnique({
        where: { email: user.email },
      })

      expect(found).not.toBeNull()
      expect(found?.id).toBe(user.id)
    })

    it('retrieves user with related data', async () => {
      const user = await createTestUserInDb()

      // Create related data
      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: '{}',
        },
      })

      const found = await testPrisma.user.findUnique({
        where: { id: user.id },
        include: {
          readings: true,
        },
      })

      expect(found?.readings).toHaveLength(1)
    })

    it('retrieves user profile completeness', async () => {
      const email = `test_complete_${Date.now()}@example.com`

      const user = await testPrisma.user.create({
        data: {
          email,
          name: '완성된프로필',
          birthDate: new Date('1990-01-01'),
          birthTime: '12:00',
          birthPlace: '서울',
          gender: 'male',
          image: 'https://example.com/avatar.jpg',
        },
      })

      const fields = ['name', 'birthDate', 'birthTime', 'birthPlace', 'gender', 'image']
      const completedFields = fields.filter((field) => user[field as keyof typeof user] !== null)
      const completeness = (completedFields.length / fields.length) * 100

      expect(completeness).toBe(100)
    })
  })

  describe('Profile Search', () => {
    it('searches users by name', async () => {
      const users: string[] = []

      const names = ['김철수', '김영희', '박철수', '이영희']

      for (const name of names) {
        const user = await testPrisma.user.create({
          data: {
            email: `test_${name}_${Date.now()}@example.com`,
            name,
          },
        })
        users.push(user.id)
      }

      const kimUsers = await testPrisma.user.findMany({
        where: {
          id: { in: users },
          name: { startsWith: '김' },
        },
      })

      expect(kimUsers).toHaveLength(2)
    })

    it('finds users with complete birth info', async () => {
      const users: string[] = []

      for (let i = 0; i < 4; i++) {
        const user = await testPrisma.user.create({
          data: {
            email: `test_birth_${Date.now()}_${i}@example.com`,
            name: `User ${i}`,
            birthDate: i < 2 ? new Date('1990-01-01') : null,
            birthTime: i < 2 ? '12:00' : null,
          },
        })
        users.push(user.id)
      }

      const completeUsers = await testPrisma.user.findMany({
        where: {
          id: { in: users },
          birthDate: { not: null },
          birthTime: { not: null },
        },
      })

      expect(completeUsers).toHaveLength(2)
    })
  })

  describe('Profile Statistics', () => {
    it('counts users by gender', async () => {
      const users: string[] = []
      const genders = ['male', 'male', 'female', 'female', 'female', null]

      for (let i = 0; i < genders.length; i++) {
        const user = await testPrisma.user.create({
          data: {
            email: `test_gender_${Date.now()}_${i}@example.com`,
            gender: genders[i],
          },
        })
        users.push(user.id)
      }

      const genderCounts = await testPrisma.user.groupBy({
        by: ['gender'],
        where: { id: { in: users } },
        _count: { id: true },
      })

      const maleCount = genderCounts.find((g) => g.gender === 'male')?._count.id
      const femaleCount = genderCounts.find((g) => g.gender === 'female')?._count.id

      expect(maleCount).toBe(2)
      expect(femaleCount).toBe(3)
    })

    it('calculates average profile completeness', async () => {
      const users: string[] = []

      const profiles = [
        { name: 'User1', birthDate: new Date(), birthTime: '12:00', birthPlace: 'Seoul' },
        { name: 'User2', birthDate: new Date(), birthTime: null, birthPlace: null },
        { name: null, birthDate: null, birthTime: null, birthPlace: null },
      ]

      for (let i = 0; i < profiles.length; i++) {
        const user = await testPrisma.user.create({
          data: {
            email: `test_avg_${Date.now()}_${i}@example.com`,
            ...profiles[i],
          },
        })
        users.push(user.id)
      }

      const allUsers = await testPrisma.user.findMany({
        where: { id: { in: users } },
      })

      const fields = ['name', 'birthDate', 'birthTime', 'birthPlace']
      const completenessScores = allUsers.map((user) => {
        const completed = fields.filter((f) => user[f as keyof typeof user] !== null).length
        return (completed / fields.length) * 100
      })

      const avgCompleteness =
        completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length
      expect(avgCompleteness).toBeGreaterThan(0)
    })
  })

  describe('Profile Privacy', () => {
    it('excludes sensitive fields in public view', async () => {
      const user = await testPrisma.user.create({
        data: {
          email: `test_privacy_${Date.now()}@example.com`,
          name: '공개사용자',
          birthDate: new Date('1990-01-01'),
          birthTime: '12:00',
        },
      })

      // Simulate public profile view - select only public fields
      const publicProfile = await testPrisma.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          image: true,
          // email, birthDate, birthTime excluded
        },
      })

      expect(publicProfile?.name).toBe('공개사용자')
      expect((publicProfile as Record<string, unknown>)?.email).toBeUndefined()
    })
  })

  describe('Profile Deletion', () => {
    it('soft deletes user profile', async () => {
      const user = await createTestUserInDb()

      // Simulate soft delete by updating a field
      await testPrisma.user.update({
        where: { id: user.id },
        data: {
          email: `deleted_${user.email}`,
          name: null,
        },
      })

      const updated = await testPrisma.user.findUnique({
        where: { id: user.id },
      })

      expect(updated?.email).toContain('deleted_')
    })

    it('anonymizes user data for GDPR', async () => {
      const user = await testPrisma.user.create({
        data: {
          email: `gdpr_${Date.now()}@example.com`,
          name: '삭제요청자',
          birthDate: new Date('1990-01-01'),
          birthTime: '12:00',
          birthPlace: '서울',
        },
      })

      await testPrisma.user.update({
        where: { id: user.id },
        data: {
          email: `anonymized_${user.id}@deleted.local`,
          name: '익명사용자',
          birthDate: null,
          birthTime: null,
          birthPlace: null,
          image: null,
        },
      })

      const anonymized = await testPrisma.user.findUnique({
        where: { id: user.id },
      })

      expect(anonymized?.name).toBe('익명사용자')
      expect(anonymized?.birthDate).toBeNull()
    })
  })

  describe('Profile Validation', () => {
    it('validates birth time format', async () => {
      const user = await createTestUserInDb()

      const validTimes = ['00:00', '12:30', '23:59']

      for (const time of validTimes) {
        const updated = await testPrisma.user.update({
          where: { id: user.id },
          data: { birthTime: time },
        })
        expect(updated.birthTime).toBe(time)
      }
    })

    it('handles missing optional fields', async () => {
      const user = await testPrisma.user.create({
        data: {
          email: `minimal_${Date.now()}@example.com`,
          // Only required field
        },
      })

      expect(user.name).toBeNull()
      expect(user.birthDate).toBeNull()
      expect(user.birthTime).toBeNull()
    })
  })
})
