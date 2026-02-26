import { describe, it, expect } from 'vitest'
import {
  CATEGORY_MAX_SCORES,
  DAEUN_SCORES,
  SEUN_SCORES,
  WOLUN_SCORES,
  ILJIN_SCORES,
  YONGSIN_SCORES,
  TRANSIT_SUN_SCORES,
  TRANSIT_MOON_SCORES,
  MAJOR_PLANETS_SCORES,
  LUNAR_PHASE_SCORES,
  SOLAR_RETURN_SCORES,
  CROSS_VERIFICATION_SCORES,
  GRADE_THRESHOLDS,
  DISPLAY_SCORE_LABEL_THRESHOLDS,
  getDisplayGradeFromScore,
  getDisplayLabelFromScore,
  normalizeToCategory,
  sumAndNormalize,
  calculateAdjustedScore,
} from '@/lib/destiny-map/calendar/scoring-config'

describe('scoring-config', () => {
  describe('CATEGORY_MAX_SCORES', () => {
    it('should have correct saju category max scores', () => {
      expect(CATEGORY_MAX_SCORES.saju.daeun).toBe(8)
      expect(CATEGORY_MAX_SCORES.saju.seun).toBe(10)
      expect(CATEGORY_MAX_SCORES.saju.wolun).toBe(7)
      expect(CATEGORY_MAX_SCORES.saju.iljin).toBe(20)
      expect(CATEGORY_MAX_SCORES.saju.yongsin).toBe(5)
      expect(CATEGORY_MAX_SCORES.saju.total).toBe(50)
    })

    it('should have correct astro category max scores', () => {
      expect(CATEGORY_MAX_SCORES.astro.transitSun).toBe(8)
      expect(CATEGORY_MAX_SCORES.astro.transitMoon).toBe(12)
      expect(CATEGORY_MAX_SCORES.astro.majorPlanets).toBe(15)
      expect(CATEGORY_MAX_SCORES.astro.lunarPhase).toBe(8)
      expect(CATEGORY_MAX_SCORES.astro.solarReturn).toBe(7)
      expect(CATEGORY_MAX_SCORES.astro.total).toBe(50)
    })

    it('should have saju total equal to sum of parts', () => {
      const sum =
        CATEGORY_MAX_SCORES.saju.daeun +
        CATEGORY_MAX_SCORES.saju.seun +
        CATEGORY_MAX_SCORES.saju.wolun +
        CATEGORY_MAX_SCORES.saju.iljin +
        CATEGORY_MAX_SCORES.saju.yongsin
      expect(sum).toBe(CATEGORY_MAX_SCORES.saju.total)
    })

    it('should have astro total equal to sum of parts', () => {
      const sum =
        CATEGORY_MAX_SCORES.astro.transitSun +
        CATEGORY_MAX_SCORES.astro.transitMoon +
        CATEGORY_MAX_SCORES.astro.majorPlanets +
        CATEGORY_MAX_SCORES.astro.lunarPhase +
        CATEGORY_MAX_SCORES.astro.solarReturn
      expect(sum).toBe(CATEGORY_MAX_SCORES.astro.total)
    })

    it('should have correct grand total', () => {
      expect(CATEGORY_MAX_SCORES.grandTotal).toBe(100)
    })

    it('should have cross bonus within reasonable range', () => {
      expect(CATEGORY_MAX_SCORES.crossBonus).toBe(3)
      expect(CATEGORY_MAX_SCORES.crossBonus).toBeLessThan(10)
    })
  })

  describe('DAEUN_SCORES', () => {
    it('should have positive scores for beneficial factors', () => {
      expect(DAEUN_SCORES.positive.inseong).toBeGreaterThan(0)
      expect(DAEUN_SCORES.positive.jaeseong).toBeGreaterThan(0)
      expect(DAEUN_SCORES.positive.bijeon).toBeGreaterThan(0)
      expect(DAEUN_SCORES.positive.siksang).toBeGreaterThan(0)
      expect(DAEUN_SCORES.positive.yukhap).toBeGreaterThan(0)
      expect(DAEUN_SCORES.positive.samhapPositive).toBeGreaterThan(0)
    })

    it('should have negative scores for harmful factors', () => {
      expect(DAEUN_SCORES.negative.chung).toBeLessThan(0)
      expect(DAEUN_SCORES.negative.gwansal).toBeLessThan(0)
      expect(DAEUN_SCORES.negative.samhapNegative).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(DAEUN_SCORES.maxRaw).toBe(0.5)
    })

    it('should have inseong as most beneficial', () => {
      expect(DAEUN_SCORES.positive.inseong).toBeGreaterThanOrEqual(DAEUN_SCORES.positive.jaeseong)
    })
  })

  describe('SEUN_SCORES', () => {
    it('should have samjae special handling', () => {
      expect(SEUN_SCORES.samjae.base).toBeLessThan(0)
      expect(SEUN_SCORES.samjae.withChung).toBeLessThan(SEUN_SCORES.samjae.base)
      expect(SEUN_SCORES.samjae.withGwiin).toBeGreaterThan(0)
    })

    it('should have positive and negative factors', () => {
      expect(Object.keys(SEUN_SCORES.positive).length).toBeGreaterThan(0)
      expect(Object.keys(SEUN_SCORES.negative).length).toBeGreaterThan(0)
    })

    it('should have reasonable maxRaw', () => {
      expect(SEUN_SCORES.maxRaw).toBe(0.45)
    })
  })

  describe('WOLUN_SCORES', () => {
    it('should have all required positive factors', () => {
      expect(WOLUN_SCORES.positive).toHaveProperty('inseong')
      expect(WOLUN_SCORES.positive).toHaveProperty('jaeseong')
      expect(WOLUN_SCORES.positive).toHaveProperty('bijeon')
      expect(WOLUN_SCORES.positive).toHaveProperty('siksang')
      expect(WOLUN_SCORES.positive).toHaveProperty('yukhap')
      expect(WOLUN_SCORES.positive).toHaveProperty('samhapPositive')
    })

    it('should have all required negative factors', () => {
      expect(WOLUN_SCORES.negative).toHaveProperty('chung')
      expect(WOLUN_SCORES.negative).toHaveProperty('gwansal')
      expect(WOLUN_SCORES.negative).toHaveProperty('samhapNegative')
    })

    it('should have maxRaw value', () => {
      expect(WOLUN_SCORES.maxRaw).toBe(0.35)
    })
  })

  describe('ILJIN_SCORES', () => {
    it('should have all 10 sibsin types', () => {
      expect(Object.keys(ILJIN_SCORES.sipsin).length).toBe(10)
      expect(ILJIN_SCORES.sipsin).toHaveProperty('jeongyin')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('pyeonyin')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('jeongchaae')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('pyeonchaae')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('sikshin')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('sanggwan')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('jeongwan')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('pyeonwan')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('bijeon')
      expect(ILJIN_SCORES.sipsin).toHaveProperty('gyeobjae')
    })

    it('should have branch interaction scores', () => {
      expect(ILJIN_SCORES.branch).toHaveProperty('yukhap')
      expect(ILJIN_SCORES.branch).toHaveProperty('samhapPositive')
      expect(ILJIN_SCORES.branch).toHaveProperty('samhapNegative')
      expect(ILJIN_SCORES.branch).toHaveProperty('chung')
      expect(ILJIN_SCORES.branch).toHaveProperty('xing')
      expect(ILJIN_SCORES.branch).toHaveProperty('hai')
    })

    it('should have special day bonuses', () => {
      expect(ILJIN_SCORES.special.cheoneulGwiin).toBeGreaterThan(0.3)
      expect(ILJIN_SCORES.special.taegukGwiin).toBeGreaterThan(0.25)
      expect(ILJIN_SCORES.special.cheondeokGwiin).toBeGreaterThan(0.2)
      expect(ILJIN_SCORES.special.geonrok).toBeGreaterThan(0.2)
    })

    it('should have negative factors', () => {
      expect(ILJIN_SCORES.negative.gongmang).toBeLessThan(0)
      expect(ILJIN_SCORES.negative.wonjin).toBeLessThan(0)
      expect(ILJIN_SCORES.negative.yangin).toBeLessThan(0)
      expect(ILJIN_SCORES.negative.backho).toBeLessThan(0)
      expect(ILJIN_SCORES.negative.guimungwan).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(ILJIN_SCORES.maxRaw).toBe(0.7)
    })
  })

  describe('YONGSIN_SCORES', () => {
    it('should have positive yongsin matches', () => {
      expect(YONGSIN_SCORES.positive.primaryMatch).toBeGreaterThan(0)
      expect(YONGSIN_SCORES.positive.secondaryMatch).toBeGreaterThan(0)
      expect(YONGSIN_SCORES.positive.branchMatch).toBeGreaterThan(0)
      expect(YONGSIN_SCORES.positive.support).toBeGreaterThan(0)
    })

    it('should have negative kibsin factors', () => {
      expect(YONGSIN_SCORES.negative.kibsinMatch).toBeLessThan(0)
      expect(YONGSIN_SCORES.negative.kibsinBranch).toBeLessThan(0)
      expect(YONGSIN_SCORES.negative.harm).toBeLessThan(0)
    })

    it('should have geokguk factors', () => {
      expect(YONGSIN_SCORES.geokguk.favor).toBeGreaterThan(0)
      expect(YONGSIN_SCORES.geokguk.avoid).toBeLessThan(0)
      expect(YONGSIN_SCORES.geokguk.strengthBalance).toBeGreaterThan(0)
      expect(YONGSIN_SCORES.geokguk.strengthImbalance).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(YONGSIN_SCORES.maxRaw).toBe(0.5)
    })
  })

  describe('TRANSIT_SUN_SCORES', () => {
    it('should have all element relations', () => {
      expect(TRANSIT_SUN_SCORES.elementRelation).toHaveProperty('same')
      expect(TRANSIT_SUN_SCORES.elementRelation).toHaveProperty('generatedBy')
      expect(TRANSIT_SUN_SCORES.elementRelation).toHaveProperty('generates')
      expect(TRANSIT_SUN_SCORES.elementRelation).toHaveProperty('controlledBy')
      expect(TRANSIT_SUN_SCORES.elementRelation).toHaveProperty('controls')
    })

    it('should have same element as most beneficial', () => {
      expect(TRANSIT_SUN_SCORES.elementRelation.same).toBeGreaterThanOrEqual(
        TRANSIT_SUN_SCORES.elementRelation.generatedBy
      )
    })

    it('should have controlledBy as negative', () => {
      expect(TRANSIT_SUN_SCORES.elementRelation.controlledBy).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(TRANSIT_SUN_SCORES.maxRaw).toBe(0.4)
    })
  })

  describe('TRANSIT_MOON_SCORES', () => {
    it('should have element relations', () => {
      expect(Object.keys(TRANSIT_MOON_SCORES.elementRelation).length).toBe(5)
    })

    it('should have void of course penalty', () => {
      expect(TRANSIT_MOON_SCORES.voidOfCourse).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(TRANSIT_MOON_SCORES.maxRaw).toBe(0.4)
    })
  })

  describe('MAJOR_PLANETS_SCORES', () => {
    it('should have weights for all 5 planets', () => {
      expect(MAJOR_PLANETS_SCORES.weights).toHaveProperty('mercury')
      expect(MAJOR_PLANETS_SCORES.weights).toHaveProperty('venus')
      expect(MAJOR_PLANETS_SCORES.weights).toHaveProperty('mars')
      expect(MAJOR_PLANETS_SCORES.weights).toHaveProperty('jupiter')
      expect(MAJOR_PLANETS_SCORES.weights).toHaveProperty('saturn')
    })

    it('should have jupiter as most important', () => {
      expect(MAJOR_PLANETS_SCORES.weights.jupiter).toBeGreaterThanOrEqual(
        MAJOR_PLANETS_SCORES.weights.venus
      )
      expect(MAJOR_PLANETS_SCORES.weights.jupiter).toBeGreaterThanOrEqual(
        MAJOR_PLANETS_SCORES.weights.mercury
      )
    })

    it('should have all aspect types', () => {
      expect(MAJOR_PLANETS_SCORES.aspects).toHaveProperty('conjunction')
      expect(MAJOR_PLANETS_SCORES.aspects).toHaveProperty('trine')
      expect(MAJOR_PLANETS_SCORES.aspects).toHaveProperty('sextile')
      expect(MAJOR_PLANETS_SCORES.aspects).toHaveProperty('square')
      expect(MAJOR_PLANETS_SCORES.aspects).toHaveProperty('opposition')
    })

    it('should have positive aspects as beneficial', () => {
      expect(MAJOR_PLANETS_SCORES.aspects.conjunction).toBeGreaterThan(0)
      expect(MAJOR_PLANETS_SCORES.aspects.trine).toBeGreaterThan(0)
      expect(MAJOR_PLANETS_SCORES.aspects.sextile).toBeGreaterThan(0)
    })

    it('should have negative aspects as harmful', () => {
      expect(MAJOR_PLANETS_SCORES.aspects.square).toBeLessThan(0)
      expect(MAJOR_PLANETS_SCORES.aspects.opposition).toBeLessThan(0)
    })

    it('should have retrograde penalties', () => {
      expect(MAJOR_PLANETS_SCORES.retrograde.mercury).toBeLessThan(0)
      expect(MAJOR_PLANETS_SCORES.retrograde.venus).toBeLessThan(0)
      expect(MAJOR_PLANETS_SCORES.retrograde.mars).toBeLessThan(0)
      expect(MAJOR_PLANETS_SCORES.retrograde.jupiter).toBeLessThan(0)
      expect(MAJOR_PLANETS_SCORES.retrograde.saturn).toBeLessThan(0)
    })

    it('should have mercury retrograde as most impactful', () => {
      expect(MAJOR_PLANETS_SCORES.retrograde.mercury).toBeLessThanOrEqual(
        MAJOR_PLANETS_SCORES.retrograde.venus
      )
    })

    it('should have maxRaw value', () => {
      expect(MAJOR_PLANETS_SCORES.maxRaw).toBe(0.7)
    })
  })

  describe('LUNAR_PHASE_SCORES', () => {
    it('should have all 8 lunar phases', () => {
      expect(Object.keys(LUNAR_PHASE_SCORES).length).toBeGreaterThanOrEqual(8)
      expect(LUNAR_PHASE_SCORES).toHaveProperty('newMoon')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('waxingCrescent')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('firstQuarter')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('waxingGibbous')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('fullMoon')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('waningGibbous')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('lastQuarter')
      expect(LUNAR_PHASE_SCORES).toHaveProperty('waningCrescent')
    })

    it('should have full moon as most beneficial', () => {
      expect(LUNAR_PHASE_SCORES.fullMoon).toBeGreaterThanOrEqual(LUNAR_PHASE_SCORES.newMoon)
    })

    it('should have quarter moons as challenging', () => {
      expect(LUNAR_PHASE_SCORES.firstQuarter).toBeLessThan(0)
      expect(LUNAR_PHASE_SCORES.lastQuarter).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(LUNAR_PHASE_SCORES.maxRaw).toBe(0.35)
    })
  })

  describe('SOLAR_RETURN_SCORES', () => {
    it('should have birthday proximity scores', () => {
      expect(SOLAR_RETURN_SCORES.exactBirthday).toBeGreaterThan(0)
      expect(SOLAR_RETURN_SCORES.nearBirthday1).toBeGreaterThan(0)
      expect(SOLAR_RETURN_SCORES.nearBirthday3).toBeGreaterThan(0)
      expect(SOLAR_RETURN_SCORES.nearBirthday7).toBeGreaterThan(0)
    })

    it('should have decreasing bonus with distance from birthday', () => {
      expect(SOLAR_RETURN_SCORES.exactBirthday).toBeGreaterThan(SOLAR_RETURN_SCORES.nearBirthday1)
      expect(SOLAR_RETURN_SCORES.nearBirthday1).toBeGreaterThan(SOLAR_RETURN_SCORES.nearBirthday3)
      expect(SOLAR_RETURN_SCORES.nearBirthday3).toBeGreaterThan(SOLAR_RETURN_SCORES.nearBirthday7)
    })

    it('should have progression factors', () => {
      expect(SOLAR_RETURN_SCORES.progressionSupport).toBeGreaterThan(0)
      expect(SOLAR_RETURN_SCORES.progressionChallenge).toBeLessThan(0)
    })

    it('should have maxRaw value', () => {
      expect(SOLAR_RETURN_SCORES.maxRaw).toBe(0.4)
    })
  })

  describe('CROSS_VERIFICATION_SCORES', () => {
    it('should have both positive bonus', () => {
      expect(CROSS_VERIFICATION_SCORES.bothPositive).toBeGreaterThan(0)
    })

    it('should have both negative penalty', () => {
      expect(CROSS_VERIFICATION_SCORES.bothNegative).toBeLessThan(0)
    })

    it('should have mixed as neutral', () => {
      expect(CROSS_VERIFICATION_SCORES.mixed).toBe(0)
    })

    it('should have element alignment bonus', () => {
      expect(CROSS_VERIFICATION_SCORES.elementAlign).toBeGreaterThan(0)
    })

    it('should have threshold values', () => {
      expect(CROSS_VERIFICATION_SCORES.positiveThreshold).toBe(25)
      expect(CROSS_VERIFICATION_SCORES.negativeThreshold).toBe(20)
      expect(CROSS_VERIFICATION_SCORES.neutralMin).toBe(20)
      expect(CROSS_VERIFICATION_SCORES.neutralMax).toBe(25)
    })
  })

  describe('GRADE_THRESHOLDS', () => {
    it('should have all grade thresholds', () => {
      expect(GRADE_THRESHOLDS).toHaveProperty('grade0')
      expect(GRADE_THRESHOLDS).toHaveProperty('grade1')
      expect(GRADE_THRESHOLDS).toHaveProperty('grade2')
      expect(GRADE_THRESHOLDS).toHaveProperty('grade3')
    })

    it('should have descending threshold values', () => {
      expect(GRADE_THRESHOLDS.grade0).toBeGreaterThan(GRADE_THRESHOLDS.grade1)
      expect(GRADE_THRESHOLDS.grade1).toBeGreaterThan(GRADE_THRESHOLDS.grade2)
      expect(GRADE_THRESHOLDS.grade2).toBeGreaterThan(GRADE_THRESHOLDS.grade3)
    })

    it('should have grade0 as highest threshold', () => {
      expect(GRADE_THRESHOLDS.grade0).toBe(68)
    })

    it('should have grade3 as lowest threshold', () => {
      expect(GRADE_THRESHOLDS.grade3).toBe(28)
    })

    it('should have realistic threshold values', () => {
      expect(GRADE_THRESHOLDS.grade0).toBeLessThanOrEqual(100)
      expect(GRADE_THRESHOLDS.grade3).toBeGreaterThanOrEqual(0)
    })
  })

  describe('display score label consistency', () => {
    it('should use backend-exported display thresholds', () => {
      expect(DISPLAY_SCORE_LABEL_THRESHOLDS.best).toBe(GRADE_THRESHOLDS.grade0)
      expect(DISPLAY_SCORE_LABEL_THRESHOLDS.good).toBe(GRADE_THRESHOLDS.grade1)
      expect(DISPLAY_SCORE_LABEL_THRESHOLDS.neutral).toBe(GRADE_THRESHOLDS.grade2)
    })

    it('should keep label and badge grade consistent on 68~70 boundary', () => {
      const cases = [
        { score: 68, grade: 0, labelKo: '최고' },
        { score: 69, grade: 0, labelKo: '최고' },
        { score: 70, grade: 0, labelKo: '최고' },
      ]

      for (const c of cases) {
        expect(getDisplayGradeFromScore(c.score)).toBe(c.grade)
        expect(getDisplayLabelFromScore(c.score, 'ko')).toBe(c.labelKo)
      }
    })
  })

  describe('normalizeToCategory', () => {
    it('should return 0 when rawScore is at minimum', () => {
      const result = normalizeToCategory(-0.5, 0.5, 10)
      expect(result).toBe(0)
    })

    it('should return categoryMax when rawScore is at maximum', () => {
      const result = normalizeToCategory(0.5, 0.5, 10)
      expect(result).toBe(10)
    })

    it('should return half categoryMax when rawScore is 0', () => {
      const result = normalizeToCategory(0, 0.5, 10)
      expect(result).toBe(5)
    })

    it('should handle negative categoryMax', () => {
      const result = normalizeToCategory(0, 0.5, -10)
      expect(result).toBe(-5)
    })

    it('should clamp values below minimum', () => {
      const result = normalizeToCategory(-1, 0.5, 10)
      expect(result).toBe(0)
    })

    it('should clamp values above maximum', () => {
      const result = normalizeToCategory(1, 0.5, 10)
      expect(result).toBe(10)
    })

    it('should round to 1 decimal place', () => {
      const result = normalizeToCategory(0.123, 0.5, 10)
      expect(result.toString()).toMatch(/^\d+\.\d$/)
    })
  })

  describe('sumAndNormalize', () => {
    it('should sum and normalize multiple scores', () => {
      const scores = [0.1, 0.2, 0.3]
      const result = sumAndNormalize(scores, 0.6, 10)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should handle empty array', () => {
      const result = sumAndNormalize([], 0.5, 10)
      expect(result).toBe(5)
    })

    it('should handle single score', () => {
      const result = sumAndNormalize([0.25], 0.5, 10)
      expect(result).toBeGreaterThan(5)
    })

    it('should handle negative scores', () => {
      const scores = [-0.1, -0.2]
      const result = sumAndNormalize(scores, 0.5, 10)
      expect(result).toBeLessThan(5)
    })

    it('should handle mixed positive and negative scores', () => {
      const scores = [0.2, -0.1]
      const result = sumAndNormalize(scores, 0.5, 10)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(10)
    })
  })

  describe('calculateAdjustedScore', () => {
    it('should return base score with no adjustments', () => {
      const result = calculateAdjustedScore(10, [], 0.5)
      expect(result).toBe(4.5) // 45% of 10
    })

    it('should increase score with positive adjustments', () => {
      const result = calculateAdjustedScore(10, [0.1], 0.5)
      expect(result).toBeGreaterThan(4.5)
    })

    it('should decrease score with negative adjustments', () => {
      const result = calculateAdjustedScore(10, [-0.1], 0.5)
      expect(result).toBeLessThan(4.5)
    })

    it('should not exceed categoryMax', () => {
      const result = calculateAdjustedScore(10, [1, 1, 1], 0.5)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should not go below 0', () => {
      const result = calculateAdjustedScore(10, [-1, -1, -1], 0.5)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should handle multiple adjustments', () => {
      const result = calculateAdjustedScore(10, [0.05, 0.1, -0.03], 0.5)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('should round to 1 decimal place', () => {
      const result = calculateAdjustedScore(10, [0.123], 0.5)
      expect(result.toString()).toMatch(/^\d+\.\d$/)
    })

    it('should use 2.2 amplification factor', () => {
      const base = 10 * 0.45 // 4.5
      const adj = 0.1 * 2.2 * 10 // 2.2
      const expected = Math.round(Math.min(10, base + adj) * 10) / 10
      const result = calculateAdjustedScore(10, [0.1], 0.5)
      expect(result).toBe(expected)
    })
  })

  describe('Score configuration consistency', () => {
    it('should have all positive scores less than maxRaw', () => {
      const allPositiveScores = [
        ...Object.values(DAEUN_SCORES.positive),
        ...Object.values(SEUN_SCORES.positive),
        ...Object.values(WOLUN_SCORES.positive),
        ...Object.values(ILJIN_SCORES.sipsin).filter((v) => v > 0),
        ...Object.values(ILJIN_SCORES.branch).filter((v) => v > 0),
        ...Object.values(ILJIN_SCORES.special),
      ]

      allPositiveScores.forEach((score) => {
        expect(Math.abs(score)).toBeLessThanOrEqual(1)
      })
    })

    it('should have all negative scores greater than negative maxRaw', () => {
      const allNegativeScores = [
        ...Object.values(DAEUN_SCORES.negative),
        ...Object.values(SEUN_SCORES.negative),
        ...Object.values(WOLUN_SCORES.negative),
        ...Object.values(ILJIN_SCORES.sipsin).filter((v) => v < 0),
        ...Object.values(ILJIN_SCORES.branch).filter((v) => v < 0),
        ...Object.values(ILJIN_SCORES.negative),
      ]

      allNegativeScores.forEach((score) => {
        expect(Math.abs(score)).toBeLessThanOrEqual(1)
      })
    })

    it('should have reasonable element relation scores', () => {
      const sunRelations = Object.values(TRANSIT_SUN_SCORES.elementRelation)
      sunRelations.forEach((score) => {
        expect(Math.abs(score)).toBeLessThan(1)
      })

      const moonRelations = Object.values(TRANSIT_MOON_SCORES.elementRelation)
      moonRelations.forEach((score) => {
        expect(Math.abs(score)).toBeLessThan(1)
      })
    })

    it('should have total planet weights reasonable', () => {
      const totalWeight =
        MAJOR_PLANETS_SCORES.weights.mercury +
        MAJOR_PLANETS_SCORES.weights.venus +
        MAJOR_PLANETS_SCORES.weights.mars +
        MAJOR_PLANETS_SCORES.weights.jupiter +
        MAJOR_PLANETS_SCORES.weights.saturn

      expect(totalWeight).toBeGreaterThan(0)
      expect(totalWeight).toBeLessThan(5)
    })

    it('should have samjae offset behavior correct', () => {
      expect(SEUN_SCORES.samjae.withGwiin).toBeGreaterThan(SEUN_SCORES.samjae.base)
      expect(SEUN_SCORES.samjae.withChung).toBeLessThan(SEUN_SCORES.samjae.base)
    })
  })
})
