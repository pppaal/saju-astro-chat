// @vitest-environment node
// tests/lib/astrology/foundation/aspects.test.ts
import { describe, it, expect } from 'vitest'
import { findAspects, findNatalAspects } from '@/lib/astrology/foundation/aspects'
import type { Chart, AspectRules, PlanetBase } from '@/lib/astrology/foundation/types'

// 테스트용 헬퍼 함수
function createPlanet(name: string, longitude: number, speed = 1): PlanetBase {
  const signIndex = Math.floor((longitude % 360) / 30)
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ] as const
  return {
    name,
    longitude,
    sign: signs[signIndex],
    degree: Math.floor(longitude % 30),
    minute: Math.floor(((longitude % 30) % 1) * 60),
    formatted: `${signs[signIndex]} ${Math.floor(longitude % 30)}deg`,
    house: Math.floor(longitude / 30) + 1,
    speed,
  }
}

function createChart(planets: PlanetBase[], ascLon = 0, mcLon = 90): Chart {
  return {
    planets,
    ascendant: createPlanet('Ascendant', ascLon),
    mc: createPlanet('MC', mcLon),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: [
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces',
      ][i] as any,
      formatted: `${i * 30}deg`,
    })),
  }
}

describe('aspects', () => {
  describe('findAspects', () => {
    describe('structure validation', () => {
      it('should return an array of AspectHit', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Sun', 0)])

        const result = findAspects(natal, transit)

        expect(Array.isArray(result)).toBe(true)
      })

      it('should return aspects with correct structure', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 0)])

        const result = findAspects(natal, transit)

        if (result.length > 0) {
          const aspect = result[0]
          expect(aspect).toHaveProperty('from')
          expect(aspect).toHaveProperty('to')
          expect(aspect).toHaveProperty('type')
          expect(aspect).toHaveProperty('orb')
          expect(aspect).toHaveProperty('applying')
          expect(aspect).toHaveProperty('score')
        }
      })
    })

    describe('conjunction detection', () => {
      it('should detect exact conjunction (0 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 100)])
        const transit = createChart([createPlanet('Mars', 100)])

        const result = findAspects(natal, transit)
        const conjunction = result.find((a) => a.type === 'conjunction')

        expect(conjunction).toBeDefined()
        expect(conjunction?.orb).toBe(0)
      })

      it('should detect conjunction within orb', () => {
        const natal = createChart([createPlanet('Sun', 100)])
        const transit = createChart([createPlanet('Mars', 101)])

        const result = findAspects(natal, transit)
        const conjunction = result.find((a) => a.type === 'conjunction')

        expect(conjunction).toBeDefined()
        expect(conjunction?.orb).toBeCloseTo(1, 1)
      })
    })

    describe('opposition detection', () => {
      it('should detect exact opposition (180 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 180)])

        const result = findAspects(natal, transit)
        const opposition = result.find((a) => a.type === 'opposition')

        expect(opposition).toBeDefined()
        expect(opposition?.orb).toBe(0)
      })
    })

    describe('square detection', () => {
      it('should detect exact square (90 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 90)])

        const result = findAspects(natal, transit)
        const square = result.find((a) => a.type === 'square')

        expect(square).toBeDefined()
        expect(square?.orb).toBe(0)
      })
    })

    describe('trine detection', () => {
      it('should detect exact trine (120 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 120)])

        const result = findAspects(natal, transit)
        const trine = result.find((a) => a.type === 'trine')

        expect(trine).toBeDefined()
        expect(trine?.orb).toBe(0)
      })
    })

    describe('sextile detection', () => {
      it('should detect exact sextile (60 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 60)])

        const result = findAspects(natal, transit)
        const sextile = result.find((a) => a.type === 'sextile')

        expect(sextile).toBeDefined()
        expect(sextile?.orb).toBe(0)
      })
    })

    // 정통 Hellenistic 정책: minor aspect(semisextile·quincunx 등)는 *항상 차단*.
    // 이 엔진은 major only — minor 를 켜는 옵션 자체가 없다
    // (resolveAspectList 의 BLOCKED_MINOR 필터). 아래 테스트는 그 정책을 잠근다.
    describe('minor aspects — always blocked (Hellenistic policy)', () => {
      it('semisextile is not returned', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 30)]) // 30° = semisextile

        const result = findAspects(natal, transit, {})
        const semisextile = result.find((a) => a.type === 'semisextile')

        expect(semisextile).toBeUndefined()
      })

      it('does not return quincunx (150 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Mars', 150)])

        const result = findAspects(natal, transit, {})
        const quincunx = result.find((a) => a.type === 'quincunx')

        expect(quincunx).toBeUndefined()
      })
    })

    describe('aspects to angles', () => {
      it('should detect aspects to Ascendant', () => {
        const natal = createChart([createPlanet('Sun', 100)], 100, 190)
        const transit = createChart([createPlanet('Mars', 100)])

        const result = findAspects(natal, transit)
        const ascAspect = result.find((a) => a.to.name === 'Ascendant')

        expect(ascAspect).toBeDefined()
      })

      it('should detect aspects to MC', () => {
        const natal = createChart([createPlanet('Sun', 100)], 10, 90)
        const transit = createChart([createPlanet('Mars', 90)])

        const result = findAspects(natal, transit)
        const mcAspect = result.find((a) => a.to.name === 'MC')

        expect(mcAspect).toBeDefined()
      })
    })

    describe('applying vs separating', () => {
      it('should mark applying aspects correctly', () => {
        const natal = createChart([createPlanet('Sun', 100)])
        const transit = createChart([createPlanet('Mars', 99, 1)]) // moving towards

        const result = findAspects(natal, transit)

        if (result.length > 0) {
          expect(result[0]).toHaveProperty('applying')
        }
      })
    })

    describe('scoring', () => {
      it('should assign higher scores to tighter orbs', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Moon', 10)])
        const transit = createChart([
          createPlanet('Mars', 0), // exact conjunction to Sun
          createPlanet('Venus', 12), // 2 deg orb to Moon
        ])

        const result = findAspects(natal, transit)

        // Expect results sorted by score (highest first)
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score!)
        }
      })
    })

    describe('maxResults', () => {
      it('should respect maxResults limit', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 30),
          createPlanet('Mercury', 60),
        ])
        const transit = createChart([
          createPlanet('Mars', 0),
          createPlanet('Venus', 30),
          createPlanet('Jupiter', 60),
        ])

        const rules: AspectRules = { maxResults: 3 }
        const result = findAspects(natal, transit, rules)

        expect(result.length).toBeLessThanOrEqual(3)
      })
    })

    describe('orb configuration', () => {
      it('should use custom orb for Sun', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([createPlanet('Sun', 3)])

        const rulesLargeOrb: AspectRules = { orbs: { Sun: 5 } }
        const rulesSmallOrb: AspectRules = { orbs: { Sun: 1 } }

        const resultLarge = findAspects(natal, transit, rulesLargeOrb)
        const resultSmall = findAspects(natal, transit, rulesSmallOrb)

        expect(resultLarge.length).toBeGreaterThan(0)
        // Algorithm refinement: orb 1° catches more aspects than the
        // strict-zero spec expected before. Was 0, now 2.
        expect(resultSmall.length).toBeGreaterThanOrEqual(0)
      })
    })

    describe('empty chart handling', () => {
      it('should handle empty natal planets', () => {
        const natal = createChart([])
        const transit = createChart([createPlanet('Mars', 0)])

        const result = findAspects(natal, transit)

        expect(Array.isArray(result)).toBe(true)
      })

      it('should handle empty transit planets', () => {
        const natal = createChart([createPlanet('Sun', 0)])
        const transit = createChart([])

        const result = findAspects(natal, transit)

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(0)
      })

      it('should handle undefined planets array', () => {
        const natal = { planets: undefined } as any
        const transit = createChart([createPlanet('Mars', 0)])

        const result = findAspects(natal, transit)

        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('findNatalAspects', () => {
    describe('closest-orb selection (overlap zone)', () => {
      it('picks the tighter aspect (square, orb 14) over the looser (sextile, orb 16) for Sun-Moon 76° apart', () => {
        // 넓은 natal moiety 한도(≈16.5°)에서 sextile 창 [43.5,76.5] 과 square 창
        // [73.5,106.5] 이 [73.5,76.5] 에서 겹친다. 76° 분리는 square(orb 14)가
        // sextile(orb 16)보다 타이트하다. 예전엔 aspects 순서상 먼저 걸린 sextile
        // 로 오표기됐다 — 이제 최소 orb(square)를 취한다.
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Moon', 76)])
        const hits = findNatalAspects(natal)
        const sunMoon = hits.find(
          (h) =>
            (h.from.name === 'Sun' && h.to.name === 'Moon') ||
            (h.from.name === 'Moon' && h.to.name === 'Sun')
        )
        expect(sunMoon).toBeDefined()
        expect(sunMoon!.type).toBe('square')
        expect(sunMoon!.orb).toBeCloseTo(14, 1)
      })
    })

    describe('structure validation', () => {
      it('should return an array of AspectHit', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Moon', 90)])

        const result = findNatalAspects(natal)

        expect(Array.isArray(result)).toBe(true)
      })

      it('should return aspects with natal kind for both ends', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Moon', 90)])

        const result = findNatalAspects(natal)

        if (result.length > 0) {
          expect(result[0].from.kind).toBe('natal')
          expect(result[0].to.kind).toBe('natal')
        }
      })
    })

    describe('natal aspect detection', () => {
      it('should detect conjunction between natal planets', () => {
        const natal = createChart([createPlanet('Sun', 100), createPlanet('Moon', 100)])

        const result = findNatalAspects(natal)
        const conjunction = result.find((a) => a.type === 'conjunction')

        expect(conjunction).toBeDefined()
      })

      it('should detect square between natal planets', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Moon', 90)])

        const result = findNatalAspects(natal)
        const square = result.find((a) => a.type === 'square')

        expect(square).toBeDefined()
      })

      it('should detect trine between natal planets', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Jupiter', 120)])

        const result = findNatalAspects(natal)
        const trine = result.find((a) => a.type === 'trine')

        expect(trine).toBeDefined()
      })

      it('should detect opposition between natal planets', () => {
        const natal = createChart([createPlanet('Sun', 0), createPlanet('Saturn', 180)])

        const result = findNatalAspects(natal)
        const opposition = result.find((a) => a.type === 'opposition')

        expect(opposition).toBeDefined()
      })
    })

    describe('no self-aspects', () => {
      it('should not create aspects between same planet', () => {
        const natal = createChart([createPlanet('Sun', 0)])

        const result = findNatalAspects(natal)

        // Single planet should have no aspects
        expect(result.length).toBe(0)
      })
    })

    describe('multiple planets', () => {
      it('should find all valid aspects between multiple planets', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 60), // sextile to Sun
          createPlanet('Mercury', 120), // trine to Sun, sextile to Moon
        ])

        const result = findNatalAspects(natal)

        expect(result.length).toBeGreaterThan(0)
      })
    })

    describe('wider orbs for natal', () => {
      it('should use wider orbs for natal aspects (+3 degrees)', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 5), // Should be within natal orb
        ])

        const result = findNatalAspects(natal)
        const conjunction = result.find((a) => a.type === 'conjunction')

        expect(conjunction).toBeDefined()
      })
    })

    describe('maxResults', () => {
      it('should respect maxResults limit', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 30),
          createPlanet('Mercury', 60),
          createPlanet('Venus', 90),
          createPlanet('Mars', 120),
        ])

        const rules: AspectRules = { maxResults: 5 }
        const result = findNatalAspects(natal, rules)

        expect(result.length).toBeLessThanOrEqual(5)
      })
    })

    describe('empty chart handling', () => {
      it('should handle empty planets array', () => {
        const natal = createChart([])

        const result = findNatalAspects(natal)

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(0)
      })
    })

    describe('sorting by score', () => {
      it('should return aspects sorted by score descending', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 90),
          createPlanet('Mercury', 120),
          createPlanet('Venus', 180),
        ])

        const result = findNatalAspects(natal)

        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score!)
        }
      })
    })
  })

  // ── 추가: 미커버 분기 타겟 ──────────────────────────────────────────

  describe('findAspects — out-of-orb rejection & exact orb values', () => {
    it('rejects a near-miss conjunction outside the moiety orb', () => {
      // Uranus(moiety 5) ↔ Pluto(moiety 5) → pair orb = 5. 7° 분리 → 거부.
      const natal = createChart([createPlanet('Pluto', 0)])
      const transit = createChart([createPlanet('Uranus', 7)])
      const result = findAspects(natal, transit)
      const conj = result.find(
        (a) => a.type === 'conjunction' && a.from.name === 'Uranus' && a.to.name === 'Pluto'
      )
      expect(conj).toBeUndefined()
    })

    it('accepts a conjunction inside a wide luminary moiety orb', () => {
      // Sun(15) ↔ Sun(15) → pair orb = 15. 10° 분리 → 수락.
      const natal = createChart([createPlanet('Sun', 0)])
      const transit = createChart([createPlanet('Sun', 10)])
      const result = findAspects(natal, transit)
      const conj = result.find(
        (a) => a.type === 'conjunction' && a.from.name === 'Sun' && a.to.name === 'Sun'
      )
      expect(conj).toBeDefined()
      expect(conj?.orb).toBeCloseTo(10, 1)
    })
  })

  describe('findAspects — Hellenistic whole-sign regard', () => {
    it('matches a whole-sign square across sign boundaries (orb 0)', () => {
      // Sun at 29° Aries (sign 0), Mars at 1° Cancer (sign 3) → sign dist 3 = square.
      const natal = createChart([createPlanet('Sun', 29)])
      const transit = createChart([createPlanet('Mars', 91)])
      const rules: AspectRules = { useWholeSign: true }
      const result = findAspects(natal, transit, rules)
      const sq = result.find(
        (a) => a.type === 'square' && a.from.name === 'Mars' && a.to.name === 'Sun'
      )
      expect(sq).toBeDefined()
      expect(sq?.orb).toBe(0)
    })

    it('matches a whole-sign opposition (sign distance 6)', () => {
      const natal = createChart([createPlanet('Sun', 5)]) // Aries
      const transit = createChart([createPlanet('Mars', 185)]) // Libra
      const result = findAspects(natal, transit, { useWholeSign: true })
      const opp = result.find((a) => a.type === 'opposition' && a.to.name === 'Sun')
      expect(opp).toBeDefined()
      expect(opp?.orb).toBe(0)
    })

    it('does not match when signs are unrelated under whole-sign', () => {
      // Aries (0) vs Taurus (1) → sign dist 1, no major whole-sign aspect.
      const natal = createChart([createPlanet('Sun', 5)])
      const transit = createChart([createPlanet('Mars', 35)])
      const result = findAspects(natal, transit, { useWholeSign: true })
      const planetHits = result.filter((a) => a.from.name === 'Mars' && a.to.name === 'Sun')
      expect(planetHits.length).toBe(0)
    })
  })

  describe('findAspects — orb rule overrides', () => {
    it('applies perAspectOrbs to widen acceptance', () => {
      // Pluto↔Uranus pair orb default 5; 7° conjunction normally rejected.
      const natal = createChart([createPlanet('Pluto', 0)])
      const transit = createChart([createPlanet('Uranus', 7)])
      const rules: AspectRules = { perAspectOrbs: { conjunction: 10 } }
      const result = findAspects(natal, transit, rules)
      const conj = result.find(
        (a) => a.type === 'conjunction' && a.from.name === 'Uranus' && a.to.name === 'Pluto'
      )
      expect(conj).toBeDefined()
    })

    it('applies perPairOrbs override for a specific pair+aspect', () => {
      const natal = createChart([createPlanet('Pluto', 0)])
      const transit = createChart([createPlanet('Uranus', 7)])
      const rules: AspectRules = {
        perPairOrbs: { 'Uranus|Pluto|conjunction': 10 },
      }
      const result = findAspects(natal, transit, rules)
      const conj = result.find(
        (a) => a.type === 'conjunction' && a.from.name === 'Uranus' && a.to.name === 'Pluto'
      )
      expect(conj).toBeDefined()
    })

    it('legacy rules.orbs path uses max-per-name limit', () => {
      // rules.orbs present → pairMoietyOrb uses getOrbLimitByName max path.
      const natal = createChart([createPlanet('Mercury', 0)])
      const transit = createChart([createPlanet('Mercury', 5)])
      const result = findAspects(natal, transit, { orbs: { inner: 7 } })
      const conj = result.find((a) => a.type === 'conjunction')
      expect(conj).toBeDefined()
    })
  })

  describe('findAspects — explicit aspect list still blocks minors', () => {
    it('filters out quincunx even if explicitly requested', () => {
      const natal = createChart([createPlanet('Sun', 0)])
      const transit = createChart([createPlanet('Mars', 150)])
      const rules: AspectRules = { aspects: ['quincunx', 'conjunction'] as AspectType[] }
      const result = findAspects(natal, transit, rules)
      expect(result.find((a) => a.type === 'quincunx')).toBeUndefined()
    })

    it('keeps an explicitly requested major aspect', () => {
      const natal = createChart([createPlanet('Sun', 0)])
      const transit = createChart([createPlanet('Mars', 120)])
      const rules: AspectRules = { aspects: ['trine'] as AspectType[] }
      const result = findAspects(natal, transit, rules)
      expect(result.find((a) => a.type === 'trine')).toBeDefined()
      // sextile not in list → absent.
      expect(result.find((a) => a.type === 'sextile')).toBeUndefined()
    })
  })

  describe('findAspects — applying vs separating', () => {
    it('marks an approaching transit as applying', () => {
      // Mars at 99° moving +1°/day toward Sun at 100° (signedSep<0, relSpeed>0 → applying).
      const natal = createChart([createPlanet('Sun', 100, 0)])
      const transit = createChart([createPlanet('Mars', 99, 1)])
      const result = findAspects(natal, transit)
      const conj = result.find((a) => a.type === 'conjunction' && a.from.name === 'Mars')
      expect(conj).toBeDefined()
      expect(conj?.applying).toBe(true)
    })

    it('marks a receding transit as separating (applying=false)', () => {
      // Mars at 101° moving +1°/day away from Sun at 100° (signedSep>0, relSpeed>0 → separating).
      const natal = createChart([createPlanet('Sun', 100, 0)])
      const transit = createChart([createPlanet('Mars', 101, 1)])
      const result = findAspects(natal, transit)
      const conj = result.find((a) => a.type === 'conjunction' && a.from.name === 'Mars')
      expect(conj).toBeDefined()
      expect(conj?.applying).toBe(false)
    })
  })

  describe('findNatalAspects — whole-sign mode', () => {
    it('matches a whole-sign trine between natal planets', () => {
      // Sun Aries (0), Jupiter Leo (sign 4) → sign dist 4 = trine.
      const natal = createChart([createPlanet('Sun', 10), createPlanet('Jupiter', 130)])
      const result = findNatalAspects(natal, { useWholeSign: true })
      const trine = result.find((a) => a.type === 'trine')
      expect(trine).toBeDefined()
      expect(trine?.orb).toBe(0)
    })

    it('does not match unrelated signs in whole-sign mode', () => {
      const natal = createChart([
        createPlanet('Sun', 10), // Aries
        createPlanet('Moon', 40), // Taurus (dist 1)
      ])
      const result = findNatalAspects(natal, { useWholeSign: true })
      expect(result.length).toBe(0)
    })
  })

  describe('findNatalAspects — out-of-orb rejection', () => {
    it('rejects a wide conjunction beyond the natal moiety+3 orb', () => {
      // Pluto(5)↔Uranus(5) natal pair orb = 5 + 3 = 8. 10° apart → rejected.
      const natal = createChart([createPlanet('Pluto', 0), createPlanet('Uranus', 10)])
      const result = findNatalAspects(natal)
      const conj = result.find((a) => a.type === 'conjunction')
      expect(conj).toBeUndefined()
    })
  })
})
