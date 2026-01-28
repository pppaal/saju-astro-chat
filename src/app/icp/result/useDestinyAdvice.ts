import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { ICPAnalysis, ICPOctantCode } from '@/lib/icp/types';
import {
  getDailyFortuneScore,
  calculateYearlyImportantDates,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  type DailyFortuneResult,
  type ImportantDate,
} from '@/lib/destiny-map/destinyCalendar';

interface DestinyAdviceState {
  fortune: DailyFortuneResult | null;
  growthDates: ImportantDate[];
  isLoading: boolean;
}

// ICP 유형별 성장 카테고리 매핑
function getGrowthCategories(icpType: ICPOctantCode): string[] {
  const categoryMap: Record<ICPOctantCode, string[]> = {
    PA: ['career', 'general'], // 리더형 - 커리어, 전반
    BC: ['career', 'wealth'], // 성취형 - 커리어, 재물
    DE: ['study', 'general'], // 분석형 - 학업, 전반
    FG: ['study', 'health'], // 관찰형 - 학업, 건강
    HI: ['love', 'health'], // 평화형 - 연애, 건강
    JK: ['love', 'general'], // 협력형 - 연애, 전반
    LM: ['love', 'travel'], // 친화형 - 연애, 여행
    NO: ['career', 'love'], // 멘토형 - 커리어, 연애
  };
  return categoryMap[icpType] || ['general'];
}

export default function useDestinyAdvice(analysis: ICPAnalysis | null) {
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [destinyAdvice, setDestinyAdvice] = useState<DestinyAdviceState>({
    fortune: null,
    growthDates: [],
    isLoading: false,
  });

  // 운명 기반 조언 생성
  const handleGenerateDestinyAdvice = useCallback(async () => {
    if (!birthDate || !analysis) {return;}

    setDestinyAdvice(prev => ({ ...prev, isLoading: true }));

    try {
      // 오늘의 운세
      const fortune = getDailyFortuneScore(birthDate, birthTime || undefined);

      // 성장에 좋은 날짜 (올해)
      const sajuProfile = calculateSajuProfileFromBirthDate(new Date(birthDate));
      const astroProfile = calculateAstroProfileFromBirthDate(new Date(birthDate));
      const growthCategories = getGrowthCategories(analysis.primaryStyle as ICPOctantCode);

      const yearlyDates = calculateYearlyImportantDates(
        new Date().getFullYear(),
        sajuProfile,
        astroProfile,
        { minGrade: 2, limit: 30 }
      );

      // ICP 유형에 맞는 날짜 필터링
      const filteredDates = yearlyDates
        .filter(d =>
          d.categories.some(cat => growthCategories.includes(cat)) ||
          d.grade <= 1
        )
        .sort((a, b) => a.grade - b.grade)
        .slice(0, 5);

      setDestinyAdvice({
        fortune,
        growthDates: filteredDates,
        isLoading: false,
      });
    } catch (error) {
      logger.error('[ICP Destiny] Error:', error);
      setDestinyAdvice(prev => ({ ...prev, isLoading: false }));
    }
  }, [birthDate, birthTime, analysis]);

  return {
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    destinyAdvice,
    handleGenerateDestinyAdvice,
  };
}
