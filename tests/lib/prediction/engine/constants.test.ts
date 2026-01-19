/**
 * Prediction Engine Constants Tests
 */
import { describe, it, expect } from 'vitest';
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
} from '@/lib/prediction/engine/constants';

describe('prediction/engine/constants', () => {
  describe('STEMS', () => {
    it('should have 10 heavenly stems', () => {
      expect(STEMS).toHaveLength(10);
    });

    it('should contain expected stems', () => {
      const expectedStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      expect(STEMS).toEqual(expectedStems);
    });

    it('should be readonly', () => {
      // TypeScript compilation test - if this compiles, type is correct
      const stems: readonly string[] = STEMS;
      expect(stems).toBeDefined();
    });
  });

  describe('BRANCHES', () => {
    it('should have 12 earthly branches', () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it('should contain expected branches', () => {
      const expectedBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      expect(BRANCHES).toEqual(expectedBranches);
    });

    it('should be readonly', () => {
      const branches: readonly string[] = BRANCHES;
      expect(branches).toBeDefined();
    });
  });

  describe('STEM_ELEMENT', () => {
    it('should map all stems to elements', () => {
      expect(Object.keys(STEM_ELEMENT)).toHaveLength(10);
    });

    it('should map wood stems correctly', () => {
      expect(STEM_ELEMENT['甲']).toBe('목');
      expect(STEM_ELEMENT['乙']).toBe('목');
    });

    it('should map fire stems correctly', () => {
      expect(STEM_ELEMENT['丙']).toBe('화');
      expect(STEM_ELEMENT['丁']).toBe('화');
    });

    it('should map earth stems correctly', () => {
      expect(STEM_ELEMENT['戊']).toBe('토');
      expect(STEM_ELEMENT['己']).toBe('토');
    });

    it('should map metal stems correctly', () => {
      expect(STEM_ELEMENT['庚']).toBe('금');
      expect(STEM_ELEMENT['辛']).toBe('금');
    });

    it('should map water stems correctly', () => {
      expect(STEM_ELEMENT['壬']).toBe('수');
      expect(STEM_ELEMENT['癸']).toBe('수');
    });

    it('should cover all five elements', () => {
      const elements = new Set(Object.values(STEM_ELEMENT));
      expect(elements.size).toBe(5);
      expect(elements).toContain('목');
      expect(elements).toContain('화');
      expect(elements).toContain('토');
      expect(elements).toContain('금');
      expect(elements).toContain('수');
    });
  });

  describe('EVENT_FAVORABLE_CONDITIONS', () => {
    const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

    it('should have conditions for all event types', () => {
      expect(Object.keys(EVENT_FAVORABLE_CONDITIONS)).toHaveLength(7);
      eventTypes.forEach(eventType => {
        expect(EVENT_FAVORABLE_CONDITIONS).toHaveProperty(eventType);
      });
    });

    it('should have required structure for each event type', () => {
      eventTypes.forEach(eventType => {
        const conditions = EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS];
        expect(conditions).toHaveProperty('favorableSibsin');
        expect(conditions).toHaveProperty('favorableStages');
        expect(conditions).toHaveProperty('favorableElements');
        expect(conditions).toHaveProperty('avoidSibsin');
        expect(conditions).toHaveProperty('avoidStages');

        expect(Array.isArray(conditions.favorableSibsin)).toBe(true);
        expect(Array.isArray(conditions.favorableStages)).toBe(true);
        expect(Array.isArray(conditions.favorableElements)).toBe(true);
        expect(Array.isArray(conditions.avoidSibsin)).toBe(true);
        expect(Array.isArray(conditions.avoidStages)).toBe(true);
      });
    });

    describe('marriage conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

      it('should have favorable sibsin for relationships', () => {
        expect(conditions.favorableSibsin).toContain('정관');
        expect(conditions.favorableSibsin).toContain('정재');
      });

      it('should have favorable stages for growth', () => {
        expect(conditions.favorableStages).toContain('건록');
        expect(conditions.favorableStages).toContain('제왕');
      });

      it('should have favorable elements', () => {
        expect(conditions.favorableElements).toContain('화');
        expect(conditions.favorableElements).toContain('목');
      });

      it('should avoid conflicting sibsin', () => {
        expect(conditions.avoidSibsin).toContain('겁재');
        expect(conditions.avoidSibsin).toContain('상관');
      });

      it('should avoid weak stages', () => {
        expect(conditions.avoidStages).toContain('사');
        expect(conditions.avoidStages).toContain('묘');
      });
    });

    describe('career conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.career;

      it('should favor authority sibsin', () => {
        expect(conditions.favorableSibsin).toContain('정관');
        expect(conditions.favorableSibsin).toContain('편관');
      });

      it('should favor strong stages', () => {
        expect(conditions.favorableStages).toContain('건록');
        expect(conditions.favorableStages).toContain('제왕');
      });

      it('should favor stable elements', () => {
        expect(conditions.favorableElements).toContain('금');
        expect(conditions.favorableElements).toContain('토');
      });
    });

    describe('investment conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.investment;

      it('should favor wealth sibsin', () => {
        expect(conditions.favorableSibsin).toContain('정재');
        expect(conditions.favorableSibsin).toContain('편재');
      });

      it('should favor prosperous stages', () => {
        expect(conditions.favorableStages).toContain('건록');
        expect(conditions.favorableStages).toContain('제왕');
      });

      it('should favor wealth elements', () => {
        expect(conditions.favorableElements).toContain('토');
        expect(conditions.favorableElements).toContain('금');
      });

      it('should avoid many weak stages', () => {
        expect(conditions.avoidStages.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('move conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.move;

      it('should favor movement sibsin', () => {
        expect(conditions.favorableSibsin).toContain('편인');
        expect(conditions.favorableSibsin).toContain('식신');
      });

      it('should favor flexible stages', () => {
        expect(conditions.favorableStages).toContain('장생');
        expect(conditions.favorableStages).toContain('목욕');
      });

      it('should favor change elements', () => {
        expect(conditions.favorableElements).toContain('목');
        expect(conditions.favorableElements).toContain('수');
      });
    });

    describe('study conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.study;

      it('should favor learning sibsin', () => {
        expect(conditions.favorableSibsin).toContain('정인');
        expect(conditions.favorableSibsin).toContain('편인');
      });

      it('should favor growth stages', () => {
        expect(conditions.favorableStages).toContain('장생');
        expect(conditions.favorableStages).toContain('양');
      });

      it('should favor wisdom elements', () => {
        expect(conditions.favorableElements).toContain('수');
        expect(conditions.favorableElements).toContain('목');
      });
    });

    describe('health conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.health;

      it('should favor support sibsin', () => {
        expect(conditions.favorableSibsin).toContain('정인');
        expect(conditions.favorableSibsin).toContain('비견');
      });

      it('should favor strong stages', () => {
        expect(conditions.favorableStages).toContain('건록');
        expect(conditions.favorableStages).toContain('제왕');
      });

      it('should avoid illness stages', () => {
        expect(conditions.avoidStages).toContain('병');
        expect(conditions.avoidStages).toContain('사');
      });
    });

    describe('relationship conditions', () => {
      const conditions = EVENT_FAVORABLE_CONDITIONS.relationship;

      it('should favor harmonious sibsin', () => {
        expect(conditions.favorableSibsin).toContain('정재');
        expect(conditions.favorableSibsin).toContain('정관');
        expect(conditions.favorableSibsin).toContain('비견');
      });

      it('should favor balanced stages', () => {
        expect(conditions.favorableStages).toContain('건록');
        expect(conditions.favorableStages).toContain('장생');
      });

      it('should favor social elements', () => {
        expect(conditions.favorableElements).toContain('화');
        expect(conditions.favorableElements).toContain('목');
      });
    });
  });

  describe('ASTRO_EVENT_CONDITIONS', () => {
    const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

    it('should have conditions for all event types', () => {
      expect(Object.keys(ASTRO_EVENT_CONDITIONS)).toHaveLength(7);
      eventTypes.forEach(eventType => {
        expect(ASTRO_EVENT_CONDITIONS).toHaveProperty(eventType);
      });
    });

    it('should have required structure for each event type', () => {
      eventTypes.forEach(eventType => {
        const conditions = ASTRO_EVENT_CONDITIONS[eventType as keyof typeof ASTRO_EVENT_CONDITIONS];
        expect(conditions).toHaveProperty('favorableSigns');
        expect(conditions).toHaveProperty('keyPlanets');
        expect(conditions).toHaveProperty('favorableHouses');
        expect(conditions).toHaveProperty('avoidRetrogrades');
        expect(conditions).toHaveProperty('moonPhaseBonus');

        expect(Array.isArray(conditions.favorableSigns)).toBe(true);
        expect(Array.isArray(conditions.keyPlanets)).toBe(true);
        expect(Array.isArray(conditions.favorableHouses)).toBe(true);
        expect(Array.isArray(conditions.avoidRetrogrades)).toBe(true);
        expect(typeof conditions.moonPhaseBonus).toBe('object');
      });
    });

    describe('marriage astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.marriage;

      it('should favor relationship signs', () => {
        expect(conditions.favorableSigns).toContain('Libra');
        expect(conditions.favorableSigns).toContain('Taurus');
      });

      it('should use relationship planets', () => {
        expect(conditions.keyPlanets).toContain('Venus');
        expect(conditions.keyPlanets).toContain('Moon');
      });

      it('should favor relationship houses', () => {
        expect(conditions.favorableHouses).toContain(7); // House of partnerships
        expect(conditions.favorableHouses).toContain(5); // House of romance
      });

      it('should avoid Venus retrograde', () => {
        expect(conditions.avoidRetrogrades).toContain('Venus');
      });

      it('should give bonus for full moon', () => {
        expect(conditions.moonPhaseBonus['full_moon']).toBeGreaterThan(0);
      });
    });

    describe('career astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.career;

      it('should favor ambitious signs', () => {
        expect(conditions.favorableSigns).toContain('Capricorn');
        expect(conditions.favorableSigns).toContain('Leo');
      });

      it('should use career planets', () => {
        expect(conditions.keyPlanets).toContain('Sun');
        expect(conditions.keyPlanets).toContain('Saturn');
      });

      it('should favor career houses', () => {
        expect(conditions.favorableHouses).toContain(10); // Midheaven
        expect(conditions.favorableHouses).toContain(6); // Work
      });

      it('should avoid Mercury retrograde', () => {
        expect(conditions.avoidRetrogrades).toContain('Mercury');
      });
    });

    describe('investment astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.investment;

      it('should favor wealth signs', () => {
        expect(conditions.favorableSigns).toContain('Taurus');
        expect(conditions.favorableSigns).toContain('Scorpio');
      });

      it('should use wealth planets', () => {
        expect(conditions.keyPlanets).toContain('Jupiter');
        expect(conditions.keyPlanets).toContain('Venus');
      });

      it('should favor money houses', () => {
        expect(conditions.favorableHouses).toContain(2); // House of money
        expect(conditions.favorableHouses).toContain(8); // House of shared resources
      });

      it('should give bonus for new moon', () => {
        expect(conditions.moonPhaseBonus['new_moon']).toBeGreaterThan(0);
      });
    });

    describe('move astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.move;

      it('should favor travel signs', () => {
        expect(conditions.favorableSigns).toContain('Sagittarius');
      });

      it('should use movement planets', () => {
        expect(conditions.keyPlanets).toContain('Moon');
        expect(conditions.keyPlanets).toContain('Mercury');
      });

      it('should favor home and travel houses', () => {
        expect(conditions.favorableHouses).toContain(4); // House of home
        expect(conditions.favorableHouses).toContain(9); // House of travel
      });

      it('should avoid Mercury retrograde', () => {
        expect(conditions.avoidRetrogrades).toContain('Mercury');
      });
    });

    describe('study astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.study;

      it('should favor intellectual signs', () => {
        expect(conditions.favorableSigns).toContain('Gemini');
        expect(conditions.favorableSigns).toContain('Virgo');
        expect(conditions.favorableSigns).toContain('Sagittarius');
      });

      it('should use learning planets', () => {
        expect(conditions.keyPlanets).toContain('Mercury');
        expect(conditions.keyPlanets).toContain('Jupiter');
      });

      it('should favor learning houses', () => {
        expect(conditions.favorableHouses).toContain(3); // House of learning
        expect(conditions.favorableHouses).toContain(9); // House of higher education
      });

      it('should avoid Mercury retrograde', () => {
        expect(conditions.avoidRetrogrades).toContain('Mercury');
      });
    });

    describe('health astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.health;

      it('should favor health-conscious signs', () => {
        expect(conditions.favorableSigns).toContain('Virgo');
      });

      it('should use vitality planets', () => {
        expect(conditions.keyPlanets).toContain('Sun');
        expect(conditions.keyPlanets).toContain('Mars');
      });

      it('should favor health houses', () => {
        expect(conditions.favorableHouses).toContain(6); // House of health
        expect(conditions.favorableHouses).toContain(1); // House of self/body
      });

      it('should give bonus for healing moon phases', () => {
        expect(conditions.moonPhaseBonus).toHaveProperty('new_moon');
        expect(conditions.moonPhaseBonus).toHaveProperty('waning_gibbous');
      });
    });

    describe('relationship astro conditions', () => {
      const conditions = ASTRO_EVENT_CONDITIONS.relationship;

      it('should favor social signs', () => {
        expect(conditions.favorableSigns).toContain('Libra');
        expect(conditions.favorableSigns).toContain('Leo');
      });

      it('should use connection planets', () => {
        expect(conditions.keyPlanets).toContain('Venus');
        expect(conditions.keyPlanets).toContain('Moon');
      });

      it('should favor relationship houses', () => {
        expect(conditions.favorableHouses).toContain(5); // House of romance
        expect(conditions.favorableHouses).toContain(7); // House of partnerships
        expect(conditions.favorableHouses).toContain(11); // House of friendships
      });

      it('should avoid relationship planet retrogrades', () => {
        expect(conditions.avoidRetrogrades).toContain('Venus');
      });

      it('should give bonus for full moon', () => {
        expect(conditions.moonPhaseBonus['full_moon']).toBeGreaterThan(0);
      });
    });

    describe('moon phase bonus validation', () => {
      it('should have positive bonuses for all moon phases', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          Object.values(conditions.moonPhaseBonus).forEach(bonus => {
            expect(bonus).toBeGreaterThan(0);
            expect(bonus).toBeLessThanOrEqual(10);
          });
        });
      });

      it('should have at least 2 moon phases per event', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          expect(Object.keys(conditions.moonPhaseBonus).length).toBeGreaterThanOrEqual(2);
        });
      });
    });

    describe('house validation', () => {
      it('should have valid house numbers (1-12)', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          conditions.favorableHouses.forEach(house => {
            expect(house).toBeGreaterThanOrEqual(1);
            expect(house).toBeLessThanOrEqual(12);
          });
        });
      });
    });

    describe('cross-validation', () => {
      it('should have at least 2 favorable signs per event', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          expect(conditions.favorableSigns.length).toBeGreaterThanOrEqual(2);
        });
      });

      it('should have at least 2 key planets per event', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          expect(conditions.keyPlanets.length).toBeGreaterThanOrEqual(2);
        });
      });

      it('should have at least 2 favorable houses per event', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          expect(conditions.favorableHouses.length).toBeGreaterThanOrEqual(2);
        });
      });

      it('should have at least 1 retrograde to avoid per event', () => {
        Object.values(ASTRO_EVENT_CONDITIONS).forEach(conditions => {
          expect(conditions.avoidRetrogrades.length).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });

  describe('consistency checks', () => {
    it('should have same event types in both constants', () => {
      const sajuEvents = new Set(Object.keys(EVENT_FAVORABLE_CONDITIONS));
      const astroEvents = new Set(Object.keys(ASTRO_EVENT_CONDITIONS));

      expect(sajuEvents).toEqual(astroEvents);
    });

    it('should use valid five elements in favorable conditions', () => {
      const validElements = new Set(['목', '화', '토', '금', '수']);

      Object.values(EVENT_FAVORABLE_CONDITIONS).forEach(conditions => {
        conditions.favorableElements.forEach(element => {
          expect(validElements.has(element)).toBe(true);
        });
      });
    });
  });
});
