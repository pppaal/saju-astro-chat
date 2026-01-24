// Love Domain: Matrix Analysis
// Analyzes love and romance through Shinsal-Planet and Asteroid-House combinations

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SHINSAL_PLANET_MATRIX, SHINSAL_INFO } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { ASTEROID_HOUSE_MATRIX, ASTEROID_INFO } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
import type { ShinsalKind, PlanetName, AsteroidName, HouseNumber } from '@/lib/destiny-matrix/types';
import type { SajuData, AstroData } from '../../../types';
import type { LoveMatrixResult, ShinsalPlanetResult, AsteroidHouseResult } from '../../types';

// Helper to get house life area
const getHouseLifeArea = (house: number): { ko: string; en: string } => {
  const areas: Record<number, { ko: string; en: string }> = {
    1: { ko: '자아', en: 'Self' },
    5: { ko: '연애', en: 'Romance' },
    7: { ko: '파트너십', en: 'Partnership' },
    8: { ko: '친밀감', en: 'Intimacy' },
  };
  return areas[house] || { ko: '기타', en: 'Other' };
};

// Extended Saju data type for internal use
interface ExtendedSajuData {
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
}

/**
 * Analyzes love and romance patterns through matrix combinations
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Love matrix analysis result or null
 */
export function getLoveMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const shinsalLove: ShinsalPlanetResult[] = [];
  const asteroidLove: AsteroidHouseResult[] = [];

  // 1. 신살-행성 분석 (사랑 관련: 도화, 홍염살 중심)
  const loveShinsals: ShinsalKind[] = ['도화', '홍염살', '천을귀인', '월덕귀인', '반안'];
  const lovePlanets: PlanetName[] = ['Venus', 'Mars', 'Moon', 'Neptune'];
  const shinsalList = extSaju?.shinsal || saju?.sinsal || [];

  // 사주에서 신살 추출 (배열 또는 객체 형태 처리)
  const userShinsals: ShinsalKind[] = [];
  if (Array.isArray(shinsalList)) {
    for (const s of shinsalList) {
      const name = typeof s === 'string' ? s : (s as { name?: string; shinsal?: string })?.name || (s as { shinsal?: string })?.shinsal;
      if (name && loveShinsals.includes(name as ShinsalKind)) {
        userShinsals.push(name as ShinsalKind);
      }
    }
  } else if (typeof shinsalList === 'object' && shinsalList !== null) {
    for (const key of Object.keys(shinsalList as Record<string, unknown>)) {
      const val = (shinsalList as Record<string, unknown>)[key];
      if (Array.isArray(val)) {
        for (const v of val) {
          const name = typeof v === 'string' ? v : (v as { name?: string })?.name;
          if (name && loveShinsals.includes(name as ShinsalKind)) {
            userShinsals.push(name as ShinsalKind);
          }
        }
      }
    }
  }

  // 신살-행성 매트릭스 분석
  for (const shinsal of userShinsals) {
    for (const planet of lovePlanets) {
      const interaction = SHINSAL_PLANET_MATRIX[shinsal]?.[planet];
      const info = SHINSAL_INFO[shinsal];
      if (interaction && info) {
        shinsalLove.push({
          shinsal,
          shinsalInfo: { ko: info.ko, en: info.en, effect: info.effect, effectEn: info.effectEn },
          planet,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${shinsal} × ${planet} = ${interaction.keyword}`,
              en: `${shinsal} × ${planet} = ${interaction.keywordEn}`,
            },
          },
          category: info.category,
        });
      }
    }
  }

  // 2. 소행성-하우스 분석 (Juno 중심)
  const loveAsteroids: AsteroidName[] = ['Juno', 'Ceres'];

  // astro에서 소행성 정보 추출
  const astroWithAsteroids = astro as AstroData & { asteroids?: Array<{ name?: string; house?: number }> };
  if (astroWithAsteroids?.asteroids || astro?.planets) {
    const asteroidData = astroWithAsteroids?.asteroids || [];
    const planetData = astro?.planets || [];

    for (const asteroid of loveAsteroids) {
      // asteroids 배열에서 찾기
      let asteroidInfo = Array.isArray(asteroidData) ? asteroidData.find((a) =>
        a?.name?.toLowerCase() === asteroid.toLowerCase()
      ) : undefined;

      // planets 배열에서도 찾기 (일부 시스템에서 소행성을 planets에 포함)
      if (!asteroidInfo && Array.isArray(planetData)) {
        asteroidInfo = planetData.find((p) =>
          p?.name?.toLowerCase() === asteroid.toLowerCase()
        );
      }

      if (asteroidInfo?.house) {
        const house = asteroidInfo.house as HouseNumber;
        const interaction = ASTEROID_HOUSE_MATRIX[asteroid]?.[house];
        const info = ASTEROID_INFO[asteroid];

        if (interaction && info) {
          asteroidLove.push({
            asteroid,
            asteroidInfo: { ko: info.ko, en: info.en, theme: info.theme, themeEn: info.themeEn },
            house,
            fusion: {
              level: interaction.level,
              score: interaction.score,
              icon: interaction.icon,
              color: getInteractionColor(interaction.level),
              keyword: { ko: interaction.keyword, en: interaction.keywordEn },
              description: {
                ko: `${info.ko} × ${house}하우스 = ${interaction.keyword}`,
                en: `${info.en} × House ${house} = ${interaction.keywordEn}`,
              },
            },
            lifeArea: isKo ? getHouseLifeArea(house).ko : getHouseLifeArea(house).en,
          });
        }
      }
    }
  }

  // 3. 점수 및 메시지 계산
  const allScores = [
    ...shinsalLove.map(s => s.fusion.score),
    ...asteroidLove.map(a => a.fusion.score),
  ];

  const loveScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10)
    : 65;

  // 사랑 메시지 생성
  const hasDoHwa = userShinsals.includes('도화' as ShinsalKind);
  const hasHongYeom = userShinsals.includes('홍염살' as ShinsalKind);
  const hasJuno7H = asteroidLove.some(a => a.asteroid === 'Juno' && a.house === 7);

  let loveMessage = { ko: '균형 잡힌 연애 에너지를 가지고 있어요.', en: 'You have balanced romantic energy.' };

  if (hasDoHwa && hasHongYeom) {
    loveMessage = {
      ko: '강렬한 연애 에너지! 이성에게 매우 매력적이지만 감정 조절이 필요해요.',
      en: 'Intense romantic energy! Very attractive but needs emotional control.',
    };
  } else if (hasDoHwa) {
    loveMessage = {
      ko: '도화살의 매력! 자연스러운 이성 인연이 많아요.',
      en: 'Peach blossom charm! Natural romantic connections abound.',
    };
  } else if (hasJuno7H) {
    loveMessage = {
      ko: '결혼 운이 강해요! 파트너십에서 헌신과 충실함을 발휘해요.',
      en: 'Strong marriage luck! You excel in partnership devotion and loyalty.',
    };
  }

  return {
    shinsalLove,
    asteroidLove,
    loveScore,
    loveMessage,
  };
}
