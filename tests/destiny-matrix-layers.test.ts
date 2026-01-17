/**
 * Destiny Fusion Matrix™ - Layer 1-10 Advice Field Tests
 *
 * 모든 10개 데이터 레이어의 advice 필드 완전성을 검증합니다.
 */

import { describe, it, expect } from 'vitest';

// Layer 1
import { ELEMENT_CORE_GRID } from '@/lib/destiny-matrix/data/layer1-element-core';
// Layer 2
import { SIBSIN_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
// Layer 3
import { SIBSIN_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
// Layer 4
import { TIMING_OVERLAY_MATRIX } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
// Layer 5
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
// Layer 6
import { TWELVE_STAGE_HOUSE_MATRIX } from '@/lib/destiny-matrix/data/layer6-stage-house';
// Layer 7
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
// Layer 8
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
// Layer 9
import { ASTEROID_HOUSE_MATRIX, ASTEROID_ELEMENT_MATRIX } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
// Layer 10
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';


// 헬퍼: 모든 셀을 순회하며 advice 필드 검증
function validateAdviceField(
  matrix: Record<string, Record<string | number, { advice?: string }>>,
  layerName: string
): { total: number; withAdvice: number; missingAdvice: string[] } {
  let total = 0;
  let withAdvice = 0;
  const missingAdvice: string[] = [];

  for (const [rowKey, row] of Object.entries(matrix)) {
    for (const [colKey, cell] of Object.entries(row)) {
      total++;
      if (cell.advice && cell.advice.length > 0) {
        withAdvice++;
      } else {
        missingAdvice.push(`${layerName}[${rowKey}][${colKey}]`);
      }
    }
  }

  return { total, withAdvice, missingAdvice };
}

// advice 문자열 구조 검증 (한국어, 적절한 길이)
function validateAdviceContent(advice: string): boolean {
  // 한글 포함 여부
  const hasKorean = /[가-힣]/.test(advice);
  // 최소 길이 (50자 이상)
  const hasMinLength = advice.length >= 50;
  // 최대 길이 (500자 이하)
  const hasMaxLength = advice.length <= 500;
  // "단," 패턴 포함 (주의사항)
  const hasWarningPattern = advice.includes('단,');

  return hasKorean && hasMinLength && hasMaxLength && hasWarningPattern;
}

describe('Destiny Fusion Matrix - Layer Advice Coverage', () => {

  describe('Layer 1: Element Core Grid', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(ELEMENT_CORE_GRID, 'Layer1');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('advice 필드가 한글과 적절한 길이를 가져야 함', () => {
      const cell = ELEMENT_CORE_GRID['목'].fire;
      expect(cell.advice).toBeDefined();
      // 한글 포함, 50자 이상
      expect(/[가-힣]/.test(cell.advice!)).toBe(true);
      expect(cell.advice!.length).toBeGreaterThanOrEqual(50);
    });

    it('예상 셀 수가 맞아야 함 (5x4 = 20)', () => {
      const result = validateAdviceField(ELEMENT_CORE_GRID, 'Layer1');
      expect(result.total).toBe(20);
    });
  });

  describe('Layer 2: Sibsin Planet Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(SIBSIN_PLANET_MATRIX, 'Layer2');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('예상 셀 수가 맞아야 함 (10x10 = 100)', () => {
      const result = validateAdviceField(SIBSIN_PLANET_MATRIX, 'Layer2');
      expect(result.total).toBe(100);  // 10 십신 x 10 행성
    });
  });

  describe('Layer 3: Sibsin House Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(SIBSIN_HOUSE_MATRIX, 'Layer3');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('예상 셀 수가 맞아야 함 (10x12 = 120)', () => {
      const result = validateAdviceField(SIBSIN_HOUSE_MATRIX, 'Layer3');
      expect(result.total).toBe(120);
    });
  });

  describe('Layer 4: Timing Overlay Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(TIMING_OVERLAY_MATRIX, 'Layer4');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('예상 셀 수가 맞아야 함 (9x12 = 108)', () => {
      const result = validateAdviceField(TIMING_OVERLAY_MATRIX, 'Layer4');
      expect(result.total).toBe(108);
    });
  });

  describe('Layer 5: Relation Aspect Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(RELATION_ASPECT_MATRIX, 'Layer5');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });
  });

  describe('Layer 6: Twelve Stage House Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(TWELVE_STAGE_HOUSE_MATRIX, 'Layer6');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('예상 셀 수가 맞아야 함 (12x12 = 144)', () => {
      const result = validateAdviceField(TWELVE_STAGE_HOUSE_MATRIX, 'Layer6');
      expect(result.total).toBe(144);
    });
  });

  describe('Layer 7: Advanced Analysis Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(ADVANCED_ANALYSIS_MATRIX, 'Layer7');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });
  });

  describe('Layer 8: Shinsal Planet Matrix', () => {
    it('모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(SHINSAL_PLANET_MATRIX, 'Layer8');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });
  });

  describe('Layer 9: Asteroid Matrices', () => {
    it('ASTEROID_HOUSE_MATRIX의 모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(ASTEROID_HOUSE_MATRIX, 'Layer9-House');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('ASTEROID_HOUSE_MATRIX 예상 셀 수 (4x12 = 48)', () => {
      const result = validateAdviceField(ASTEROID_HOUSE_MATRIX, 'Layer9-House');
      expect(result.total).toBe(48);
    });

    it('ASTEROID_ELEMENT_MATRIX의 모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(ASTEROID_ELEMENT_MATRIX, 'Layer9-Element');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('ASTEROID_ELEMENT_MATRIX 예상 셀 수 (4x5 = 20)', () => {
      const result = validateAdviceField(ASTEROID_ELEMENT_MATRIX, 'Layer9-Element');
      expect(result.total).toBe(20);
    });
  });

  describe('Layer 10: ExtraPoint Matrices', () => {
    it('EXTRAPOINT_ELEMENT_MATRIX의 모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(EXTRAPOINT_ELEMENT_MATRIX, 'Layer10-Element');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('EXTRAPOINT_ELEMENT_MATRIX 예상 셀 수 (6x5 = 30)', () => {
      const result = validateAdviceField(EXTRAPOINT_ELEMENT_MATRIX, 'Layer10-Element');
      expect(result.total).toBe(30);
    });

    it('EXTRAPOINT_SIBSIN_MATRIX의 모든 셀에 advice 필드가 존재해야 함', () => {
      const result = validateAdviceField(EXTRAPOINT_SIBSIN_MATRIX, 'Layer10-Sibsin');
      expect(result.missingAdvice).toHaveLength(0);
      expect(result.withAdvice).toBe(result.total);
    });

    it('EXTRAPOINT_SIBSIN_MATRIX 예상 셀 수 (6x10 = 60)', () => {
      const result = validateAdviceField(EXTRAPOINT_SIBSIN_MATRIX, 'Layer10-Sibsin');
      expect(result.total).toBe(60);
    });
  });
});

describe('Destiny Fusion Matrix - Advice Content Quality', () => {

  it('Layer 1 advice에 한글이 포함되어 있어야 함', () => {
    const advice = ELEMENT_CORE_GRID['화'].fire.advice!;
    expect(/[가-힣]/.test(advice)).toBe(true);
  });

  it('Layer 4 advice에 주의사항 패턴이 있어야 함', () => {
    const advice = TIMING_OVERLAY_MATRIX.daeunTransition.saturnReturn.advice!;
    // "단," 또는 다른 주의 표현 패턴
    const hasWarningPattern = advice.includes('단,') ||
                               advice.includes('주의') ||
                               advice.includes('피하세요') ||
                               advice.includes('마세요');
    expect(hasWarningPattern).toBe(true);
  });

  it('Layer 6 advice 길이가 적절해야 함 (50-500자)', () => {
    const advice = TWELVE_STAGE_HOUSE_MATRIX['장생'][1].advice!;
    expect(advice.length).toBeGreaterThanOrEqual(50);
    expect(advice.length).toBeLessThanOrEqual(500);
  });

  it('Layer 8 신살 항목 샘플에 advice가 있어야 함', () => {
    // 대표 신살 샘플 검증
    const sampleShinsals = ['천을귀인', '금여록', '역마'];
    const samplePlanets = ['Sun', 'Moon', 'Jupiter'];

    for (const shinsal of sampleShinsals) {
      if (SHINSAL_PLANET_MATRIX[shinsal]) {
        for (const planet of samplePlanets) {
          if (SHINSAL_PLANET_MATRIX[shinsal][planet]) {
            expect(SHINSAL_PLANET_MATRIX[shinsal][planet].advice).toBeDefined();
          }
        }
      }
    }
  });

  it('Layer 10 ExtraPoint advice가 3부분 구조를 가져야 함', () => {
    // 상황 설명 → 긍정적 행동 → 주의사항 (단,)
    const advice = EXTRAPOINT_ELEMENT_MATRIX.Chiron['목'].advice!;
    expect(advice.includes('단,')).toBe(true);
    expect(advice.length).toBeGreaterThan(100);
  });
});

describe('Destiny Fusion Matrix - Score Consistency', () => {

  it('score가 1-10 범위 내에 있어야 함', () => {
    const checkScoreRange = (cell: { score: number }) => {
      expect(cell.score).toBeGreaterThanOrEqual(1);
      expect(cell.score).toBeLessThanOrEqual(10);
    };

    // Layer 1 샘플 체크
    checkScoreRange(ELEMENT_CORE_GRID['목'].fire);
    checkScoreRange(ELEMENT_CORE_GRID['화'].water);

    // Layer 6 샘플 체크
    checkScoreRange(TWELVE_STAGE_HOUSE_MATRIX['장생'][1]);
    checkScoreRange(TWELVE_STAGE_HOUSE_MATRIX['절'][1]);
  });

  it('extreme level은 score 8 이상이어야 함', () => {
    const cell = ELEMENT_CORE_GRID['화'].fire;
    if (cell.level === 'extreme') {
      expect(cell.score).toBeGreaterThanOrEqual(8);
    }
  });

  it('conflict level은 score 4 이하이어야 함', () => {
    const cell = ELEMENT_CORE_GRID['화'].water;
    if (cell.level === 'conflict') {
      expect(cell.score).toBeLessThanOrEqual(4);
    }
  });
});
