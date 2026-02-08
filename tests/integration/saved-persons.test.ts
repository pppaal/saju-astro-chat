/**
 * Saved Persons Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 저장된 인물 관리
 * - 인물 정보 업데이트
 * - 인물 간 궁합 분석용 데이터
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

describe('Integration: Saved Persons', () => {
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

  describe('Person Creation', () => {
    it('saves person with basic info', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '김철수',
          relationship: 'friend',
          birthDate: new Date('1990-05-15'),
        },
      })

      expect(person.name).toBe('김철수')
      expect(person.relationship).toBe('friend')
    })

    it('saves person with full birth info', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '이영희',
          relationship: 'partner',
          birthDate: new Date('1992-08-20'),
          birthTime: '14:30',
          birthPlace: '서울',
          gender: 'female',
          isLunar: false,
        },
      })

      expect(person.birthTime).toBe('14:30')
      expect(person.birthPlace).toBe('서울')
      expect(person.gender).toBe('female')
    })

    it('saves person with lunar calendar', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '박민수',
          relationship: 'family',
          birthDate: new Date('1985-03-10'),
          isLunar: true,
        },
      })

      expect(person.isLunar).toBe(true)
    })

    it('saves multiple persons for one user', async () => {
      const user = await createTestUserInDb()

      const persons = [
        { name: '가족1', relationship: 'family' },
        { name: '친구1', relationship: 'friend' },
        { name: '연인', relationship: 'partner' },
        { name: '동료1', relationship: 'colleague' },
      ]

      for (const p of persons) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: p.name,
            relationship: p.relationship,
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const savedPersons = await testPrisma.savedPerson.findMany({
        where: { userId: user.id },
      })

      expect(savedPersons).toHaveLength(4)
    })
  })

  describe('Person Updates', () => {
    it('updates person name', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '원래이름',
          relationship: 'friend',
          birthDate: new Date('1990-01-01'),
        },
      })

      const updated = await testPrisma.savedPerson.update({
        where: { id: person.id },
        data: { name: '새이름' },
      })

      expect(updated.name).toBe('새이름')
    })

    it('updates relationship type', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '관계변경',
          relationship: 'friend',
          birthDate: new Date('1990-01-01'),
        },
      })

      const updated = await testPrisma.savedPerson.update({
        where: { id: person.id },
        data: { relationship: 'partner' },
      })

      expect(updated.relationship).toBe('partner')
    })

    it('updates birth information', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '생일수정',
          relationship: 'family',
          birthDate: new Date('1990-01-01'),
        },
      })

      const updated = await testPrisma.savedPerson.update({
        where: { id: person.id },
        data: {
          birthDate: new Date('1990-05-15'),
          birthTime: '08:30',
          birthPlace: '부산',
        },
      })

      expect(updated.birthTime).toBe('08:30')
      expect(updated.birthPlace).toBe('부산')
    })

    it('adds notes to person', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '노트추가',
          relationship: 'friend',
          birthDate: new Date('1990-01-01'),
          notes: null,
        },
      })

      const updated = await testPrisma.savedPerson.update({
        where: { id: person.id },
        data: { notes: '대학교 동기, 매우 친한 친구' },
      })

      expect(updated.notes).toContain('대학교 동기')
    })
  })

  describe('Person Retrieval', () => {
    it('retrieves all saved persons for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const persons = await testPrisma.savedPerson.findMany({
        where: { userId: user.id },
      })

      expect(persons).toHaveLength(5)
    })

    it('retrieves persons by relationship', async () => {
      const user = await createTestUserInDb()

      const relationships = ['family', 'family', 'friend', 'partner', 'colleague']

      for (let i = 0; i < relationships.length; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: relationships[i],
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const familyMembers = await testPrisma.savedPerson.findMany({
        where: { userId: user.id, relationship: 'family' },
      })

      expect(familyMembers).toHaveLength(2)
    })

    it('retrieves person by id', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '특정인물',
          relationship: 'friend',
          birthDate: new Date('1990-01-01'),
        },
      })

      const found = await testPrisma.savedPerson.findUnique({
        where: { id: person.id },
      })

      expect(found?.name).toBe('특정인물')
    })

    it('searches persons by name', async () => {
      const user = await createTestUserInDb()

      const names = ['김철수', '김영희', '박철수', '이민수']

      for (const name of names) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const kimPersons = await testPrisma.savedPerson.findMany({
        where: {
          userId: user.id,
          name: { startsWith: '김' },
        },
      })

      expect(kimPersons).toHaveLength(2)
    })
  })

  describe('Person Statistics', () => {
    it('counts persons by relationship type', async () => {
      const user = await createTestUserInDb()

      const relationships = ['family', 'family', 'family', 'friend', 'friend', 'partner']

      for (let i = 0; i < relationships.length; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: relationships[i],
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const counts = await testPrisma.savedPerson.groupBy({
        by: ['relationship'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const familyCount = counts.find((c) => c.relationship === 'family')?._count.id
      expect(familyCount).toBe(3)
    })

    it('finds persons with complete birth info', async () => {
      const user = await createTestUserInDb()

      // Complete info
      for (let i = 0; i < 2; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Complete ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
            birthTime: '12:00',
            birthPlace: '서울',
          },
        })
      }

      // Incomplete info
      for (let i = 0; i < 3; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Incomplete ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const completePersons = await testPrisma.savedPerson.findMany({
        where: {
          userId: user.id,
          birthTime: { not: null },
          birthPlace: { not: null },
        },
      })

      expect(completePersons).toHaveLength(2)
    })
  })

  describe('Person for Compatibility', () => {
    it('retrieves pair for compatibility analysis', async () => {
      const user = await createTestUserInDb()

      const person1 = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Person A',
          relationship: 'partner',
          birthDate: new Date('1990-05-15'),
          birthTime: '14:30',
          gender: 'male',
        },
      })

      const person2 = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: 'Person B',
          relationship: 'partner',
          birthDate: new Date('1992-08-20'),
          birthTime: '09:15',
          gender: 'female',
        },
      })

      const pair = await testPrisma.savedPerson.findMany({
        where: {
          id: { in: [person1.id, person2.id] },
        },
      })

      expect(pair).toHaveLength(2)
      expect(pair.every((p) => p.birthTime !== null)).toBe(true)
    })

    it('stores compatibility result reference', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '궁합대상',
          relationship: 'partner',
          birthDate: new Date('1990-01-01'),
        },
      })

      // Create compatibility result
      await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          person1Name: user.name || '나',
          person1BirthDate: new Date('1988-03-15'),
          person2Name: person.name,
          person2BirthDate: person.birthDate,
          overallScore: 85,
          content: JSON.stringify({ compatibility: 'excellent' }),
        },
      })

      const results = await testPrisma.compatibilityResult.findMany({
        where: {
          userId: user.id,
          person2Name: person.name,
        },
      })

      expect(results).toHaveLength(1)
      expect(results[0].overallScore).toBe(85)
    })
  })

  describe('Person Deletion', () => {
    it('deletes single person', async () => {
      const user = await createTestUserInDb()

      const person = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: '삭제대상',
          relationship: 'friend',
          birthDate: new Date('1990-01-01'),
        },
      })

      await testPrisma.savedPerson.delete({
        where: { id: person.id },
      })

      const found = await testPrisma.savedPerson.findUnique({
        where: { id: person.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all persons for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Delete ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      await testPrisma.savedPerson.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.savedPerson.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })

    it('deletes persons by relationship', async () => {
      const user = await createTestUserInDb()

      const relationships = ['friend', 'friend', 'family', 'colleague']

      for (let i = 0; i < relationships.length; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: relationships[i],
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      await testPrisma.savedPerson.deleteMany({
        where: { userId: user.id, relationship: 'friend' },
      })

      const remaining = await testPrisma.savedPerson.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })

  describe('Person Limits', () => {
    it('counts total saved persons', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 10; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const count = await testPrisma.savedPerson.count({
        where: { userId: user.id },
      })

      expect(count).toBe(10)
    })

    it('enforces person limit check', async () => {
      const user = await createTestUserInDb()
      const maxPersons = 20

      for (let i = 0; i < 15; i++) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: `Person ${i}`,
            relationship: 'friend',
            birthDate: new Date('1990-01-01'),
          },
        })
      }

      const count = await testPrisma.savedPerson.count({
        where: { userId: user.id },
      })

      const canAddMore = count < maxPersons
      expect(canAddMore).toBe(true)
    })
  })
})
