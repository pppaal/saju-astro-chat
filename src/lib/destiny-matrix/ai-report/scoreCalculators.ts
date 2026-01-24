// src/lib/destiny-matrix/ai-report/scoreCalculators.ts
// 점수 계산 및 헬퍼 함수들

import type { ReportPeriod, ReportTheme, TimingData, ThemedReportSections } from './types';

// ===========================
// 기간 라벨 생성
// ===========================

export function generatePeriodLabel(
  period: ReportPeriod,
  targetDate: string,
  lang: 'ko' | 'en'
): string {
  const date = new Date(targetDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (lang === 'ko') {
    switch (period) {
      case 'daily':
        return `${year}년 ${month}월 ${day}일`;
      case 'monthly':
        return `${year}년 ${month}월`;
      case 'yearly':
        return `${year}년`;
      default:
        return `${year}년 종합`;
    }
  } else {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    switch (period) {
      case 'daily':
        return `${monthNames[month - 1]} ${day}, ${year}`;
      case 'monthly':
        return `${monthNames[month - 1]} ${year}`;
      case 'yearly':
        return `${year}`;
      default:
        return `${year} Comprehensive`;
    }
  }
}

// ===========================
// 기간 점수 계산
// ===========================

// 오행 상생상극 보너스 테이블
const ELEMENT_BONUS: Record<string, Record<string, number>> = {
  '목': { '수': 15, '목': 10, '화': 5, '토': -5, '금': -10 },
  '화': { '목': 15, '화': 10, '토': 5, '금': -5, '수': -10 },
  '토': { '화': 15, '토': 10, '금': 5, '수': -5, '목': -10 },
  '금': { '토': 15, '금': 10, '수': 5, '목': -5, '화': -10 },
  '수': { '금': 15, '수': 10, '목': 5, '화': -5, '토': -10 },
};

export interface PeriodScoreResult {
  overall: number;
  career: number;
  love: number;
  wealth: number;
  health: number;
}

export function calculatePeriodScore(
  timingData: TimingData,
  dayMasterElement: string
): PeriodScoreResult {
  const baseScore = 60;
  const seunElement = timingData.seun?.element || '토';
  const bonus = ELEMENT_BONUS[dayMasterElement]?.[seunElement] || 0;

  const overall = Math.min(100, Math.max(0, baseScore + bonus + Math.floor(Math.random() * 10)));

  return {
    overall,
    career: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 20) - 10)),
    love: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 20) - 10)),
    wealth: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 20) - 10)),
    health: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 20) - 10)),
  };
}

// ===========================
// 테마 점수 계산
// ===========================

// 테마별 관련 십신 가중치
const THEME_SIBSIN_WEIGHTS: Record<ReportTheme, string[]> = {
  love: ['정재', '편재', '정관', '편관'],
  career: ['정관', '편관', '식신', '상관'],
  wealth: ['정재', '편재', '식신', '상관'],
  health: ['비견', '겁재', '정인', '편인'],
  family: ['정인', '편인', '비견', '겁재'],
};

export interface ThemeScoreResult {
  overall: number;
  potential: number;
  timing: number;
  compatibility: number;
}

export function calculateThemeScore(
  theme: ReportTheme,
  sibsinDistribution?: Record<string, number>
): ThemeScoreResult {
  const baseScore = 65;

  let themeBonus = 0;
  const relevantSibsin = THEME_SIBSIN_WEIGHTS[theme] || [];

  if (sibsinDistribution) {
    relevantSibsin.forEach(sibsin => {
      themeBonus += (sibsinDistribution[sibsin] || 0) * 2;
    });
  }

  const overall = Math.min(100, Math.max(0, baseScore + themeBonus));

  return {
    overall,
    potential: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 15))),
    timing: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 20) - 10)),
    compatibility: Math.min(100, Math.max(0, overall + Math.floor(Math.random() * 15) - 5)),
  };
}

// ===========================
// 키워드 추출
// ===========================

const DEFAULT_KEYWORDS: Record<ReportTheme, { ko: string[]; en: string[] }> = {
  love: {
    ko: ['인연', '만남', '소통', '배려', '신뢰'],
    en: ['Connection', 'Meeting', 'Communication', 'Care', 'Trust'],
  },
  career: {
    ko: ['성장', '도전', '협업', '전문성', '리더십'],
    en: ['Growth', 'Challenge', 'Collaboration', 'Expertise', 'Leadership'],
  },
  wealth: {
    ko: ['저축', '투자', '기회', '안정', '성장'],
    en: ['Savings', 'Investment', 'Opportunity', 'Stability', 'Growth'],
  },
  health: {
    ko: ['균형', '활력', '휴식', '예방', '회복'],
    en: ['Balance', 'Vitality', 'Rest', 'Prevention', 'Recovery'],
  },
  family: {
    ko: ['화합', '소통', '이해', '지지', '감사'],
    en: ['Harmony', 'Communication', 'Understanding', 'Support', 'Gratitude'],
  },
};

export function extractKeywords(
  _sections: ThemedReportSections,
  theme: ReportTheme,
  lang: 'ko' | 'en'
): string[] {
  return DEFAULT_KEYWORDS[theme]?.[lang] || [];
}
