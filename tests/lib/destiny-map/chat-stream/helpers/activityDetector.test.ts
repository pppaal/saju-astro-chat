import { describe, it, expect } from 'vitest';
import {
  detectActivity,
  isDateRelatedQuestion,
  analyzeActivityIntent,
} from '@/lib/destiny-map/chat-stream/helpers/activityDetector';

describe('detectActivity', () => {
  describe('marriage keywords', () => {
    it('should detect Korean marriage keywords', () => {
      expect(detectActivity('결혼 날짜를 정하고 싶어요')).toBe('marriage');
      expect(detectActivity('혼례 준비를 하려고 합니다')).toBe('marriage');
      expect(detectActivity('웨딩 계획이 있어요')).toBe('marriage');
    });

    it('should detect English marriage keywords', () => {
      expect(detectActivity('I want to marry soon')).toBe('marriage');
      expect(detectActivity('Best wedding date?')).toBe('marriage');
      expect(detectActivity('marriage plans')).toBe('marriage');
    });
  });

  describe('moving keywords', () => {
    it('should detect moving keywords', () => {
      expect(detectActivity('이사를 가려고 합니다')).toBe('moving');
      expect(detectActivity('When should I move?')).toBe('moving');
      expect(detectActivity('입주 날짜')).toBe('moving');
    });
  });

  describe('business keywords', () => {
    it('should detect business keywords', () => {
      expect(detectActivity('개업을 하려고 합니다')).toBe('business');
      expect(detectActivity('창업 시기가 궁금합니다')).toBe('business');
      expect(detectActivity('starting a business')).toBe('business');
      expect(detectActivity('오픈 날짜')).toBe('business');
    });
  });

  describe('contract keywords', () => {
    it('should detect contract keywords', () => {
      expect(detectActivity('계약을 할까요?')).toBe('contract');
      expect(detectActivity('When to sign the contract?')).toBe('contract');
    });
  });

  describe('interview keywords', () => {
    it('should detect interview keywords', () => {
      expect(detectActivity('면접 일정이 있어요')).toBe('interview');
      expect(detectActivity('Best time for an interview')).toBe('interview');
      expect(detectActivity('취업 시기')).toBe('interview');
    });
  });

  describe('investment keywords', () => {
    it('should detect investment keywords', () => {
      expect(detectActivity('투자를 하려고 합니다')).toBe('investment');
      expect(detectActivity('주식 투자 시기')).toBe('investment');
      expect(detectActivity('부동산 매매')).toBe('investment');
      expect(detectActivity('When to invest?')).toBe('investment');
    });
  });

  describe('travel keywords', () => {
    it('should detect travel keywords', () => {
      expect(detectActivity('여행 계획')).toBe('travel');
      expect(detectActivity('When should I travel?')).toBe('travel');
      expect(detectActivity('휴가 일정')).toBe('travel');
    });
  });

  describe('surgery keywords', () => {
    it('should detect surgery keywords', () => {
      expect(detectActivity('수술 날짜')).toBe('surgery');
      expect(detectActivity('치료 시기')).toBe('surgery');
      expect(detectActivity('surgery timing')).toBe('surgery');
    });
  });

  describe('study keywords', () => {
    it('should detect study keywords', () => {
      expect(detectActivity('시험 볼 때')).toBe('study');
      expect(detectActivity('When is the exam?')).toBe('study');
      expect(detectActivity('학습 시작')).toBe('study');
    });
  });

  describe('career change keywords', () => {
    it('should detect career change keywords', () => {
      expect(detectActivity('이직을 고민 중입니다')).toBe('career_change');
      expect(detectActivity('퇴사 시기')).toBe('career_change');
      expect(detectActivity('job change timing')).toBe('career_change');
    });
  });

  describe('negotiation keywords', () => {
    it('should detect negotiation keywords', () => {
      expect(detectActivity('협상 시기')).toBe('negotiation');
      expect(detectActivity('거래 날짜')).toBe('negotiation');
    });
  });

  describe('no match', () => {
    it('should return null for unrelated text', () => {
      expect(detectActivity('오늘 날씨 어때?')).toBeNull();
      expect(detectActivity('hello world')).toBeNull();
      expect(detectActivity('')).toBeNull();
    });
  });

  it('should be case-insensitive for English keywords', () => {
    expect(detectActivity('WEDDING plans')).toBe('marriage');
    expect(detectActivity('Best TRAVEL time')).toBe('travel');
  });
});

describe('isDateRelatedQuestion', () => {
  it('should detect Korean date keywords', () => {
    expect(isDateRelatedQuestion('언제가 좋을까요?')).toBe(true);
    expect(isDateRelatedQuestion('좋은 날 알려주세요')).toBe(true);
    expect(isDateRelatedQuestion('길일을 찾고 있어요')).toBe(true);
    expect(isDateRelatedQuestion('최적의 시기')).toBe(true);
    expect(isDateRelatedQuestion('날짜 추천')).toBe(true);
  });

  it('should detect English date keywords', () => {
    expect(isDateRelatedQuestion('When should I do this?')).toBe(true);
    expect(isDateRelatedQuestion('Best date for this?')).toBe(true);
    expect(isDateRelatedQuestion('What is the best timing?')).toBe(true);
    expect(isDateRelatedQuestion('good day to start?')).toBe(true);
  });

  it('should return false for non-date questions', () => {
    expect(isDateRelatedQuestion('오늘의 운세')).toBe(false);
    expect(isDateRelatedQuestion('Tell me about my personality')).toBe(false);
  });
});

describe('analyzeActivityIntent', () => {
  it('should return both activity and date question flag', () => {
    const result = analyzeActivityIntent('결혼 좋은 날 언제예요?');
    expect(result.activity).toBe('marriage');
    expect(result.isDateQuestion).toBe(true);
  });

  it('should return activity without date question', () => {
    const result = analyzeActivityIntent('결혼 운세 알려주세요');
    expect(result.activity).toBe('marriage');
    expect(result.isDateQuestion).toBe(false);
  });

  it('should return date question without activity', () => {
    const result = analyzeActivityIntent('언제가 좋을까요?');
    expect(result.activity).toBeNull();
    expect(result.isDateQuestion).toBe(true);
  });

  it('should return neither for unrelated question', () => {
    const result = analyzeActivityIntent('오늘 운세');
    expect(result.activity).toBeNull();
    expect(result.isDateQuestion).toBe(false);
  });
});
