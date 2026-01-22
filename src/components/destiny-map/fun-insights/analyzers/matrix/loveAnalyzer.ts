/**
 * Love Matrix Analyzer
 * 사랑 매트릭스 특화 분석
 */

import type { ShinsalKind, PlanetName, AsteroidName } from '@/lib/destiny-matrix/types';
import type { SajuData, AstroData } from '../../types';
import type { LoveMatrixResult } from './types';
import { analyzeShinsalPlanet } from './shinsalPlanet';
import { analyzeAsteroidHouse } from './asteroidHouse';

/**
 * 사랑 매트릭스 분석 (LoveTab용)
 */
export function analyzeLoveMatrix(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  // 1. 신살-행성 분석 (사랑 관련: 도화, 홍염살 중심)
  const loveShinsals: ShinsalKind[] = ['도화', '홍염살', '천을귀인', '월덕귀인', '반안'];
  const lovePlanets: PlanetName[] = ['Venus', 'Mars', 'Moon', 'Neptune'];

  const shinsalLove = analyzeShinsalPlanet(saju, loveShinsals, lovePlanets);

  // 2. 소행성-하우스 분석 (Juno 중심)
  const loveAsteroids: AsteroidName[] = ['Juno', 'Ceres'];
  const asteroidLove = analyzeAsteroidHouse(astro, loveAsteroids, lang);

  // 3. 점수 및 메시지 계산
  const allScores = [
    ...shinsalLove.map(s => s.fusion.score),
    ...asteroidLove.map(a => a.fusion.score),
  ];

  const loveScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10)
    : 65;

  // 사랑 메시지 생성
  const hasDoHwa = shinsalLove.some(s => s.shinsal === '도화');
  const hasHongYeom = shinsalLove.some(s => s.shinsal === '홍염살');
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
