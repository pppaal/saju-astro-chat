/**
 * Dream Types Tests
 */
import { describe, it, expect } from 'vitest';
import type {
  Phase,
  UserProfile,
  GuestBirthInfo,
  Recommendation,
  InsightResponse,
  ChatMessage,
} from '@/lib/dream/types';

describe('dream/types', () => {
  describe('Phase type', () => {
    it('should accept valid phase values', () => {
      const phases: Phase[] = [
        'birth-input',
        'dream-input',
        'analyzing',
        'result',
      ];

      // TypeScript compilation test - if this compiles, types are correct
      expect(phases).toHaveLength(4);
      expect(phases).toContain('birth-input');
      expect(phases).toContain('dream-input');
      expect(phases).toContain('analyzing');
      expect(phases).toContain('result');
    });
  });

  describe('UserProfile interface', () => {
    it('should allow empty profile', () => {
      const profile: UserProfile = {};
      expect(profile).toBeDefined();
    });

    it('should allow partial profile', () => {
      const profile: UserProfile = {
        name: 'John',
        birthDate: '1990-01-01',
      };
      expect(profile.name).toBe('John');
      expect(profile.birthDate).toBe('1990-01-01');
    });

    it('should allow complete profile', () => {
      const profile: UserProfile = {
        name: 'Jane',
        birthDate: '1995-05-15',
        birthTime: '14:30',
        birthCity: 'Seoul',
        gender: 'F',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      expect(profile.name).toBe('Jane');
      expect(profile.gender).toBe('F');
      expect(profile.latitude).toBe(37.5665);
    });

    it('should enforce gender type', () => {
      const profileM: UserProfile = { gender: 'M' };
      const profileF: UserProfile = { gender: 'F' };

      expect(profileM.gender).toBe('M');
      expect(profileF.gender).toBe('F');
    });
  });

  describe('GuestBirthInfo interface', () => {
    it('should require mandatory fields', () => {
      const guestInfo: GuestBirthInfo = {
        birthDate: '2000-01-01',
        birthTime: '10:00',
        gender: 'M',
      };

      expect(guestInfo.birthDate).toBe('2000-01-01');
      expect(guestInfo.birthTime).toBe('10:00');
      expect(guestInfo.gender).toBe('M');
    });

    it('should allow optional birthCity', () => {
      const guestInfo: GuestBirthInfo = {
        birthDate: '2000-01-01',
        birthTime: '10:00',
        gender: 'F',
        birthCity: 'Busan',
      };

      expect(guestInfo.birthCity).toBe('Busan');
    });
  });

  describe('Recommendation interface', () => {
    it('should have title and detail', () => {
      const recommendation: Recommendation = {
        title: 'Practice mindfulness',
        detail: 'Meditate for 10 minutes daily',
      };

      expect(recommendation.title).toBe('Practice mindfulness');
      expect(recommendation.detail).toBe('Meditate for 10 minutes daily');
    });
  });

  describe('InsightResponse interface', () => {
    it('should allow empty insight response', () => {
      const insight: InsightResponse = {};
      expect(insight).toBeDefined();
    });

    it('should support summary and fromFallback', () => {
      const insight: InsightResponse = {
        summary: 'Your dream indicates growth',
        fromFallback: false,
      };

      expect(insight.summary).toBe('Your dream indicates growth');
      expect(insight.fromFallback).toBe(false);
    });

    it('should support dreamSymbols with interpretations', () => {
      const insight: InsightResponse = {
        dreamSymbols: [
          {
            label: 'Water',
            meaning: 'Emotions and subconscious',
            interpretations: {
              jung: 'Collective unconscious',
              stoic: 'Natural flow',
              tarot: 'Cups suit energy',
            },
          },
        ],
      };

      expect(insight.dreamSymbols).toHaveLength(1);
      expect(insight.dreamSymbols![0].label).toBe('Water');
      expect(insight.dreamSymbols![0].interpretations?.jung).toBe(
        'Collective unconscious'
      );
    });

    it('should support crossInsights', () => {
      const insight: InsightResponse = {
        crossInsights: [
          'Connection with recent life events',
          'Alignment with birth chart',
        ],
      };

      expect(insight.crossInsights).toHaveLength(2);
    });

    it('should support recommendations as strings and objects', () => {
      const insight: InsightResponse = {
        recommendations: [
          'Keep a dream journal',
          {
            title: 'Meditation',
            detail: 'Practice daily',
          },
        ],
      };

      expect(insight.recommendations).toHaveLength(2);
      expect(typeof insight.recommendations![0]).toBe('string');
      expect(typeof insight.recommendations![1]).toBe('object');
    });

    it('should support themes with weights', () => {
      const insight: InsightResponse = {
        themes: [
          { label: 'Growth', weight: 0.8 },
          { label: 'Change', weight: 0.6 },
        ],
      };

      expect(insight.themes).toHaveLength(2);
      expect(insight.themes![0].weight).toBe(0.8);
    });

    it('should support cultural notes', () => {
      const insight: InsightResponse = {
        culturalNotes: {
          korean: '한국 문화적 의미',
          western: 'Western interpretation',
          chinese: '中国文化解释',
          islamic: 'Islamic perspective',
        },
      };

      expect(insight.culturalNotes?.korean).toBe('한국 문화적 의미');
      expect(insight.culturalNotes?.western).toBe('Western interpretation');
    });

    it('should support luckyElements', () => {
      const insight: InsightResponse = {
        luckyElements: {
          luckyNumbers: [7, 14, 21],
          luckyColors: ['blue', 'green'],
          advice: 'Wear blue on important days',
        },
      };

      expect(insight.luckyElements?.luckyNumbers).toEqual([7, 14, 21]);
      expect(insight.luckyElements?.luckyColors).toContain('blue');
    });

    it('should support celestial with moon phase', () => {
      const insight: InsightResponse = {
        celestial: {
          moon_phase: {
            name: 'Full Moon',
            korean: '보름달',
            emoji: '🌕',
            dream_meaning: 'Peak of manifestation',
          },
        },
      };

      expect(insight.celestial?.moon_phase?.name).toBe('Full Moon');
      expect(insight.celestial?.moon_phase?.emoji).toBe('🌕');
    });

    it('should support cosmicInfluence', () => {
      const insight: InsightResponse = {
        cosmicInfluence: {
          moonPhaseEffect: 'Strong emotional pull',
          planetaryInfluence: 'Mercury retrograde',
          overallEnergy: 'Introspective',
        },
      };

      expect(insight.cosmicInfluence?.moonPhaseEffect).toBe(
        'Strong emotional pull'
      );
    });

    it('should support premium_features with taemong', () => {
      const insight: InsightResponse = {
        premium_features: {
          taemong: {
            is_taemong: true,
            primary_symbol: {
              symbol: '용',
              child_trait: 'Leadership',
              gender_hint: 'Male',
              interpretation: 'Auspicious sign',
            },
          },
        },
      };

      expect(insight.premium_features?.taemong?.is_taemong).toBe(true);
      expect(insight.premium_features?.taemong?.primary_symbol?.symbol).toBe(
        '용'
      );
    });

    it('should support premium_features with combinations', () => {
      const insight: InsightResponse = {
        premium_features: {
          combinations: [
            {
              combination: '龍 + 鳳凰',
              meaning: 'Perfect harmony',
              interpretation: 'Very auspicious',
              is_lucky: true,
            },
          ],
        },
      };

      expect(insight.premium_features?.combinations).toHaveLength(1);
      expect(insight.premium_features?.combinations![0].is_lucky).toBe(true);
    });

    it('should support complex insight with multiple features', () => {
      const insight: InsightResponse = {
        summary: 'Comprehensive dream analysis',
        dreamSymbols: [{ label: 'Dragon', meaning: 'Power' }],
        crossInsights: ['Connection found'],
        recommendations: ['Take action'],
        themes: [{ label: 'Transformation', weight: 0.9 }],
        culturalNotes: { korean: '용꿈' },
        luckyElements: { luckyNumbers: [9] },
        celestial: {
          moon_phase: { name: 'New Moon', emoji: '🌑' },
        },
        cosmicInfluence: { overallEnergy: 'New beginnings' },
        premium_features: {
          taemong: { is_taemong: true },
          combinations: [],
        },
      };

      expect(insight.summary).toBeTruthy();
      expect(insight.dreamSymbols).toHaveLength(1);
      expect(insight.premium_features?.taemong?.is_taemong).toBe(true);
    });
  });

  describe('ChatMessage interface', () => {
    it('should support user message', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'I had a dream about flying',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('I had a dream about flying');
    });

    it('should support assistant message', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Flying dreams often represent freedom',
      };

      expect(message.role).toBe('assistant');
      expect(message.content).toBeTruthy();
    });

    it('should support conversation array', () => {
      const conversation: ChatMessage[] = [
        { role: 'user', content: 'Tell me about my dream' },
        { role: 'assistant', content: 'Let me analyze it' },
        { role: 'user', content: 'What does it mean?' },
        { role: 'assistant', content: 'Here is the interpretation' },
      ];

      expect(conversation).toHaveLength(4);
      expect(conversation[0].role).toBe('user');
      expect(conversation[1].role).toBe('assistant');
    });
  });

  describe('Type validation helpers', () => {
    // These would be actual runtime validators in a real application
    function isValidPhase(value: unknown): value is Phase {
      return (
        typeof value === 'string' &&
        ['birth-input', 'dream-input', 'analyzing', 'result'].includes(value)
      );
    }

    function isValidGender(value: unknown): value is 'M' | 'F' {
      return value === 'M' || value === 'F';
    }

    function isValidChatMessage(value: unknown): value is ChatMessage {
      if (!value || typeof value !== 'object') return false;
      const msg = value as Record<string, unknown>;
      return (
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string'
      );
    }

    it('should validate phase values', () => {
      expect(isValidPhase('birth-input')).toBe(true);
      expect(isValidPhase('result')).toBe(true);
      expect(isValidPhase('invalid')).toBe(false);
      expect(isValidPhase(123)).toBe(false);
    });

    it('should validate gender values', () => {
      expect(isValidGender('M')).toBe(true);
      expect(isValidGender('F')).toBe(true);
      expect(isValidGender('X')).toBe(false);
      expect(isValidGender(null)).toBe(false);
    });

    it('should validate chat messages', () => {
      expect(isValidChatMessage({ role: 'user', content: 'Hi' })).toBe(true);
      expect(
        isValidChatMessage({ role: 'assistant', content: 'Hello' })
      ).toBe(true);
      expect(isValidChatMessage({ role: 'invalid', content: 'Hi' })).toBe(
        false
      );
      expect(isValidChatMessage({ role: 'user' })).toBe(false);
      expect(isValidChatMessage(null)).toBe(false);
    });
  });

  describe('Type narrowing and defaults', () => {
    it('should handle optional UserProfile fields', () => {
      const profile: UserProfile = { name: 'Test' };

      // Test undefined handling
      const city = profile.birthCity ?? 'Unknown';
      const lat = profile.latitude ?? 0;
      const gender = profile.gender ?? 'M';

      expect(city).toBe('Unknown');
      expect(lat).toBe(0);
      expect(gender).toBe('M');
    });

    it('should handle optional InsightResponse fields', () => {
      const insight: InsightResponse = {};

      const symbols = insight.dreamSymbols ?? [];
      const insights = insight.crossInsights ?? [];
      const themes = insight.themes ?? [];

      expect(symbols).toEqual([]);
      expect(insights).toEqual([]);
      expect(themes).toEqual([]);
    });

    it('should safely access nested optional properties', () => {
      const insight: InsightResponse = {};

      const moonName = insight.celestial?.moon_phase?.name;
      const taemongStatus = insight.premium_features?.taemong?.is_taemong;
      const koreanNote = insight.culturalNotes?.korean;

      expect(moonName).toBeUndefined();
      expect(taemongStatus).toBeUndefined();
      expect(koreanNote).toBeUndefined();
    });

    it('should safely access deeply nested properties', () => {
      const insight: InsightResponse = {
        premium_features: {
          taemong: {
            is_taemong: true,
            primary_symbol: {
              symbol: '龍',
            },
          },
        },
      };

      const symbol = insight.premium_features?.taemong?.primary_symbol?.symbol;
      const trait = insight.premium_features?.taemong?.primary_symbol
        ?.child_trait;

      expect(symbol).toBe('龍');
      expect(trait).toBeUndefined();
    });
  });
});