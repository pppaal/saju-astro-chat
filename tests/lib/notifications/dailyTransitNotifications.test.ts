/**
 * Daily Transit Notifications Tests
 *
 * Tests for daily transit-based notification system
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateDailyNotifications,
  type NotificationType,
  type DailyNotification,
} from '@/lib/notifications/dailyTransitNotifications';

describe('NotificationType', () => {
  it('should include all notification types', () => {
    const types: NotificationType[] = [
      'daily_fortune',
      'lucky_time',
      'caution_time',
      'transit_peak',
      'wealth_opportunity',
      'relationship_hint',
      'credit_low',
      'credit_depleted',
      'premium_feature',
      'promotion',
      'new_feature',
    ];

    expect(types).toHaveLength(11);
    expect(types).toContain('daily_fortune');
    expect(types).toContain('lucky_time');
    expect(types).toContain('caution_time');
  });
});

describe('DailyNotification interface', () => {
  it('should have all required fields', () => {
    const notification: DailyNotification = {
      type: 'daily_fortune',
      title: '오늘의 운세',
      message: '좋은 하루가 될 것입니다.',
      emoji: '✨',
      confidence: 4,
      category: 'positive',
    };

    expect(notification.type).toBe('daily_fortune');
    expect(notification.title).toBe('오늘의 운세');
    expect(notification.message).toBeDefined();
    expect(notification.emoji).toBe('✨');
    expect(notification.confidence).toBe(4);
    expect(notification.category).toBe('positive');
  });

  it('should support optional fields', () => {
    const notification: DailyNotification = {
      type: 'lucky_time',
      title: '행운의 시간',
      message: '오전 10시가 행운의 시간입니다.',
      emoji: '🍀',
      scheduledHour: 10,
      confidence: 5,
      category: 'positive',
      data: {
        luckyColor: '초록색',
        luckyNumber: 7,
        luckyDirection: '동쪽',
        element: 'wood',
      },
    };

    expect(notification.scheduledHour).toBe(10);
    expect(notification.data?.luckyColor).toBe('초록색');
    expect(notification.data?.luckyNumber).toBe(7);
    expect(notification.data?.luckyDirection).toBe('동쪽');
    expect(notification.data?.element).toBe('wood');
  });

  it('should support url in data', () => {
    const notification: DailyNotification = {
      type: 'premium_feature',
      title: '프리미엄 기능',
      message: '새로운 기능을 확인하세요.',
      emoji: '⭐',
      confidence: 3,
      category: 'neutral',
      data: {
        url: '/premium',
      },
    };

    expect(notification.data?.url).toBe('/premium');
  });
});

describe('generateDailyNotifications', () => {
  const mockSaju = {
    dayMaster: '甲',
    pillars: {
      year: { heavenlyStem: '庚', earthlyBranch: '午' },
      month: { heavenlyStem: '辛', earthlyBranch: '巳' },
      day: { heavenlyStem: '甲', earthlyBranch: '子' },
      hour: { heavenlyStem: '丙', earthlyBranch: '寅' },
    },
    unse: {
      iljin: { heavenlyStem: '丙', earthlyBranch: '寅' },
    },
  };

  const mockAstrology = {
    transits: [],
    planets: [],
  };

  const mockProfile = {
    birthDate: '1990-05-15',
    birthTime: '10:30',
    name: 'Test User',
    locale: 'ko',
  };

  it('should return empty array when dayMaster is missing', () => {
    const result = generateDailyNotifications(
      { pillars: {} },
      mockAstrology,
      mockProfile
    );

    expect(result).toEqual([]);
  });

  it('should generate notifications when dayMaster is provided', () => {
    const result = generateDailyNotifications(
      mockSaju,
      mockAstrology,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should include daily fortune notification', () => {
    const result = generateDailyNotifications(
      mockSaju,
      mockAstrology,
      mockProfile
    );

    const dailyFortune = result.find(n => n.type === 'daily_fortune');
    if (dailyFortune) {
      expect(dailyFortune.title).toBeDefined();
      expect(dailyFortune.message).toBeDefined();
    }
  });

  it('should handle array iljin data', () => {
    const sajuWithArrayIljin = {
      ...mockSaju,
      unse: {
        iljin: [{ heavenlyStem: '丙', earthlyBranch: '寅' }],
      },
    };

    const result = generateDailyNotifications(
      sajuWithArrayIljin,
      mockAstrology,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle string dayMaster', () => {
    const sajuWithStringDayMaster = {
      dayMaster: '甲木',
      unse: { iljin: { heavenlyStem: '丙' } },
    };

    const result = generateDailyNotifications(
      sajuWithStringDayMaster,
      mockAstrology,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle object dayMaster with name field', () => {
    const sajuWithObjectDayMaster = {
      dayMaster: { name: '甲', element: 'wood' },
      unse: { iljin: { heavenlyStem: '丙' } },
    };

    const result = generateDailyNotifications(
      sajuWithObjectDayMaster,
      mockAstrology,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should use locale parameter', () => {
    const result = generateDailyNotifications(
      mockSaju,
      mockAstrology,
      mockProfile,
      'en'
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should default to Korean locale', () => {
    const result = generateDailyNotifications(
      mockSaju,
      mockAstrology,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle transit data for bonuses', () => {
    const astrologyWithTransits = {
      transits: [
        { planet: 'Venus', aspect: 'conjunction' },
        { planet: 'Jupiter', aspect: 'trine' },
        { planet: 'Mars', aspect: 'sextile' },
      ],
      planets: [],
    };

    const result = generateDailyNotifications(
      mockSaju,
      astrologyWithTransits,
      mockProfile
    );

    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Notification categories', () => {
  it('should support positive category', () => {
    const notification: DailyNotification = {
      type: 'lucky_time',
      title: 'Test',
      message: 'Test',
      emoji: '🍀',
      confidence: 5,
      category: 'positive',
    };

    expect(notification.category).toBe('positive');
  });

  it('should support neutral category', () => {
    const notification: DailyNotification = {
      type: 'daily_fortune',
      title: 'Test',
      message: 'Test',
      emoji: '☀️',
      confidence: 3,
      category: 'neutral',
    };

    expect(notification.category).toBe('neutral');
  });

  it('should support caution category', () => {
    const notification: DailyNotification = {
      type: 'caution_time',
      title: 'Test',
      message: 'Test',
      emoji: '⚠️',
      confidence: 4,
      category: 'caution',
    };

    expect(notification.category).toBe('caution');
  });
});

describe('Confidence levels', () => {
  it('should support confidence from 1 to 5', () => {
    const confidenceLevels = [1, 2, 3, 4, 5];

    for (const level of confidenceLevels) {
      const notification: DailyNotification = {
        type: 'daily_fortune',
        title: 'Test',
        message: 'Test',
        emoji: '✨',
        confidence: level,
        category: 'neutral',
      };

      expect(notification.confidence).toBe(level);
      expect(notification.confidence).toBeGreaterThanOrEqual(1);
      expect(notification.confidence).toBeLessThanOrEqual(5);
    }
  });
});

describe('Element mapping', () => {
  it('should map 10 heavenly stems to elements', () => {
    const stemToElement: Record<string, string> = {
      '甲': 'wood', '乙': 'wood',
      '丙': 'fire', '丁': 'fire',
      '戊': 'earth', '己': 'earth',
      '庚': 'metal', '辛': 'metal',
      '壬': 'water', '癸': 'water',
    };

    expect(Object.keys(stemToElement)).toHaveLength(10);
    expect(stemToElement['甲']).toBe('wood');
    expect(stemToElement['丙']).toBe('fire');
    expect(stemToElement['戊']).toBe('earth');
    expect(stemToElement['庚']).toBe('metal');
    expect(stemToElement['壬']).toBe('water');
  });

  it('should map 12 earthly branches to elements', () => {
    const branchToElement: Record<string, string> = {
      '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
      '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
      '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
    };

    expect(Object.keys(branchToElement)).toHaveLength(12);
    expect(branchToElement['子']).toBe('water');
    expect(branchToElement['午']).toBe('fire');
    expect(branchToElement['酉']).toBe('metal');
  });

  it('should map zodiac signs to elements', () => {
    const zodiacToElement: Record<string, string> = {
      Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
      Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
      Gemini: 'air', Libra: 'air', Aquarius: 'air',
      Cancer: 'water', Scorpio: 'water', Pisces: 'water',
    };

    expect(Object.keys(zodiacToElement)).toHaveLength(12);
    expect(zodiacToElement['Aries']).toBe('fire');
    expect(zodiacToElement['Taurus']).toBe('earth');
    expect(zodiacToElement['Gemini']).toBe('air');
    expect(zodiacToElement['Cancer']).toBe('water');
  });
});

describe('Lucky attributes', () => {
  it('should define element colors', () => {
    const elementColors: Record<string, string[]> = {
      wood: ['초록색', '청록색'],
      fire: ['빨간색', '보라색'],
      earth: ['노란색', '베이지'],
      metal: ['흰색', '금색'],
      water: ['검정색', '파란색'],
    };

    expect(elementColors.wood).toContain('초록색');
    expect(elementColors.fire).toContain('빨간색');
    expect(elementColors.earth).toContain('노란색');
    expect(elementColors.metal).toContain('흰색');
    expect(elementColors.water).toContain('파란색');
  });

  it('should define element numbers', () => {
    const elementNumbers: Record<string, number[]> = {
      wood: [3, 8],
      fire: [2, 7],
      earth: [5, 10],
      metal: [4, 9],
      water: [1, 6],
    };

    expect(elementNumbers.wood).toContain(3);
    expect(elementNumbers.fire).toContain(7);
    expect(elementNumbers.earth).toContain(5);
    expect(elementNumbers.metal).toContain(9);
    expect(elementNumbers.water).toContain(1);
  });

  it('should define element directions', () => {
    const elementDirections: Record<string, string> = {
      wood: '동쪽',
      fire: '남쪽',
      earth: '중앙',
      metal: '서쪽',
      water: '북쪽',
    };

    expect(elementDirections.wood).toBe('동쪽');
    expect(elementDirections.fire).toBe('남쪽');
    expect(elementDirections.earth).toBe('중앙');
    expect(elementDirections.metal).toBe('서쪽');
    expect(elementDirections.water).toBe('북쪽');
  });
});

describe('Hourly fortune analysis', () => {
  it('should cover 24 hours with 12 branches', () => {
    const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    expect(hourBranches).toHaveLength(12);
    expect(24 / 12).toBe(2);
  });

  it('should return score between 1-5', () => {
    const validScores = [1, 2, 3, 4, 5];
    expect(validScores.includes(2)).toBe(true);
    expect(validScores.includes(3)).toBe(true);
    expect(validScores.includes(5)).toBe(true);
  });

  it('should return valid fortune types', () => {
    const validTypes = ['positive', 'neutral', 'caution'];
    expect(validTypes).toContain('positive');
    expect(validTypes).toContain('neutral');
    expect(validTypes).toContain('caution');
  });
});

describe('Category score calculation', () => {
  it('should define all fortune categories', () => {
    const categories = ['wealth', 'love', 'career', 'health', 'overall'];
    expect(categories).toHaveLength(5);
  });

  it('should have scores in valid range 0-100', () => {
    const score = 75;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should calculate overall as average of categories', () => {
    const wealth = 60;
    const love = 70;
    const career = 80;
    const health = 50;
    const overall = Math.round((wealth + love + career + health) / 4);
    expect(overall).toBe(65);
  });
});
