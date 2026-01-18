/**
 * @file Yongsin (용신/희신) Compatibility Analysis
 * 용신/희신 궁합 분석 - 서로에게 필요한 오행을 채워주는지 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { YongsinAnalysis } from './types';
import { normalizeElement, getElementKorean } from './element-utils';

export function analyzeYongsinCompatibility(p1: SajuProfile, p2: SajuProfile): YongsinAnalysis {
  // 일간 기준으로 용신 계산 (간략화된 버전)
  const p1Yongsin = calculateYongsin(p1);
  const p1Huisin = calculateHuisin(p1, p1Yongsin);
  const p2Yongsin = calculateYongsin(p2);
  const p2Huisin = calculateHuisin(p2, p2Yongsin);

  // 일간 이름 가져오기
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const interpretation: string[] = [];
  let compatibility = 50;

  // 상대방이 나의 용신을 가지고 있는지 검사
  const p2HasP1Yongsin = getElementStrength(p2, p1Yongsin) >= 2;
  const p1HasP2Yongsin = getElementStrength(p1, p2Yongsin) >= 2;

  const mutualSupport = p2HasP1Yongsin && p1HasP2Yongsin;

  // 용신 설명 헬퍼
  const getElementDescription = (element: string): string => {
    const descriptions: Record<string, string> = {
      wood: '성장, 창의성, 새로운 시작의',
      fire: '열정, 활력, 따뜻함의',
      earth: '안정, 신뢰, 중심의',
      metal: '결단력, 정제, 완성의',
      water: '지혜, 유연함, 깊이의',
    };
    return descriptions[element] || '';
  };

  if (mutualSupport) {
    compatibility = 95;
    interpretation.push(`🔮 운명적인 용신 궁합이에요! 서로에게 필요한 것을 자연스럽게 채워주는 '완벽한 보완 관계'예요. ${p1DayMaster}일간은 ${getElementDescription(p1Yongsin)} 기운이 필요하고, ${p2DayMaster}일간은 ${getElementDescription(p2Yongsin)} 기운이 필요한데, 놀랍게도 서로가 그 기운을 가지고 있어요!`);
    interpretation.push(`💎 함께 있으면 각자 혼자일 때 느끼던 공허함이나 부족함이 자연스럽게 채워지는 느낌을 받을 거예요. 마치 배고픈 사람에게 밥을, 목마른 사람에게 물을 주는 것처럼요. 이런 궁합은 정말 드물어요!`);
  } else if (p2HasP1Yongsin || p1HasP2Yongsin) {
    compatibility = 75;
    if (p2HasP1Yongsin) {
      interpretation.push(`💫 ${p2DayMaster}일간이 ${p1DayMaster}일간에게 꼭 필요한 ${getElementKorean(p1Yongsin)}(${getElementDescription(p1Yongsin)}) 에너지를 가지고 있어요! ${p1DayMaster}일간은 ${p2DayMaster}일간 옆에 있으면 왠지 모르게 편안하고 힘이 나는 느낌을 받을 거예요.`);
    }
    if (p1HasP2Yongsin) {
      interpretation.push(`💫 ${p1DayMaster}일간이 ${p2DayMaster}일간에게 필요한 ${getElementKorean(p2Yongsin)}(${getElementDescription(p2Yongsin)}) 에너지의 원천이에요! ${p2DayMaster}일간은 ${p1DayMaster}일간과 함께할 때 더 균형 잡히고 완전해지는 느낌을 받을 거예요.`);
    }
  } else {
    compatibility = 45;
    interpretation.push(`🌿 용신 측면에서는 직접적인 보완 관계가 아니에요. 하지만 괜찮아요! 용신은 궁합의 한 부분일 뿐이에요.`);
    interpretation.push(`💡 각자에게 필요한 에너지(${p1DayMaster}일간: ${getElementKorean(p1Yongsin)}, ${p2DayMaster}일간: ${getElementKorean(p2Yongsin)})는 취미활동, 인테리어, 색상 선택 등 다른 방식으로 채울 수 있어요. 함께 '우리의 용신 채우기 프로젝트'를 해보는 건 어때요?`);
  }

  // 희신 검사
  if (getElementStrength(p2, p1Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`✨ 보너스! ${p2DayMaster}일간이 ${p1DayMaster}일간의 희신(${getElementKorean(p1Huisin)} - 용신을 도와주는 좋은 기운)도 가지고 있어요! 마치 메인 요리에 맛있는 사이드 디쉬까지 나오는 느낌이에요.`);
  }
  if (getElementStrength(p1, p2Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`✨ 보너스! ${p1DayMaster}일간도 ${p2DayMaster}일간의 희신(${getElementKorean(p2Huisin)})을 품고 있어요! 서로에게 주는 것이 더 많아지는 관계랍니다.`);
  }

  return {
    person1Yongsin: p1Yongsin,
    person1Huisin: p1Huisin,
    person2Yongsin: p2Yongsin,
    person2Huisin: p2Huisin,
    mutualSupport,
    compatibility: Math.min(100, compatibility),
    interpretation,
  };
}

export function calculateYongsin(profile: SajuProfile): string {
  const dm = normalizeElement(profile.dayMaster.element);
  const elements = profile.elements;

  // 일간의 강약 판단
  const selfStrength = elements[dm as keyof typeof elements] || 0;
  const isStrong = selfStrength >= 3;

  // 오행 생극 관계로 용신 결정
  const yongsinMap: Record<string, { strong: string; weak: string }> = {
    wood: { strong: 'metal', weak: 'water' },  // 강하면 금(관성), 약하면 수(인성)
    fire: { strong: 'water', weak: 'wood' },
    earth: { strong: 'wood', weak: 'fire' },
    metal: { strong: 'fire', weak: 'earth' },
    water: { strong: 'earth', weak: 'metal' },
  };

  return yongsinMap[dm]?.[isStrong ? 'strong' : 'weak'] || 'earth';
}

export function calculateHuisin(profile: SajuProfile, yongsin: string): string {
  // 희신은 용신을 생하는 오행
  const generateMap: Record<string, string> = {
    wood: 'water',
    fire: 'wood',
    earth: 'fire',
    metal: 'earth',
    water: 'metal',
  };
  return generateMap[yongsin] || 'earth';
}

function getElementStrength(profile: SajuProfile, element: string): number {
  return profile.elements[element as keyof typeof profile.elements] || 0;
}
