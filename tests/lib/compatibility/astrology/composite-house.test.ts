import { describe, it, expect } from 'vitest'
import {
  analyzeCompositeChart,
  analyzeHouseOverlays,
  type CompositeChartAnalysis,
  type HouseOverlayAnalysis,
} from '@/lib/compatibility/astrology/composite-house'
import type { AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'

// Helper to create minimal astrology profile
function createProfile(
  sunElement: string,
  moonElement: string,
  venusElement: string = 'fire'
): AstrologyProfile {
  return {
    sun: { sign: 'Aries', element: sunElement, quality: 'cardinal', position: 'Aries 15°' },
    moon: { sign: 'Taurus', element: moonElement, quality: 'fixed', position: 'Taurus 15°' },
    venus: { sign: 'Gemini', element: venusElement, quality: 'mutable', position: 'Gemini 15°' },
    mars: { sign: 'Cancer', element: 'water', quality: 'cardinal', position: 'Cancer 15°' },
    mercury: { sign: 'Leo', element: 'fire', quality: 'fixed', position: 'Leo 15°' },
    jupiter: { sign: 'Virgo', element: 'earth', quality: 'mutable', position: 'Virgo 15°' },
    saturn: { sign: 'Libra', element: 'air', quality: 'cardinal', position: 'Libra 15°' },
    uranus: { sign: 'Scorpio', element: 'water', quality: 'fixed', position: 'Scorpio 15°' },
    neptune: {
      sign: 'Sagittarius',
      element: 'fire',
      quality: 'mutable',
      position: 'Sagittarius 15°',
    },
    pluto: { sign: 'Capricorn', element: 'earth', quality: 'cardinal', position: 'Capricorn 15°' },
    ascendant: { sign: 'Aquarius', element: 'air', quality: 'fixed', position: 'Aquarius 15°' },
  } as AstrologyProfile
}

describe('Composite Chart and House Analysis', () => {
  describe('analyzeCompositeChart()', () => {
    describe('Fire Element Dominant', () => {
      it('should identify fire-dominant relationship purpose', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'fire')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toContain('열정')
        expect(result.relationshipPurpose).toContain('창조성')
      })

      it('should identify fire-dominant core theme', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.coreTheme).toContain('모험')
      })

      it('should include fire-related strengths', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'fire')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.strengths).toBeDefined()
        expect(result.strengths.length).toBeGreaterThan(0)
        expect(result.strengths.some((s) => s.includes('도전'))).toBe(true)
      })

      it('should include fire-related growth areas', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'fire')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.growthAreas).toBeDefined()
        expect(result.growthAreas.length).toBeGreaterThan(0)
        expect(result.growthAreas.some((g) => g.includes('인내'))).toBe(true)
      })
    })

    describe('Earth Element Dominant', () => {
      it('should identify earth-dominant relationship purpose', () => {
        const p1 = createProfile('earth', 'earth')
        const p2 = createProfile('earth', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toContain('안정성')
        expect(result.relationshipPurpose).toContain('실질적')
      })

      it('should identify earth-dominant core theme', () => {
        const p1 = createProfile('earth', 'earth')
        const p2 = createProfile('earth', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.coreTheme).toContain('신뢰')
      })

      it('should include earth-related strengths', () => {
        const p1 = createProfile('earth', 'earth')
        const p2 = createProfile('earth', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.strengths.some((s) => s.includes('믿을 수 있는'))).toBe(true)
      })

      it('should include earth-related growth areas', () => {
        const p1 = createProfile('earth', 'earth')
        const p2 = createProfile('earth', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.growthAreas.some((g) => g.includes('융통성'))).toBe(true)
      })
    })

    describe('Air Element Dominant', () => {
      it('should identify air-dominant relationship purpose', () => {
        const p1 = createProfile('air', 'air')
        const p2 = createProfile('air', 'air')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toContain('지적')
        expect(result.relationshipPurpose).toContain('소통')
      })

      it('should identify air-dominant core theme', () => {
        const p1 = createProfile('air', 'air')
        const p2 = createProfile('air', 'air')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.coreTheme).toContain('아이디어')
      })

      it('should include air-related strengths', () => {
        const p1 = createProfile('air', 'air')
        const p2 = createProfile('air', 'air')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.strengths.some((s) => s.includes('대화'))).toBe(true)
      })

      it('should include air-related growth areas', () => {
        const p1 = createProfile('air', 'air')
        const p2 = createProfile('air', 'air')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.growthAreas.some((g) => g.includes('감정적'))).toBe(true)
      })
    })

    describe('Water Element Dominant', () => {
      it('should identify water-dominant relationship purpose', () => {
        const p1 = createProfile('water', 'water')
        const p2 = createProfile('water', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toContain('감정적')
        expect(result.relationshipPurpose).toContain('치유')
      })

      it('should identify water-dominant core theme', () => {
        const p1 = createProfile('water', 'water')
        const p2 = createProfile('water', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.coreTheme).toContain('직관')
      })

      it('should include water-related strengths', () => {
        const p1 = createProfile('water', 'water')
        const p2 = createProfile('water', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.strengths.some((s) => s.includes('감정적'))).toBe(true)
      })

      it('should include water-related growth areas', () => {
        const p1 = createProfile('water', 'water')
        const p2 = createProfile('water', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.growthAreas.some((g) => g.includes('객관성'))).toBe(true)
      })
    })

    describe('Longevity Potential', () => {
      it('should calculate high longevity for balanced elements (3+ different)', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.longevityPotential).toBe(85)
      })

      it('should calculate medium longevity for 2 different elements', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('earth', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.longevityPotential).toBe(70)
      })

      it('should calculate lower longevity for 1 dominant element', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'fire')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.longevityPotential).toBe(60)
      })

      it('should have longevity potential between 0 and 100', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.longevityPotential).toBeGreaterThanOrEqual(0)
        expect(result.longevityPotential).toBeLessThanOrEqual(100)
      })
    })

    describe('Result Structure', () => {
      it('should return all required fields', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result).toHaveProperty('relationshipPurpose')
        expect(result).toHaveProperty('coreTheme')
        expect(result).toHaveProperty('strengths')
        expect(result).toHaveProperty('growthAreas')
        expect(result).toHaveProperty('longevityPotential')
      })

      it('should have non-empty relationship purpose', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose.length).toBeGreaterThan(0)
      })

      it('should have non-empty core theme', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.coreTheme.length).toBeGreaterThan(0)
      })

      it('should have at least one strength', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.strengths.length).toBeGreaterThan(0)
      })

      it('should have at least one growth area', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.growthAreas.length).toBeGreaterThan(0)
      })

      it('should have strengths as array of strings', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(Array.isArray(result.strengths)).toBe(true)
        result.strengths.forEach((strength) => {
          expect(typeof strength).toBe('string')
        })
      })

      it('should have growth areas as array of strings', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(Array.isArray(result.growthAreas)).toBe(true)
        result.growthAreas.forEach((area) => {
          expect(typeof area).toBe('string')
        })
      })
    })

    describe('Element Counting', () => {
      it('should correctly count element frequencies', () => {
        const p1 = createProfile('fire', 'fire')
        const p2 = createProfile('fire', 'earth')
        const result = analyzeCompositeChart(p1, p2)

        // 3 fire + 1 earth = fire dominant
        expect(result.relationshipPurpose).toContain('열정')
      })

      it('should handle mixed elements', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toBeDefined()
        expect(result.coreTheme).toBeDefined()
      })

      it('should break ties consistently', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('fire', 'earth')
        const result1 = analyzeCompositeChart(p1, p2)
        const result2 = analyzeCompositeChart(p1, p2)

        expect(result1.relationshipPurpose).toBe(result2.relationshipPurpose)
      })
    })
  })

  describe('analyzeHouseOverlays()', () => {
    describe('Partnership Area (7th House)', () => {
      it('should always include partnership area', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const partnership = result.areas.find((a) => a.area === '파트너십')
        expect(partnership).toBeDefined()
      })

      it('should mark partnership as very positive', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const partnership = result.areas.find((a) => a.area === '파트너십')
        expect(partnership?.impact).toBe('very_positive')
      })

      it('should have partnership description', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const partnership = result.areas.find((a) => a.area === '파트너십')
        expect(partnership?.description).toBeDefined()
        expect(partnership?.description.length).toBeGreaterThan(0)
      })
    })

    describe('Romance Area (5th House)', () => {
      it('should include romance area when venus and sun elements match', () => {
        const p1 = createProfile('fire', 'earth', 'fire')
        const p2 = createProfile('fire', 'water', 'earth')
        const result = analyzeHouseOverlays(p1, p2)

        const romance = result.areas.find((a) => a.area === '로맨스')
        expect(romance).toBeDefined()
      })

      it('should mark romance as very positive when present', () => {
        const p1 = createProfile('fire', 'earth', 'fire')
        const p2 = createProfile('fire', 'water', 'earth')
        const result = analyzeHouseOverlays(p1, p2)

        const romance = result.areas.find((a) => a.area === '로맨스')
        if (romance) {
          expect(romance.impact).toBe('very_positive')
        }
      })

      it('should not include romance area when venus and sun elements differ', () => {
        const p1 = createProfile('fire', 'earth', 'water')
        const p2 = createProfile('earth', 'water', 'air')
        const result = analyzeHouseOverlays(p1, p2)

        const romance = result.areas.find((a) => a.area === '로맨스')
        expect(romance).toBeUndefined()
      })
    })

    describe('Home Life Area (4th House)', () => {
      it('should include home life area when moon elements match', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'earth')
        const result = analyzeHouseOverlays(p1, p2)

        const homeLife = result.areas.find((a) => a.area === '가정생활')
        expect(homeLife).toBeDefined()
      })

      it('should mark home life as positive when present', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'earth')
        const result = analyzeHouseOverlays(p1, p2)

        const homeLife = result.areas.find((a) => a.area === '가정생활')
        if (homeLife) {
          expect(homeLife.impact).toBe('positive')
        }
      })

      it('should not include home life area when moon elements differ', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const homeLife = result.areas.find((a) => a.area === '가정생활')
        expect(homeLife).toBeUndefined()
      })
    })

    describe('Shared Goals Area (10th House)', () => {
      it('should always include shared goals area', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const sharedGoals = result.areas.find((a) => a.area === '공동 목표')
        expect(sharedGoals).toBeDefined()
      })

      it('should mark shared goals as positive', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const sharedGoals = result.areas.find((a) => a.area === '공동 목표')
        expect(sharedGoals?.impact).toBe('positive')
      })

      it('should have shared goals description', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        const sharedGoals = result.areas.find((a) => a.area === '공동 목표')
        expect(sharedGoals?.description).toBeDefined()
        expect(sharedGoals?.description.length).toBeGreaterThan(0)
      })
    })

    describe('Result Structure', () => {
      it('should return description and areas', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        expect(result).toHaveProperty('description')
        expect(result).toHaveProperty('areas')
      })

      it('should have non-empty description', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        expect(result.description.length).toBeGreaterThan(0)
        expect(result.description).toContain('하우스')
      })

      it('should have areas as array', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        expect(Array.isArray(result.areas)).toBe(true)
      })

      it('should have at least 2 areas (partnership + shared goals)', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        expect(result.areas.length).toBeGreaterThanOrEqual(2)
      })

      it('should have valid area structure', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        result.areas.forEach((area) => {
          expect(area).toHaveProperty('area')
          expect(area).toHaveProperty('impact')
          expect(area).toHaveProperty('description')
          expect(typeof area.area).toBe('string')
          expect(typeof area.description).toBe('string')
          expect(['very_positive', 'positive', 'neutral', 'challenging']).toContain(area.impact)
        })
      })

      it('should have non-empty area names', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        result.areas.forEach((area) => {
          expect(area.area.length).toBeGreaterThan(0)
        })
      })

      it('should have non-empty area descriptions', () => {
        const p1 = createProfile('fire', 'earth')
        const p2 = createProfile('air', 'water')
        const result = analyzeHouseOverlays(p1, p2)

        result.areas.forEach((area) => {
          expect(area.description.length).toBeGreaterThan(0)
        })
      })
    })

    describe('Conditional Areas', () => {
      it('should have maximum 4 areas when all conditions met', () => {
        const p1 = createProfile('fire', 'earth', 'fire')
        const p2 = createProfile('fire', 'earth', 'earth')
        const result = analyzeHouseOverlays(p1, p2)

        expect(result.areas.length).toBeLessThanOrEqual(4)
      })

      it('should have minimum 2 areas when no conditions met', () => {
        const p1 = createProfile('fire', 'earth', 'water')
        const p2 = createProfile('air', 'water', 'air')
        const result = analyzeHouseOverlays(p1, p2)

        expect(result.areas.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should provide consistent analysis for same profiles', () => {
      const p1 = createProfile('fire', 'earth')
      const p2 = createProfile('air', 'water')

      const composite1 = analyzeCompositeChart(p1, p2)
      const composite2 = analyzeCompositeChart(p1, p2)

      expect(composite1).toEqual(composite2)
    })

    it('should provide different analysis for different profiles', () => {
      const p1a = createProfile('fire', 'fire')
      const p1b = createProfile('earth', 'earth')
      const p2 = createProfile('air', 'water')

      const composite1 = analyzeCompositeChart(p1a, p2)
      const composite2 = analyzeCompositeChart(p1b, p2)

      expect(composite1.relationshipPurpose).not.toBe(composite2.relationshipPurpose)
    })

    it('should handle all four element types', () => {
      const elements = ['fire', 'earth', 'air', 'water']

      elements.forEach((element) => {
        const p1 = createProfile(element, element)
        const p2 = createProfile(element, element)
        const result = analyzeCompositeChart(p1, p2)

        expect(result.relationshipPurpose).toBeDefined()
        expect(result.coreTheme).toBeDefined()
        expect(result.strengths.length).toBeGreaterThan(0)
        expect(result.growthAreas.length).toBeGreaterThan(0)
      })
    })

    it('should provide complete relationship analysis', () => {
      const p1 = createProfile('fire', 'earth', 'fire')
      const p2 = createProfile('fire', 'earth', 'earth')

      const composite = analyzeCompositeChart(p1, p2)
      const houses = analyzeHouseOverlays(p1, p2)

      expect(composite.relationshipPurpose).toBeDefined()
      expect(composite.longevityPotential).toBeGreaterThanOrEqual(60)
      expect(houses.areas.length).toBeGreaterThanOrEqual(2)
    })
  })
})
