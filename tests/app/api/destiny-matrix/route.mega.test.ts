// tests/app/api/destiny-matrix/route.mega.test.ts
// Comprehensive tests for Destiny Fusion Matrix API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/destiny-matrix/route'

// Mock dependencies
vi.mock('@/lib/destiny-matrix', () => ({
  calculateDestinyMatrix: vi.fn(),
}))

vi.mock('@/lib/Saju/saju', () => ({
  calculateSajuData: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import { calculateSajuData } from '@/lib/Saju/saju'
import { logger } from '@/lib/logger'

describe('GET /api/destiny-matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return summary metadata for default format', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Destiny Fusion Matrix™')
    expect(data.version).toBe('2.0')
    expect(data.copyright).toContain('2024')
    expect(data.layers).toHaveLength(10)
    expect(data.totalCells).toBe(1206)
    expect(data.interactionLevels).toHaveLength(5)
    expect(data.notice).toContain('proprietary')
  })

  it('should return summary metadata for ?format=summary', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix?format=summary', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Destiny Fusion Matrix™')
    expect(data.layers).toHaveLength(10)
  })

  it('should return summary metadata for ?format=full', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix?format=full', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Destiny Fusion Matrix™')
    expect(data.layers).toHaveLength(10)
  })

  it('should reject invalid format parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix?format=raw', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod enum validation rejects 'raw' before reaching the old code path
    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
    expect(data.details).toBeDefined()
  })

  it('should handle errors in GET', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
      method: 'GET',
    })

    // Mock logger error to throw
    vi.mocked(logger.error).mockImplementation(() => {
      // Just track the call
    })

    // Test error handling by checking it doesn't crash
    const response = await GET(req)

    // Should return successfully even if there's an internal issue
    expect(response.status).toBe(200)
  })

  it('should include all 10 layers with correct cell counts', async () => {
    const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(data.layers[0]).toEqual({
      layer: 1,
      name: 'Element Core Grid',
      nameKo: '기운핵심격자',
      cells: 20,
    })
    expect(data.layers[9]).toEqual({
      layer: 10,
      name: 'ExtraPoint-Element Matrix',
      nameKo: '엑스트라포인트 매트릭스',
      cells: 90,
    })
  })
})

describe('POST /api/destiny-matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for calculateDestinyMatrix
    vi.mocked(calculateDestinyMatrix).mockReturnValue({
      layer1_elementCore: { 'wood-fire': { interaction: { keyword: 'Growth', score: 8 } } },
      layer2_sibsinPlanet: { 'sipjae-venus': { interaction: { keyword: 'Wealth', score: 7 } } },
      layer3_sibsinHouse: {},
      layer4_timing: {},
      layer5_relationAspect: {},
      layer6_stageHouse: {},
      layer7_advanced: {},
      layer8_shinsalPlanet: {},
      layer9_asteroidHouse: {},
      layer10_extraPointElement: {},
      summary: {
        totalScore: 85,
        strengthPoints: [
          {
            layer: 'Layer 1',
            cell: { interaction: { keyword: 'Growth', score: 8 } },
            match: 'wood-fire',
          },
          {
            layer: 'Layer 2',
            cell: { interaction: { keyword: 'Wealth', score: 7 } },
            match: 'sipjae-venus',
          },
        ],
        cautionPoints: [],
        topSynergies: ['Excellent timing for growth', 'Wealth opportunities present'],
      },
    } as never)
  })

  describe('Legacy direct input mode', () => {
    it('should calculate matrix with dayMasterElement provided', async () => {
      const body = {
        dayMasterElement: '목',
        pillarElements: ['목', '화', '토', '금'],
        sibsinDistribution: { 비겁: 2, 식상: 1 },
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.totalScore).toBe(85)
      expect(data.summary.cellsMatched).toBe(2)
      expect(data.highlights.strengths).toHaveLength(2)
      expect(data.copyright).toContain('Destiny Fusion Matrix™')
    })

    it('should reject English element names (Zod only accepts Korean)', async () => {
      const body = {
        dayMasterElement: 'wood',
        pillarElements: ['wood', 'fire', 'earth', 'metal', 'water'],
        lang: 'en',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      // fiveElementSchema = z.enum(['목','화','토','금','수']) rejects English names
      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should include all 10 layers in calculation', async () => {
      // Use valid schema-compliant data:
      // - twelveStages keys must be 'year'|'month'|'day'|'time', values are twelve stage names
      // - planetSigns values must match zodiacSignSchema (capitalized: 'Aries', not 'aries')
      // - aspects must match aspectHitSchema (from/to/type/orb)
      // - activeTransits must match transitAspectSchema (transitPlanet/natalPlanet/aspectType/orb)
      // - extraPointSigns values must match zodiacSignSchema
      const body = {
        dayMasterElement: '목',
        pillarElements: ['목', '화', '토', '금'],
        sibsinDistribution: { 비겁: 2 },
        twelveStages: { year: '장생', month: '관대', day: '왕지', time: '쇠' },
        relations: ['형'],
        geokguk: '신왕격',
        yongsin: ['화', '토'],
        currentDaeunElement: '화',
        currentSaeunElement: '토',
        shinsalList: ['천을귀인'],
        dominantWesternElement: 'fire',
        planetHouses: { sun: 1 },
        planetSigns: { sun: 'Aries' },
        aspects: [{
          from: { name: 'Sun', kind: 'natal', longitude: 0 },
          to: { name: 'Moon', kind: 'natal', longitude: 90 },
          type: 'conjunction',
          orb: 0,
        }],
        activeTransits: [{
          transitPlanet: 'jupiter',
          natalPlanet: 'sun',
          aspectType: 'trine',
          orb: 2,
        }],
        asteroidHouses: { chiron: 12 },
        extraPointSigns: { north_node: 'Leo' },
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Route passes yongsin?.[0] (first element), and includes lang
      expect(calculateDestinyMatrix).toHaveBeenCalledWith(
        expect.objectContaining({
          dayMasterElement: '목',
          pillarElements: ['목', '화', '토', '금'],
          sibsinDistribution: { 비겁: 2 },
          twelveStages: { year: '장생', month: '관대', day: '왕지', time: '쇠' },
          relations: ['형'],
          geokguk: '신왕격',
          yongsin: '화',
          currentDaeunElement: '화',
          currentSaeunElement: '토',
          shinsalList: ['천을귀인'],
          dominantWesternElement: 'fire',
          planetHouses: { sun: 1 },
          planetSigns: { sun: 'Aries' },
          aspects: [{
            from: { name: 'Sun', kind: 'natal', longitude: 0 },
            to: { name: 'Moon', kind: 'natal', longitude: 90 },
            type: 'conjunction',
            orb: 0,
          }],
          activeTransits: [{
            transitPlanet: 'jupiter',
            natalPlanet: 'sun',
            aspectType: 'trine',
            orb: 2,
          }],
          asteroidHouses: { chiron: 12 },
          extraPointSigns: { north_node: 'Leo' },
          lang: 'ko',
        })
      )
    })
  })

  describe('Automatic Saju calculation mode', () => {
    beforeEach(() => {
      vi.mocked(calculateSajuData).mockReturnValue({
        yearPillar: {
          heavenlyStem: { name: '갑', element: '목', sibsin: '비견' },
          earthlyBranch: { name: '자', element: '수', sibsin: '편인' },
        },
        monthPillar: {
          heavenlyStem: { name: '병', element: '화', sibsin: '식신' },
          earthlyBranch: { name: '인', element: '목', sibsin: '비견' },
        },
        dayPillar: {
          heavenlyStem: { name: '갑', element: '목', sibsin: '비견' },
          earthlyBranch: { name: '오', element: '화', sibsin: '식신' },
        },
        timePillar: {
          heavenlyStem: { name: '무', element: '토', sibsin: '상관' },
          earthlyBranch: { name: '신', element: '금', sibsin: '편재' },
        },
      } as never)
    })

    it('should calculate saju from birthDate', async () => {
      const body = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        gender: 'male',
        timezone: 'Asia/Seoul',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(calculateSajuData).toHaveBeenCalledWith(
        '1990-05-15',
        '14:30',
        'male',
        'solar',
        'Asia/Seoul'
      )
      expect(data.success).toBe(true)
    })

    it('should use default birthTime and gender when not provided', async () => {
      const body = {
        birthDate: '1990-05-15',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(calculateSajuData).toHaveBeenCalledWith(
        '1990-05-15',
        '12:00', // default
        'male', // default
        'solar',
        'Asia/Seoul' // default
      )
    })

    it('should extract day master element from saju', async () => {
      const body = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        gender: 'male',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      expect(call[0].dayMasterElement).toBe('목') // From day pillar
    })

    it('should extract pillar elements from saju', async () => {
      const body = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        gender: 'female',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      expect(call[0].pillarElements).toEqual(['목', '수', '화', '목', '목', '화', '토', '금'])
    })

    it('should build sibsin distribution from saju', async () => {
      const body = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        gender: 'male',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      expect(call[0].sibsinDistribution).toEqual({
        비견: 3,
        편인: 1,
        식신: 2,
        상관: 1,
        편재: 1,
      })
    })

    it('should handle saju calculation failure', async () => {
      vi.mocked(calculateSajuData).mockImplementation(() => {
        throw new Error('Invalid date')
      })

      // Use a valid date format so Zod passes but saju calculation throws
      const body = {
        birthDate: '1990-05-15',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to calculate saju from birth data')
      expect(logger.error).toHaveBeenCalledWith('Saju calculation failed:', expect.any(Error))
    })

    it('should handle missing element in saju data', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        yearPillar: {
          heavenlyStem: { name: '갑', element: undefined, sibsin: '비견' },
          earthlyBranch: { name: '자', element: '수', sibsin: '편인' },
        },
        monthPillar: {
          heavenlyStem: { name: '병', element: '화', sibsin: '식신' },
          earthlyBranch: { name: '인', element: '목', sibsin: '비견' },
        },
        dayPillar: {
          heavenlyStem: { name: '갑', element: '목', sibsin: '비견' },
          earthlyBranch: { name: '오', element: '화', sibsin: '식신' },
        },
        timePillar: {
          heavenlyStem: { name: '무', element: '토', sibsin: '상관' },
          earthlyBranch: { name: '신', element: '금', sibsin: '편재' },
        },
      } as never)

      const body = {
        birthDate: '1990-05-15',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      // Should filter out undefined elements
      expect(call[0].pillarElements).toHaveLength(7) // 8 - 1 undefined
    })

    it('should handle missing sibsin in saju data', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        yearPillar: {
          heavenlyStem: { name: '갑', element: '목', sibsin: undefined },
          earthlyBranch: { name: '자', element: '수', sibsin: '편인' },
        },
        monthPillar: {
          heavenlyStem: { name: '병', element: '화', sibsin: '식신' },
          earthlyBranch: { name: '인', element: '목', sibsin: '비견' },
        },
        dayPillar: {
          heavenlyStem: { name: '갑', element: '목', sibsin: '비견' },
          earthlyBranch: { name: '오', element: '화', sibsin: '식신' },
        },
        timePillar: {
          heavenlyStem: { name: '무', element: '토', sibsin: '상관' },
          earthlyBranch: { name: '신', element: '금', sibsin: '편재' },
        },
      } as never)

      const body = {
        birthDate: '1990-05-15',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      // Should not count undefined sibsin
      expect(call[0].sibsinDistribution).toEqual({
        편인: 1,
        식신: 2,
        비견: 2,
        상관: 1,
        편재: 1,
      })
    })
  })

  describe('Input validation', () => {
    it('should reject missing dayMasterElement when birthDate not provided', async () => {
      const body = {
        pillarElements: ['목', '화'],
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      // Zod .refine() handles this validation with 'validation_failed' error
      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      // The Zod refine message is in the details
      expect(data.details).toBeDefined()
    })

    it('should reject invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to calculate matrix')
      expect(logger.error).toHaveBeenCalledWith('Destiny Matrix POST error:', expect.any(Error))
    })
  })

  describe('Response format', () => {
    it('should include summary with correct structure', async () => {
      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.summary).toEqual({
        totalScore: 85,
        layersProcessed: 2,
        cellsMatched: 2,
        strengthCount: 2,
        cautionCount: 0,
      })
    })

    it('should limit highlights to top 3 strengths and cautions', async () => {
      vi.mocked(calculateDestinyMatrix).mockReturnValue({
        layer1_elementCore: { 'wood-fire': { interaction: { keyword: 'Growth', score: 8 } } },
        layer2_sibsinPlanet: {},
        layer3_sibsinHouse: {},
        layer4_timing: {},
        layer5_relationAspect: {},
        layer6_stageHouse: {},
        layer7_advanced: {},
        layer8_shinsalPlanet: {},
        layer9_asteroidHouse: {},
        layer10_extraPointElement: {},
        summary: {
          totalScore: 70,
          strengthPoints: [
            { layer: 'L1', cell: { interaction: { keyword: 'S1', score: 9 } }, match: 'm1' },
            { layer: 'L2', cell: { interaction: { keyword: 'S2', score: 8 } }, match: 'm2' },
            { layer: 'L3', cell: { interaction: { keyword: 'S3', score: 8 } }, match: 'm3' },
            { layer: 'L4', cell: { interaction: { keyword: 'S4', score: 7 } }, match: 'm4' },
            { layer: 'L5', cell: { interaction: { keyword: 'S5', score: 7 } }, match: 'm5' },
          ],
          cautionPoints: [
            { layer: 'L6', cell: { interaction: { keyword: 'C1', score: 3 } }, match: 'm6' },
            { layer: 'L7', cell: { interaction: { keyword: 'C2', score: 2 } }, match: 'm7' },
            { layer: 'L8', cell: { interaction: { keyword: 'C3', score: 2 } }, match: 'm8' },
            { layer: 'L9', cell: { interaction: { keyword: 'C4', score: 1 } }, match: 'm9' },
          ],
          topSynergies: [],
        },
      } as never)

      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.highlights.strengths).toHaveLength(3)
      expect(data.highlights.cautions).toHaveLength(3)
      expect(data.highlights.strengths[0].keyword).toBe('S1')
      expect(data.highlights.cautions[0].keyword).toBe('C1')
    })

    it('should limit synergies to top 3', async () => {
      vi.mocked(calculateDestinyMatrix).mockReturnValue({
        layer1_elementCore: {},
        layer2_sibsinPlanet: {},
        layer3_sibsinHouse: {},
        layer4_timing: {},
        layer5_relationAspect: {},
        layer6_stageHouse: {},
        layer7_advanced: {},
        layer8_shinsalPlanet: {},
        layer9_asteroidHouse: {},
        layer10_extraPointElement: {},
        summary: {
          totalScore: 80,
          strengthPoints: [],
          cautionPoints: [],
          topSynergies: ['Syn1', 'Syn2', 'Syn3', 'Syn4', 'Syn5'],
        },
      } as never)

      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.synergies).toHaveLength(3)
      expect(data.synergies).toEqual(['Syn1', 'Syn2', 'Syn3'])
    })

    it('should handle empty strengthPoints and cautionPoints', async () => {
      vi.mocked(calculateDestinyMatrix).mockReturnValue({
        layer1_elementCore: {},
        layer2_sibsinPlanet: {},
        layer3_sibsinHouse: {},
        layer4_timing: {},
        layer5_relationAspect: {},
        layer6_stageHouse: {},
        layer7_advanced: {},
        layer8_shinsalPlanet: {},
        layer9_asteroidHouse: {},
        layer10_extraPointElement: {},
        summary: {
          totalScore: 50,
          strengthPoints: undefined,
          cautionPoints: undefined,
          topSynergies: undefined,
        },
      } as never)

      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.summary.strengthCount).toBe(0)
      expect(data.summary.cautionCount).toBe(0)
      expect(data.highlights.strengths).toBeUndefined()
      expect(data.highlights.cautions).toBeUndefined()
      expect(data.synergies).toBeUndefined()
    })

    it('should count cells per layer', async () => {
      vi.mocked(calculateDestinyMatrix).mockReturnValue({
        layer1_elementCore: { a: {}, b: {} },
        layer2_sibsinPlanet: { c: {} },
        layer3_sibsinHouse: { d: {}, e: {}, f: {} },
        layer4_timing: {},
        layer5_relationAspect: { g: {} },
        layer6_stageHouse: {},
        layer7_advanced: {},
        layer8_shinsalPlanet: { h: {} },
        layer9_asteroidHouse: {},
        layer10_extraPointElement: { i: {}, j: {} },
        summary: {
          totalScore: 75,
          strengthPoints: [],
          cautionPoints: [],
          topSynergies: [],
        },
      } as never)

      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.summary.cellsMatched).toBe(10) // 2+1+3+0+1+0+0+1+0+2
      expect(data.summary.layersProcessed).toBe(6) // Layers with >0 cells
    })
  })

  describe('Error handling', () => {
    it('should handle matrix calculation errors', async () => {
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw new Error('Matrix calculation failed')
      })

      const body = {
        dayMasterElement: '목',
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to calculate matrix')
      expect(logger.error).toHaveBeenCalledWith('Destiny Matrix POST error:', expect.any(Error))
    })
  })

  describe('Element mapping', () => {
    it('should reject English element names (Zod only accepts Korean)', async () => {
      const body = {
        dayMasterElement: 'water',
        pillarElements: ['wood', 'fire', 'earth', 'metal', 'water'],
        lang: 'en',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      // fiveElementSchema only accepts Korean names
      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should keep Korean elements unchanged', async () => {
      const body = {
        dayMasterElement: '수',
        pillarElements: ['목', '화', '토', '금', '수'],
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      const call = vi.mocked(calculateDestinyMatrix).mock.calls[0]
      expect(call[0].dayMasterElement).toBe('수')
      expect(call[0].pillarElements).toEqual(['목', '화', '토', '금', '수'])
    })

    it('should reject unknown element names via Zod validation', async () => {
      const body = {
        dayMasterElement: 'unknown',
        pillarElements: ['unknown1', '목', 'unknown2'],
        lang: 'ko',
      }

      const req = new NextRequest('http://localhost:3000/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      // fiveElementSchema rejects unknown element names
      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })
})
