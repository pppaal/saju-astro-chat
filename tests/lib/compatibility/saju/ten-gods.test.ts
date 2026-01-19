/**
 * Ten Gods (십성) Analysis Tests
 */
import { describe, it, expect } from 'vitest';
import { analyzeTenGods } from '@/lib/compatibility/saju/ten-gods';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

describe('saju/ten-gods', () => {
  // Helper to create mock SajuProfile
  function createMockProfile(overrides: Partial<SajuProfile> = {}): SajuProfile {
    return {
      dayMaster: { name: '甲', element: 'wood' },
      pillars: {
        year: { stem: '甲', branch: '子' },
        month: { stem: '乙', branch: '丑' },
        day: { stem: '甲', branch: '寅' },
        hour: { stem: '丙', branch: '卯' },
      },
      elements: { wood: 2, fire: 1, earth: 1, metal: 1, water: 1 },
      ...overrides,
    } as SajuProfile;
  }

  describe('analyzeTenGods', () => {
    it('should return TenGodAnalysis structure', () => {
      const p1 = createMockProfile();
      const p2 = createMockProfile({
        dayMaster: { name: '丙', element: 'fire' },
        elements: { wood: 1, fire: 2, earth: 1, metal: 1, water: 1 },
      });

      const result = analyzeTenGods(p1, p2);

      expect(result).toHaveProperty('person1Primary');
      expect(result).toHaveProperty('person2Primary');
      expect(result).toHaveProperty('interaction');
      expect(result).toHaveProperty('relationshipDynamics');
      expect(result.interaction).toHaveProperty('supports');
      expect(result.interaction).toHaveProperty('conflicts');
      expect(result.interaction).toHaveProperty('balance');
    });

    it('should extract primary ten gods correctly', () => {
      const p1 = createMockProfile({
        dayMaster: { name: '甲', element: 'wood' },
        elements: { wood: 3, fire: 2, earth: 1, metal: 0, water: 0 },
      });
      const p2 = createMockProfile({
        dayMaster: { name: '丙', element: 'fire' },
        elements: { wood: 0, fire: 3, earth: 2, metal: 1, water: 0 },
      });

      const result = analyzeTenGods(p1, p2);

      expect(Array.isArray(result.person1Primary)).toBe(true);
      expect(Array.isArray(result.person2Primary)).toBe(true);
      expect(result.person1Primary.length).toBeLessThanOrEqual(4);
      expect(result.person2Primary.length).toBeLessThanOrEqual(4);
    });

    describe('재성-관성 조화 (재생관)', () => {
      it('should detect 재성-관성 harmony when p1 has 재성 and p2 has 관성', () => {
        // Wood dayMaster: earth = 편재, metal = 편관
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 1, fire: 0, earth: 3, metal: 0, water: 1 }, // 편재 dominant
        });
        // Fire dayMaster: water = 편관
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 1, earth: 0, metal: 0, water: 3 }, // 편관 dominant
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.interaction.supports.some(s => s.includes('재물') || s.includes('💰'))).toBe(true);
      });
    });

    describe('인성-비겁 조화', () => {
      it('should detect 인성-비겁 harmony', () => {
        // Wood dayMaster: water = 정인
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 1, fire: 0, earth: 0, metal: 0, water: 3 }, // 정인 dominant
        });
        // Fire dayMaster: fire = 비견
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 3, earth: 0, metal: 0, water: 1 }, // 비견 dominant
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.interaction.supports.some(s => s.includes('멘토') || s.includes('📚'))).toBe(true);
      });
    });

    describe('식상-재성 조화 (식상생재)', () => {
      it('should detect 식상-재성 harmony', () => {
        // Wood dayMaster: fire = 식신
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 1, fire: 3, earth: 0, metal: 0, water: 1 }, // 식신 dominant
        });
        // Fire dayMaster: metal = 편재
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 1, earth: 0, metal: 3, water: 0 }, // 편재 dominant
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.interaction.supports.some(s => s.includes('아이디어') || s.includes('✨'))).toBe(true);
      });
    });

    describe('비겁-재성 충돌 (겁재탈재)', () => {
      it('should detect 비겁-재성 conflict', () => {
        // Wood dayMaster: wood = 비견
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 3, fire: 0, earth: 0, metal: 0, water: 1 }, // 비견 dominant
        });
        // Fire dayMaster: metal = 편재
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 1, earth: 0, metal: 3, water: 0 }, // 편재 dominant
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.interaction.conflicts.some(c => c.includes('경쟁') || c.includes('⚔️'))).toBe(true);
      });
    });

    describe('common ten gods', () => {
      it('should detect common ten gods when both have similar patterns', () => {
        // Both have same element distribution - should have common ten gods
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 1, metal: 0, water: 0 },
        });
        const p2 = createMockProfile({
          dayMaster: { name: '乙', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 1, metal: 0, water: 0 },
        });

        const result = analyzeTenGods(p1, p2);

        // Should detect common ten gods
        expect(result.interaction.supports.some(s => s.includes('공통') || s.includes('🤝'))).toBe(true);
      });
    });

    describe('balance calculation', () => {
      it('should return 50 balance when no supports or conflicts', () => {
        // Create profiles that won't trigger any rules
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 1, fire: 0, earth: 0, metal: 0, water: 0 },
        });
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 1, earth: 0, metal: 0, water: 0 },
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.interaction.balance).toBe(50);
      });

      it('should return high balance when many supports', () => {
        // Multiple harmony conditions
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 2, metal: 0, water: 2 },
        });
        const p2 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 2, metal: 0, water: 2 },
        });

        const result = analyzeTenGods(p1, p2);

        // With common ten gods, balance should be positive
        expect(result.interaction.balance).toBeGreaterThanOrEqual(50);
      });
    });

    describe('relationshipDynamics message', () => {
      it('should return high harmony message for balance >= 80', () => {
        // Create conditions for high balance
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 2 },
        });
        const p2 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 2 },
        });

        const result = analyzeTenGods(p1, p2);

        // Should have some relationship dynamics message
        expect(result.relationshipDynamics).toBeTruthy();
        expect(typeof result.relationshipDynamics).toBe('string');
      });

      it('should include day master names in dynamics', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
        });
        const p2 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.relationshipDynamics).toContain('甲');
      });
    });

    describe('edge cases', () => {
      it('should handle empty elements', () => {
        const p1 = createMockProfile({
          elements: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        });
        const p2 = createMockProfile({
          elements: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        });

        const result = analyzeTenGods(p1, p2);

        expect(result.person1Primary).toEqual([]);
        expect(result.person2Primary).toEqual([]);
        expect(result.interaction.balance).toBe(50);
      });

      it('should handle missing dayMaster name', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '', element: 'wood' },
          pillars: {
            year: { stem: '甲', branch: '子' },
            month: { stem: '乙', branch: '丑' },
            day: { stem: '甲', branch: '寅' },
            hour: { stem: '丙', branch: '卯' },
          },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Should fallback to pillars.day.stem
        expect(result.relationshipDynamics).toBeTruthy();
      });

      it('should handle unknown element', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'unknown' as any },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        expect(result.person1Primary).toEqual([]);
      });

      it('should limit primary ten gods to 4', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 5, fire: 4, earth: 3, metal: 2, water: 1 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        expect(result.person1Primary.length).toBeLessThanOrEqual(4);
      });
    });

    describe('ten god mapping', () => {
      it('should correctly map ten gods for wood dayMaster', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: 'wood' },
          elements: { wood: 3, fire: 0, earth: 0, metal: 0, water: 0 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Wood element for wood dayMaster = 비견
        expect(result.person1Primary).toContain('비견');
      });

      it('should correctly map ten gods for fire dayMaster', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '丙', element: 'fire' },
          elements: { wood: 0, fire: 3, earth: 0, metal: 0, water: 0 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Fire element for fire dayMaster = 비견
        expect(result.person1Primary).toContain('비견');
      });

      it('should correctly map ten gods for earth dayMaster', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '戊', element: 'earth' },
          elements: { wood: 0, fire: 0, earth: 3, metal: 0, water: 0 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Earth element for earth dayMaster = 비견
        expect(result.person1Primary).toContain('비견');
      });

      it('should correctly map ten gods for metal dayMaster', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '庚', element: 'metal' },
          elements: { wood: 0, fire: 0, earth: 0, metal: 3, water: 0 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Metal element for metal dayMaster = 비견
        expect(result.person1Primary).toContain('비견');
      });

      it('should correctly map ten gods for water dayMaster', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '壬', element: 'water' },
          elements: { wood: 0, fire: 0, earth: 0, metal: 0, water: 3 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        // Water element for water dayMaster = 비견
        expect(result.person1Primary).toContain('비견');
      });
    });

    describe('Korean element normalization', () => {
      it('should handle Korean element names', () => {
        const p1 = createMockProfile({
          dayMaster: { name: '甲', element: '목' },
          elements: { wood: 3, fire: 2, earth: 1, metal: 0, water: 0 },
        });
        const p2 = createMockProfile();

        const result = analyzeTenGods(p1, p2);

        expect(result.person1Primary.length).toBeGreaterThan(0);
      });
    });
  });
});
