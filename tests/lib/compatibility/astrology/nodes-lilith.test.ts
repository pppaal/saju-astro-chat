/**
 * Tests for src/lib/compatibility/astrology/nodes-lilith.ts
 * 노드/릴리스 분석 테스트
 */

import { describe, it, expect } from 'vitest';
import { analyzeNodes, analyzeLilith } from '@/lib/compatibility/astrology/nodes-lilith';

describe('nodes-lilith', () => {
  // Common test fixtures
  const makePlanet = (sign: string, element: string) => ({ sign, element });

  describe('analyzeNodes', () => {
    const p1Sun = makePlanet('Leo', 'fire');
    const p2Sun = makePlanet('Aries', 'fire');
    const p1Moon = makePlanet('Cancer', 'water');
    const p2Moon = makePlanet('Pisces', 'water');

    it('should return neutral when nodes are undefined', () => {
      const result = analyzeNodes(
        undefined, undefined, undefined, undefined,
        p1Sun, p2Sun, p1Moon, p2Moon
      );
      expect(result.karmicRelationshipType).toBe('neutral');
      expect(result.northNodeConnection.compatibility).toBe(50);
      expect(result.southNodeConnection.compatibility).toBe(50);
    });

    it('should detect soulmate when north nodes share same sign', () => {
      const p1NN = makePlanet('Leo', 'fire');
      const p2NN = makePlanet('Leo', 'fire');
      const p1SN = makePlanet('Aquarius', 'air');
      const p2SN = makePlanet('Libra', 'air');

      const result = analyzeNodes(
        p1NN, p1SN, p2NN, p2SN,
        p1Sun, p2Sun, p1Moon, p2Moon
      );
      expect(result.karmicRelationshipType).toBe('soulmate');
      expect(result.northNodeConnection.compatibility).toBe(100);
      expect(result.northNodeConnection.destinyAlignment).toContain('같은 영혼적 목적지');
    });

    it('should detect dharmic when north nodes share same element', () => {
      const p1NN = makePlanet('Leo', 'fire');
      const p2NN = makePlanet('Aries', 'fire');
      // Use different south node elements to avoid karmic override
      const p1SN = makePlanet('Aquarius', 'air');
      const p2SN = makePlanet('Taurus', 'earth');

      const result = analyzeNodes(
        p1NN, p1SN, p2NN, p2SN,
        // Use different sun/moon elements to avoid soulmate override
        makePlanet('Taurus', 'earth'), makePlanet('Virgo', 'earth'),
        makePlanet('Gemini', 'air'), makePlanet('Libra', 'air')
      );
      expect(result.karmicRelationshipType).toBe('dharmic');
      expect(result.northNodeConnection.compatibility).toBe(80);
    });

    it('should boost compatibility when north node matches partner sun', () => {
      const p1NN = makePlanet('Leo', 'fire');
      const p2NN = makePlanet('Taurus', 'earth');
      const p1SN = makePlanet('Aquarius', 'air');
      const p2SN = makePlanet('Scorpio', 'water');

      // P1 north node element (fire) matches P2 sun element (fire)
      const result = analyzeNodes(
        p1NN, p1SN, p2NN, p2SN,
        p1Sun, makePlanet('Aries', 'fire'),
        p1Moon, p2Moon
      );
      expect(result.karmicRelationshipType).toBe('soulmate');
      expect(result.lifeLessons).toContain('Person2가 Person1에게 운명적 역할');
    });

    it('should detect karmic when south nodes share same sign', () => {
      const p1NN = makePlanet('Leo', 'fire');
      const p2NN = makePlanet('Taurus', 'earth');
      const p1SN = makePlanet('Aquarius', 'air');
      const p2SN = makePlanet('Aquarius', 'air');

      const result = analyzeNodes(
        p1NN, p1SN, p2NN, p2SN,
        // Avoid soulmate trigger on sun/moon
        makePlanet('Virgo', 'earth'), makePlanet('Capricorn', 'earth'),
        makePlanet('Taurus', 'earth'), makePlanet('Virgo', 'earth')
      );
      expect(result.karmicRelationshipType).toBe('karmic');
      expect(result.southNodeConnection.compatibility).toBe(95);
      expect(result.southNodeConnection.pastLifeIndicators).toContain('같은 과거생 패턴');
    });

    it('should cap compatibility at 100', () => {
      // Trigger multiple bonuses
      const p1NN = makePlanet('Leo', 'fire');
      const p2NN = makePlanet('Leo', 'fire');  // same sign +95
      const p1SN = makePlanet('Aquarius', 'air');
      const p2SN = makePlanet('Libra', 'air');

      const result = analyzeNodes(
        p1NN, p1SN, p2NN, p2SN,
        p1Sun, makePlanet('Aries', 'fire'),    // matches p1NN element +15
        p1Moon, makePlanet('Sagittarius', 'fire') // matches p1NN element +10
      );
      expect(result.northNodeConnection.compatibility).toBeLessThanOrEqual(100);
    });

    it('should set correct evolutionary purpose for each type', () => {
      // Neutral
      const neutral = analyzeNodes(
        undefined, undefined, undefined, undefined,
        p1Sun, p2Sun, p1Moon, p2Moon
      );
      expect(neutral.evolutionaryPurpose).toContain('새로운 경험');

      // Soulmate
      const soulmate = analyzeNodes(
        makePlanet('Leo', 'fire'), makePlanet('Aquarius', 'air'),
        makePlanet('Leo', 'fire'), makePlanet('Aquarius', 'air'),
        p1Sun, p2Sun, p1Moon, p2Moon
      );
      expect(soulmate.evolutionaryPurpose).toContain('운명적 만남');
    });
  });

  describe('analyzeLilith', () => {
    const p1Sun = makePlanet('Leo', 'fire');
    const p2Sun = makePlanet('Aries', 'fire');
    const p1Mars = makePlanet('Scorpio', 'water');
    const p2Mars = makePlanet('Capricorn', 'earth');
    const p1Venus = makePlanet('Libra', 'air');
    const p2Venus = makePlanet('Taurus', 'earth');

    it('should return defaults when lilith data is missing', () => {
      const result = analyzeLilith(
        undefined, undefined,
        p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.lilithCompatibility).toBe(50);
      expect(result.magneticAttraction).toBe(50);
      expect(result.shadowDynamics).toContain('불완전');
    });

    it('should return defaults when p1 lilith is missing', () => {
      const result = analyzeLilith(
        undefined, makePlanet('Scorpio', 'water'),
        p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.lilithCompatibility).toBe(50);
    });

    it('should detect high compatibility when liliths share same sign', () => {
      const lilith = makePlanet('Scorpio', 'water');
      const result = analyzeLilith(
        lilith, lilith,
        p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.lilithCompatibility).toBe(90);
      expect(result.magneticAttraction).toBeGreaterThanOrEqual(95);
      expect(result.shadowDynamics).toContain('깊이 이해');
    });

    it('should detect moderate compatibility when liliths share same element', () => {
      const result = analyzeLilith(
        makePlanet('Scorpio', 'water'),
        makePlanet('Pisces', 'water'),
        p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.lilithCompatibility).toBe(75);
      expect(result.magneticAttraction).toBeGreaterThanOrEqual(80);
    });

    it('should detect low compatibility for incompatible elements', () => {
      const result = analyzeLilith(
        makePlanet('Aries', 'fire'),
        makePlanet('Cancer', 'water'),
        p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.lilithCompatibility).toBe(40);
      expect(result.potentialChallenges.length).toBeGreaterThan(0);
    });

    it('should boost magnetic attraction for lilith-mars connections', () => {
      // p1 lilith water matches p2 mars... need to align elements
      const result = analyzeLilith(
        makePlanet('Scorpio', 'water'), // p1 lilith
        makePlanet('Leo', 'fire'),      // p2 lilith (different element, not incompatible)
        p1Sun, p2Sun,
        makePlanet('Cancer', 'water'),  // p1 mars = water (matches p2 lilith? no, fire)
        makePlanet('Pisces', 'water'),  // p2 mars = water (matches p1 lilith water)
        p1Venus, p2Venus
      );
      expect(result.magneticAttraction).toBeGreaterThan(50);
      expect(result.repressedDesires.some(d => d.includes('Person1의 숨겨진 욕망'))).toBe(true);
    });

    it('should boost magnetic attraction for lilith-venus connections', () => {
      const result = analyzeLilith(
        makePlanet('Libra', 'air'),    // p1 lilith air
        makePlanet('Taurus', 'earth'), // p2 lilith earth
        p1Sun, p2Sun, p1Mars, p2Mars,
        makePlanet('Gemini', 'air'),   // p1 venus air (does NOT match p2 lilith earth)
        makePlanet('Aquarius', 'air'), // p2 venus air (matches p1 lilith air!)
      );
      expect(result.repressedDesires.some(d => d.includes('Person2가 Person1의 매력에'))).toBe(true);
      expect(result.healingOpportunities.some(d => d.includes('Person1이 Person2의 자기 수용'))).toBe(true);
    });

    it('should add element-specific repressed desires', () => {
      const elements = ['fire', 'earth', 'air', 'water'];
      for (const el of elements) {
        const result = analyzeLilith(
          makePlanet('Test', el),
          makePlanet('Test2', el),
          p1Sun, p2Sun, p1Mars, p2Mars, p1Venus, p2Venus
        );
        expect(result.repressedDesires.some(d => d.includes('Person1:'))).toBe(true);
      }
    });

    it('should cap magnetic attraction at 100', () => {
      // Same sign lilith (95) + mars matches + venus matches
      const result = analyzeLilith(
        makePlanet('Scorpio', 'water'),
        makePlanet('Scorpio', 'water'),
        p1Sun, p2Sun,
        makePlanet('Pisces', 'water'),  // p1 mars water = p2 lilith water
        makePlanet('Cancer', 'water'),  // p2 mars water = p1 lilith water
        makePlanet('Cancer', 'water'),  // p1 venus water = p2 lilith water
        makePlanet('Pisces', 'water'),  // p2 venus water = p1 lilith water
      );
      expect(result.magneticAttraction).toBeLessThanOrEqual(100);
    });

    it('should add lilith-sun challenges', () => {
      // p1 lilith element matches p2 sun element
      const result = analyzeLilith(
        makePlanet('Aries', 'fire'),     // p1 lilith fire
        makePlanet('Aries', 'fire'),     // p2 lilith fire
        makePlanet('Leo', 'fire'),       // p1 sun fire (matches p2 lilith)
        makePlanet('Sagittarius', 'fire'), // p2 sun fire (matches p1 lilith)
        p1Mars, p2Mars, p1Venus, p2Venus
      );
      expect(result.potentialChallenges.some(c => c.includes('정체성에 도전'))).toBe(true);
      expect(result.healingOpportunities.some(h => h.includes('억압된 면을 통합'))).toBe(true);
    });
  });
});
