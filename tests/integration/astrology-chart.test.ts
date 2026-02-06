/**
 * Astrology Chart Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 점성술 차트 저장
 * - 행성 위치 데이터
 * - 차트 분석 결과
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

describe('Integration: Astrology Chart', () => {
  if (!hasTestDb) {
    it.skip('skips when test database is unavailable', () => {})
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

  describe('Chart Creation', () => {
    it('creates natal chart', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15T14:30:00'),
          birthPlace: '서울, 대한민국',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
        },
      })

      expect(chart.chartType).toBe('natal')
      expect(chart.sunSign).toBe('taurus')
    })

    it('creates chart with planet positions', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15T14:30:00'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          planetPositions: {
            sun: { sign: 'taurus', degree: 24.5, house: 9 },
            moon: { sign: 'cancer', degree: 12.3, house: 11 },
            mercury: { sign: 'gemini', degree: 8.7, house: 10 },
            venus: { sign: 'aries', degree: 28.1, house: 8 },
            mars: { sign: 'aquarius', degree: 15.4, house: 6 },
            jupiter: { sign: 'cancer', degree: 5.2, house: 11 },
            saturn: { sign: 'capricorn', degree: 22.8, house: 5 },
          },
        },
      })

      const positions = chart.planetPositions as { sun: { sign: string } }
      expect(positions.sun.sign).toBe('taurus')
    })

    it('creates chart with house positions', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15T14:30:00'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          housePositions: {
            1: { sign: 'virgo', degree: 15.2 },
            2: { sign: 'libra', degree: 12.8 },
            3: { sign: 'scorpio', degree: 14.1 },
            4: { sign: 'sagittarius', degree: 18.5 },
            5: { sign: 'capricorn', degree: 22.3 },
            6: { sign: 'aquarius', degree: 20.7 },
            7: { sign: 'pisces', degree: 15.2 },
            8: { sign: 'aries', degree: 12.8 },
            9: { sign: 'taurus', degree: 14.1 },
            10: { sign: 'gemini', degree: 18.5 },
            11: { sign: 'cancer', degree: 22.3 },
            12: { sign: 'leo', degree: 20.7 },
          },
        },
      })

      const houses = chart.housePositions as { 1: { sign: string } }
      expect(houses[1].sign).toBe('virgo')
    })

    it('creates chart with aspects', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15T14:30:00'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          aspects: [
            { planet1: 'sun', planet2: 'moon', type: 'sextile', orb: 2.3 },
            { planet1: 'venus', planet2: 'mars', type: 'square', orb: 1.5 },
            { planet1: 'jupiter', planet2: 'saturn', type: 'opposition', orb: 3.1 },
          ],
        },
      })

      expect(chart.aspects).toHaveLength(3)
    })

    it('creates synastry chart', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user1.id,
          partnerId: user2.id,
          chartType: 'synastry',
          birthDate: new Date('1990-05-15'),
          partnerBirthDate: new Date('1992-08-20'),
          birthPlace: '서울',
          partnerBirthPlace: '부산',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          compatibilityScore: 85,
        },
      })

      expect(chart.chartType).toBe('synastry')
      expect(chart.compatibilityScore).toBe(85)
    })

    it('creates transit chart', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'transit',
          birthDate: new Date('1990-05-15'),
          transitDate: new Date(),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
        },
      })

      expect(chart.chartType).toBe('transit')
      expect(chart.transitDate).not.toBeNull()
    })
  })

  describe('Chart Retrieval', () => {
    it('retrieves charts by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const charts = await testPrisma.astrologyChart.findMany({
        where: { userId: user.id },
      })

      expect(charts).toHaveLength(5)
    })

    it('retrieves charts by type', async () => {
      const user = await createTestUserInDb()

      const types = ['natal', 'transit', 'natal', 'synastry', 'natal']

      for (const type of types) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: type,
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const natalCharts = await testPrisma.astrologyChart.findMany({
        where: { userId: user.id, chartType: 'natal' },
      })

      expect(natalCharts).toHaveLength(3)
    })

    it('retrieves charts by sun sign', async () => {
      const users: string[] = []
      const signs = ['aries', 'taurus', 'taurus', 'gemini', 'taurus']

      for (let i = 0; i < signs.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: signs[i],
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const taurusCharts = await testPrisma.astrologyChart.findMany({
        where: { userId: { in: users }, sunSign: 'taurus' },
      })

      expect(taurusCharts).toHaveLength(3)
    })

    it('retrieves recent charts first', async () => {
      const user = await createTestUserInDb()

      const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo']

      for (const sign of signs) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: sign,
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const charts = await testPrisma.astrologyChart.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(charts[0].sunSign).toBe('leo')
    })
  })

  describe('Chart Statistics', () => {
    it('counts charts by sun sign', async () => {
      const users: string[] = []
      const signs = ['aries', 'taurus', 'taurus', 'taurus', 'gemini', 'aries']

      for (let i = 0; i < signs.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: signs[i],
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const counts = await testPrisma.astrologyChart.groupBy({
        by: ['sunSign'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const taurusCount = counts.find((c) => c.sunSign === 'taurus')?._count.id
      expect(taurusCount).toBe(3)
    })

    it('counts charts by type', async () => {
      const user = await createTestUserInDb()

      const types = ['natal', 'transit', 'natal', 'synastry', 'transit', 'natal']

      for (const type of types) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: type,
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const counts = await testPrisma.astrologyChart.groupBy({
        by: ['chartType'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const natalCount = counts.find((c) => c.chartType === 'natal')?._count.id
      expect(natalCount).toBe(3)
    })

    it('finds most common moon sign', async () => {
      const users: string[] = []
      const moonSigns = ['cancer', 'leo', 'cancer', 'virgo', 'cancer', 'leo']

      for (let i = 0; i < moonSigns.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: moonSigns[i],
            ascendant: 'virgo',
          },
        })
      }

      const counts = await testPrisma.astrologyChart.groupBy({
        by: ['moonSign'],
        where: { userId: { in: users } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0].moonSign).toBe('cancer')
    })
  })

  describe('Chart Analysis', () => {
    it('stores interpretation', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          interpretation: {
            sun: '황소자리 태양은 안정과 물질적 안정을 추구합니다',
            moon: '게자리 달은 감정적이고 가정적인 성향을 나타냅니다',
            ascendant: '처녀자리 상승궁은 분석적이고 실용적인 첫인상을 줍니다',
          },
        },
      })

      const interp = chart.interpretation as { sun: string }
      expect(interp.sun).toContain('황소자리')
    })

    it('stores element balance', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          elementBalance: {
            fire: 2,
            earth: 4,
            air: 2,
            water: 2,
          },
        },
      })

      const elements = chart.elementBalance as { earth: number }
      expect(elements.earth).toBe(4)
    })

    it('stores modality balance', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          modalityBalance: {
            cardinal: 3,
            fixed: 4,
            mutable: 3,
          },
        },
      })

      const modality = chart.modalityBalance as { fixed: number }
      expect(modality.fixed).toBe(4)
    })
  })

  describe('Chart Updates', () => {
    it('updates interpretation', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          interpretation: { summary: '원래 해석' },
        },
      })

      const updated = await testPrisma.astrologyChart.update({
        where: { id: chart.id },
        data: { interpretation: { summary: '수정된 해석' } },
      })

      const interp = updated.interpretation as { summary: string }
      expect(interp.summary).toBe('수정된 해석')
    })

    it('marks as favorite', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
          isFavorite: false,
        },
      })

      const updated = await testPrisma.astrologyChart.update({
        where: { id: chart.id },
        data: { isFavorite: true },
      })

      expect(updated.isFavorite).toBe(true)
    })
  })

  describe('Chart Deletion', () => {
    it('deletes chart', async () => {
      const user = await createTestUserInDb()

      const chart = await testPrisma.astrologyChart.create({
        data: {
          userId: user.id,
          chartType: 'natal',
          birthDate: new Date('1990-05-15'),
          birthPlace: '서울',
          latitude: 37.5665,
          longitude: 126.978,
          sunSign: 'taurus',
          moonSign: 'cancer',
          ascendant: 'virgo',
        },
      })

      await testPrisma.astrologyChart.delete({
        where: { id: chart.id },
      })

      const found = await testPrisma.astrologyChart.findUnique({
        where: { id: chart.id },
      })

      expect(found).toBeNull()
    })

    it('deletes old transit charts', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old transit charts
      for (let i = 0; i < 3; i++) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'transit',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: 'cancer',
            ascendant: 'virgo',
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent charts
      for (let i = 0; i < 2; i++) {
        await testPrisma.astrologyChart.create({
          data: {
            userId: user.id,
            chartType: 'natal',
            birthDate: new Date('1990-05-15'),
            birthPlace: '서울',
            latitude: 37.5665,
            longitude: 126.978,
            sunSign: 'taurus',
            moonSign: 'cancer',
            ascendant: 'virgo',
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.astrologyChart.deleteMany({
        where: {
          userId: user.id,
          chartType: 'transit',
          createdAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.astrologyChart.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
