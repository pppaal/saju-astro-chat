/**
 * Tests for src/lib/i18n/chat-utils.ts
 * 채팅 i18n 유틸리티 테스트 (순수 함수만)
 */

import { describe, it, expect } from 'vitest';
import { getRandomLoadingMessage, detectCrisis } from '@/lib/i18n/chat-utils';

describe('chat-utils', () => {
  describe('getRandomLoadingMessage', () => {
    it('should return a Korean message for ko locale', () => {
      const msg = getRandomLoadingMessage('ko');
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('should return an English message for en locale', () => {
      const msg = getRandomLoadingMessage('en');
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('should return English message for unknown locale', () => {
      const msg = getRandomLoadingMessage('fr' as any);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('should return one of the known Korean messages', () => {
      const knownKo = ['카드 해석 중...', '답변 준비 중...', '분석 중...', '응답 생성 중...', '조언 정리 중...'];
      const msg = getRandomLoadingMessage('ko');
      expect(knownKo).toContain(msg);
    });

    it('should return one of the known English messages', () => {
      const knownEn = ['Analyzing cards...', 'Preparing response...', 'Processing...', 'Generating answer...', 'Organizing insights...'];
      const msg = getRandomLoadingMessage('en');
      expect(knownEn).toContain(msg);
    });
  });

  describe('detectCrisis', () => {
    // Korean
    it('should detect Korean crisis keyword: 죽고 싶', () => {
      expect(detectCrisis('오늘 죽고 싶어요', 'ko')).toBe(true);
    });

    it('should detect Korean crisis keyword: 자살', () => {
      expect(detectCrisis('자살에 대해 생각합니다', 'ko')).toBe(true);
    });

    it('should detect Korean crisis keyword: 끝내고 싶', () => {
      expect(detectCrisis('모든 것을 끝내고 싶어', 'ko')).toBe(true);
    });

    it('should detect Korean crisis keyword: 사라지고 싶', () => {
      expect(detectCrisis('사라지고 싶습니다', 'ko')).toBe(true);
    });

    it('should detect Korean crisis keyword: 자해', () => {
      expect(detectCrisis('자해하고 싶어', 'ko')).toBe(true);
    });

    it('should detect Korean crisis keyword: 삶이 싫', () => {
      expect(detectCrisis('삶이 싫어졌어요', 'ko')).toBe(true);
    });

    it('should not detect crisis in normal Korean text', () => {
      expect(detectCrisis('오늘 운세 알려주세요', 'ko')).toBe(false);
    });

    // English
    it('should detect English crisis keyword: kill myself', () => {
      expect(detectCrisis('I want to kill myself', 'en')).toBe(true);
    });

    it('should detect English crisis keyword: suicide', () => {
      expect(detectCrisis('thinking about suicide', 'en')).toBe(true);
    });

    it('should detect English crisis keyword: end it all', () => {
      expect(detectCrisis('I want to end it all', 'en')).toBe(true);
    });

    it('should detect English crisis keyword: want to die', () => {
      expect(detectCrisis('I want to die', 'en')).toBe(true);
    });

    it('should detect English crisis keyword: self harm', () => {
      expect(detectCrisis('thinking about self harm', 'en')).toBe(true);
    });

    it('should not detect crisis in normal English text', () => {
      expect(detectCrisis('Tell me my horoscope', 'en')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(detectCrisis('I WANT TO KILL MYSELF', 'en')).toBe(true);
      expect(detectCrisis('SUICIDE', 'en')).toBe(true);
    });

    it('should use English keywords for unknown locale', () => {
      expect(detectCrisis('I want to kill myself', 'fr' as any)).toBe(true);
    });
  });
});
