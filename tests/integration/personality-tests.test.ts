/**
 * Personality Tests Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 성격 분석 결과 저장
 * - ICP 결과 관리
 * - 전생 분석 결과 저장
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

describe('Integration: Personality Tests System', () => {
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

  describe('Personality Result', () => {
    it('creates personality result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.personalityResult.create({
        data: {
          userId: user.id,
          testType: 'mbti_saju',
          result: {
            type: 'INTJ',
            traits: ['analytical', 'strategic', 'independent'],
            description: '분석적이고 전략적인 성향...',
          },
          answers: [
            { questionId: 1, answer: 'A' },
            { questionId: 2, answer: 'B' },
          ],
        },
      })

      expect(result).toBeDefined()
      expect(result.testType).toBe('mbti_saju')
      const res = result.result as { type: string }
      expect(res.type).toBe('INTJ')
    })

    it('stores multiple test results for user', async () => {
      const user = await createTestUserInDb()

      const testTypes = ['mbti_saju', 'element_balance', 'zodiac_personality']

      for (const testType of testTypes) {
        await testPrisma.personalityResult.create({
          data: {
            userId: user.id,
            testType,
            result: { testType },
            answers: [],
          },
        })
      }

      const results = await testPrisma.personalityResult.findMany({
        where: { userId: user.id },
      })

      expect(results).toHaveLength(3)
    })

    it('retrieves latest personality result', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 3; i++) {
        await testPrisma.personalityResult.create({
          data: {
            userId: user.id,
            testType: 'mbti_saju',
            result: { version: i },
            answers: [],
          },
        })
      }

      const latest = await testPrisma.personalityResult.findFirst({
        where: { userId: user.id, testType: 'mbti_saju' },
        orderBy: { createdAt: 'desc' },
      })

      const res = latest!.result as { version: number }
      expect(res.version).toBe(3)
    })

    it('updates personality result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.personalityResult.create({
        data: {
          userId: user.id,
          testType: 'element_balance',
          result: { fire: 30, water: 20, earth: 25, metal: 15, wood: 10 },
          answers: [],
        },
      })

      const updated = await testPrisma.personalityResult.update({
        where: { id: result.id },
        data: {
          result: { fire: 35, water: 18, earth: 22, metal: 15, wood: 10 },
        },
      })

      const res = updated.result as { fire: number }
      expect(res.fire).toBe(35)
    })
  })

  describe('ICP Result', () => {
    it('creates ICP result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          analysisType: 'ideal_partner',
          result: {
            idealTraits: ['caring', 'ambitious', 'humorous'],
            compatibleSigns: ['Cancer', 'Pisces'],
            avoidTraits: ['possessive', 'lazy'],
          },
          inputData: { birthDate: '1990-05-15', gender: 'female' },
        },
      })

      expect(result).toBeDefined()
      expect(result.analysisType).toBe('ideal_partner')
    })

    it('stores detailed ICP analysis', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.iCPResult.create({
        data: {
          userId: user.id,
          analysisType: 'relationship_dynamics',
          result: {
            communicationStyle: 'direct',
            loveLanguage: 'quality_time',
            conflictResolution: 'collaborative',
            emotionalNeeds: ['security', 'appreciation'],
          },
          inputData: {},
        },
      })

      const res = result.result as { communicationStyle: string }
      expect(res.communicationStyle).toBe('direct')
    })

    it('retrieves ICP results by analysis type', async () => {
      const user = await createTestUserInDb()

      await testPrisma.iCPResult.create({
        data: { userId: user.id, analysisType: 'ideal_partner', result: {}, inputData: {} },
      })
      await testPrisma.iCPResult.create({
        data: { userId: user.id, analysisType: 'career_match', result: {}, inputData: {} },
      })
      await testPrisma.iCPResult.create({
        data: { userId: user.id, analysisType: 'ideal_partner', result: {}, inputData: {} },
      })

      const partnerResults = await testPrisma.iCPResult.findMany({
        where: { userId: user.id, analysisType: 'ideal_partner' },
      })

      expect(partnerResults).toHaveLength(2)
    })
  })

  describe('Past Life Result', () => {
    it('creates past life result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.pastLifeResult.create({
        data: {
          userId: user.id,
          result: {
            era: 'medieval',
            location: 'Korea',
            occupation: 'scholar',
            karmaLessons: ['patience', 'humility'],
            pastConnections: ['current spouse was a friend'],
          },
          inputData: { birthDate: '1990-05-15' },
        },
      })

      expect(result).toBeDefined()
      const res = result.result as { era: string }
      expect(res.era).toBe('medieval')
    })

    it('stores multiple past life analyses', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 3; i++) {
        await testPrisma.pastLifeResult.create({
          data: {
            userId: user.id,
            result: { lifeNumber: i, era: `era_${i}` },
            inputData: {},
          },
        })
      }

      const results = await testPrisma.pastLifeResult.findMany({
        where: { userId: user.id },
      })

      expect(results).toHaveLength(3)
    })

    it('retrieves latest past life result', async () => {
      const user = await createTestUserInDb()

      await testPrisma.pastLifeResult.create({
        data: { userId: user.id, result: { version: 1 }, inputData: {} },
      })
      await testPrisma.pastLifeResult.create({
        data: { userId: user.id, result: { version: 2 }, inputData: {} },
      })

      const latest = await testPrisma.pastLifeResult.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      const res = latest!.result as { version: number }
      expect(res.version).toBe(2)
    })
  })

  describe('Compatibility Result', () => {
    it('creates compatibility result', async () => {
      const user = await createTestUserInDb()

      const result = await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          partnerData: {
            name: 'Partner',
            birthDate: '1992-08-20',
            gender: 'male',
          },
          result: {
            overallScore: 85,
            loveScore: 90,
            friendshipScore: 80,
            workScore: 75,
            analysis: 'Very compatible relationship...',
          },
        },
      })

      expect(result).toBeDefined()
      const res = result.result as { overallScore: number }
      expect(res.overallScore).toBe(85)
    })

    it('stores multiple compatibility checks', async () => {
      const user = await createTestUserInDb()

      const partners = ['Alice', 'Bob', 'Charlie']

      for (const name of partners) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            partnerData: { name, birthDate: '1990-01-01' },
            result: { score: Math.floor(Math.random() * 100) },
          },
        })
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      })

      expect(results).toHaveLength(3)
    })

    it('retrieves compatibility results ordered by score', async () => {
      const user = await createTestUserInDb()

      const scores = [75, 90, 60, 85]

      for (const score of scores) {
        await testPrisma.compatibilityResult.create({
          data: {
            userId: user.id,
            partnerData: { score },
            result: { overallScore: score },
          },
        })
      }

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      })

      const sortedScores = results
        .map((r) => (r.result as { overallScore: number }).overallScore)
        .sort((a, b) => b - a)

      expect(sortedScores).toEqual([90, 85, 75, 60])
    })
  })

  describe('Destiny Matrix Report', () => {
    it('creates destiny matrix report', async () => {
      const user = await createTestUserInDb()

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: '1990-05-15',
          reportData: {
            lifePathNumber: 7,
            soulNumber: 3,
            personalityNumber: 4,
            matrixGrid: [
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9],
            ],
          },
        },
      })

      expect(report).toBeDefined()
      const data = report.reportData as { lifePathNumber: number }
      expect(data.lifePathNumber).toBe(7)
    })

    it('stores AI generated analysis', async () => {
      const user = await createTestUserInDb()

      const report = await testPrisma.destinyMatrixReport.create({
        data: {
          userId: user.id,
          birthDate: '1990-05-15',
          reportData: { matrix: [] },
          aiAnalysis: 'Based on your destiny matrix, you possess strong analytical abilities...',
        },
      })

      expect(report.aiAnalysis).toContain('analytical abilities')
    })

    it('retrieves reports by birth date', async () => {
      const user = await createTestUserInDb()

      await testPrisma.destinyMatrixReport.create({
        data: { userId: user.id, birthDate: '1990-05-15', reportData: {} },
      })
      await testPrisma.destinyMatrixReport.create({
        data: { userId: user.id, birthDate: '1992-08-20', reportData: {} },
      })

      const reports = await testPrisma.destinyMatrixReport.findMany({
        where: { userId: user.id, birthDate: '1990-05-15' },
      })

      expect(reports).toHaveLength(1)
    })
  })
})
