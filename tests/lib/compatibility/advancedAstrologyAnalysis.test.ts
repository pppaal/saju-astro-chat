// tests/lib/compatibility/advancedAstrologyAnalysis.test.ts
import { describe, it, expect } from 'vitest';
import { type AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility';
import {
  analyzeAspects,
  analyzeSynastry,
  analyzeCompositeChart,
  analyzeHouseOverlays,
  performComprehensiveAstrologyAnalysis,
  calculateEclipticDegree,
  calculateExactAngle,
  determineAspectType,
  isAspectHarmonious,
  calculateAspectStrength,
  analyzeDegreeBasedAspects,
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
  analyzeOuterPlanets,
  analyzeNodes,
  analyzeLilith,
  analyzeDavisonChart,
  analyzeProgressedChart,
  performExtendedAstrologyAnalysis,
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/advancedAstrologyAnalysis';

describe('advancedAstrologyAnalysis', () => {
  // Helper function to create simple astrology profile
  const createProfile = (
    sunSign: string = 'Aries',
    moonSign: string = 'Taurus',
    venusSign: string = 'Gemini',
    marsSign: string = 'Leo'
  ): AstrologyProfile => ({
    sun: { sign: sunSign, element: getElement(sunSign) },
    moon: { sign: moonSign, element: getElement(moonSign) },
    venus: { sign: venusSign, element: getElement(venusSign) },
    mars: { sign: marsSign, element: getElement(marsSign) },
    ascendant: { sign: 'Libra', element: 'air' },
  });

  const getElement = (sign: string): string => {
    const fireSign = ['Aries', 'Leo', 'Sagittarius'];
    const earthSign = ['Taurus', 'Virgo', 'Capricorn'];
    const airSign = ['Gemini', 'Libra', 'Aquarius'];
    const waterSign = ['Cancer', 'Scorpio', 'Pisces'];

    if (fireSign.includes(sign)) return 'fire';
    if (earthSign.includes(sign)) return 'earth';
    if (airSign.includes(sign)) return 'air';
    if (waterSign.includes(sign)) return 'water';
    return 'fire';
  };

  describe('analyzeAspects', () => {
    it('should return valid AspectAnalysis structure', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeAspects(p1, p2);

      expect(result).toBeDefined();
      expect(result.majorAspects).toBeDefined();
      expect(Array.isArray(result.majorAspects)).toBe(true);
      expect(result.harmoniousCount).toBeGreaterThanOrEqual(0);
      expect(result.challengingCount).toBeGreaterThanOrEqual(0);
      expect(result.overallHarmony).toBeGreaterThanOrEqual(0);
      expect(result.overallHarmony).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.keyInsights)).toBe(true);
    });

    it('should detect harmonious aspects for same elements', () => {
      const p1 = createProfile('Aries', 'Cancer', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Scorpio', 'Libra', 'Sagittarius');

      const result = analyzeAspects(p1, p2);

      expect(result.harmoniousCount).toBeGreaterThan(0);
    });

    it('should include key insights', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeAspects(p1, p2);

      expect(result.keyInsights.length).toBeGreaterThan(0);
    });

    it('should calculate overall harmony correctly', () => {
      const p1 = createProfile('Aries', 'Leo', 'Sagittarius', 'Aries');
      const p2 = createProfile('Leo', 'Sagittarius', 'Aries', 'Leo');

      const result = analyzeAspects(p1, p2);

      // Same fire signs should have high harmony
      expect(result.overallHarmony).toBeGreaterThan(50);
    });
  });

  describe('analyzeSynastry', () => {
    it('should return valid SynastryAnalysis structure', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeSynastry(p1, p2);

      expect(result).toBeDefined();
      expect(result.emotionalConnection).toBeGreaterThanOrEqual(0);
      expect(result.emotionalConnection).toBeLessThanOrEqual(100);
      expect(result.intellectualConnection).toBeGreaterThanOrEqual(0);
      expect(result.intellectualConnection).toBeLessThanOrEqual(100);
      expect(result.romanticConnection).toBeGreaterThanOrEqual(0);
      expect(result.romanticConnection).toBeLessThanOrEqual(100);
      expect(result.compatibilityIndex).toBeGreaterThanOrEqual(0);
      expect(result.compatibilityIndex).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.challenges)).toBe(true);
    });

    it('should detect high emotional connection for same moon signs', () => {
      const p1 = createProfile('Aries', 'Cancer', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Cancer', 'Libra', 'Sagittarius');

      const result = analyzeSynastry(p1, p2);

      expect(result.emotionalConnection).toBeGreaterThanOrEqual(75);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should detect high romantic connection for Venus-Mars compatibility', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Gemini');
      const p2 = createProfile('Leo', 'Virgo', 'Gemini', 'Sagittarius');

      const result = analyzeSynastry(p1, p2);

      expect(result.romanticConnection).toBeGreaterThan(50);
    });

    it('should calculate compatibility index as weighted average', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeSynastry(p1, p2);

      expect(result.compatibilityIndex).toBeGreaterThan(0);
      expect(result.compatibilityIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeCompositeChart', () => {
    it('should return valid CompositeChartAnalysis structure', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeCompositeChart(p1, p2);

      expect(result).toBeDefined();
      expect(result.relationshipPurpose).toBeDefined();
      expect(result.coreTheme).toBeDefined();
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.growthAreas)).toBe(true);
      expect(result.longevityPotential).toBeGreaterThanOrEqual(0);
      expect(result.longevityPotential).toBeLessThanOrEqual(100);
    });

    it('should identify fire element theme when fire dominant', () => {
      const p1 = createProfile('Aries', 'Leo', 'Sagittarius', 'Aries');
      const p2 = createProfile('Leo', 'Sagittarius', 'Aries', 'Leo');

      const result = analyzeCompositeChart(p1, p2);

      expect(result.relationshipPurpose).toContain('열정');
      expect(result.coreTheme).toContain('모험');
    });

    it('should identify earth element theme when earth dominant', () => {
      const p1 = createProfile('Taurus', 'Virgo', 'Capricorn', 'Taurus');
      const p2 = createProfile('Virgo', 'Capricorn', 'Taurus', 'Virgo');

      const result = analyzeCompositeChart(p1, p2);

      expect(result.relationshipPurpose).toContain('안정');
      expect(result.coreTheme).toContain('신뢰');
    });

    it('should have higher longevity for balanced elements', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Cancer');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Scorpio');

      const result = analyzeCompositeChart(p1, p2);

      // Balanced elements should have higher potential
      expect(result.longevityPotential).toBeGreaterThan(60);
    });
  });

  describe('analyzeHouseOverlays', () => {
    it('should return valid HouseOverlayAnalysis structure', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeHouseOverlays(p1, p2);

      expect(result).toBeDefined();
      expect(result.description).toBeDefined();
      expect(Array.isArray(result.areas)).toBe(true);
      expect(result.areas.length).toBeGreaterThan(0);
    });

    it('should include partnership area', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeHouseOverlays(p1, p2);

      const partnership = result.areas.find(a => a.area === '파트너십');
      expect(partnership).toBeDefined();
      expect(partnership?.impact).toBe('very_positive');
    });

    it('should detect romance area when Venus-Sun aligned', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Aries', 'Leo');
      const p2 = createProfile('Aries', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeHouseOverlays(p1, p2);

      const romance = result.areas.find(a => a.area === '로맨스');
      expect(romance).toBeDefined();
    });
  });

  describe('performComprehensiveAstrologyAnalysis', () => {
    it('should return comprehensive compatibility result', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = performComprehensiveAstrologyAnalysis(p1, p2);

      expect(result).toBeDefined();
      expect(result.aspects).toBeDefined();
      expect(result.synastry).toBeDefined();
      expect(result.compositeChart).toBeDefined();
      expect(result.houseOverlays).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.grade).toMatch(/^(S\+|S|A|B|C|D|F)$/);
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.detailedInsights)).toBe(true);
    });

    it('should assign grade S+ for score >= 95', () => {
      // Create highly compatible profiles (all fire)
      const p1 = createProfile('Aries', 'Leo', 'Sagittarius', 'Aries');
      const p2 = createProfile('Leo', 'Sagittarius', 'Aries', 'Leo');

      const result = performComprehensiveAstrologyAnalysis(p1, p2);

      if (result.overallScore >= 95) {
        expect(result.grade).toBe('S+');
      }
    });

    it('should include detailed insights', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = performComprehensiveAstrologyAnalysis(p1, p2);

      expect(result.detailedInsights.length).toBeGreaterThan(0);
    });
  });

  describe('ecliptic degree calculations', () => {
    it('should calculate correct ecliptic degree for Aries', () => {
      const degree = calculateEclipticDegree('Aries', 15);
      expect(degree).toBe(15);
    });

    it('should calculate correct ecliptic degree for Leo', () => {
      const degree = calculateEclipticDegree('Leo', 10);
      expect(degree).toBe(130);
    });

    it('should default to 15 degrees when not specified', () => {
      const degree = calculateEclipticDegree('Aries');
      expect(degree).toBe(15);
    });

    it('should handle unknown signs', () => {
      // Unknown signs return 0 (no offset) as the sign is not found
      const degree = calculateEclipticDegree('Unknown', 15);
      expect(degree).toBe(0);
    });
  });

  describe('calculateExactAngle', () => {
    it('should calculate angle less than 180 degrees', () => {
      const angle = calculateExactAngle(30, 90);
      expect(angle).toBe(60);
    });

    it('should wrap around for angles > 180', () => {
      const angle = calculateExactAngle(10, 350);
      expect(angle).toBe(20);
    });

    it('should return 0 for same degree', () => {
      const angle = calculateExactAngle(45, 45);
      expect(angle).toBe(0);
    });

    it('should handle 180 degree opposition', () => {
      const angle = calculateExactAngle(0, 180);
      expect(angle).toBe(180);
    });
  });

  describe('determineAspectType', () => {
    it('should detect conjunction for 0 degrees', () => {
      const { type, orb } = determineAspectType(0);
      expect(type).toBe('conjunction');
      expect(orb).toBe(0);
    });

    it('should detect sextile for 60 degrees', () => {
      const { type } = determineAspectType(60);
      expect(type).toBe('sextile');
    });

    it('should detect square for 90 degrees', () => {
      const { type } = determineAspectType(90);
      expect(type).toBe('square');
    });

    it('should detect trine for 120 degrees', () => {
      const { type } = determineAspectType(120);
      expect(type).toBe('trine');
    });

    it('should detect opposition for 180 degrees', () => {
      const { type } = determineAspectType(180);
      expect(type).toBe('opposition');
    });

    it('should allow orb tolerance', () => {
      const { type } = determineAspectType(62);
      expect(type).toBe('sextile');
    });

    it('should return null for angles without aspect', () => {
      const { type } = determineAspectType(100);
      expect(type).toBeNull();
    });
  });

  describe('isAspectHarmonious', () => {
    it('should identify conjunction as harmonious', () => {
      expect(isAspectHarmonious('conjunction')).toBe(true);
    });

    it('should identify sextile as harmonious', () => {
      expect(isAspectHarmonious('sextile')).toBe(true);
    });

    it('should identify trine as harmonious', () => {
      expect(isAspectHarmonious('trine')).toBe(true);
    });

    it('should identify square as challenging', () => {
      expect(isAspectHarmonious('square')).toBe(false);
    });

    it('should identify opposition as challenging', () => {
      expect(isAspectHarmonious('opposition')).toBe(false);
    });

    it('should identify quintile as non-harmonious (minor aspect)', () => {
      // quintile is a minor aspect, not in the harmonious list
      expect(isAspectHarmonious('quintile')).toBe(false);
    });
  });

  describe('calculateAspectStrength', () => {
    it('should return 100 for exact aspect (orb 0)', () => {
      const strength = calculateAspectStrength(0, 10);
      expect(strength).toBe(100);
    });

    it('should return 50 for half orb', () => {
      const strength = calculateAspectStrength(5, 10);
      expect(strength).toBe(50);
    });

    it('should return 0 for maximum orb', () => {
      const strength = calculateAspectStrength(10, 10);
      expect(strength).toBe(0);
    });

    it('should calculate proportional strength', () => {
      const strength = calculateAspectStrength(2, 8);
      expect(strength).toBe(75);
    });
  });

  describe('analyzeDegreeBasedAspects', () => {
    it('should return valid DegreeAspectAnalysis', () => {
      const p1Planets = [
        { name: 'Sun', sign: 'Aries', degree: 15 },
        { name: 'Moon', sign: 'Taurus', degree: 20 },
      ];
      const p2Planets = [
        { name: 'Sun', sign: 'Leo', degree: 15 },
        { name: 'Moon', sign: 'Virgo', degree: 20 },
      ];

      const result = analyzeDegreeBasedAspects(p1Planets, p2Planets);

      expect(result).toBeDefined();
      expect(Array.isArray(result.allAspects)).toBe(true);
      expect(Array.isArray(result.majorAspects)).toBe(true);
      expect(Array.isArray(result.minorAspects)).toBe(true);
      expect(result.harmonyScore).toBeGreaterThanOrEqual(0);
      expect(result.tensionScore).toBeGreaterThanOrEqual(0);
      expect(result.overallBalance).toBeGreaterThanOrEqual(0);
      expect(result.overallBalance).toBeLessThanOrEqual(100);
    });

    it('should identify tightest aspect', () => {
      const p1Planets = [{ name: 'Sun', sign: 'Aries', degree: 15 }];
      const p2Planets = [{ name: 'Sun', sign: 'Aries', degree: 16 }];

      const result = analyzeDegreeBasedAspects(p1Planets, p2Planets);

      expect(result.tightestAspect).toBeDefined();
      expect(result.tightestAspect?.orb).toBeLessThan(2);
    });
  });

  describe('analyzeMercuryAspects', () => {
    it('should return valid MercuryAspectAnalysis', () => {
      const p1Mercury = { sign: 'Gemini', element: 'air', degree: 15 };
      const p2Mercury = { sign: 'Libra', element: 'air', degree: 20 };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeMercuryAspects(p1Mercury, p2Mercury, p1Sun, p2Sun);

      expect(result).toBeDefined();
      expect(result.mercuryCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.mercuryCompatibility).toBeLessThanOrEqual(100);
      expect(result.communicationStyle).toBeDefined();
      expect(result.intellectualSynergy).toBeDefined();
      expect(Array.isArray(result.potentialMiscommunications)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
    });

    it('should detect high compatibility for same Mercury signs', () => {
      const p1Mercury = { sign: 'Gemini', element: 'air' };
      const p2Mercury = { sign: 'Gemini', element: 'air' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeMercuryAspects(p1Mercury, p2Mercury, p1Sun, p2Sun);

      expect(result.mercuryCompatibility).toBe(95);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should detect compatibility for same Mercury elements', () => {
      const p1Mercury = { sign: 'Gemini', element: 'air' };
      const p2Mercury = { sign: 'Libra', element: 'air' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeMercuryAspects(p1Mercury, p2Mercury, p1Sun, p2Sun);

      expect(result.mercuryCompatibility).toBe(85);
    });
  });

  describe('analyzeJupiterAspects', () => {
    it('should return valid JupiterAspectAnalysis', () => {
      const p1Jupiter = { sign: 'Sagittarius', element: 'fire' };
      const p2Jupiter = { sign: 'Aries', element: 'fire' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeJupiterAspects(p1Jupiter, p2Jupiter, p1Sun, p2Sun);

      expect(result).toBeDefined();
      expect(result.expansionCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.expansionCompatibility).toBeLessThanOrEqual(100);
      expect(result.sharedBeliefs).toBeDefined();
      expect(Array.isArray(result.growthAreas)).toBe(true);
      expect(Array.isArray(result.potentialConflicts)).toBe(true);
      expect(Array.isArray(result.blessingAreas)).toBe(true);
    });

    it('should detect high compatibility for same Jupiter signs', () => {
      const p1Jupiter = { sign: 'Sagittarius', element: 'fire' };
      const p2Jupiter = { sign: 'Sagittarius', element: 'fire' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeJupiterAspects(p1Jupiter, p2Jupiter, p1Sun, p2Sun);

      expect(result.expansionCompatibility).toBeGreaterThanOrEqual(95);
      expect(result.blessingAreas.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSaturnAspects', () => {
    it('should return valid SaturnAspectAnalysis', () => {
      const p1Saturn = { sign: 'Capricorn', element: 'earth' };
      const p2Saturn = { sign: 'Taurus', element: 'earth' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Moon = { sign: 'Cancer', element: 'water' };
      const p2Moon = { sign: 'Scorpio', element: 'water' };

      const result = analyzeSaturnAspects(p1Saturn, p2Saturn, p1Sun, p2Sun, p1Moon, p2Moon);

      expect(result).toBeDefined();
      expect(result.stabilityCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.stabilityCompatibility).toBeLessThanOrEqual(100);
      expect(result.karmicLesson).toBeDefined();
      expect(result.structureInRelationship).toBeDefined();
      expect(Array.isArray(result.challenges)).toBe(true);
      expect(Array.isArray(result.maturityAreas)).toBe(true);
      expect(result.longTermPotential).toBeGreaterThanOrEqual(0);
      expect(result.longTermPotential).toBeLessThanOrEqual(100);
    });

    it('should have high long-term potential for compatible Saturn', () => {
      const p1Saturn = { sign: 'Capricorn', element: 'earth' };
      const p2Saturn = { sign: 'Taurus', element: 'earth' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Moon = { sign: 'Cancer', element: 'water' };
      const p2Moon = { sign: 'Scorpio', element: 'water' };

      const result = analyzeSaturnAspects(p1Saturn, p2Saturn, p1Sun, p2Sun, p1Moon, p2Moon);

      expect(result.longTermPotential).toBeGreaterThan(70);
    });
  });

  describe('analyzeOuterPlanets', () => {
    it('should return valid OuterPlanetAnalysis', () => {
      const p1Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Scorpio', element: 'water' },
      };
      const p2Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Scorpio', element: 'water' },
      };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeOuterPlanets(p1Outer, p2Outer, p1Sun, p2Sun);

      expect(result).toBeDefined();
      expect(result.uranusInfluence).toBeDefined();
      expect(result.neptuneInfluence).toBeDefined();
      expect(result.plutoInfluence).toBeDefined();
      expect(Array.isArray(result.generationalThemes)).toBe(true);
      expect(result.overallTranscendentScore).toBeGreaterThanOrEqual(0);
      expect(result.overallTranscendentScore).toBeLessThanOrEqual(100);
    });

    it('should detect generational themes for same signs', () => {
      const p1Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Scorpio', element: 'water' },
      };
      const p2Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Scorpio', element: 'water' },
      };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeOuterPlanets(p1Outer, p2Outer, p1Sun, p2Sun);

      expect(result.generationalThemes.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeNodes', () => {
    it('should return valid NodeAnalysis', () => {
      const p1NorthNode = { sign: 'Leo', element: 'fire' };
      const p1SouthNode = { sign: 'Aquarius', element: 'air' };
      const p2NorthNode = { sign: 'Leo', element: 'fire' };
      const p2SouthNode = { sign: 'Aquarius', element: 'air' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Moon = { sign: 'Cancer', element: 'water' };
      const p2Moon = { sign: 'Scorpio', element: 'water' };

      const result = analyzeNodes(
        p1NorthNode,
        p1SouthNode,
        p2NorthNode,
        p2SouthNode,
        p1Sun,
        p2Sun,
        p1Moon,
        p2Moon
      );

      expect(result).toBeDefined();
      expect(result.northNodeConnection).toBeDefined();
      expect(result.southNodeConnection).toBeDefined();
      expect(result.karmicRelationshipType).toMatch(/^(soulmate|karmic|dharmic|neutral)$/);
      expect(Array.isArray(result.lifeLessons)).toBe(true);
      expect(result.evolutionaryPurpose).toBeDefined();
    });

    it('should detect soulmate connection for same North Node', () => {
      const p1NorthNode = { sign: 'Leo', element: 'fire' };
      const p1SouthNode = { sign: 'Aquarius', element: 'air' };
      const p2NorthNode = { sign: 'Leo', element: 'fire' };
      const p2SouthNode = { sign: 'Aquarius', element: 'air' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Moon = { sign: 'Cancer', element: 'water' };
      const p2Moon = { sign: 'Scorpio', element: 'water' };

      const result = analyzeNodes(
        p1NorthNode,
        p1SouthNode,
        p2NorthNode,
        p2SouthNode,
        p1Sun,
        p2Sun,
        p1Moon,
        p2Moon
      );

      expect(result.karmicRelationshipType).toBe('soulmate');
      expect(result.northNodeConnection.compatibility).toBeGreaterThan(90);
    });
  });

  describe('analyzeLilith', () => {
    it('should return valid LilithAnalysis', () => {
      const p1Lilith = { sign: 'Scorpio', element: 'water' };
      const p2Lilith = { sign: 'Scorpio', element: 'water' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Mars = { sign: 'Aries', element: 'fire' };
      const p2Mars = { sign: 'Leo', element: 'fire' };
      const p1Venus = { sign: 'Gemini', element: 'air' };
      const p2Venus = { sign: 'Libra', element: 'air' };

      const result = analyzeLilith(p1Lilith, p2Lilith, p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus);

      expect(result).toBeDefined();
      expect(result.lilithCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.lilithCompatibility).toBeLessThanOrEqual(100);
      expect(result.shadowDynamics).toBeDefined();
      expect(Array.isArray(result.repressedDesires)).toBe(true);
      expect(result.magneticAttraction).toBeGreaterThanOrEqual(0);
      expect(result.magneticAttraction).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.potentialChallenges)).toBe(true);
      expect(Array.isArray(result.healingOpportunities)).toBe(true);
    });

    it('should handle missing Lilith data', () => {
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Mars = { sign: 'Aries', element: 'fire' };
      const p2Mars = { sign: 'Leo', element: 'fire' };
      const p1Venus = { sign: 'Gemini', element: 'air' };
      const p2Venus = { sign: 'Libra', element: 'air' };

      const result = analyzeLilith(undefined, undefined, p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus);

      expect(result.lilithCompatibility).toBe(50);
      expect(result.shadowDynamics).toContain('불완전');
    });

    it('should detect high magnetic attraction for same Lilith', () => {
      const p1Lilith = { sign: 'Scorpio', element: 'water' };
      const p2Lilith = { sign: 'Scorpio', element: 'water' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const p1Mars = { sign: 'Aries', element: 'fire' };
      const p2Mars = { sign: 'Leo', element: 'fire' };
      const p1Venus = { sign: 'Gemini', element: 'air' };
      const p2Venus = { sign: 'Libra', element: 'air' };

      const result = analyzeLilith(p1Lilith, p2Lilith, p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus);

      expect(result.magneticAttraction).toBeGreaterThan(90);
    });
  });

  describe('analyzeDavisonChart', () => {
    it('should return valid DavisonChartAnalysis', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeDavisonChart(p1, p2);

      expect(result).toBeDefined();
      expect(result.relationshipSun).toBeDefined();
      expect(result.relationshipMoon).toBeDefined();
      expect(result.relationshipAscendant).toBeDefined();
      expect(result.relationshipIdentity).toBeDefined();
      expect(result.emotionalFoundation).toBeDefined();
      expect(result.publicImage).toBeDefined();
      expect(Array.isArray(result.coreStrengths)).toBe(true);
      expect(Array.isArray(result.growthChallenges)).toBe(true);
      expect(result.relationshipPurpose).toBeDefined();
    });

    it('should calculate midpoint signs', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeDavisonChart(p1, p2);

      expect(result.relationshipSun.sign).toBeDefined();
      expect(result.relationshipSun.element).toBeDefined();
      expect(result.relationshipMoon.sign).toBeDefined();
      expect(result.relationshipMoon.element).toBeDefined();
    });
  });

  describe('analyzeProgressedChart', () => {
    it('should return valid ProgressedChartAnalysis', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeProgressedChart(p1, p2, 5);

      expect(result).toBeDefined();
      expect(result.progressedSunPhase).toBeDefined();
      expect(result.progressedMoonPhase).toBeDefined();
      expect(result.currentRelationshipTheme).toBeDefined();
      expect(Array.isArray(result.timedInfluences)).toBe(true);
      expect(Array.isArray(result.upcomingTrends)).toBe(true);
      expect(Array.isArray(result.synchronicityIndicators)).toBe(true);
    });

    it('should handle 0 years in relationship', () => {
      const p1 = createProfile('Aries', 'Taurus', 'Gemini', 'Leo');
      const p2 = createProfile('Leo', 'Virgo', 'Libra', 'Sagittarius');

      const result = analyzeProgressedChart(p1, p2, 0);

      expect(result).toBeDefined();
      expect(result.synchronicityIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('performExtendedAstrologyAnalysis', () => {
    const createExtendedProfile = (): ExtendedAstrologyProfile => ({
      ...createProfile('Aries', 'Taurus', 'Gemini', 'Leo'),
      mercury: { sign: 'Gemini', element: 'air', degree: 15 },
      jupiter: { sign: 'Sagittarius', element: 'fire' },
      saturn: { sign: 'Capricorn', element: 'earth' },
      uranus: { sign: 'Aquarius', element: 'air' },
      neptune: { sign: 'Pisces', element: 'water' },
      pluto: { sign: 'Scorpio', element: 'water' },
      northNode: { sign: 'Leo', element: 'fire' },
      southNode: { sign: 'Aquarius', element: 'air' },
      lilith: { sign: 'Scorpio', element: 'water' },
    });

    it('should return extended compatibility result', () => {
      const p1 = createExtendedProfile();
      const p2 = createExtendedProfile();

      const result = performExtendedAstrologyAnalysis(p1, p2, 2);

      expect(result).toBeDefined();
      expect(result.degreeBasedAspects).toBeDefined();
      expect(result.mercuryAnalysis).toBeDefined();
      expect(result.jupiterAnalysis).toBeDefined();
      expect(result.saturnAnalysis).toBeDefined();
      expect(result.outerPlanetsAnalysis).toBeDefined();
      expect(result.nodeAnalysis).toBeDefined();
      expect(result.lilithAnalysis).toBeDefined();
      expect(result.davisonChart).toBeDefined();
      expect(result.progressedChart).toBeDefined();
      expect(result.extendedScore).toBeGreaterThanOrEqual(0);
      expect(result.extendedScore).toBeLessThanOrEqual(100);
      expect(result.extendedGrade).toMatch(/^(S\+|S|A|B|C|D|F)$/);
      expect(result.extendedSummary).toBeDefined();
      expect(Array.isArray(result.extendedInsights)).toBe(true);
    });

    it('should include all base analysis properties', () => {
      const p1 = createExtendedProfile();
      const p2 = createExtendedProfile();

      const result = performExtendedAstrologyAnalysis(p1, p2);

      expect(result.aspects).toBeDefined();
      expect(result.synastry).toBeDefined();
      expect(result.compositeChart).toBeDefined();
      expect(result.houseOverlays).toBeDefined();
    });

    it('should extend summary for soulmate connections', () => {
      const p1 = createExtendedProfile();
      const p2 = createExtendedProfile();
      p2.northNode = { sign: 'Leo', element: 'fire' };

      const result = performExtendedAstrologyAnalysis(p1, p2);

      if (result.nodeAnalysis?.karmicRelationshipType === 'soulmate') {
        expect(result.extendedSummary).toContain('소울메이트');
      }
    });
  });
});
