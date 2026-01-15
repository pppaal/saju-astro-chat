// tests/lib/compatibility/groupCompatibility.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  analyzeGroupSajuCompatibility,
  analyzeGroupAstrologyCompatibility,
  analyzeGroupCompatibility,
  type GroupMember,
} from '@/lib/compatibility/groupCompatibility';
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility';

// Mock performComprehensiveSajuAnalysis and performComprehensiveAstrologyAnalysis
vi.mock('@/lib/compatibility/advancedSajuAnalysis', () => ({
  performComprehensiveSajuAnalysis: vi.fn().mockReturnValue({
    overallScore: 75,
    summary: 'Good compatibility',
  }),
}));

vi.mock('@/lib/compatibility/advancedAstrologyAnalysis', () => ({
  performComprehensiveAstrologyAnalysis: vi.fn().mockReturnValue({
    overallScore: 70,
    summary: 'Good astrological compatibility',
  }),
}));

// 테스트용 헬퍼 함수
function createSajuProfile(element: string): SajuProfile {
  const elementMap: Record<string, string> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
    '목': '목',
    '화': '화',
    '토': '토',
    '금': '금',
    '수': '수',
  };

  return {
    dayMaster: {
      name: '甲',
      element: elementMap[element] || element,
    },
    pillars: {
      year: { stem: '甲', branch: '子' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '甲', branch: '午' },
      time: { stem: '庚', branch: '申' },
    },
    elements: {
      wood: element === 'wood' || element === '목' ? 3 : 1,
      fire: element === 'fire' || element === '화' ? 3 : 1,
      earth: element === 'earth' || element === '토' ? 3 : 1,
      metal: element === 'metal' || element === '금' ? 3 : 1,
      water: element === 'water' || element === '수' ? 3 : 1,
    },
  } as SajuProfile;
}

function createAstrologyProfile(element: string): AstrologyProfile {
  const signMap: Record<string, string> = {
    fire: 'Aries',
    earth: 'Taurus',
    air: 'Gemini',
    water: 'Cancer',
  };

  return {
    sun: { sign: signMap[element] || 'Aries', element },
    moon: { sign: 'Cancer', element: 'water' },
    mercury: { sign: 'Gemini', element: 'air' },
    venus: { sign: 'Taurus', element: 'earth' },
    mars: { sign: 'Aries', element: 'fire' },
    jupiter: { sign: 'Sagittarius', element: 'fire' },
    saturn: { sign: 'Capricorn', element: 'earth' },
    ascendant: { sign: 'Leo', element: 'fire' },
  } as AstrologyProfile;
}

function createGroupMember(
  id: string,
  name: string,
  sajuElement?: string,
  astroElement?: string
): GroupMember {
  return {
    id,
    name,
    sajuProfile: sajuElement ? createSajuProfile(sajuElement) : undefined,
    astrologyProfile: astroElement ? createAstrologyProfile(astroElement) : undefined,
  };
}

describe('groupCompatibility', () => {
  describe('analyzeGroupSajuCompatibility', () => {
    describe('validation', () => {
      it('should throw error for less than 2 members', () => {
        const members = [createGroupMember('1', 'Alice', 'wood')];

        expect(() => analyzeGroupSajuCompatibility(members)).toThrow();
      });

      it('should throw error for more than 6 members', () => {
        const members = Array.from({ length: 7 }, (_, i) =>
          createGroupMember(`${i}`, `Member${i}`, 'wood')
        );

        expect(() => analyzeGroupSajuCompatibility(members)).toThrow();
      });

      it('should throw error if less than 2 members have saju profiles', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob'),
        ];

        expect(() => analyzeGroupSajuCompatibility(members)).toThrow();
      });
    });

    describe('structure validation', () => {
      it('should return GroupSajuAnalysis with all required fields', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
          createGroupMember('3', 'Carol', 'earth'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        expect(result).toHaveProperty('groupSize');
        expect(result).toHaveProperty('pairwiseResults');
        expect(result).toHaveProperty('elementBalance');
        expect(result).toHaveProperty('groupDynamics');
        expect(result).toHaveProperty('memberRoles');
        expect(result).toHaveProperty('overallHarmony');
        expect(result).toHaveProperty('strengths');
        expect(result).toHaveProperty('challenges');
        expect(result).toHaveProperty('advice');
      });
    });

    describe('pairwise results', () => {
      it('should calculate all pairs for 3 members', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
          createGroupMember('3', 'Carol', 'earth'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        // 3 members = 3 pairs (3C2 = 3)
        expect(result.pairwiseResults.length).toBe(3);
      });

      it('should calculate all pairs for 4 members', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
          createGroupMember('3', 'Carol', 'earth'),
          createGroupMember('4', 'Dave', 'metal'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        // 4 members = 6 pairs (4C2 = 6)
        expect(result.pairwiseResults.length).toBe(6);
      });

      it('should have valid relationship types', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
        ];

        const result = analyzeGroupSajuCompatibility(members);
        const validRelationships = ['excellent', 'good', 'neutral', 'challenging'];

        result.pairwiseResults.forEach((pair) => {
          expect(validRelationships).toContain(pair.relationship);
        });
      });
    });

    describe('element balance', () => {
      it('should analyze element distribution', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
          createGroupMember('3', 'Carol', 'earth'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        expect(result.elementBalance.length).toBe(5); // 5 elements
        result.elementBalance.forEach((eb) => {
          expect(eb).toHaveProperty('element');
          expect(eb).toHaveProperty('count');
          expect(eb).toHaveProperty('percentage');
        });
      });

      it('should identify dominant element', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'wood'),
          createGroupMember('3', 'Carol', 'fire'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        expect(result.groupDynamics.dominantElement).toBeDefined();
      });
    });

    describe('member roles', () => {
      it('should assign roles to all members', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
          createGroupMember('3', 'Carol', 'earth'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        expect(result.memberRoles.length).toBe(3);
        result.memberRoles.forEach((role) => {
          expect(role).toHaveProperty('memberId');
          expect(role).toHaveProperty('memberName');
          expect(role).toHaveProperty('primaryRole');
          expect(role).toHaveProperty('strengthsInGroup');
          expect(role).toHaveProperty('potentialChallenges');
        });
      });
    });

    describe('scores', () => {
      it('should return overallHarmony between 0 and 100', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
        ];

        const result = analyzeGroupSajuCompatibility(members);

        expect(result.overallHarmony).toBeGreaterThanOrEqual(0);
        expect(result.overallHarmony).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('analyzeGroupAstrologyCompatibility', () => {
    describe('validation', () => {
      it('should throw error for less than 2 members', () => {
        const members = [createGroupMember('1', 'Alice', undefined, 'fire')];

        expect(() => analyzeGroupAstrologyCompatibility(members)).toThrow();
      });

      it('should throw error if less than 2 members have astrology profiles', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob'),
        ];

        expect(() => analyzeGroupAstrologyCompatibility(members)).toThrow();
      });
    });

    describe('structure validation', () => {
      it('should return GroupAstrologyAnalysis with all required fields', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'earth'),
          createGroupMember('3', 'Carol', undefined, 'air'),
        ];

        const result = analyzeGroupAstrologyCompatibility(members);

        expect(result).toHaveProperty('groupSize');
        expect(result).toHaveProperty('pairwiseResults');
        expect(result).toHaveProperty('elementDistribution');
        expect(result).toHaveProperty('modalityDistribution');
        expect(result).toHaveProperty('groupEnergy');
        expect(result).toHaveProperty('memberRoles');
        expect(result).toHaveProperty('synergyAspects');
        expect(result).toHaveProperty('overallHarmony');
        expect(result).toHaveProperty('strengths');
        expect(result).toHaveProperty('challenges');
        expect(result).toHaveProperty('advice');
      });
    });

    describe('element distribution', () => {
      it('should analyze element distribution', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'earth'),
          createGroupMember('3', 'Carol', undefined, 'air'),
        ];

        const result = analyzeGroupAstrologyCompatibility(members);

        expect(result.elementDistribution.length).toBe(4); // 4 astro elements
        result.elementDistribution.forEach((ed) => {
          expect(ed).toHaveProperty('element');
          expect(ed).toHaveProperty('count');
          expect(ed).toHaveProperty('percentage');
          expect(ed).toHaveProperty('members');
        });
      });
    });

    describe('modality distribution', () => {
      it('should analyze modality distribution', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'earth'),
          createGroupMember('3', 'Carol', undefined, 'air'),
        ];

        const result = analyzeGroupAstrologyCompatibility(members);

        expect(result.modalityDistribution.length).toBe(3); // cardinal, fixed, mutable
        result.modalityDistribution.forEach((md) => {
          expect(md).toHaveProperty('modality');
          expect(md).toHaveProperty('count');
          expect(md).toHaveProperty('members');
        });
      });
    });

    describe('group energy', () => {
      it('should determine group personality', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'fire'),
          createGroupMember('3', 'Carol', undefined, 'fire'),
        ];

        const result = analyzeGroupAstrologyCompatibility(members);

        expect(result.groupEnergy).toHaveProperty('dominantElement');
        expect(result.groupEnergy).toHaveProperty('dominantModality');
        expect(result.groupEnergy).toHaveProperty('groupPersonality');
        expect(result.groupEnergy).toHaveProperty('interpretation');
      });
    });

    describe('synergy aspects', () => {
      it('should detect element harmony when multiple members share element', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'fire'),
          createGroupMember('3', 'Carol', undefined, 'earth'),
        ];

        const result = analyzeGroupAstrologyCompatibility(members);

        expect(Array.isArray(result.synergyAspects)).toBe(true);
      });
    });
  });

  describe('analyzeGroupCompatibility', () => {
    describe('validation', () => {
      it('should throw error for less than 2 members', () => {
        const members = [createGroupMember('1', 'Alice', 'wood', 'fire')];

        expect(() => analyzeGroupCompatibility(members)).toThrow();
      });
    });

    describe('structure validation', () => {
      it('should return ComprehensiveGroupAnalysis with all required fields', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
          createGroupMember('3', 'Carol', 'earth', 'air'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(result).toHaveProperty('groupSize');
        expect(result).toHaveProperty('analysisType');
        expect(result).toHaveProperty('combinedPairwiseMatrix');
        expect(result).toHaveProperty('overallGroupScore');
        expect(result).toHaveProperty('groupGrade');
        expect(result).toHaveProperty('groupType');
        expect(result).toHaveProperty('coreStrengths');
        expect(result).toHaveProperty('mainChallenges');
        expect(result).toHaveProperty('actionableAdvice');
        expect(result).toHaveProperty('bestPairs');
        expect(result).toHaveProperty('needsWorkPairs');
      });
    });

    describe('analysis type', () => {
      it('should be combined when both saju and astrology are present', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(result.analysisType).toBe('combined');
      });

      it('should be saju_only when only saju profiles present', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood'),
          createGroupMember('2', 'Bob', 'fire'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(result.analysisType).toBe('saju_only');
      });

      it('should be astrology_only when only astrology profiles present', () => {
        const members = [
          createGroupMember('1', 'Alice', undefined, 'fire'),
          createGroupMember('2', 'Bob', undefined, 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(result.analysisType).toBe('astrology_only');
      });
    });

    describe('grades', () => {
      it('should return valid grade', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);
        const validGrades = ['S+', 'S', 'A', 'B', 'C', 'D'];

        expect(validGrades).toContain(result.groupGrade);
      });
    });

    describe('scores', () => {
      it('should return overallGroupScore between 0 and 100', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(result.overallGroupScore).toBeGreaterThanOrEqual(0);
        expect(result.overallGroupScore).toBeLessThanOrEqual(100);
      });
    });

    describe('pairwise matrix', () => {
      it('should contain all pairs', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
          createGroupMember('3', 'Carol', 'earth', 'air'),
        ];

        const result = analyzeGroupCompatibility(members);

        // 3 members = 3 pairs
        expect(result.combinedPairwiseMatrix.length).toBe(3);
      });

      it('should have valid structure for each pair', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);

        result.combinedPairwiseMatrix.forEach((pair) => {
          expect(pair).toHaveProperty('member1');
          expect(pair).toHaveProperty('member2');
          expect(pair).toHaveProperty('score');
          expect(pair).toHaveProperty('relationship');
        });
      });
    });

    describe('best and needs work pairs', () => {
      it('should identify best pairs', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
          createGroupMember('3', 'Carol', 'earth', 'air'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(Array.isArray(result.bestPairs)).toBe(true);
        result.bestPairs.forEach((pair) => {
          expect(pair).toHaveProperty('names');
          expect(pair).toHaveProperty('score');
        });
      });

      it('should identify pairs needing work', () => {
        const members = [
          createGroupMember('1', 'Alice', 'wood', 'fire'),
          createGroupMember('2', 'Bob', 'fire', 'earth'),
        ];

        const result = analyzeGroupCompatibility(members);

        expect(Array.isArray(result.needsWorkPairs)).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle 2 member groups', () => {
      const members = [
        createGroupMember('1', 'Alice', 'wood', 'fire'),
        createGroupMember('2', 'Bob', 'fire', 'earth'),
      ];

      const result = analyzeGroupCompatibility(members);

      expect(result.groupSize).toBe(2);
      expect(result.combinedPairwiseMatrix.length).toBe(1);
    });

    it('should handle mixed profile availability', () => {
      const members = [
        createGroupMember('1', 'Alice', 'wood', 'fire'),
        createGroupMember('2', 'Bob', 'fire'),
        createGroupMember('3', 'Carol', undefined, 'air'),
      ];

      const result = analyzeGroupCompatibility(members);

      expect(result).toBeDefined();
      expect(result.groupSize).toBe(3);
    });
  });
});
