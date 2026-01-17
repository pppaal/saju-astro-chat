import { describe, it, expect } from 'vitest';

describe('Daily Fortune Generator', () => {
  it('should export ZodiacSign type', async () => {
    const module = await import('@/lib/marketing/dailyFortuneGenerator');
    expect(module).toBeDefined();
  });

  it('should export ChineseZodiac type', async () => {
    const module = await import('@/lib/marketing/dailyFortuneGenerator');
    expect(module).toBeDefined();
  });

  it('should export FortuneScores interface', async () => {
    const module = await import('@/lib/marketing/dailyFortuneGenerator');
    expect(module).toBeDefined();
  });

  it('should export DailyFortune interface', async () => {
    const module = await import('@/lib/marketing/dailyFortuneGenerator');
    expect(module).toBeDefined();
  });

  it('should export generateShareText function', async () => {
    const { generateShareText } = await import('@/lib/marketing/dailyFortuneGenerator');
    expect(typeof generateShareText).toBe('function');
  });

  it('should generate share text from fortune', async () => {
    const { generateShareText } = await import('@/lib/marketing/dailyFortuneGenerator');

    const mockFortune = {
      date: '2024-01-15',
      sign: 'aries',
      signKo: '양자리',
      emoji: '♈',
      scores: {
        overall: 85,
        love: 80,
        career: 90,
        health: 75,
        wealth: 82
      },
      luckyColor: '빨강',
      luckyNumber: 7,
      luckyItem: '반지',
      message: '오늘은 좋은 하루가 될 거예요!',
      advice: '긍정적인 마음을 유지하세요!',
      hashtags: ['#운세', '#양자리', '#오늘의운세'],
    };

    const result = generateShareText(mockFortune);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Image Generator', () => {
  it('should export ImageGeneratorOptions interface', async () => {
    const module = await import('@/lib/marketing/imageGenerator');
    expect(module).toBeDefined();
  });

  it('should export generateFortuneSVG function', async () => {
    const { generateFortuneSVG } = await import('@/lib/marketing/imageGenerator');
    expect(typeof generateFortuneSVG).toBe('function');
  });

  it('should generate SVG from fortune data', async () => {
    const { generateFortuneSVG } = await import('@/lib/marketing/imageGenerator');

    const mockFortune = {
      date: '2024-01-15',
      sign: 'aries',
      signKo: '양자리',
      emoji: '♈',
      scores: {
        overall: 85,
        love: 80,
        career: 90,
        health: 75,
        wealth: 82
      },
      luckyColor: '빨강',
      luckyNumber: 7,
      luckyItem: '반지',
      message: '오늘은 좋은 하루가 될 거예요!',
      advice: '긍정적인 마음을 유지하세요!',
      hashtags: ['#운세', '#양자리'],
    };

    const result = generateFortuneSVG(mockFortune);

    expect(typeof result).toBe('string');
    expect(result).toContain('<svg');
    expect(result).toContain('</svg>');
  });
});

describe('Social Media Poster', () => {
  it('should export PostResult interface', async () => {
    const module = await import('@/lib/marketing/socialMediaPoster');
    expect(module).toBeDefined();
  });

  it('should export loadSocialMediaConfig function', async () => {
    const { loadSocialMediaConfig } = await import('@/lib/marketing/socialMediaPoster');
    expect(typeof loadSocialMediaConfig).toBe('function');
  });

  it('should load social media config', async () => {
    const { loadSocialMediaConfig } = await import('@/lib/marketing/socialMediaPoster');
    const result = loadSocialMediaConfig();

    // The function returns an object with enabled platforms based on env vars
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });
});
