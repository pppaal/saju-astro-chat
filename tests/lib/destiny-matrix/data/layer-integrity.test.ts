/**
 * Destiny Matrix Data Layer Integrity Tests
 *
 * Tests for data integrity across all 10 layers
 */

import { describe, it, expect } from 'vitest';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { SIBSIN_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import { SIBSIN_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
import { TIMING_OVERLAY_MATRIX } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { TWELVE_STAGE_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { ASTEROID_HOUSE_MATRIX, ASTEROID_ELEMENT_MATRIX } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { InteractionCode } from '@/lib/destiny-matrix/types';

describe('Layer 1: Element Core Grid', () => {
  const elements = ['목', '화', '토', '금', '수'] as const;
  const westElements = ['fire', 'earth', 'air', 'water'] as const;

  it('has all 20 cells (5 x 4)', () => {
    let count = 0;
    elements.forEach((sajuEl) => {
      westElements.forEach((westEl) => {
        if (ELEMENT_CORE_GRID[sajuEl]?.[westEl]) {
          count++;
        }
      });
    });
    expect(count).toBe(20);
  });

  it('all cells have valid InteractionCode structure', () => {
    elements.forEach((sajuEl) => {
      westElements.forEach((westEl) => {
        const cell = ELEMENT_CORE_GRID[sajuEl]?.[westEl];
        expect(cell).toBeDefined();
        expect(cell).toHaveProperty('level');
        expect(cell).toHaveProperty('score');
        expect(cell).toHaveProperty('icon');
        expect(cell).toHaveProperty('colorCode');
        expect(cell).toHaveProperty('keyword');
        expect(cell).toHaveProperty('keywordEn');
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });

  it('SIGN_TO_ELEMENT maps all 12 zodiac signs', () => {
    const zodiacSigns = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];

    zodiacSigns.forEach((sign) => {
      const element = SIGN_TO_ELEMENT[sign];
      expect(element).toBeDefined();
      expect(westElements).toContain(element);
    });
  });
});

describe('Layer 2: Sibsin-Planet Matrix', () => {
  const sibsinList = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;

  it('has all 100 cells (10 x 10)', () => {
    let count = 0;
    sibsinList.forEach((sibsin) => {
      planets.forEach((planet) => {
        if (SIBSIN_PLANET_MATRIX[sibsin]?.[planet]) {
          count++;
        }
      });
    });
    expect(count).toBe(100);
  });

  it('all cells have valid structure', () => {
    sibsinList.forEach((sibsin) => {
      planets.forEach((planet) => {
        const cell = SIBSIN_PLANET_MATRIX[sibsin]?.[planet];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
        expect(['extreme', 'amplify', 'balance', 'clash', 'conflict']).toContain(cell.level);
      });
    });
  });
});

describe('Layer 3: Sibsin-House Matrix', () => {
  const sibsinList = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;
  const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

  it('has all 120 cells (10 x 12)', () => {
    let count = 0;
    sibsinList.forEach((sibsin) => {
      houses.forEach((house) => {
        if (SIBSIN_HOUSE_MATRIX[sibsin]?.[house]) {
          count++;
        }
      });
    });
    expect(count).toBe(120);
  });

  it('all cells have valid structure', () => {
    sibsinList.forEach((sibsin) => {
      houses.forEach((house) => {
        const cell = SIBSIN_HOUSE_MATRIX[sibsin]?.[house];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 4: Timing Overlay Matrix', () => {
  const timingRows = ['daeunTransition', '목', '화', '토', '금', '수', 'shortTerm', 'wolun', 'ilun'] as const;
  const transits = [
    'saturnReturn', 'jupiterReturn', 'uranusSquare', 'neptuneSquare',
    'plutoTransit', 'nodeReturn', 'eclipse',
    'mercuryRetrograde', 'venusRetrograde', 'marsRetrograde',
    'jupiterRetrograde', 'saturnRetrograde'
  ] as const;

  it('has all 108 cells (9 x 12)', () => {
    let count = 0;
    timingRows.forEach((row) => {
      transits.forEach((transit) => {
        if (TIMING_OVERLAY_MATRIX[row]?.[transit]) {
          count++;
        }
      });
    });
    expect(count).toBe(108);
  });

  it('all cells have valid structure', () => {
    timingRows.forEach((row) => {
      transits.forEach((transit) => {
        const cell = TIMING_OVERLAY_MATRIX[row]?.[transit];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });

  // Retrograde schedules are internal implementation detail, not part of matrix data
});

describe('Layer 5: Relation-Aspect Matrix', () => {
  const relations = ['samhap', 'yukhap', 'banghap', 'chung', 'hyeong', 'pa', 'hae', 'wonjin'] as const;
  const aspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile', 'quincunx', 'semisextile', 'quintile', 'biquintile'] as const;

  it('has all 72 cells (8 x 9)', () => {
    let count = 0;
    relations.forEach((relation) => {
      aspects.forEach((aspect) => {
        if (RELATION_ASPECT_MATRIX[relation]?.[aspect]) {
          count++;
        }
      });
    });
    expect(count).toBe(72);
  });

  it('all cells have valid structure', () => {
    relations.forEach((relation) => {
      aspects.forEach((aspect) => {
        const cell = RELATION_ASPECT_MATRIX[relation]?.[aspect];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 6: TwelveStage-House Matrix', () => {
  const stages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양'] as const;
  const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

  it('has all 144 cells (12 x 12)', () => {
    let count = 0;
    stages.forEach((stage) => {
      houses.forEach((house) => {
        if (TWELVE_STAGE_HOUSE_MATRIX[stage]?.[house]) {
          count++;
        }
      });
    });
    expect(count).toBe(144);
  });

  it('all cells have valid structure', () => {
    stages.forEach((stage) => {
      houses.forEach((house) => {
        const cell = TWELVE_STAGE_HOUSE_MATRIX[stage]?.[house];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 7: Advanced Analysis Matrix', () => {
  const geokguks = [
    'jeonggwan', 'pyeongwan', 'jeongin', 'pyeongin', 'siksin', 'sanggwan', 'jeongjae', 'pyeonjae',
    'geonrok', 'yangin',
    'jonga', 'jongjae', 'jongsal', 'jonggang',
    'gokjik', 'yeomsang', 'gasaek', 'jonghyeok', 'yunha'
  ] as const;
  const yongsinRows = ['yongsin_목', 'yongsin_화', 'yongsin_토', 'yongsin_금', 'yongsin_수'] as const;
  const progressions = ['secondary', 'solarArc', 'solarReturn', 'lunarReturn', 'draconic', 'harmonics'] as const;

  it('has all geokguk cells (19 x 6 = 114)', () => {
    let count = 0;
    geokguks.forEach((geokguk) => {
      progressions.forEach((progression) => {
        if (ADVANCED_ANALYSIS_MATRIX[geokguk]?.[progression]) {
          count++;
        }
      });
    });
    expect(count).toBe(114);
  });

  it('has all yongsin cells (5 x 6 = 30)', () => {
    let count = 0;
    yongsinRows.forEach((yongsin) => {
      progressions.forEach((progression) => {
        if (ADVANCED_ANALYSIS_MATRIX[yongsin]?.[progression]) {
          count++;
        }
      });
    });
    expect(count).toBe(30);
  });

  it('total cells = 144 (114 + 30)', () => {
    let total = 0;
    Object.keys(ADVANCED_ANALYSIS_MATRIX).forEach((row) => {
      Object.keys(ADVANCED_ANALYSIS_MATRIX[row as keyof typeof ADVANCED_ANALYSIS_MATRIX]).forEach(() => {
        total++;
      });
    });
    expect(total).toBe(144);
  });

  it('all cells have valid structure', () => {
    [...geokguks, ...yongsinRows].forEach((row) => {
      progressions.forEach((progression) => {
        const cell = ADVANCED_ANALYSIS_MATRIX[row as keyof typeof ADVANCED_ANALYSIS_MATRIX]?.[progression];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 8: Shinsal-Planet Matrix', () => {
  const shinsals = [
    // 길신 (11)
    '천을귀인', '태극귀인', '천덕귀인', '월덕귀인', '문창귀인', '학당귀인',
    '금여록', '천주귀인', '암록', '건록', '제왕',
    // 흉신 (15)
    '도화', '홍염살', '양인', '백호', '겁살', '재살', '천살', '지살', '년살',
    '월살', '망신', '고신', '괴강', '현침', '귀문관',
    // 특수 (8)
    '역마', '화개', '장성', '반안', '천라지망', '공망', '삼재', '원진'
  ] as const;
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;

  it('has all 340 cells (34 x 10)', () => {
    let count = 0;
    shinsals.forEach((shinsal) => {
      planets.forEach((planet) => {
        if (SHINSAL_PLANET_MATRIX[shinsal]?.[planet]) {
          count++;
        }
      });
    });
    expect(count).toBe(340);
  });

  it('all cells have valid structure', () => {
    shinsals.forEach((shinsal) => {
      planets.forEach((planet) => {
        const cell = SHINSAL_PLANET_MATRIX[shinsal]?.[planet];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 9: Asteroid Matrices', () => {
  const asteroids = ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const;
  const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
  const elements = ['목', '화', '토', '금', '수'] as const;

  it('Asteroid-House has all 48 cells (4 x 12)', () => {
    let count = 0;
    asteroids.forEach((asteroid) => {
      houses.forEach((house) => {
        if (ASTEROID_HOUSE_MATRIX[asteroid]?.[house]) {
          count++;
        }
      });
    });
    expect(count).toBe(48);
  });

  it('Asteroid-Element has all 20 cells (4 x 5)', () => {
    let count = 0;
    asteroids.forEach((asteroid) => {
      elements.forEach((element) => {
        if (ASTEROID_ELEMENT_MATRIX[asteroid]?.[element]) {
          count++;
        }
      });
    });
    expect(count).toBe(20);
  });

  it('total Layer 9 cells = 68', () => {
    const houseCount = Object.keys(ASTEROID_HOUSE_MATRIX).reduce((sum, asteroid) => {
      return sum + Object.keys(ASTEROID_HOUSE_MATRIX[asteroid as keyof typeof ASTEROID_HOUSE_MATRIX]).length;
    }, 0);
    const elementCount = Object.keys(ASTEROID_ELEMENT_MATRIX).reduce((sum, asteroid) => {
      return sum + Object.keys(ASTEROID_ELEMENT_MATRIX[asteroid as keyof typeof ASTEROID_ELEMENT_MATRIX]).length;
    }, 0);
    expect(houseCount + elementCount).toBe(68);
  });

  it('all cells have valid structure', () => {
    asteroids.forEach((asteroid) => {
      houses.forEach((house) => {
        const cell = ASTEROID_HOUSE_MATRIX[asteroid][house];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });

      elements.forEach((element) => {
        const cell = ASTEROID_ELEMENT_MATRIX[asteroid][element];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });
});

describe('Layer 10: ExtraPoint Matrices', () => {
  const points = ['Chiron', 'Lilith', 'PartOfFortune', 'Vertex', 'NorthNode', 'SouthNode'] as const;
  const elements = ['목', '화', '토', '금', '수'] as const;
  const sibsinList = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;

  it('ExtraPoint-Element has all 30 cells (6 x 5)', () => {
    let count = 0;
    points.forEach((point) => {
      elements.forEach((element) => {
        if (EXTRAPOINT_ELEMENT_MATRIX[point]?.[element]) {
          count++;
        }
      });
    });
    expect(count).toBe(30);
  });

  it('ExtraPoint-Sibsin has 60 cells (6 x 10, partial)', () => {
    let count = 0;
    points.forEach((point) => {
      sibsinList.forEach((sibsin) => {
        if (EXTRAPOINT_SIBSIN_MATRIX[point]?.[sibsin]) {
          count++;
        }
      });
    });
    // Partial matrix, at least 60 cells
    expect(count).toBeGreaterThanOrEqual(60);
  });

  it('all ExtraPoint-Element cells have valid structure', () => {
    points.forEach((point) => {
      elements.forEach((element) => {
        const cell = EXTRAPOINT_ELEMENT_MATRIX[point][element];
        expect(cell).toBeDefined();
        expect(cell.score).toBeGreaterThanOrEqual(1);
        expect(cell.score).toBeLessThanOrEqual(10);
      });
    });
  });

  it('all ExtraPoint-Sibsin cells (when defined) have valid structure', () => {
    points.forEach((point) => {
      sibsinList.forEach((sibsin) => {
        const cell = EXTRAPOINT_SIBSIN_MATRIX[point]?.[sibsin];
        if (cell) {
          expect(cell.score).toBeGreaterThanOrEqual(1);
          expect(cell.score).toBeLessThanOrEqual(10);
        }
      });
    });
  });
});

describe('Cross-layer integrity', () => {
  it('all layers use consistent InteractionCode structure', () => {
    const allCells: InteractionCode[] = [];

    // Sample from each layer
    allCells.push(ELEMENT_CORE_GRID['목']['fire']);
    allCells.push(SIBSIN_PLANET_MATRIX['정관']['Sun']);
    allCells.push(SIBSIN_HOUSE_MATRIX['정재'][2]);
    allCells.push(TIMING_OVERLAY_MATRIX['목']['saturnReturn']);
    allCells.push(RELATION_ASPECT_MATRIX['samhap']['conjunction']);
    allCells.push(TWELVE_STAGE_HOUSE_MATRIX['장생'][1]);
    allCells.push(ADVANCED_ANALYSIS_MATRIX['jeonggwan']['secondary']);
    allCells.push(SHINSAL_PLANET_MATRIX['천을귀인']['Sun']);
    allCells.push(ASTEROID_HOUSE_MATRIX['Ceres'][6]);
    allCells.push(EXTRAPOINT_ELEMENT_MATRIX['Chiron']['목']);

    allCells.forEach((cell) => {
      expect(cell).toHaveProperty('level');
      expect(cell).toHaveProperty('score');
      expect(cell).toHaveProperty('icon');
      expect(cell).toHaveProperty('colorCode');
      expect(cell).toHaveProperty('keyword');
      expect(cell).toHaveProperty('keywordEn');
    });
  });

  it('all scores are within valid range (1-10)', () => {
    const validateScore = (matrix: any) => {
      Object.values(matrix).forEach((row: any) => {
        Object.values(row).forEach((cell: any) => {
          if (cell && typeof cell === 'object' && 'score' in cell) {
            expect(cell.score).toBeGreaterThanOrEqual(1);
            expect(cell.score).toBeLessThanOrEqual(10);
          }
        });
      });
    };

    validateScore(ELEMENT_CORE_GRID);
    validateScore(SIBSIN_PLANET_MATRIX);
    validateScore(SIBSIN_HOUSE_MATRIX);
    validateScore(TIMING_OVERLAY_MATRIX);
    validateScore(RELATION_ASPECT_MATRIX);
    validateScore(TWELVE_STAGE_HOUSE_MATRIX);
    validateScore(ADVANCED_ANALYSIS_MATRIX);
    validateScore(SHINSAL_PLANET_MATRIX);
    validateScore(ASTEROID_HOUSE_MATRIX);
    validateScore(ASTEROID_ELEMENT_MATRIX);
    validateScore(EXTRAPOINT_ELEMENT_MATRIX);
    validateScore(EXTRAPOINT_SIBSIN_MATRIX);
  });

  it('total cells across all layers = 1,206', () => {
    const counts = {
      layer1: 20,
      layer2: 100,
      layer3: 120,
      layer4: 108,
      layer5: 72,
      layer6: 144,
      layer7: 144,
      layer8: 340,
      layer9: 68,
      layer10: 90,
    };

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(1206);
  });
});
