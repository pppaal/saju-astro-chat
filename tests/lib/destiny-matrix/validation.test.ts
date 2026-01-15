/**
 * Destiny Matrix Validation Tests
 *
 * Tests for Zod-based validation system
 */

import { describe, it, expect } from 'vitest';
import {
  validateMatrixInput,
  validateReportRequest,
  quickValidate,
  FiveElementSchema,
  SibsinKindSchema,
  GeokgukTypeSchema,
  ShinsalKindSchema,
  TransitCycleSchema,
  MatrixCalculationInputSchema,
} from '@/lib/destiny-matrix/validation';
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types';
import { DestinyMatrixError } from '@/lib/destiny-matrix/errors';

describe('FiveElementSchema', () => {
  it('accepts valid five elements', () => {
    const validElements = ['목', '화', '토', '금', '수'];
    validElements.forEach((element) => {
      expect(() => FiveElementSchema.parse(element)).not.toThrow();
    });
  });

  it('rejects invalid elements', () => {
    const invalidElements = ['wood', 'fire', 'invalid', '', null];
    invalidElements.forEach((element) => {
      expect(() => FiveElementSchema.parse(element)).toThrow();
    });
  });
});

describe('SibsinKindSchema', () => {
  it('accepts all 10 sibsin kinds', () => {
    const validSibsin = [
      '비견', '겁재', '식신', '상관', '편재', '정재',
      '편관', '정관', '편인', '정인'
    ];
    validSibsin.forEach((sibsin) => {
      expect(() => SibsinKindSchema.parse(sibsin)).not.toThrow();
    });
  });

  it('rejects invalid sibsin', () => {
    expect(() => SibsinKindSchema.parse('invalid')).toThrow();
    expect(() => SibsinKindSchema.parse('')).toThrow();
  });
});

describe('GeokgukTypeSchema', () => {
  it('accepts regular patterns (정격)', () => {
    const regular = [
      'jeonggwan', 'pyeongwan', 'jeongin', 'pyeongin',
      'siksin', 'sanggwan', 'jeongjae', 'pyeonjae'
    ];
    regular.forEach((geokguk) => {
      expect(() => GeokgukTypeSchema.parse(geokguk)).not.toThrow();
    });
  });

  it('accepts special patterns (특수격)', () => {
    const special = ['geonrok', 'yangin'];
    special.forEach((geokguk) => {
      expect(() => GeokgukTypeSchema.parse(geokguk)).not.toThrow();
    });
  });

  it('accepts following patterns (종격)', () => {
    const following = ['jonga', 'jongjae', 'jongsal', 'jonggang'];
    following.forEach((geokguk) => {
      expect(() => GeokgukTypeSchema.parse(geokguk)).not.toThrow();
    });
  });

  it('accepts external patterns (외격)', () => {
    const external = ['gokjik', 'yeomsang', 'gasaek', 'jonghyeok', 'yunha'];
    external.forEach((geokguk) => {
      expect(() => GeokgukTypeSchema.parse(geokguk)).not.toThrow();
    });
  });

  it('rejects invalid geokguk', () => {
    expect(() => GeokgukTypeSchema.parse('invalid')).toThrow();
  });
});

describe('ShinsalKindSchema', () => {
  it('accepts auspicious shinsals (길신)', () => {
    const auspicious = [
      '천을귀인', '태극귀인', '천덕귀인', '월덕귀인', '문창귀인',
      '학당귀인', '금여록', '천주귀인', '암록', '건록', '제왕'
    ];
    auspicious.forEach((shinsal) => {
      expect(() => ShinsalKindSchema.parse(shinsal)).not.toThrow();
    });
  });

  it('accepts cautionary shinsals (흉신)', () => {
    const cautionary = [
      '도화', '홍염살', '양인', '백호', '겁살', '재살',
      '천살', '지살', '년살', '월살', '망신', '고신',
      '괴강', '현침', '귀문관'
    ];
    cautionary.forEach((shinsal) => {
      expect(() => ShinsalKindSchema.parse(shinsal)).not.toThrow();
    });
  });

  it('accepts special shinsals', () => {
    const special = [
      '역마', '화개', '장성', '반안', '천라지망',
      '공망', '삼재', '원진'
    ];
    special.forEach((shinsal) => {
      expect(() => ShinsalKindSchema.parse(shinsal)).not.toThrow();
    });
  });

  it('rejects invalid shinsal', () => {
    expect(() => ShinsalKindSchema.parse('invalid')).toThrow();
  });
});

describe('TransitCycleSchema', () => {
  it('accepts major transits', () => {
    const transits = [
      'saturnReturn', 'jupiterReturn', 'uranusSquare',
      'neptuneSquare', 'plutoTransit', 'nodeReturn', 'eclipse'
    ];
    transits.forEach((transit) => {
      expect(() => TransitCycleSchema.parse(transit)).not.toThrow();
    });
  });

  it('accepts retrograde cycles', () => {
    const retrogrades = [
      'mercuryRetrograde', 'venusRetrograde', 'marsRetrograde',
      'jupiterRetrograde', 'saturnRetrograde'
    ];
    retrogrades.forEach((retrograde) => {
      expect(() => TransitCycleSchema.parse(retrograde)).not.toThrow();
    });
  });

  it('rejects invalid transit', () => {
    expect(() => TransitCycleSchema.parse('invalid')).toThrow();
  });
});

describe('validateMatrixInput', () => {
  const createValidInput = (): MatrixCalculationInput => ({
    dayMasterElement: '목',
    pillarElements: ['목', '화', '토', '금'],
    sibsinDistribution: { 비견: 2, 식신: 1 },
    twelveStages: { 장생: 1, 제왕: 1 }, // Use '제왕' instead of '왕지'
    relations: [],
    planetHouses: { Sun: 1, Moon: 4 },
    planetSigns: {},
    aspects: [],
  });

  it('accepts valid minimal input', () => {
    const input = createValidInput();
    const result = validateMatrixInput(input);

    if (!result.success) {
      console.log('Validation errors:', JSON.stringify(result.errors, null, 2));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayMasterElement).toBe('목');
    }
  });

  it('accepts input with all layers', () => {
    const input: MatrixCalculationInput = {
      ...createValidInput(),
      dominantWesternElement: 'fire',
      activeTransits: ['saturnReturn', 'jupiterReturn'],
      currentDaeunElement: '화',
      currentSaeunElement: '토',
      geokguk: 'jeonggwan',
      yongsin: '수',
      shinsalList: ['천을귀인', '역마'],
      asteroidHouses: { Ceres: 6, Pallas: 9 },
      extraPointSigns: { Chiron: '양자리', NorthNode: '쌍둥이자리' },
      lang: 'ko',
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(true);
  });

  it('rejects input without dayMasterElement', () => {
    const input = { ...createValidInput() };
    delete (input as any).dayMasterElement;

    const result = validateMatrixInput(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid dayMasterElement', () => {
    const input = {
      ...createValidInput(),
      dayMasterElement: 'invalid' as any,
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid planetHouses', () => {
    const input = {
      ...createValidInput(),
      planetHouses: { Sun: 0 as any }, // Invalid house number
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(false);
  });

  it('accepts empty sibsinDistribution', () => {
    const input = {
      ...createValidInput(),
      sibsinDistribution: {},
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid sibsin in distribution', () => {
    const input = {
      ...createValidInput(),
      sibsinDistribution: { 'invalid': 1 } as any,
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(false);
  });

  it('accepts valid aspects', () => {
    const input = {
      ...createValidInput(),
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'conjunction' },
        { planet1: 'Mars', planet2: 'Venus', type: 'trine' },
      ],
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid aspect type', () => {
    const input = {
      ...createValidInput(),
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'invalid' as any },
      ],
    };

    const result = validateMatrixInput(input);
    expect(result.success).toBe(false);
  });
});

describe('quickValidate', () => {
  it('returns true for valid input with dayMasterElement', () => {
    const input = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const result = quickValidate(input);
    expect(result.valid).toBe(true);
  });

  it('returns false for input without dayMasterElement', () => {
    const input = {
      pillarElements: [],
      sibsinDistribution: {},
    } as any;

    const result = quickValidate(input);
    expect(result.valid).toBe(false);
  });

  it('returns false for input with invalid dayMasterElement', () => {
    const input = {
      dayMasterElement: 'invalid',
      pillarElements: [],
    } as any;

    const result = quickValidate(input);
    expect(result.valid).toBe(false);
  });
});

describe('MatrixCalculationInputSchema edge cases', () => {
  it('accepts lang option', () => {
    const input = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
      lang: 'en',
    };

    const result = MatrixCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid lang', () => {
    const input = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
      lang: 'fr', // Invalid
    };

    const result = MatrixCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts partial records for optional fields', () => {
    const input = {
      dayMasterElement: '화',
      pillarElements: ['목'],
      sibsinDistribution: { 정관: 1 },
      twelveStages: { 장생: 1 },
      relations: [],
      planetHouses: { Sun: 1 },
      planetSigns: {},
      aspects: [],
      asteroidHouses: { Ceres: 4 }, // Partial
      extraPointSigns: { Chiron: '양자리' }, // Partial
    };

    const result = MatrixCalculationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('handles complex real-world input', () => {
    const input = {
      dayMasterElement: '목',
      pillarElements: ['목', '화', '토', '금', '수', '목', '화', '토'],
      sibsinDistribution: {
        비견: 2,
        식신: 1,
        정재: 1,
        정관: 2,
        정인: 2,
      },
      twelveStages: {
        장생: 1,
        목욕: 1,
        관대: 1,
        건록: 1,  // Changed from 임관
        제왕: 2,  // Changed from 왕지
        쇠: 1,
        병: 1,
      },
      relations: [
        { kind: '지지삼합', detail: '寅午戌' },
        { kind: '지지육합', detail: '子丑' },
      ],
      dominantWesternElement: 'fire',
      planetHouses: {
        Sun: 5,
        Moon: 11,
        Mercury: 4,
        Venus: 6,
        Mars: 8,
        Jupiter: 9,
        Saturn: 10,
        Uranus: 2,
        Neptune: 12,
        Pluto: 8,
      },
      planetSigns: {
        Sun: '사자자리',
        Moon: '물병자리',
      },
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'opposition' },
        { planet1: 'Venus', planet2: 'Mars', type: 'trine' },
        { planet1: 'Jupiter', planet2: 'Saturn', type: 'square' },
      ],
      activeTransits: ['saturnReturn', 'mercuryRetrograde'],
      currentDaeunElement: '화',
      currentSaeunElement: '토',
      geokguk: 'jeonggwan',
      yongsin: '수',
      shinsalList: ['천을귀인', '역마', '도화', '화개'],
      asteroidHouses: {
        Ceres: 6,
        Pallas: 9,
        Juno: 7,
        Vesta: 4,
      },
      extraPointSigns: {
        Chiron: '양자리',
        Lilith: '전갈자리',
        PartOfFortune: '사자자리',
        Vertex: '처녀자리',
        NorthNode: '쌍둥이자리',
        SouthNode: '사수자리',
      },
      lang: 'ko',
    };

    const result = MatrixCalculationInputSchema.safeParse(input);
    if (!result.success) {
      console.log('Complex input validation errors:', JSON.stringify(result.error.errors, null, 2));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pillarElements).toHaveLength(8);
      expect(Object.keys(result.data.sibsinDistribution)).toHaveLength(5);
      expect(result.data.shinsalList).toHaveLength(4);
    }
  });
});
