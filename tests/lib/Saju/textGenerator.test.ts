// tests/lib/Saju/textGenerator.test.ts
// 운세 텍스트 생성기 테스트


import {
  generateElementText,
  generateSibsinText,
  generateTwelveStageText,
  generateFortuneText,
  generateChungText,
  generateHapText,
  generateStrengthAdvice,
  generateComprehensiveText,
  TextStyle,
  TextContext,
  FortuneInput,
} from '@/lib/Saju/textGenerator';
import type { SajuPillars, PillarData, FiveElement, SibsinKind } from '@/lib/Saju/types';

// 테스트 헬퍼 함수
function createPillarData(stemName: string, branchName: string): PillarData {
  const stemElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };
  const stemYinYangMap: Record<string, '양' | '음'> = {
    '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
    '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
  };

  return {
    heavenlyStem: {
      name: stemName,
      element: stemElementMap[stemName] || '토',
      yin_yang: stemYinYangMap[stemName] || '양',
      sibsin: '비견',
    },
    earthlyBranch: {
      name: branchName,
      element: '토',
      yin_yang: '양',
      sibsin: '비견',
    },
    jijanggan: {},
  };
}

function createTestPillars(): SajuPillars {
  return {
    year: createPillarData('甲', '子'),
    month: createPillarData('乙', '丑'),
    day: createPillarData('丙', '寅'),
    time: createPillarData('丁', '卯'),
  };
}

describe('textGenerator', () => {
  describe('generateElementText', () => {
    const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

    it('should generate text for all five elements', () => {
      for (const element of elements) {
        const result = generateElementText(element);

        expect(result.main).toBeTruthy();
        expect(result.main).toContain(element);
        expect(result.details.length).toBeGreaterThan(0);
        expect(result.keywords.length).toBeGreaterThan(0);
        expect(result.advice).toBeTruthy();
      }
    });

    it('should respect formal style', () => {
      const result = generateElementText('목', { style: 'formal' });

      expect(result.main).toContain('기운이 작용하는');
      expect(result.main).toContain('木');
    });

    it('should respect casual style', () => {
      const result = generateElementText('화', { style: 'casual' });

      expect(result.main).toContain('기운이 강해요');
    });

    it('should respect poetic style', () => {
      const result = generateElementText('수', { style: 'poetic' });

      expect(result.main.length).toBeGreaterThan(20);
    });

    it('should respect brief style', () => {
      const result = generateElementText('금', { style: 'brief' });

      expect(result.main.length).toBeLessThan(50);
      expect(result.details.length).toBe(1);
    });

    it('should include domain recommendations', () => {
      const result = generateElementText('토');

      expect(result.advice).toBeTruthy();
      expect(result.details.some(d => d.includes('분야'))).toBe(true);
    });
  });

  describe('generateSibsinText', () => {
    const sibsinTypes: SibsinKind[] = [
      '비견', '겁재', '식신', '상관', '편재',
      '정재', '편관', '정관', '편인', '정인'
    ];

    it('should generate text for all 10 sibsin types', () => {
      for (const sibsin of sibsinTypes) {
        const result = generateSibsinText(sibsin);

        expect(result.main).toBeTruthy();
        expect(result.main).toContain(sibsin);
        expect(result.details.length).toBeGreaterThan(0);
        expect(result.keywords).toContain(sibsin);
        expect(result.advice).toBeTruthy();
      }
    });

    it('should include theme in keywords', () => {
      const result = generateSibsinText('정관');

      expect(result.keywords.some(k => k.includes('질서') || k.includes('명예') || k === '정관')).toBe(true);
    });

    it('should adjust style for casual context', () => {
      const formal = generateSibsinText('식신', { style: 'formal' });
      const casual = generateSibsinText('식신', { style: 'casual' });

      expect(formal.main).not.toEqual(casual.main);
      expect(casual.main).toContain('이에요');
    });

    it('should provide caution in details', () => {
      const result = generateSibsinText('편관');

      expect(result.details.some(d => d.includes('스트레스') || d.includes('건강'))).toBe(true);
    });
  });

  describe('generateTwelveStageText', () => {
    const stages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양'];

    it('should generate text for all 12 stages', () => {
      for (const stage of stages) {
        const result = generateTwelveStageText(stage);

        expect(result.main).toBeTruthy();
        expect(result.main).toContain(stage);
        expect(result.keywords).toContain(stage);
        expect(result.advice).toBeTruthy();
      }
    });

    it('should handle unknown stage gracefully', () => {
      const result = generateTwelveStageText('알수없음');

      expect(result.main).toBeTruthy();
      expect(result.advice).toBeTruthy();
    });

    it('should include energy keyword', () => {
      const result = generateTwelveStageText('장생');

      expect(result.keywords.some(k => k.includes('기운'))).toBe(true);
    });

    it('should provide appropriate advice for each stage', () => {
      const result1 = generateTwelveStageText('왕지');
      expect(result1.advice).toContain('겸손');

      const result2 = generateTwelveStageText('병');
      expect(result2.advice).toContain('쉬');
    });
  });

  describe('generateFortuneText', () => {
    it('should generate daily fortune text', () => {
      const input: FortuneInput = {
        type: 'daily',
        stem: '甲',
        branch: '子',
        dayMaster: '丙',
      };

      const result = generateFortuneText(input);

      expect(result.main).toContain('오늘');
      expect(result.main).toContain('甲子');
    });

    it('should generate monthly fortune text', () => {
      const input: FortuneInput = {
        type: 'monthly',
        stem: '乙',
        branch: '丑',
        dayMaster: '丁',
      };

      const result = generateFortuneText(input);

      expect(result.main).toContain('이번 달');
    });

    it('should generate yearly fortune text', () => {
      const input: FortuneInput = {
        type: 'yearly',
        stem: '丙',
        branch: '寅',
        dayMaster: '戊',
      };

      const result = generateFortuneText(input);

      expect(result.main).toContain('올해');
    });

    it('should generate daeun fortune text', () => {
      const input: FortuneInput = {
        type: 'daeun',
        stem: '壬',
        branch: '申',
        dayMaster: '甲',
      };

      const result = generateFortuneText(input);

      expect(result.main).toContain('대운');
    });

    it('should include sibsin analysis when provided', () => {
      const input: FortuneInput = {
        type: 'daily',
        stem: '甲',
        branch: '子',
        dayMaster: '丙',
        sibsin: '정관',
      };

      const result = generateFortuneText(input);

      expect(result.keywords).toContain('정관');
    });

    it('should include twelve stage analysis when provided', () => {
      const input: FortuneInput = {
        type: 'monthly',
        stem: '乙',
        branch: '丑',
        dayMaster: '丁',
        twelveStage: '장생',
      };

      const result = generateFortuneText(input);

      expect(result.keywords).toContain('장생');
    });

    it('should provide combined advice', () => {
      const input: FortuneInput = {
        type: 'yearly',
        stem: '丙',
        branch: '寅',
        dayMaster: '戊',
        sibsin: '식신',
        twelveStage: '관대',
      };

      const result = generateFortuneText(input);

      expect(result.advice).toBeTruthy();
      expect(result.advice.length).toBeGreaterThan(20);
    });
  });

  describe('generateChungText', () => {
    it('should generate text for branch clash', () => {
      const result = generateChungText('子', '午');

      expect(result.main).toContain('子');
      expect(result.main).toContain('午');
      expect(result.main).toContain('충');
      expect(result.keywords).toContain('충');
      expect(result.keywords).toContain('변화');
    });

    it('should include caution details', () => {
      const result = generateChungText('寅', '申');

      expect(result.details.some(d => d.includes('변화'))).toBe(true);
      expect(result.details.some(d => d.includes('주의'))).toBe(true);
    });

    it('should provide advice', () => {
      const result = generateChungText('卯', '酉');

      expect(result.advice).toContain('유연');
    });

    it('should respect casual style', () => {
      const result = generateChungText('辰', '戌', { style: 'casual' });

      expect(result.main).toContain('이에요');
    });
  });

  describe('generateHapText', () => {
    it('should generate text for yukhap (육합)', () => {
      const result = generateHapText('子', '丑', '육합');

      expect(result.main).toContain('子');
      expect(result.main).toContain('丑');
      expect(result.main).toContain('육합');
      expect(result.keywords).toContain('합');
    });

    it('should generate text for samhap (삼합)', () => {
      const result = generateHapText('寅', '午', '삼합');

      expect(result.main).toContain('삼합');
    });

    it('should generate text for banghap (방합)', () => {
      const result = generateHapText('寅', '卯', '방합');

      expect(result.main).toContain('방합');
    });

    it('should include positive keywords', () => {
      const result = generateHapText('巳', '申', '육합');

      expect(result.keywords).toContain('화합');
      expect(result.keywords).toContain('기회');
    });

    it('should provide encouraging advice', () => {
      const result = generateHapText('午', '未', '육합');

      expect(result.advice).toContain('협력');
    });
  });

  describe('generateStrengthAdvice', () => {
    const strengthLevels = ['극강', '강', '중강', '중약', '약', '극약'] as const;

    it('should generate advice for all strength levels', () => {
      for (const level of strengthLevels) {
        const result = generateStrengthAdvice(level, '목');

        expect(result.main).toBeTruthy();
        expect(result.details.length).toBeGreaterThan(0);
        expect(result.advice).toBeTruthy();
      }
    });

    it('should include yongsin in details', () => {
      const result = generateStrengthAdvice('중강', '화');

      expect(result.details.some(d => d.includes('용신'))).toBe(true);
      expect(result.details.some(d => d.includes('화'))).toBe(true);
    });

    it('should include strength level in keywords', () => {
      const result = generateStrengthAdvice('신약', '금');

      expect(result.keywords.some(k => strengthLevels.includes(k as typeof strengthLevels[number]) || k === '금')).toBe(true);
    });

    it('should recommend yongsin activities', () => {
      const result = generateStrengthAdvice('약', '수');

      expect(result.details.some(d => d.includes('연구') || d.includes('무역') || d.includes('물류'))).toBe(true);
    });
  });

  describe('generateComprehensiveText', () => {
    it('should generate comprehensive analysis text', () => {
      const pillars = createTestPillars();
      const options = {
        strengthLevel: '중강',
        geokguk: '정관격',
        yongsin: '수' as FiveElement,
      };

      const result = generateComprehensiveText(pillars, options);

      expect(result.main).toContain('丙');
      expect(result.main).toContain('정관격');
      expect(result.main).toContain('중강');
      expect(result.details.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should include day master information', () => {
      const pillars = createTestPillars();
      const options = {
        strengthLevel: '강',
        geokguk: '식신격',
        yongsin: '금' as FiveElement,
      };

      const result = generateComprehensiveText(pillars, options);

      expect(result.keywords).toContain('丙');
      expect(result.keywords).toContain('화');
    });

    it('should include fortune info when provided', () => {
      const pillars = createTestPillars();
      const options = {
        strengthLevel: '중약',
        geokguk: '정재격',
        yongsin: '목' as FiveElement,
        unseInfo: {
          type: 'yearly' as const,
          stem: '甲',
          branch: '辰',
          dayMaster: '丙',
        },
      };

      const result = generateComprehensiveText(pillars, options);

      expect(result.details.length).toBeGreaterThan(3);
    });

    it('should adjust for casual style', () => {
      const pillars = createTestPillars();
      const options = {
        strengthLevel: '중강',
        geokguk: '편인격',
        yongsin: '토' as FiveElement,
      };

      const result = generateComprehensiveText(pillars, options, { style: 'casual' });

      expect(result.main).toContain('이에요');
    });

    it('should generate unique keywords without duplicates', () => {
      const pillars = createTestPillars();
      const options = {
        strengthLevel: '극강',
        geokguk: '비견격',
        yongsin: '화' as FiveElement,
      };

      const result = generateComprehensiveText(pillars, options);

      const uniqueKeywords = new Set(result.keywords);
      expect(result.keywords.length).toBe(uniqueKeywords.size);
    });
  });

  describe('Style variations', () => {
    const styles: TextStyle[] = ['formal', 'casual', 'poetic', 'brief'];

    it('should produce different outputs for different styles', () => {
      const results = styles.map(style =>
        generateElementText('목', { style })
      );

      // 각 스타일은 서로 다른 출력을 생성해야 함
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          expect(results[i].main).not.toEqual(results[j].main);
        }
      }
    });

    it('should maintain consistent structure across styles', () => {
      for (const style of styles) {
        const result = generateElementText('화', { style });

        expect(result).toHaveProperty('main');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('keywords');
        expect(result).toHaveProperty('advice');
      }
    });
  });
});
