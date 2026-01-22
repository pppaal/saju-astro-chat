/**
 * Layer 9: Asteroid-House Analysis
 * 소행성-하우스 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ASTEROID_HOUSE_MATRIX, ASTEROID_INFO } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
import type { AsteroidName, HouseNumber } from '@/lib/destiny-matrix/types';
import type { AstroData } from '../../types';
import type { AsteroidHouseResult } from './types';

function getHouseLifeArea(house: number, isKo: boolean): string {
  const areas: Record<number, { ko: string; en: string }> = {
    1: { ko: '자아/외모', en: 'Self/Appearance' },
    2: { ko: '재물/가치', en: 'Money/Values' },
    3: { ko: '소통/학습', en: 'Communication/Learning' },
    4: { ko: '가정/뿌리', en: 'Home/Roots' },
    5: { ko: '창조/연애', en: 'Creativity/Romance' },
    6: { ko: '건강/일상', en: 'Health/Daily Work' },
    7: { ko: '관계/파트너', en: 'Relationships/Partner' },
    8: { ko: '변혁/깊이', en: 'Transformation/Depth' },
    9: { ko: '확장/철학', en: 'Expansion/Philosophy' },
    10: { ko: '커리어/명예', en: 'Career/Status' },
    11: { ko: '희망/네트워크', en: 'Hopes/Network' },
    12: { ko: '영성/무의식', en: 'Spirituality/Unconscious' },
  };
  return isKo ? areas[house]?.ko || '' : areas[house]?.en || '';
}

/**
 * 소행성-하우스 융합 분석
 */
export function analyzeAsteroidHouse(
  astro: AstroData | undefined,
  targetAsteroids?: AsteroidName[],
  lang: string = 'en'
): AsteroidHouseResult[] {
  const isKo = lang === 'ko';
  const asteroidHouseResults: AsteroidHouseResult[] = [];

  if (!astro) return asteroidHouseResults;

  const asteroids = targetAsteroids || ['Juno', 'Ceres', 'Pallas', 'Vesta'] as AsteroidName[];

  // astro에서 소행성 정보 추출
  const astroWithAsteroids = astro as AstroData & { asteroids?: Array<{ name?: string; house?: number }> };
  const asteroidData = astroWithAsteroids?.asteroids || [];
  const planetData = astro?.planets || [];

  for (const asteroid of asteroids) {
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
        asteroidHouseResults.push({
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
          lifeArea: getHouseLifeArea(house, isKo),
        });
      }
    }
  }

  return asteroidHouseResults;
}
