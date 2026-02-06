/**
 * Compatibility Analysis Integration Tests
 * Tests the full compatibility analysis pipeline end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'
import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeComprehensiveCompatibility } from '@/lib/Saju/compatibility'
import { calculateCosmicCompatibility } from '@/lib/compatibility/cosmicCompatibility'

const toCompatibilitySubject = (id: string, saju: ReturnType<typeof calculateSajuData>) => ({
  id,
  pillars: saju.pillars,
})

const toSajuProfile = (saju: ReturnType<typeof calculateSajuData>) => ({
  dayMaster: {
    element: saju.dayMaster.element,
    yin_yang: saju.dayMaster.yin_yang === 'Н-`' ? 'yang' : 'yin',
    name: saju.dayMaster.name,
  },
  pillars: {
    year: {
      stem: saju.pillars.year.heavenlyStem.name,
      branch: saju.pillars.year.earthlyBranch.name,
    },
    month: {
      stem: saju.pillars.month.heavenlyStem.name,
      branch: saju.pillars.month.earthlyBranch.name,
    },
    day: {
      stem: saju.pillars.day.heavenlyStem.name,
      branch: saju.pillars.day.earthlyBranch.name,
    },
    time: {
      stem: saju.pillars.time.heavenlyStem.name,
      branch: saju.pillars.time.earthlyBranch.name,
    },
  },
  elements: saju.fiveElements,
})

const hasTestDb = await checkTestDbConnection()

describe('Compatibility Analysis Integration', () => {
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

  describe('Saju Compatibility Analysis', () => {
    it('should analyze compatibility between two users', async () => {
      const user1 = await createTestUserInDb({
        birthDate: '1990-05-15',
        birthTime: '14:30',
        gender: 'male',
      })

      const user2 = await createTestUserInDb({
        birthDate: '1992-08-20',
        birthTime: '10:15',
        gender: 'female',
      })

      const saju1 = calculateSajuData('1990-05-15', '14:30', 'male', 'solar', 'Asia/Seoul')

      const saju2 = calculateSajuData('1992-08-20', '10:15', 'female', 'solar', 'Asia/Seoul')

      const compatibility = analyzeComprehensiveCompatibility(
        toCompatibilitySubject(user1.id, saju1),
        toCompatibilitySubject(user2.id, saju2)
      )

      expect(compatibility).toBeDefined()
      expect(compatibility.overallScore).toBeGreaterThanOrEqual(0)
      expect(compatibility.overallScore).toBeLessThanOrEqual(100)
      expect(compatibility.categoryScores.length).toBeGreaterThan(0)
    })

    it('should give high compatibility score for same birth data', async () => {
      const saju1 = calculateSajuData('1995-06-10', '15:30', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1995-06-10', '15:30', 'male', 'solar', 'Asia/Seoul')

      const compatibility = analyzeComprehensiveCompatibility(
        toCompatibilitySubject('same-1', saju1),
        toCompatibilitySubject('same-2', saju2)
      )

      expect(compatibility.overallScore).toBeGreaterThan(50)
    })

    it('should analyze multiple compatibility types', async () => {
      const saju1 = calculateSajuData('1988-03-12', '09:00', 'female', 'solar', 'Asia/Seoul')

      const saju2 = calculateSajuData('1990-07-25', '16:45', 'male', 'solar', 'Asia/Seoul')

      const compatibility = analyzeComprehensiveCompatibility(
        toCompatibilitySubject('user-1', saju1),
        toCompatibilitySubject('user-2', saju2)
      )

      expect(compatibility.categoryScores.length).toBeGreaterThan(0)
    })
  })

  describe('Cosmic Compatibility Analysis', () => {
    it('should perform cosmic compatibility analysis', async () => {
      const saju1 = calculateSajuData('1990-05-15', '14:30', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1992-08-20', '10:15', 'female', 'solar', 'Asia/Seoul')
      const profile1 = {
        sun: { sign: 'Aries', element: 'fire' },
        moon: { sign: 'Taurus', element: 'earth' },
        venus: { sign: 'Gemini', element: 'air' },
        mars: { sign: 'Leo', element: 'fire' },
        ascendant: { sign: 'Libra', element: 'air' },
      }

      const profile2 = {
        sun: { sign: 'Leo', element: 'fire' },
        moon: { sign: 'Virgo', element: 'earth' },
        venus: { sign: 'Cancer', element: 'water' },
        mars: { sign: 'Sagittarius', element: 'fire' },
        ascendant: { sign: 'Scorpio', element: 'water' },
      }

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju1),
        profile1,
        toSajuProfile(saju2),
        profile2
      )

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.details.astrologyAnalysis.sunMoonHarmony).toBeDefined()
      expect(result.details.astrologyAnalysis.venusMarsSynergy).toBeDefined()
      expect(result.details.astrologyAnalysis.elementalAlignment).toBeDefined()
    })

    it('should detect fire sign compatibility', async () => {
      const saju1 = calculateSajuData('1991-04-02', '08:00', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1991-11-12', '21:30', 'female', 'solar', 'Asia/Seoul')
      const fireProfile1 = {
        sun: { sign: 'Aries', element: 'fire' },
        moon: { sign: 'Leo', element: 'fire' },
        venus: { sign: 'Sagittarius', element: 'fire' },
        mars: { sign: 'Aries', element: 'fire' },
        ascendant: { sign: 'Leo', element: 'fire' },
      }

      const fireProfile2 = {
        sun: { sign: 'Leo', element: 'fire' },
        moon: { sign: 'Sagittarius', element: 'fire' },
        venus: { sign: 'Aries', element: 'fire' },
        mars: { sign: 'Leo', element: 'fire' },
        ascendant: { sign: 'Sagittarius', element: 'fire' },
      }

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju1),
        fireProfile1,
        toSajuProfile(saju2),
        fireProfile2
      )

      expect(result.overallScore).toBeGreaterThan(70)
      expect(result.details.astrologyAnalysis.sunMoonHarmony).toBeGreaterThan(50)
    })

    it('should detect water sign compatibility', async () => {
      const saju1 = calculateSajuData('1989-02-18', '06:30', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1989-09-05', '19:45', 'female', 'solar', 'Asia/Seoul')
      const waterProfile1 = {
        sun: { sign: 'Cancer', element: 'water' },
        moon: { sign: 'Scorpio', element: 'water' },
        venus: { sign: 'Pisces', element: 'water' },
        mars: { sign: 'Cancer', element: 'water' },
        ascendant: { sign: 'Scorpio', element: 'water' },
      }

      const waterProfile2 = {
        sun: { sign: 'Pisces', element: 'water' },
        moon: { sign: 'Cancer', element: 'water' },
        venus: { sign: 'Scorpio', element: 'water' },
        mars: { sign: 'Pisces', element: 'water' },
        ascendant: { sign: 'Cancer', element: 'water' },
      }

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju1),
        waterProfile1,
        toSajuProfile(saju2),
        waterProfile2
      )

      expect(result.overallScore).toBeGreaterThan(70)
    })
  })

  describe('Compatibility Data Persistence', () => {
    it('should save compatibility analysis results', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const compatibilityData = {
        overallScore: 85,
        categories: {
          emotional: 90,
          intellectual: 80,
          physical: 85,
        },
      }

      const reading = await testPrisma.reading.create({
        data: {
          userId: user1.id,
          type: 'compatibility',
          content: JSON.stringify({
            partnerId: user2.id,
            ...compatibilityData,
          }),
        },
      })

      expect(reading).toBeDefined()
      expect(reading.type).toBe('compatibility')

      const retrieved = await testPrisma.reading.findFirst({
        where: { userId: user1.id, type: 'compatibility' },
      })

      expect(retrieved).toBeDefined()
      const parsedResult = JSON.parse(retrieved?.content as string)
      expect(parsedResult.overallScore).toBe(85)
      expect(parsedResult.partnerId).toBe(user2.id)
    })

    it('should track compatibility history between users', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      // First analysis
      await testPrisma.reading.create({
        data: {
          userId: user1.id,
          type: 'compatibility',
          content: JSON.stringify({ partnerId: user2.id, score: 85 }),
        },
      })

      // Second analysis (re-analysis)
      await testPrisma.reading.create({
        data: {
          userId: user1.id,
          type: 'compatibility',
          content: JSON.stringify({ partnerId: user2.id, score: 87 }),
        },
      })

      const history = await testPrisma.reading.findMany({
        where: { userId: user1.id, type: 'compatibility' },
        orderBy: { createdAt: 'desc' },
      })

      expect(history.length).toBe(2)
      const latestScore = JSON.parse(history[0].content as string).score
      expect(latestScore).toBe(87)
    })
  })

  describe('Compatibility Edge Cases', () => {
    it('should handle opposite elements compatibility', async () => {
      const fireProfile = {
        sun: { sign: 'Aries', element: 'fire' },
        moon: { sign: 'Leo', element: 'fire' },
        venus: { sign: 'Sagittarius', element: 'fire' },
        mars: { sign: 'Aries', element: 'fire' },
        ascendant: { sign: 'Leo', element: 'fire' },
      }

      const waterProfile = {
        sun: { sign: 'Cancer', element: 'water' },
        moon: { sign: 'Scorpio', element: 'water' },
        venus: { sign: 'Pisces', element: 'water' },
        mars: { sign: 'Cancer', element: 'water' },
        ascendant: { sign: 'Scorpio', element: 'water' },
      }

      const saju1 = calculateSajuData('1993-03-03', '11:15', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1994-08-22', '17:45', 'female', 'solar', 'Asia/Seoul')

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju1),
        fireProfile,
        toSajuProfile(saju2),
        waterProfile
      )

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })

    it('should handle same sign compatibility', async () => {
      const sameSignProfile = {
        sun: { sign: 'Taurus', element: 'earth' },
        moon: { sign: 'Taurus', element: 'earth' },
        venus: { sign: 'Taurus', element: 'earth' },
        mars: { sign: 'Taurus', element: 'earth' },
        ascendant: { sign: 'Taurus', element: 'earth' },
      }

      const saju = calculateSajuData('1996-12-10', '09:45', 'male', 'solar', 'Asia/Seoul')

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju),
        sameSignProfile,
        toSajuProfile(saju),
        sameSignProfile
      )

      expect(result.overallScore).toBeGreaterThan(70)
    })

    it('should validate compatibility score ranges', async () => {
      const profile1 = {
        sun: { sign: 'Gemini', element: 'air' },
        moon: { sign: 'Aquarius', element: 'air' },
        venus: { sign: 'Libra', element: 'air' },
        mars: { sign: 'Gemini', element: 'air' },
        ascendant: { sign: 'Aquarius', element: 'air' },
      }

      const profile2 = {
        sun: { sign: 'Libra', element: 'air' },
        moon: { sign: 'Gemini', element: 'air' },
        venus: { sign: 'Aquarius', element: 'air' },
        mars: { sign: 'Libra', element: 'air' },
        ascendant: { sign: 'Gemini', element: 'air' },
      }

      const saju1 = calculateSajuData('1987-07-08', '05:20', 'male', 'solar', 'Asia/Seoul')
      const saju2 = calculateSajuData('1987-12-19', '22:10', 'female', 'solar', 'Asia/Seoul')

      const result = calculateCosmicCompatibility(
        toSajuProfile(saju1),
        profile1,
        toSajuProfile(saju2),
        profile2
      )

      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.details.astrologyAnalysis.sunMoonHarmony).toBeGreaterThanOrEqual(0)
      expect(result.details.astrologyAnalysis.sunMoonHarmony).toBeLessThanOrEqual(100)
    })
  })
})
