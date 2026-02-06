/**
 * Astro Domain Schema Tests
 * Comprehensive testing for domains/astro-domain.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  zodiacSignSchema,
  zodiacSignKoreanSchema,
  houseSystemSchema,
  aspectTypeSchema,
  planetNameSchema,
  astroElementSchema,
  modalitySchema,
  planetBaseSchema,
  houseSchema,
  chartMetaSchema,
  aspectEndSchema,
  aspectHitSchema,
  extraPointSchema,
  chartSchema,
  extendedChartSchema,
  progressedChartSchema,
  returnChartSchema,
  natalInputSchema,
  planetHousesSchema,
  planetSignsSchema,
  planetLongitudesSchema,
  astroElementRatiosSchema,
  modalityRatiosSchema,
  transitAspectSchema,
  astrologyChartFactsSchema,
  astrologyDataSchema,
  astroChatContextSchema,
  synastryAspectSchema,
  synastryResultSchema,
  compositeChartSchema,
} from '@/lib/api/zodValidation/domains/astro-domain'

describe('Core Enum Schema Tests', () => {
  describe('zodiacSignSchema', () => {
    it('should accept all zodiac signs', () => {
      const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
      signs.forEach(sign => {
        expect(zodiacSignSchema.safeParse(sign).success).toBe(true)
      })
    })

    it('should reject invalid signs', () => {
      expect(zodiacSignSchema.safeParse('aries').success).toBe(false)
      expect(zodiacSignSchema.safeParse('Ophiuchus').success).toBe(false)
    })
  })

  describe('zodiacSignKoreanSchema', () => {
    it('should accept all Korean zodiac signs', () => {
      const signs = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리']
      signs.forEach(sign => {
        expect(zodiacSignKoreanSchema.safeParse(sign).success).toBe(true)
      })
    })
  })

  describe('houseSystemSchema', () => {
    it('should accept all house systems', () => {
      const systems = ['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus']
      systems.forEach(system => {
        expect(houseSystemSchema.safeParse(system).success).toBe(true)
      })
    })

    it('should reject invalid systems', () => {
      expect(houseSystemSchema.safeParse('placidus').success).toBe(false)
      expect(houseSystemSchema.safeParse('Porphyry').success).toBe(false)
    })
  })

  describe('aspectTypeSchema', () => {
    it('should accept all aspect types', () => {
      const aspects = ['conjunction', 'sextile', 'square', 'trine', 'opposition', 'semisextile', 'quincunx', 'quintile', 'biquintile']
      aspects.forEach(aspect => {
        expect(aspectTypeSchema.safeParse(aspect).success).toBe(true)
      })
    })
  })

  describe('planetNameSchema', () => {
    it('should accept all planet names', () => {
      const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'Lilith', 'NorthNode', 'SouthNode', 'Ascendant', 'Midheaven', 'IC', 'Descendant']
      planets.forEach(planet => {
        expect(planetNameSchema.safeParse(planet).success).toBe(true)
      })
    })
  })

  describe('astroElementSchema', () => {
    it('should accept all elements', () => {
      const elements = ['fire', 'earth', 'air', 'water']
      elements.forEach(element => {
        expect(astroElementSchema.safeParse(element).success).toBe(true)
      })
    })
  })

  describe('modalitySchema', () => {
    it('should accept all modalities', () => {
      const modalities = ['cardinal', 'fixed', 'mutable']
      modalities.forEach(modality => {
        expect(modalitySchema.safeParse(modality).success).toBe(true)
      })
    })
  })
})

describe('Planet Schema Tests', () => {
  describe('planetBaseSchema', () => {
    const validPlanet = {
      name: 'Sun',
      longitude: 45.5,
      sign: 'Taurus',
      degree: 15,
      minute: 30,
      formatted: '15° 30\' Taurus',
      house: 10,
    }

    it('should accept valid planet', () => {
      expect(planetBaseSchema.safeParse(validPlanet).success).toBe(true)
    })

    it('should accept optional speed and retrograde', () => {
      expect(planetBaseSchema.safeParse({
        ...validPlanet,
        speed: 0.97,
        retrograde: false,
      }).success).toBe(true)
    })

    it('should reject invalid longitude', () => {
      expect(planetBaseSchema.safeParse({ ...validPlanet, longitude: -1 }).success).toBe(false)
      expect(planetBaseSchema.safeParse({ ...validPlanet, longitude: 361 }).success).toBe(false)
    })

    it('should reject invalid degree', () => {
      expect(planetBaseSchema.safeParse({ ...validPlanet, degree: 30 }).success).toBe(false)
    })

    it('should reject invalid minute', () => {
      expect(planetBaseSchema.safeParse({ ...validPlanet, minute: 60 }).success).toBe(false)
    })

    it('should reject invalid house', () => {
      expect(planetBaseSchema.safeParse({ ...validPlanet, house: 0 }).success).toBe(false)
      expect(planetBaseSchema.safeParse({ ...validPlanet, house: 13 }).success).toBe(false)
    })
  })

  describe('extraPointSchema', () => {
    it('should accept valid extra point', () => {
      expect(extraPointSchema.safeParse({
        name: 'Chiron',
        longitude: 120.5,
        sign: 'Leo',
        degree: 0,
        minute: 30,
        formatted: '0° 30\' Leo',
        house: 5,
        description: 'Wound and healing',
      }).success).toBe(true)
    })
  })
})

describe('House Schema Tests', () => {
  describe('houseSchema', () => {
    it('should accept valid house', () => {
      expect(houseSchema.safeParse({
        index: 1,
        cusp: 0,
        sign: 'Aries',
        formatted: '0° Aries',
      }).success).toBe(true)
    })

    it('should reject invalid index', () => {
      expect(houseSchema.safeParse({
        index: 0,
        cusp: 0,
        sign: 'Aries',
        formatted: 'test',
      }).success).toBe(false)

      expect(houseSchema.safeParse({
        index: 13,
        cusp: 0,
        sign: 'Aries',
        formatted: 'test',
      }).success).toBe(false)
    })
  })
})

describe('Chart Meta Schema Tests', () => {
  describe('chartMetaSchema', () => {
    it('should accept valid meta', () => {
      expect(chartMetaSchema.safeParse({
        jdUT: 2460000.5,
        isoUTC: '2024-06-15T10:30:00Z',
        timeZone: 'Asia/Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        houseSystem: 'Placidus',
      }).success).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      expect(chartMetaSchema.safeParse({
        jdUT: 2460000.5,
        isoUTC: '2024-06-15T10:30:00Z',
        timeZone: 'UTC',
        latitude: 91,
        longitude: 0,
        houseSystem: 'Placidus',
      }).success).toBe(false)
    })
  })
})

describe('Aspect Schema Tests', () => {
  describe('aspectEndSchema', () => {
    it('should accept valid aspect end', () => {
      expect(aspectEndSchema.safeParse({
        name: 'Sun',
        kind: 'natal',
        longitude: 45.5,
      }).success).toBe(true)
    })

    it('should accept all kinds', () => {
      const kinds = ['natal', 'transit', 'progressed', 'angle']
      kinds.forEach(kind => {
        expect(aspectEndSchema.safeParse({
          name: 'Moon',
          kind,
          longitude: 90,
        }).success).toBe(true)
      })
    })

    it('should accept optional house and sign', () => {
      expect(aspectEndSchema.safeParse({
        name: 'Venus',
        kind: 'natal',
        house: 7,
        sign: 'Libra',
        longitude: 180,
      }).success).toBe(true)
    })
  })

  describe('aspectHitSchema', () => {
    const validAspect = {
      from: { name: 'Sun', kind: 'natal', longitude: 45 },
      to: { name: 'Moon', kind: 'natal', longitude: 90 },
      type: 'square',
      orb: 3.5,
    }

    it('should accept valid aspect', () => {
      expect(aspectHitSchema.safeParse(validAspect).success).toBe(true)
    })

    it('should accept optional fields', () => {
      expect(aspectHitSchema.safeParse({
        ...validAspect,
        applying: true,
        score: 85,
      }).success).toBe(true)
    })

    it('should reject invalid orb', () => {
      expect(aspectHitSchema.safeParse({ ...validAspect, orb: 16 }).success).toBe(false)
    })
  })

  describe('transitAspectSchema', () => {
    it('should accept valid transit', () => {
      expect(transitAspectSchema.safeParse({
        transitPlanet: 'Saturn',
        natalPlanet: 'Sun',
        aspectType: 'conjunction',
        orb: 2.5,
      }).success).toBe(true)
    })

    it('should accept all optional fields', () => {
      expect(transitAspectSchema.safeParse({
        transitPlanet: 'Jupiter',
        natalPlanet: 'Moon',
        aspectType: 'trine',
        orb: 4,
        applying: false,
        exactDate: '2024-06-20',
        significance: 'major',
      }).success).toBe(true)
    })

    it('should accept all significance levels', () => {
      const levels = ['major', 'minor', 'background']
      levels.forEach(level => {
        expect(transitAspectSchema.safeParse({
          transitPlanet: 'Mars',
          natalPlanet: 'Venus',
          aspectType: 'sextile',
          orb: 3,
          significance: level,
        }).success).toBe(true)
      })
    })
  })
})

describe('Chart Schema Tests', () => {
  const createPlanet = (name: string, sign: string) => ({
    name,
    longitude: 45,
    sign,
    degree: 15,
    minute: 0,
    formatted: `15° ${sign}`,
    house: 1,
  })

  const validChart = {
    planets: [createPlanet('Sun', 'Aries'), createPlanet('Moon', 'Cancer')],
    ascendant: createPlanet('Ascendant', 'Leo'),
    mc: createPlanet('Midheaven', 'Taurus'),
    houses: [{ index: 1, cusp: 0, sign: 'Leo', formatted: '0° Leo' }],
  }

  describe('chartSchema', () => {
    it('should accept valid chart', () => {
      expect(chartSchema.safeParse(validChart).success).toBe(true)
    })

    it('should accept with meta', () => {
      expect(chartSchema.safeParse({
        ...validChart,
        meta: {
          jdUT: 2460000.5,
          isoUTC: '2024-06-15T10:30:00Z',
          timeZone: 'UTC',
          latitude: 37.5665,
          longitude: 126.978,
          houseSystem: 'Placidus',
        },
      }).success).toBe(true)
    })
  })

  describe('extendedChartSchema', () => {
    it('should accept extended chart', () => {
      expect(extendedChartSchema.safeParse({
        ...validChart,
        chiron: { name: 'Chiron', longitude: 120, sign: 'Leo', degree: 0, minute: 0, formatted: '0° Leo', house: 5 },
        lilith: { name: 'Lilith', longitude: 180, sign: 'Libra', degree: 0, minute: 0, formatted: '0° Libra', house: 7 },
      }).success).toBe(true)
    })
  })

  describe('progressedChartSchema', () => {
    it('should accept progressed chart', () => {
      expect(progressedChartSchema.safeParse({
        ...validChart,
        progressionType: 'secondary',
        yearsProgressed: 35,
        progressedDate: '2025-06-15',
      }).success).toBe(true)
    })

    it('should accept solar arc progression', () => {
      expect(progressedChartSchema.safeParse({
        ...validChart,
        progressionType: 'solarArc',
        yearsProgressed: 40,
        progressedDate: '2030-01-01',
      }).success).toBe(true)
    })
  })

  describe('returnChartSchema', () => {
    it('should accept solar return chart', () => {
      expect(returnChartSchema.safeParse({
        ...validChart,
        returnType: 'solar',
        returnYear: 2024,
        exactReturnTime: '2024-06-15T14:30:00Z',
      }).success).toBe(true)
    })

    it('should accept lunar return chart', () => {
      expect(returnChartSchema.safeParse({
        ...validChart,
        returnType: 'lunar',
        returnYear: 2024,
        returnMonth: 7,
        exactReturnTime: '2024-07-10T08:15:00Z',
      }).success).toBe(true)
    })
  })
})

describe('Natal Input Schema Tests', () => {
  describe('natalInputSchema', () => {
    it('should accept valid natal input', () => {
      expect(natalInputSchema.safeParse({
        year: 1990,
        month: 5,
        date: 15,
        hour: 10,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      }).success).toBe(true)
    })

    it('should reject invalid date components', () => {
      expect(natalInputSchema.safeParse({
        year: 1990,
        month: 13,
        date: 15,
        hour: 10,
        minute: 30,
        latitude: 37,
        longitude: 126,
        timeZone: 'UTC',
      }).success).toBe(false)
    })

    it('should reject invalid time components', () => {
      expect(natalInputSchema.safeParse({
        year: 1990,
        month: 5,
        date: 15,
        hour: 24,
        minute: 30,
        latitude: 37,
        longitude: 126,
        timeZone: 'UTC',
      }).success).toBe(false)
    })
  })
})

describe('Position Record Schema Tests', () => {
  describe('planetHousesSchema', () => {
    it('should accept valid planet houses', () => {
      expect(planetHousesSchema.safeParse({
        Sun: 10,
        Moon: 4,
        Mercury: 10,
        Venus: 11,
      }).success).toBe(true)
    })

    it('should reject invalid house number', () => {
      expect(planetHousesSchema.safeParse({
        Sun: 0,
      }).success).toBe(false)

      expect(planetHousesSchema.safeParse({
        Sun: 13,
      }).success).toBe(false)
    })
  })

  describe('planetSignsSchema', () => {
    it('should accept valid planet signs', () => {
      expect(planetSignsSchema.safeParse({
        Sun: 'Aries',
        Moon: 'Cancer',
        Mercury: 'Gemini',
      }).success).toBe(true)
    })
  })

  describe('planetLongitudesSchema', () => {
    it('should accept valid longitudes', () => {
      expect(planetLongitudesSchema.safeParse({
        Sun: 45.5,
        Moon: 120.25,
        Mercury: 85.75,
      }).success).toBe(true)
    })

    it('should reject invalid longitude', () => {
      expect(planetLongitudesSchema.safeParse({
        Sun: 361,
      }).success).toBe(false)
    })
  })
})

describe('Element & Modality Ratio Schema Tests', () => {
  describe('astroElementRatiosSchema', () => {
    it('should accept valid ratios', () => {
      expect(astroElementRatiosSchema.safeParse({
        fire: 30,
        earth: 25,
        air: 25,
        water: 20,
      }).success).toBe(true)
    })
  })

  describe('modalityRatiosSchema', () => {
    it('should accept valid ratios', () => {
      expect(modalityRatiosSchema.safeParse({
        cardinal: 40,
        fixed: 35,
        mutable: 25,
      }).success).toBe(true)
    })
  })
})

describe('Astrology Data Schema Tests', () => {
  const createPlanet = (name: string, sign: string) => ({
    name,
    longitude: 45,
    sign,
    degree: 15,
    minute: 0,
    formatted: `15° ${sign}`,
    house: 1,
  })

  describe('astrologyChartFactsSchema', () => {
    it('should accept valid chart facts', () => {
      expect(astrologyChartFactsSchema.safeParse({
        sun: createPlanet('Sun', 'Aries'),
        moon: createPlanet('Moon', 'Cancer'),
      }).success).toBe(true)
    })

    it('should accept full chart facts', () => {
      expect(astrologyChartFactsSchema.safeParse({
        sun: createPlanet('Sun', 'Aries'),
        moon: createPlanet('Moon', 'Cancer'),
        mercury: createPlanet('Mercury', 'Taurus'),
        venus: createPlanet('Venus', 'Gemini'),
        mars: createPlanet('Mars', 'Leo'),
        elementRatios: { fire: 30, earth: 25, air: 25, water: 20 },
      }).success).toBe(true)
    })
  })

  describe('astrologyDataSchema', () => {
    it('should accept valid astrology data', () => {
      expect(astrologyDataSchema.safeParse({
        planets: [createPlanet('Sun', 'Aries')],
        houses: [{ index: 1, cusp: 0, sign: 'Leo', formatted: '0° Leo' }],
        ascendant: createPlanet('Ascendant', 'Leo'),
        mc: createPlanet('MC', 'Taurus'),
        aspects: [],
      }).success).toBe(true)
    })
  })
})

describe('Chat Context Schema Tests', () => {
  describe('astroChatContextSchema', () => {
    it('should accept valid chat context', () => {
      expect(astroChatContextSchema.safeParse({
        sunSign: 'Aries',
        moonSign: 'Cancer',
        ascendant: 'Leo',
      }).success).toBe(true)
    })

    it('should accept full context', () => {
      expect(astroChatContextSchema.safeParse({
        sunSign: 'Aries',
        moonSign: 'Cancer',
        ascendant: 'Leo',
        sunLongitude: 15.5,
        moonLongitude: 90.25,
        dominantElement: 'fire',
        planetHouses: { Sun: 10, Moon: 4 },
        planetSigns: { Sun: 'Aries', Moon: 'Cancer' },
        activeTransits: [],
      }).success).toBe(true)
    })

    it('should accept minimal context', () => {
      expect(astroChatContextSchema.safeParse({
        sunSign: 'Leo',
      }).success).toBe(true)
    })
  })
})

describe('Synastry Schema Tests', () => {
  describe('synastryAspectSchema', () => {
    it('should accept valid synastry aspect', () => {
      expect(synastryAspectSchema.safeParse({
        person1Planet: 'Sun',
        person2Planet: 'Moon',
        aspectType: 'trine',
        orb: 3.5,
        influence: 'harmonious',
      }).success).toBe(true)
    })

    it('should accept all influence types', () => {
      const influences = ['harmonious', 'challenging', 'neutral']
      influences.forEach(influence => {
        expect(synastryAspectSchema.safeParse({
          person1Planet: 'Venus',
          person2Planet: 'Mars',
          aspectType: 'conjunction',
          orb: 2,
          influence,
        }).success).toBe(true)
      })
    })
  })

  describe('synastryResultSchema', () => {
    it('should accept valid synastry result', () => {
      expect(synastryResultSchema.safeParse({
        aspects: [
          { person1Planet: 'Sun', person2Planet: 'Moon', aspectType: 'trine', orb: 3, influence: 'harmonious' },
        ],
        overallScore: 85,
        strengths: ['Strong emotional connection', 'Compatible communication styles'],
        challenges: ['Different approaches to finances'],
        summary: 'A compatible relationship with good potential for growth.',
      }).success).toBe(true)
    })
  })
})

describe('Composite Chart Schema Tests', () => {
  describe('compositeChartSchema', () => {
    const createPlanet = (name: string, sign: string) => ({
      name,
      longitude: 45,
      sign,
      degree: 15,
      minute: 0,
      formatted: `15° ${sign}`,
      house: 1,
    })

    it('should accept valid composite chart', () => {
      expect(compositeChartSchema.safeParse({
        compositePlanets: [createPlanet('Sun', 'Aries')],
        compositeHouses: [{ index: 1, cusp: 0, sign: 'Leo', formatted: '0° Leo' }],
      }).success).toBe(true)
    })

    it('should accept full composite chart', () => {
      expect(compositeChartSchema.safeParse({
        compositePlanets: [createPlanet('Sun', 'Aries'), createPlanet('Moon', 'Cancer')],
        compositeHouses: [{ index: 1, cusp: 0, sign: 'Leo', formatted: '0° Leo' }],
        compositeAscendant: createPlanet('Ascendant', 'Leo'),
        compositeMC: createPlanet('MC', 'Taurus'),
        relationshipThemes: ['Partnership', 'Growth', 'Communication'],
      }).success).toBe(true)
    })
  })
})
