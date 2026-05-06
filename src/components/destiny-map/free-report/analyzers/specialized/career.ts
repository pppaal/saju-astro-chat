/**
 * Career Advanced Analysis
 * Specialized career analysis combining Saju and Astrology data
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import type { WesternElement } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { CareerAdvancedResult, ExtendedSajuData } from '../types/specialized.types';

// Helper functions
function mapSajuElementToKo(el: string): FiveElement {
  const map: Record<string, FiveElement> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[el] || '토';
}

function getWestElementFromSign(sign: string): WesternElement {
  const normalized = sign?.charAt(0).toUpperCase() + sign?.slice(1).toLowerCase();
  return SIGN_TO_ELEMENT[normalized] || 'earth';
}

// Constants
const HOUSE_CAREER_AREAS: Record<number, { ko: string; en: string }> = {
  2: { ko: '재물 관리, 금융', en: 'Wealth management, Finance' },
  3: { ko: '소통, 글쓰기, 마케팅', en: 'Communication, Writing, Marketing' },
  6: { ko: '서비스, 건강 관리', en: 'Service, Healthcare' },
  7: { ko: '협상, 파트너십', en: 'Negotiation, Partnership' },
  8: { ko: '연구, 심리, 금융', en: 'Research, Psychology, Finance' },
  9: { ko: '교육, 출판, 해외', en: 'Education, Publishing, International' },
  10: { ko: '리더십, 경영, 공직', en: 'Leadership, Management, Public service' },
  11: { ko: '네트워크, IT, 혁신', en: 'Networking, IT, Innovation' },
};

/**
 * Analyze career aspects using destiny matrix
 * Combines Saju career patterns with astrological career indicators
 */
export function getCareerAdvancedAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerAdvancedResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 격국 기반 커리어 방향 (L7)
  let geokgukCareer: CareerAdvancedResult['geokgukCareer'] = null;
  const geokguk = extSaju?.advancedAnalysis?.geokguk?.name;
  if (geokguk) {
    const geokData = ADVANCED_ANALYSIS_MATRIX[geokguk as keyof typeof ADVANCED_ANALYSIS_MATRIX];
    if (geokData && geokData.secondary) {
      const interaction = geokData.secondary;
      geokgukCareer = {
        geokguk,
        pattern: 'secondary',
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        careerDirection: {
          ko: `${geokguk} 격국에 맞는 커리어 방향`,
          en: `Career direction for ${geokguk} pattern`,
        },
      };
    }
  }

  // 2. 하우스별 커리어 맵
  const houseCareerMap: CareerAdvancedResult['houseCareerMap'] = [];
  if (astro?.planets && Array.isArray(astro.planets)) {
    const housePlanets: Record<number, string[]> = {};
    for (const p of astro.planets) {
      if (p.house && p.name) {
        const house = p.house as number;
        if (!housePlanets[house]) {housePlanets[house] = [];}
        housePlanets[house].push(p.name);
      }
    }

    for (const [houseStr, planets] of Object.entries(housePlanets)) {
      const house = parseInt(houseStr);
      if (HOUSE_CAREER_AREAS[house]) {
        const planetCount = planets.length;
        const strength: 'strong' | 'moderate' | 'weak' = planetCount >= 3 ? 'strong' : planetCount >= 2 ? 'moderate' : 'weak';
        houseCareerMap.push({
          house,
          planets,
          careerArea: HOUSE_CAREER_AREAS[house],
          strength,
          icon: house === 10 ? '🏆' : house === 6 ? '💼' : house === 2 ? '💰' : '⭐',
        });
      }
    }
  }

  // 3. MC (Midheaven) 분석
  let midheaven: CareerAdvancedResult['midheaven'] = null;
  if (astro?.houses && Array.isArray(astro.houses)) {
    const mc = astro.houses.find(h => h.number === 10 || h.index === 10 || h.cusp === 10);
    if (mc?.sign) {
      const mcElement = getWestElementFromSign(mc.sign);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[mcElement];
      if (interaction) {
        midheaven = {
          sign: mc.sign,
          element: mcElement,
          sajuAlignment: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: interaction.keyword, en: interaction.keywordEn },
          },
          publicImage: {
            ko: `${mc.sign} MC - 대중적 이미지`,
            en: `${mc.sign} MC - Public image`,
          },
        };
      }
    }
  }

  // 4. 커리어 타이밍
  const careerTiming: CareerAdvancedResult['careerTiming'] = [];
  const currentYear = new Date().getFullYear();
  const daeunList = extSaju?.daeun || [];
  const currentDaeun = daeunList.find(d => d.current || d.isCurrent);

  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
    if (interaction) {
      careerTiming.push({
        period: `${currentDaeun.startAge || currentYear}세~`,
        icon: '🌟',
        strength: interaction.score >= 70 ? 'strong' : interaction.score >= 50 ? 'moderate' : 'weak',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 시기 - ${interaction.keyword}`,
          en: `${daeunEl} Daeun period - ${interaction.keywordEn}`,
        },
        goodFor: isKo ? ['커리어 발전', '새로운 도전'] : ['Career growth', 'New challenges'],
      });
    }
  }

  // 종합 점수
  const geokScore = geokgukCareer?.fusion.score || 0;
  const houseScore = houseCareerMap.length > 0 ? houseCareerMap.reduce((sum, h) => sum + (h.strength === 'strong' ? 80 : h.strength === 'moderate' ? 60 : 40), 0) / houseCareerMap.length : 0;
  const mcScore = midheaven?.sajuAlignment.score || 0;
  const careerScore = Math.round((geokScore + houseScore + mcScore) / 3);

  return {
    careerScore,
    geokgukCareer,
    houseCareerMap,
    midheaven,
    careerTiming,
  };
}
