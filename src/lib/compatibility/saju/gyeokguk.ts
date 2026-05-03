/**
 * @file Gyeokguk (격국) Analysis
 * 격국(格局) 비교 분석 - 사주의 패턴 유형 비교
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { GyeokgukAnalysis, GyeokgukType } from './types';
import { normalizeElement } from './element-utils';

export function analyzeGyeokguk(p1: SajuProfile, p2: SajuProfile): GyeokgukAnalysis {
  const p1Gyeokguk = determineGyeokguk(p1);
  const p2Gyeokguk = determineGyeokguk(p2);

  const strengths: string[] = [];
  const challenges: string[] = [];
  let compatibility: GyeokgukAnalysis['compatibility'] = 'neutral';
  let dynamics = '';

  // 격국 조합 분석
  const combo = `${p1Gyeokguk}-${p2Gyeokguk}`;

  // 좋은 조합
  const excellentCombos = [
    '정관격-정인격', '정인격-정관격',
    '정재격-식신격', '식신격-정재격',
    '정관격-정재격', '정재격-정관격',
  ];

  const goodCombos = [
    '편관격-편인격', '편인격-편관격',
    '편재격-상관격', '상관격-편재격',
    '건록격-정관격', '정관격-건록격',
  ];

  const challengingCombos = [
    '양인격-양인격',
    '상관격-정관격', '정관격-상관격',
    '편관격-양인격', '양인격-편관격',
  ];

  if (excellentCombos.includes(combo)) {
    compatibility = 'excellent';
    dynamics = `🏆 격국의 환상적인 조합이에요! ${p1Gyeokguk}과 ${p2Gyeokguk}이 만나면 마치 명품 브랜드의 콜라보레이션 같아요. 각자의 강점이 배가 되고, 함께 있으면 1+1이 3이 되는 마법 같은 시너지!`;
    strengths.push('🚀 사회적 성공을 함께 이룰 수 있는 드림팀 조합! 비즈니스 파트너로도 최고예요.');
    strengths.push('🧩 서로의 빈 곳을 자연스럽게 채워주는 퍼즐 같은 관계. 내가 부족하면 상대가 있고, 상대가 힘들면 내가 있는!');
  } else if (goodCombos.includes(combo)) {
    compatibility = 'good';
    dynamics = `✨ 격국의 조화가 좋아요! ${p1Gyeokguk}과 ${p2Gyeokguk}의 만남은 마치 좋은 와인과 치즈의 페어링 같아요. 각자 혼자서도 좋지만, 함께하면 더 특별해지는 관계!`;
    strengths.push('💪 서로 다른 무기를 가진 팀메이트처럼, 어떤 상황에서도 협력해서 헤쳐나갈 수 있어요.');
  } else if (challengingCombos.includes(combo)) {
    compatibility = 'challenging';
    dynamics = `⚡ ${p1Gyeokguk}과 ${p2Gyeokguk}은 두 마리 호랑이 같은 조합이에요! 강한 에너지가 부딪히면 불꽃이 튀지만, 그 불꽃이 서로를 성장시키는 원동력이 될 수도 있어요.`;
    challenges.push('🎯 가치관과 행동 방식이 달라서 "왜 저렇게 하지?" 하고 의아할 때가 있을 거예요. 하지만 이건 틀린 게 아니라 다른 거예요!');
    challenges.push('👑 누가 리드할지 경쟁이 생길 수 있어요. 하지만 서로의 영역을 존중하면 두 사람 다 왕이 될 수 있어요!');
  } else if (p1Gyeokguk === p2Gyeokguk) {
    compatibility = 'good';
    dynamics = `🪞 같은 ${p1Gyeokguk}! 마치 거울을 보는 것 같아요. 상대방이 왜 그렇게 행동하는지 본능적으로 이해할 수 있어요. "아, 나도 그랬을 거야"라는 공감이 자연스럽게 생기는 관계!`;
    strengths.push('🎯 비슷한 가치관과 목표를 가지고 있어서 같은 방향을 바라보며 함께 걸어갈 수 있어요.');
    challenges.push('🌶️ 너무 비슷해서 가끔 "새로운 자극이 필요해!" 할 때가 있을 수 있어요. 함께 새로운 경험을 찾아보세요!');
  } else {
    dynamics = `🌈 ${p1Gyeokguk}과 ${p2Gyeokguk}의 만남은 서로 다른 색깔의 조화예요! 다양성이 관계를 풍요롭게 만들어요.`;
    strengths.push('📚 서로에게 배울 점이 많아요! 상대방을 통해 세상을 보는 새로운 렌즈를 얻을 수 있어요.');
  }

  return {
    person1Gyeokguk: p1Gyeokguk,
    person2Gyeokguk: p2Gyeokguk,
    compatibility,
    dynamics,
    strengths,
    challenges,
  };
}

function determineGyeokguk(profile: SajuProfile): GyeokgukType {
  const monthStem = profile.pillars.month.stem;
  const dayMasterElement = normalizeElement(profile.dayMaster.element);

  // 월간과 일간의 관계로 격국 결정 (간략화)
  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const monthElement = stemElements[monthStem] || 'earth';

  // 십성 관계로 격국 결정
  const relationship = getTenGodRelationship(dayMasterElement, monthElement);

  const gyeokgukMap: Record<string, GyeokgukType> = {
    '비겁': '건록격',
    '식상': '식신격',
    '재성': '정재격',
    '관성': '정관격',
    '인성': '정인격',
  };

  return gyeokgukMap[relationship] || '정관격';
}

function getTenGodRelationship(dayMaster: string, target: string): string {
  // 오행 관계로 십성 카테고리 결정
  if (dayMaster === target) {return '비겁';}

  const generates: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };
  const controls: Record<string, string> = {
    wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
  };

  if (generates[dayMaster] === target) {return '식상';}
  if (generates[target] === dayMaster) {return '인성';}
  if (controls[dayMaster] === target) {return '재성';}
  if (controls[target] === dayMaster) {return '관성';}

  return '비겁';
}
