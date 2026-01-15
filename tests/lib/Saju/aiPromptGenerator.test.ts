// tests/lib/Saju/aiPromptGenerator.test.ts

import {
  generateLLMPrompt,
  generateImagePrompt,
  generateNarrativePrompt,
  generateChatPrompt,
  PromptType,
  PromptStyle,
  PromptLanguage,
  PromptOptions,
  GeneratedPrompt,
  ImagePrompt,
} from '@/lib/Saju/aiPromptGenerator';
import { SajuPillars } from '@/lib/Saju/types';

// 테스트용 SajuPillars 헬퍼
function createTestPillars(): SajuPillars {
  return {
    year: {
      heavenlyStem: { name: '甲', element: '목', yin_yang: '양' },
      earthlyBranch: { name: '子', element: '수', yin_yang: '양' },
    },
    month: {
      heavenlyStem: { name: '丙', element: '화', yin_yang: '양' },
      earthlyBranch: { name: '寅', element: '목', yin_yang: '양' },
    },
    day: {
      heavenlyStem: { name: '戊', element: '토', yin_yang: '양' },
      earthlyBranch: { name: '午', element: '화', yin_yang: '양' },
    },
    time: {
      heavenlyStem: { name: '庚', element: '금', yin_yang: '양' },
      earthlyBranch: { name: '申', element: '금', yin_yang: '양' },
    },
  } as SajuPillars;
}

function createYinPillars(): SajuPillars {
  return {
    year: {
      heavenlyStem: { name: '乙', element: '목', yin_yang: '음' },
      earthlyBranch: { name: '丑', element: '토', yin_yang: '음' },
    },
    month: {
      heavenlyStem: { name: '丁', element: '화', yin_yang: '음' },
      earthlyBranch: { name: '卯', element: '목', yin_yang: '음' },
    },
    day: {
      heavenlyStem: { name: '己', element: '토', yin_yang: '음' },
      earthlyBranch: { name: '未', element: '토', yin_yang: '음' },
    },
    time: {
      heavenlyStem: { name: '辛', element: '금', yin_yang: '음' },
      earthlyBranch: { name: '酉', element: '금', yin_yang: '음' },
    },
  } as SajuPillars;
}

describe('aiPromptGenerator', () => {
  describe('generateLLMPrompt', () => {
    const pillars = createTestPillars();

    describe('structure validation', () => {
      it('should return GeneratedPrompt with all required fields', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });

        expect(result).toHaveProperty('systemPrompt');
        expect(result).toHaveProperty('userPrompt');
        expect(result).toHaveProperty('contextData');
        expect(result).toHaveProperty('suggestedFollowUps');
        expect(result).toHaveProperty('metadata');
      });

      it('should have correct metadata structure', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });

        expect(result.metadata).toHaveProperty('type');
        expect(result.metadata).toHaveProperty('style');
        expect(result.metadata).toHaveProperty('language');
        expect(result.metadata).toHaveProperty('tokenEstimate');
      });

      it('should have contextData with pillar information', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });

        expect(result.contextData).toHaveProperty('dayMaster');
        expect(result.contextData).toHaveProperty('dayElement');
        expect(result.contextData).toHaveProperty('dayYinYang');
        expect(result.contextData).toHaveProperty('pillars');
      });
    });

    describe('prompt types', () => {
      const promptTypes: PromptType[] = [
        'fortune_reading',
        'personality',
        'compatibility',
        'career',
        'health',
        'image_aura',
        'image_element',
        'image_fortune',
        'narrative',
      ];

      promptTypes.forEach((type) => {
        it(`should generate prompt for type: ${type}`, () => {
          const result = generateLLMPrompt(pillars, { type });

          expect(result.metadata.type).toBe(type);
          expect(result.systemPrompt).toBeTruthy();
          expect(result.userPrompt).toBeTruthy();
        });
      });
    });

    describe('prompt styles', () => {
      const styles: PromptStyle[] = [
        'professional',
        'friendly',
        'mystical',
        'modern',
        'traditional',
      ];

      styles.forEach((style) => {
        it(`should apply style: ${style}`, () => {
          const result = generateLLMPrompt(pillars, {
            type: 'fortune_reading',
            style,
          });

          expect(result.metadata.style).toBe(style);
        });
      });

      it('should default to professional style', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(result.metadata.style).toBe('professional');
      });
    });

    describe('languages', () => {
      const languages: PromptLanguage[] = ['ko', 'en', 'ja', 'zh'];

      it('should default to Korean language', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(result.metadata.language).toBe('ko');
      });

      it('should generate Korean prompt by default', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(result.systemPrompt).toContain('명리학');
      });

      it('should generate English prompt when language is en', () => {
        const result = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          language: 'en',
        });
        expect(result.systemPrompt).toContain('Four Pillars');
      });
    });

    describe('follow-up questions', () => {
      it('should return array of follow-up questions', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(Array.isArray(result.suggestedFollowUps)).toBe(true);
        expect(result.suggestedFollowUps.length).toBeGreaterThan(0);
      });

      it('should return Korean follow-ups for Korean language', () => {
        const result = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          language: 'ko',
        });
        expect(result.suggestedFollowUps.some((q) => /가요|나요/.test(q))).toBe(true);
      });

      it('should return English follow-ups for English language', () => {
        const result = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          language: 'en',
        });
        expect(result.suggestedFollowUps.some((q) => /\?/.test(q))).toBe(true);
      });
    });

    describe('token estimation', () => {
      it('should estimate tokens based on prompt length', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(result.metadata.tokenEstimate).toBeGreaterThan(0);
      });

      it('should estimate higher tokens for longer prompts', () => {
        const short = generateLLMPrompt(pillars, { type: 'health' });
        const long = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          additionalContext: '이 사람은 현재 사업을 준비하고 있으며 올해 중요한 결정을 내려야 합니다.',
        });

        expect(long.metadata.tokenEstimate).toBeGreaterThan(short.metadata.tokenEstimate);
      });
    });

    describe('additional context', () => {
      it('should include additional context in user prompt', () => {
        const additionalContext = '특별한 상담 요청 사항';
        const result = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          additionalContext,
        });

        expect(result.userPrompt).toContain(additionalContext);
      });
    });

    describe('disclaimer', () => {
      it('should include Korean disclaimer by default', () => {
        const result = generateLLMPrompt(pillars, { type: 'fortune_reading' });
        expect(result.systemPrompt).toContain('참고');
      });

      it('should include English disclaimer for English language', () => {
        const result = generateLLMPrompt(pillars, {
          type: 'fortune_reading',
          language: 'en',
        });
        expect(result.systemPrompt).toContain('Note');
      });
    });
  });

  describe('generateImagePrompt', () => {
    const pillars = createTestPillars();

    describe('structure validation', () => {
      it('should return ImagePrompt with all required fields', () => {
        const result = generateImagePrompt(pillars, 'aura');

        expect(result).toHaveProperty('positive');
        expect(result).toHaveProperty('negative');
        expect(result).toHaveProperty('style');
        expect(result).toHaveProperty('aspectRatio');
        expect(result).toHaveProperty('quality');
        expect(result).toHaveProperty('metadata');
      });

      it('should have correct metadata structure', () => {
        const result = generateImagePrompt(pillars, 'aura');

        expect(result.metadata).toHaveProperty('element');
        expect(result.metadata).toHaveProperty('mood');
        expect(result.metadata).toHaveProperty('colorPalette');
      });
    });

    describe('image types', () => {
      const imageTypes: Array<'aura' | 'element' | 'fortune_card' | 'portrait'> = [
        'aura',
        'element',
        'fortune_card',
        'portrait',
      ];

      imageTypes.forEach((type) => {
        it(`should generate prompt for image type: ${type}`, () => {
          const result = generateImagePrompt(pillars, type);

          expect(result.positive).toBeTruthy();
          expect(result.negative).toBeTruthy();
        });
      });
    });

    describe('aura image', () => {
      it('should include aura-specific keywords', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(result.positive).toContain('aura');
        expect(result.positive).toContain('energy');
      });
    });

    describe('element image', () => {
      it('should include element-specific keywords', () => {
        const result = generateImagePrompt(pillars, 'element');
        expect(result.positive).toContain('element');
      });
    });

    describe('fortune_card image', () => {
      it('should include tarot card keywords', () => {
        const result = generateImagePrompt(pillars, 'fortune_card');
        expect(result.positive).toContain('card');
      });
    });

    describe('portrait image', () => {
      it('should include portrait keywords', () => {
        const result = generateImagePrompt(pillars, 'portrait');
        expect(result.positive).toContain('portrait');
      });

      it('should reflect yin/yang in portrait', () => {
        const yangPillars = createTestPillars();
        const yinPillars = createYinPillars();

        const yangResult = generateImagePrompt(yangPillars, 'portrait');
        const yinResult = generateImagePrompt(yinPillars, 'portrait');

        expect(yangResult.positive).toContain('yang');
        expect(yinResult.positive).toContain('yin');
      });
    });

    describe('styles', () => {
      const styles: Array<'realistic' | 'artistic' | 'anime' | 'mystical'> = [
        'realistic',
        'artistic',
        'anime',
        'mystical',
      ];

      styles.forEach((style) => {
        it(`should apply style: ${style}`, () => {
          const result = generateImagePrompt(pillars, 'aura', { style });
          expect(result.style).toBe(style);
        });
      });

      it('should default to mystical style', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(result.style).toBe('mystical');
      });
    });

    describe('aspect ratios', () => {
      const ratios: Array<'1:1' | '2:3' | '3:2' | '16:9'> = ['1:1', '2:3', '3:2', '16:9'];

      ratios.forEach((ratio) => {
        it(`should set aspect ratio: ${ratio}`, () => {
          const result = generateImagePrompt(pillars, 'aura', { aspectRatio: ratio });
          expect(result.aspectRatio).toBe(ratio);
          expect(result.positive).toContain(ratio);
        });
      });

      it('should default to 2:3 aspect ratio', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(result.aspectRatio).toBe('2:3');
      });
    });

    describe('negative prompts', () => {
      it('should include quality-negative keywords', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(result.negative).toContain('low quality');
        expect(result.negative).toContain('blurry');
      });
    });

    describe('element-based colors', () => {
      it('should include element colors in metadata', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(Array.isArray(result.metadata.colorPalette)).toBe(true);
        expect(result.metadata.colorPalette.length).toBeGreaterThan(0);
      });

      it('should set correct element in metadata', () => {
        const result = generateImagePrompt(pillars, 'aura');
        expect(result.metadata.element).toBe('토'); // Day master is 戊 (토)
      });
    });
  });

  describe('generateNarrativePrompt', () => {
    const pillars = createTestPillars();

    describe('narrative types', () => {
      const narrativeTypes: Array<'life_story' | 'year_ahead' | 'relationship' | 'career_path'> = [
        'life_story',
        'year_ahead',
        'relationship',
        'career_path',
      ];

      narrativeTypes.forEach((type) => {
        it(`should generate narrative for type: ${type}`, () => {
          const result = generateNarrativePrompt(pillars, type);

          expect(result).toHaveProperty('systemPrompt');
          expect(result).toHaveProperty('userPrompt');
          expect(result.metadata.type).toBe('narrative');
        });
      });
    });

    it('should use mystical style for narratives', () => {
      const result = generateNarrativePrompt(pillars, 'life_story');
      expect(result.metadata.style).toBe('mystical');
    });

    it('should include narrative context in user prompt', () => {
      const result = generateNarrativePrompt(pillars, 'life_story');
      expect(result.userPrompt).toContain('인생');
    });
  });

  describe('generateChatPrompt', () => {
    const pillars = createTestPillars();

    describe('structure validation', () => {
      it('should return object with systemPrompt and messages', () => {
        const result = generateChatPrompt(pillars, '안녕하세요', []);

        expect(result).toHaveProperty('systemPrompt');
        expect(result).toHaveProperty('messages');
      });
    });

    describe('system prompt', () => {
      it('should include saju information in system prompt', () => {
        const result = generateChatPrompt(pillars, '안녕하세요', []);

        expect(result.systemPrompt).toContain('甲子');
        expect(result.systemPrompt).toContain('丙寅');
        expect(result.systemPrompt).toContain('戊午');
        expect(result.systemPrompt).toContain('庚申');
      });

      it('should include day master element', () => {
        const result = generateChatPrompt(pillars, '안녕하세요', []);
        expect(result.systemPrompt).toContain('토');
      });

      it('should include conversation principles', () => {
        const result = generateChatPrompt(pillars, '안녕하세요', []);
        expect(result.systemPrompt).toContain('원칙');
      });
    });

    describe('messages', () => {
      it('should include user message in messages array', () => {
        const userMessage = '제 운세가 어떤가요?';
        const result = generateChatPrompt(pillars, userMessage, []);

        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.role).toBe('user');
        expect(lastMessage.content).toBe(userMessage);
      });

      it('should include conversation history', () => {
        const history = [
          { role: 'user' as const, content: '첫 번째 질문' },
          { role: 'assistant' as const, content: '첫 번째 답변' },
        ];
        const result = generateChatPrompt(pillars, '두 번째 질문', history);

        expect(result.messages.length).toBe(3);
        expect(result.messages[0].content).toBe('첫 번째 질문');
        expect(result.messages[1].content).toBe('첫 번째 답변');
        expect(result.messages[2].content).toBe('두 번째 질문');
      });

      it('should preserve message roles', () => {
        const history = [
          { role: 'user' as const, content: '질문' },
          { role: 'assistant' as const, content: '답변' },
        ];
        const result = generateChatPrompt(pillars, '새 질문', history);

        expect(result.messages[0].role).toBe('user');
        expect(result.messages[1].role).toBe('assistant');
        expect(result.messages[2].role).toBe('user');
      });
    });

    describe('empty history', () => {
      it('should work with empty conversation history', () => {
        const result = generateChatPrompt(pillars, '안녕하세요', []);

        expect(result.messages.length).toBe(1);
        expect(result.messages[0].content).toBe('안녕하세요');
      });
    });
  });

  describe('element-based keywords', () => {
    describe('each element should produce different keywords', () => {
      it('should use wood element keywords for 목 day master', () => {
        const woodPillars = {
          ...createTestPillars(),
          day: {
            heavenlyStem: { name: '甲', element: '목', yin_yang: '양' },
            earthlyBranch: { name: '寅', element: '목', yin_yang: '양' },
          },
        } as SajuPillars;

        const result = generateImagePrompt(woodPillars, 'element');
        expect(result.metadata.element).toBe('목');
      });

      it('should use fire element keywords for 화 day master', () => {
        const firePillars = {
          ...createTestPillars(),
          day: {
            heavenlyStem: { name: '丙', element: '화', yin_yang: '양' },
            earthlyBranch: { name: '午', element: '화', yin_yang: '양' },
          },
        } as SajuPillars;

        const result = generateImagePrompt(firePillars, 'element');
        expect(result.metadata.element).toBe('화');
      });

      it('should use metal element keywords for 금 day master', () => {
        const metalPillars = {
          ...createTestPillars(),
          day: {
            heavenlyStem: { name: '庚', element: '금', yin_yang: '양' },
            earthlyBranch: { name: '申', element: '금', yin_yang: '양' },
          },
        } as SajuPillars;

        const result = generateImagePrompt(metalPillars, 'element');
        expect(result.metadata.element).toBe('금');
      });

      it('should use water element keywords for 수 day master', () => {
        const waterPillars = {
          ...createTestPillars(),
          day: {
            heavenlyStem: { name: '壬', element: '수', yin_yang: '양' },
            earthlyBranch: { name: '子', element: '수', yin_yang: '양' },
          },
        } as SajuPillars;

        const result = generateImagePrompt(waterPillars, 'element');
        expect(result.metadata.element).toBe('수');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle all pillar combinations', () => {
      const pillars = createTestPillars();
      expect(() => generateLLMPrompt(pillars, { type: 'fortune_reading' })).not.toThrow();
    });

    it('should handle yin pillars', () => {
      const pillars = createYinPillars();
      expect(() => generateLLMPrompt(pillars, { type: 'fortune_reading' })).not.toThrow();
    });

    it('should handle all option combinations', () => {
      const pillars = createTestPillars();
      const options: PromptOptions = {
        type: 'career',
        style: 'modern',
        language: 'en',
        maxLength: 500,
        includeDisclaimer: true,
        targetAudience: 'young',
        additionalContext: 'Additional context here',
      };

      expect(() => generateLLMPrompt(pillars, options)).not.toThrow();
    });
  });
});
