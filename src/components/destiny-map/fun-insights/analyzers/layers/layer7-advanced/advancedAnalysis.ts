// Layer 7: Advanced Analysis
// Analyzes the fusion between Saju patterns (Geokguk) and Western progressions

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import type { AdvancedAnalysisRow, ProgressionType, InteractionCode } from '@/lib/destiny-matrix/types';
import type { SajuData, AstroData } from '../../../types';
import type { AdvancedAnalysisResult } from '../../types';

// Pattern (Geokguk) localized names
const PATTERN_NAMES: Record<string, { ko: string; en: string }> = {
  jeonggwan: { ko: '정관격', en: 'Proper Authority' },
  pyeongwan: { ko: '편관격', en: 'Partial Authority' },
  jeongin: { ko: '정인격', en: 'Proper Seal' },
  pyeonin: { ko: '편인격', en: 'Partial Seal' },
  siksin: { ko: '식신격', en: 'Eating God' },
  sanggwan: { ko: '상관격', en: 'Hurting Officer' },
  jeongjae: { ko: '정재격', en: 'Proper Wealth' },
  pyeonjae: { ko: '편재격', en: 'Partial Wealth' },
};

// Progression localized names
const PROGRESSION_NAMES: Record<string, { ko: string; en: string }> = {
  secondary: { ko: '세컨더리', en: 'Secondary Progression' },
  solarArc: { ko: '솔라아크', en: 'Solar Arc' },
  solarReturn: { ko: '솔라리턴', en: 'Solar Return' },
  lunarReturn: { ko: '루나리턴', en: 'Lunar Return' },
  draconic: { ko: '드라코닉', en: 'Draconic' },
  harmonics: { ko: '하모닉스', en: 'Harmonics' },
};

// Extended Saju data type for internal use
interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  advancedAnalysis?: {
    geokguk?: {
      name?: string;
      type?: string;
    };
  };
}

/**
 * Analyzes advanced combinations between Saju patterns and Western progressions
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Array of advanced analysis results (max 5)
 */
export function getAdvancedAnalysisResult(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): AdvancedAnalysisResult[] {
  const isKo = lang === 'ko';
  const results: AdvancedAnalysisResult[] = [];

  if (!saju && !astro) return results;

  const extSaju = saju as ExtendedSajuData | undefined;

  // 실제 격국 데이터에서 추출 시도
  const geokgukData = extSaju?.advancedAnalysis?.geokguk;
  const geokgukName = geokgukData?.name || geokgukData?.type || '';

  // 격국 이름에서 패턴 매핑
  const geokgukToPattern: Record<string, AdvancedAnalysisRow> = {
    '정관격': 'jeonggwan', '정관': 'jeonggwan', 'jeonggwan': 'jeonggwan',
    '편관격': 'pyeongwan', '편관': 'pyeongwan', 'pyeongwan': 'pyeongwan',
    '정인격': 'jeongin', '정인': 'jeongin', 'jeongin': 'jeongin',
    '편인격': 'pyeongin', '편인': 'pyeongin', 'pyeongin': 'pyeongin',
    '식신격': 'siksin', '식신': 'siksin', 'siksin': 'siksin',
    '상관격': 'sanggwan', '상관': 'sanggwan', 'sanggwan': 'sanggwan',
    '정재격': 'jeongjae', '정재': 'jeongjae', 'jeongjae': 'jeongjae',
    '편재격': 'pyeonjae', '편재': 'pyeonjae', 'pyeonjae': 'pyeonjae',
  };

  // 실제 격국 데이터가 있으면 사용, 없으면 일간 오행 기반 추정
  let pattern: AdvancedAnalysisRow;
  if (geokgukName && geokgukToPattern[geokgukName]) {
    pattern = geokgukToPattern[geokgukName];
  } else {
    // 일간 오행 기반 기본 격국 추정
    const dayElement = saju?.dayMaster?.element || 'wood';
    const elementToPattern: Record<string, AdvancedAnalysisRow> = {
      wood: 'jeongin',
      fire: 'siksin',
      earth: 'jeongjae',
      metal: 'jeonggwan',
      water: 'pyeongin',
    };
    pattern = elementToPattern[dayElement] || 'jeonggwan';
  }

  // 실제 프로그레션 데이터 확인
  const progressions: ProgressionType[] = [];

  // astro 데이터에서 프로그레션 정보 추출
  if (astro?.solarReturn) progressions.push('solarReturn');
  if (astro?.lunarReturn) progressions.push('lunarReturn');
  if (astro?.progressions?.secondary) progressions.push('secondary');
  if (astro?.progressions?.solarArc) progressions.push('solarArc');
  if (astro?.draconic) progressions.push('draconic');
  if (astro?.harmonics) progressions.push('harmonics');

  // 프로그레션 데이터가 없으면 기본값 사용
  const useProgressions: ProgressionType[] = progressions.length > 0
    ? progressions
    : ['solarReturn', 'secondary', 'harmonics'];

  for (const prog of useProgressions) {
    const patternData = ADVANCED_ANALYSIS_MATRIX[pattern];
    if (patternData && patternData[prog]) {
      const interaction = patternData[prog];
      const patternInfo = PATTERN_NAMES[pattern] || { ko: pattern, en: pattern };
      const progressionInfo = PROGRESSION_NAMES[prog] || { ko: prog, en: prog };

      results.push({
        pattern,
        progression: prog,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${patternInfo.ko} × ${progressionInfo.ko} = ${interaction.keyword}`,
            en: `${patternInfo.en} × ${progressionInfo.en} = ${interaction.keywordEn}`,
          },
        },
        patternInfo,
        progressionInfo,
        advice: (interaction as InteractionCode & { advice?: string }).advice,
      });
    }
  }

  return results.slice(0, 5); // 최대 5개
}
