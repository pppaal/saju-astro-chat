// Career Domain: Matrix Analysis
// Analyzes career patterns through Sibsin-House combinations

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SIBSIN_HOUSE_MATRIX, HOUSE_KEYWORDS } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
import { SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import type { SibsinKind, HouseNumber } from '@/lib/destiny-matrix/types';
import type { SajuData, AstroData } from '../../../types';
import type { CareerMatrixResult, SibsinHouseResult } from '../../types';

// Extended Saju data type for internal use
interface ExtendedSajuData {
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
}

/**
 * Analyzes career patterns through matrix combinations
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Career matrix analysis result or null
 */
export function getCareerMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const sibsinCareer: SibsinHouseResult[] = [];
  const careerStrengths: Array<{ area: string; score: number; icon: string }> = [];

  // 1. 십신-하우스 분석 (10하우스 중심)
  const careerHouses: HouseNumber[] = [10, 6, 2]; // 커리어, 직장, 재물
  const sibsinList = extSaju?.sibsin || {};

  // 각 기둥의 십신 추출
  const allSibsin: SibsinKind[] = [];
  if (sibsinList.year) allSibsin.push(sibsinList.year);
  if (sibsinList.month) allSibsin.push(sibsinList.month);
  if (sibsinList.day) allSibsin.push(sibsinList.day);
  if (sibsinList.hour) allSibsin.push(sibsinList.hour);

  // 십신-하우스 매트릭스 분석
  for (const sibsin of allSibsin) {
    for (const house of careerHouses) {
      const interaction = SIBSIN_HOUSE_MATRIX[sibsin]?.[house];
      const sibsinKw = SIBSIN_KEYWORDS[sibsin];
      const houseKw = HOUSE_KEYWORDS[house];

      if (interaction && sibsinKw && houseKw) {
        sibsinCareer.push({
          sibsin,
          sibsinKeyword: sibsinKw,
          house,
          houseKeyword: houseKw,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${sibsin}(${sibsinKw.ko}) × ${house}H = ${interaction.keyword}`,
              en: `${sibsin}(${sibsinKw.en}) × H${house} = ${interaction.keywordEn}`,
            },
          },
        });
      }
    }
  }

  // 2. 커리어 강점 추출
  const strengthMap = new Map<string, { score: number; icon: string }>();

  for (const item of sibsinCareer) {
    if (item.fusion.level === 'extreme' || item.fusion.level === 'amplify') {
      const key = isKo ? item.fusion.keyword.ko : item.fusion.keyword.en;
      const existing = strengthMap.get(key);
      if (!existing || existing.score < item.fusion.score) {
        strengthMap.set(key, { score: item.fusion.score, icon: item.fusion.icon });
      }
    }
  }

  for (const [area, data] of strengthMap) {
    careerStrengths.push({ area, score: data.score, icon: data.icon });
  }
  careerStrengths.sort((a, b) => b.score - a.score);

  // 3. 점수 및 메시지 계산
  const careerScores = sibsinCareer.filter(s => s.house === 10).map(s => s.fusion.score);
  const careerScore = careerScores.length > 0
    ? Math.round(careerScores.reduce((a, b) => a + b, 0) / careerScores.length * 10)
    : 65;

  // 커리어 메시지 생성
  const has10HExtreme = sibsinCareer.some(s => s.house === 10 && s.fusion.level === 'extreme');
  const has10HConflict = sibsinCareer.some(s => s.house === 10 && s.fusion.level === 'conflict');
  const hasJeongGwan10H = sibsinCareer.some(s => s.sibsin === '정관' && s.house === 10);
  const hasPyeonJae10H = sibsinCareer.some(s => s.sibsin === '편재' && s.house === 10);

  let careerMessage = { ko: '균형 잡힌 직업 에너지를 가지고 있어요.', en: 'You have balanced career energy.' };

  if (hasJeongGwan10H) {
    careerMessage = {
      ko: '정관의 권위! 조직에서 인정받고 승진하기 좋은 구조예요.',
      en: 'Authority of proper official! Great structure for recognition and promotion.',
    };
  } else if (hasPyeonJae10H) {
    careerMessage = {
      ko: '편재의 사업운! 자영업이나 투자에서 성공 가능성이 높아요.',
      en: 'Business luck! High potential for success in self-employment or investment.',
    };
  } else if (has10HExtreme) {
    careerMessage = {
      ko: '커리어에서 극강의 에너지가 흐르고 있어요! 적극적으로 도전하세요.',
      en: 'Extreme energy flows in your career! Challenge actively.',
    };
  } else if (has10HConflict) {
    careerMessage = {
      ko: '커리어에 긴장이 있어요. 이것은 성장의 기회! 신중하게 접근하세요.',
      en: 'Tension in career. This is a growth opportunity! Approach carefully.',
    };
  }

  return {
    sibsinCareer: sibsinCareer.slice(0, 12), // 최대 12개
    careerStrengths: careerStrengths.slice(0, 5),
    careerScore,
    careerMessage,
  };
}
