/**
 * Destiny Snapshot Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 운명 스냅샷 생성 및 관리
 * - 기간별 예측 저장
 * - 스냅샷 비교 및 분석
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

describe('Integration: Destiny Snapshot', () => {
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

  describe('Snapshot Creation', () => {
    it('creates destiny snapshot with target date', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-15',
          data: {
            period: 'monthly',
            predictions: {
              career: '성장의 기회가 있습니다',
              love: '새로운 만남이 예상됩니다',
              health: '건강에 유의하세요',
            },
            keyDates: ['2024-06-05', '2024-06-20'],
          },
        },
      })

      expect(snapshot).toBeDefined()
      expect(snapshot.targetDate).toBe('2024-06-15')
      const data = snapshot.data as { period: string }
      expect(data.period).toBe('monthly')
    })

    it('stores yearly forecast snapshot', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-01-01',
          data: {
            year: 2024,
            overallTheme: '변화와 성장의 해',
            quarterlyOutlook: [
              { q: 1, score: 75, focus: '새로운 시작' },
              { q: 2, score: 80, focus: '발전' },
              { q: 3, score: 70, focus: '도전' },
              { q: 4, score: 85, focus: '수확' },
            ],
          },
        },
      })

      const data = snapshot.data as { year: number; quarterlyOutlook: unknown[] }
      expect(data.year).toBe(2024)
      expect(data.quarterlyOutlook).toHaveLength(4)
    })

    it('stores weekly snapshot', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-10',
          data: {
            weekOf: '2024-06-10',
            dailyScores: [75, 80, 72, 88, 65, 90, 78],
            peakDay: 'Saturday',
            advice: '주말에 중요한 결정을 내리세요',
          },
        },
      })

      const data = snapshot.data as { dailyScores: number[] }
      expect(data.dailyScores).toHaveLength(7)
    })
  })

  describe('Snapshot Retrieval', () => {
    it('retrieves snapshots by target date range', async () => {
      const user = await createTestUserInDb()

      const dates = ['2024-01-15', '2024-03-15', '2024-06-15', '2024-09-15']

      for (const targetDate of dates) {
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate,
            data: { month: targetDate.split('-')[1] },
          },
        })
      }

      const firstHalf = await testPrisma.destinySnapshot.findMany({
        where: {
          userId: user.id,
          targetDate: { gte: '2024-01-01', lt: '2024-07-01' },
        },
      })

      expect(firstHalf).toHaveLength(3)
    })

    it('retrieves latest snapshot for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 5; i++) {
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate: `2024-0${i}-15`,
            data: { month: i },
          },
        })
      }

      const latest = await testPrisma.destinySnapshot.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      const data = latest!.data as { month: number }
      expect(data.month).toBe(5)
    })

    it('retrieves snapshot for specific date', async () => {
      const user = await createTestUserInDb()

      await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-15',
          data: { special: true, event: 'Summer Solstice' },
        },
      })

      const snapshot = await testPrisma.destinySnapshot.findFirst({
        where: { userId: user.id, targetDate: '2024-06-15' },
      })

      const data = snapshot!.data as { event: string }
      expect(data.event).toBe('Summer Solstice')
    })
  })

  describe('Snapshot Updates', () => {
    it('updates existing snapshot data', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-15',
          data: { status: 'draft', score: 70 },
        },
      })

      const updated = await testPrisma.destinySnapshot.update({
        where: { id: snapshot.id },
        data: {
          data: { status: 'final', score: 85, revised: true },
        },
      })

      const data = updated.data as { status: string; score: number }
      expect(data.status).toBe('final')
      expect(data.score).toBe(85)
    })

    it('adds additional predictions to snapshot', async () => {
      const user = await createTestUserInDb()

      const snapshot = await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-07-01',
          data: {
            predictions: ['career growth'],
          },
        },
      })

      const originalData = snapshot.data as { predictions: string[] }

      const updated = await testPrisma.destinySnapshot.update({
        where: { id: snapshot.id },
        data: {
          data: {
            predictions: [...originalData.predictions, 'love opportunity', 'health focus'],
          },
        },
      })

      const newData = updated.data as { predictions: string[] }
      expect(newData.predictions).toHaveLength(3)
    })
  })

  describe('Snapshot Comparison', () => {
    it('compares consecutive monthly snapshots', async () => {
      const user = await createTestUserInDb()

      await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-05-01',
          data: { overallScore: 72 },
        },
      })

      await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-01',
          data: { overallScore: 85 },
        },
      })

      const snapshots = await testPrisma.destinySnapshot.findMany({
        where: { userId: user.id },
        orderBy: { targetDate: 'asc' },
      })

      const may = snapshots[0].data as { overallScore: number }
      const june = snapshots[1].data as { overallScore: number }

      const improvement = june.overallScore - may.overallScore
      expect(improvement).toBe(13)
    })

    it('tracks year-over-year changes', async () => {
      const user = await createTestUserInDb()

      await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2023-06-15',
          data: { yearScore: 75 },
        },
      })

      await testPrisma.destinySnapshot.create({
        data: {
          userId: user.id,
          targetDate: '2024-06-15',
          data: { yearScore: 82 },
        },
      })

      const snapshots = await testPrisma.destinySnapshot.findMany({
        where: {
          userId: user.id,
          targetDate: { endsWith: '06-15' },
        },
        orderBy: { targetDate: 'asc' },
      })

      expect(snapshots).toHaveLength(2)
    })
  })

  describe('Snapshot Analytics', () => {
    it('calculates average scores across snapshots', async () => {
      const user = await createTestUserInDb()

      const scores = [70, 75, 80, 85, 90]

      for (let i = 0; i < scores.length; i++) {
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate: `2024-0${i + 1}-15`,
            data: { score: scores[i] },
          },
        })
      }

      const snapshots = await testPrisma.destinySnapshot.findMany({
        where: { userId: user.id },
      })

      const avg =
        snapshots.reduce((sum, s) => {
          const data = s.data as { score: number }
          return sum + data.score
        }, 0) / snapshots.length

      expect(avg).toBe(80)
    })

    it('finds peak and low periods', async () => {
      const user = await createTestUserInDb()

      const monthlyScores = [65, 78, 82, 55, 90, 73]

      for (let i = 0; i < monthlyScores.length; i++) {
        await testPrisma.destinySnapshot.create({
          data: {
            userId: user.id,
            targetDate: `2024-0${i + 1}-01`,
            data: { monthlyScore: monthlyScores[i] },
          },
        })
      }

      const snapshots = await testPrisma.destinySnapshot.findMany({
        where: { userId: user.id },
      })

      const scores = snapshots.map((s) => {
        const data = s.data as { monthlyScore: number }
        return { date: s.targetDate, score: data.monthlyScore }
      })

      const peak = scores.reduce((a, b) => (a.score > b.score ? a : b))
      const low = scores.reduce((a, b) => (a.score < b.score ? a : b))

      expect(peak.score).toBe(90)
      expect(low.score).toBe(55)
    })
  })
})
