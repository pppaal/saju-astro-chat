import { describe, expect, it } from 'vitest'
import { buildGraphRAGEvidence, summarizeGraphRAGEvidence } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'

type TestCity = {
  city: string
  latitude: number
  longitude: number
  timezone: string
}

const cities: TestCity[] = [
  { city: 'Seoul', latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' },
  { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { city: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { city: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { city: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
]

describe('graphRagEvidence 20-case regression', () => {
  it('keeps angle/orb + saju cross evidence deterministic across 20 birth profiles', () => {
    const report = {
      overallScore: { total: 83, grade: 'A' },
      topInsights: [
        {
          id: 'I1',
          domain: 'career',
          title: 'Career momentum',
          score: 87,
          weightedScore: 84,
          sources: [
            {
              layer: 5,
              key: 'career_pair',
              contribution: 0.42,
              sajuFactor: 'gwan-energy',
              astroFactor: 'Sun-Jupiter trine',
            },
          ],
        },
      ],
    } as any

    for (let i = 0; i < 20; i++) {
      const c = cities[i % cities.length]
      const input = {
        dayMasterElement: 'Wood',
        pillarElements: ['Wood', 'Fire', 'Earth'],
        sibsinDistribution: { gwan: 30, jae: 20, sik: 10 },
        twelveStages: {},
        relations: [{ kind: 'chung', detail: 'deterministic-case' }],
        geokguk: 'jeonggwan',
        yongsin: 'Fire',
        currentDaeunElement: i % 2 === 0 ? 'Metal' : 'Water',
        currentSaeunElement: i % 2 === 0 ? 'Fire' : 'Earth',
        dominantWesternElement: 'Fire',
        planetHouses: { Sun: 1, Moon: 7, Jupiter: 10, Venus: 5, Mars: 8 },
        planetSigns: { Sun: '양자리', Moon: '게자리' },
        aspects: [
          { planet1: 'Sun', planet2: 'Jupiter', type: 'trine', angle: 120, orb: 1.4 },
          { planet1: 'Venus', planet2: 'Mars', type: 'square', angle: 90, orb: 2.1 },
          { planet1: 'Sun', planet2: 'Moon', type: 'conjunction', angle: 0, orb: 0.7 },
        ],
        activeTransits: ['saturnReturn', 'mercuryRetrograde'],
        lang: i % 2 === 0 ? 'ko' : 'en',
        profileContext: {
          birthDate: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
          birthTime: `${String(i % 24).padStart(2, '0')}:30`,
          birthCity: c.city,
          timezone: c.timezone,
          latitude: c.latitude,
          longitude: c.longitude,
          analysisAt: new Date(Date.UTC(2026, 1, 1 + i)).toISOString(),
        },
      } as any

      const mode = i % 3 === 0 ? 'timing' : i % 3 === 1 ? 'themed' : 'comprehensive'
      const evidence = buildGraphRAGEvidence(input, report, {
        mode,
        period: 'monthly',
        theme: 'career',
      } as any)

      expect(evidence.anchors.length, `case-${i + 1}`).toBeGreaterThan(0)
      const first = evidence.anchors[0]
      expect(first.sajuEvidence, `case-${i + 1}`).toContain('birthDate=')
      expect(first.crossEvidenceSets.length, `case-${i + 1}`).toBeGreaterThanOrEqual(2)
      const allSets = evidence.anchors.flatMap((anchor) => anchor.crossEvidenceSets || [])
      expect(
        allSets.some((set) => /angle=/.test(set.astrologyEvidence)),
        `case-${i + 1}`
      ).toBe(true)
      expect(
        allSets.some((set) => /orb=/.test(set.astrologyEvidence)),
        `case-${i + 1}`
      ).toBe(true)
      expect(allSets.some((set) => set.id.startsWith('T')), `case-${i + 1}`).toBe(true)

      const summary = summarizeGraphRAGEvidence(evidence)
      expect(summary, `case-${i + 1}`).not.toBeNull()
      expect(summary?.totalAnchors, `case-${i + 1}`).toBe(evidence.anchors.length)
      expect(summary?.totalSets, `case-${i + 1}`).toBeGreaterThan(0)
    }
  })
})
