/**
 * @file Twelve States (12운성) Analysis
 * 12운성(十二運星) 분석 - 장생, 목욕, 관대, 건록, 제왕, 쇠, 병, 사, 묘, 절, 태, 양
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { TwelveStatesAnalysis, TwelveState } from './types';
import { normalizeElement } from './element-utils';

export function analyzeTwelveStates(p1: SajuProfile, p2: SajuProfile): TwelveStatesAnalysis {
  const p1States = calculateTwelveStates(p1);
  const p2States = calculateTwelveStates(p2);

  const interpretation: string[] = [];
  let energyCompatibility = 50;

  // 일지 12운성 비교 (가장 중요)
  const p1DayState = p1States.find(s => s.pillar === 'day')?.state;
  const p2DayState = p2States.find(s => s.pillar === 'day')?.state;

  // 왕성한 운성들
  const strongStates: TwelveState[] = ['건록', '제왕', '관대', '장생'];
  // 약한 운성들
  const weakStates: TwelveState[] = ['사', '묘', '절', '병'];

  const p1Strong = p1DayState && strongStates.includes(p1DayState);
  const p2Strong = p2DayState && strongStates.includes(p2DayState);
  const p1Weak = p1DayState && weakStates.includes(p1DayState);
  const p2Weak = p2DayState && weakStates.includes(p2DayState);

  // 일간 이름 가져오기
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  if (p1Strong && p2Strong) {
    energyCompatibility = 85;
    interpretation.push(`⚡ 파워 커플 탄생! ${p1DayMaster}일간(${p1DayState})과 ${p2DayMaster}일간(${p2DayState}) 모두 왕성한 에너지를 뿜어내고 있어요! 마치 두 개의 태양이 만난 것처럼 눈부시고 역동적인 관계예요. 함께하면 못 이룰 일이 없을 것 같아요!`);
    interpretation.push(`🏆 다만 조심! 두 사람 다 에너지가 넘치다 보니 "내가 이끌 거야!"하는 순간이 올 수 있어요. 핵심은 경쟁이 아닌 협력! 각자의 강점을 발휘할 영역을 나누면 세상을 정복할 수 있어요!`);
  } else if (p1Strong && p2Weak) {
    energyCompatibility = 70;
    interpretation.push(`🦸 ${p1DayMaster}일간(${p1DayState})이 에너지 넘치는 히어로 역할! ${p2DayMaster}일간(${p2DayState})에게 활력을 불어넣고 리드해주는 관계예요. 한 사람이 끌어주고, 한 사람이 따라가는 자연스러운 밸런스가 있어요.`);
    interpretation.push(`💕 ${p2DayMaster}일간은 ${p1DayMaster}일간 덕분에 더 활기차지고, ${p1DayMaster}일간은 ${p2DayMaster}일간의 차분함에서 안정감을 얻어요. 서로에게 필요한 것을 주고받는 좋은 조합이에요!`);
  } else if (p1Weak && p2Strong) {
    energyCompatibility = 70;
    interpretation.push(`🌟 ${p2DayMaster}일간(${p2DayState})이 에너지 충전기 역할! ${p1DayMaster}일간(${p1DayState})에게 활력과 자신감을 불어넣어주는 관계예요. 서로 다른 에너지 레벨이 오히려 아름다운 균형을 이뤄요.`);
    interpretation.push(`🌙 ${p1DayMaster}일간의 차분하고 깊은 에너지가 ${p2DayMaster}일간의 넘치는 열정에 방향을 잡아줘요. 마치 바람과 돛의 관계처럼, 서로가 있어야 더 멀리 갈 수 있어요!`);
  } else if (p1Weak && p2Weak) {
    energyCompatibility = 45;
    interpretation.push(`🌿 ${p1DayMaster}일간(${p1DayState})과 ${p2DayMaster}일간(${p2DayState}), 서로 조용한 에너지를 가지고 있어요. 시끌벅적한 것보다 둘만의 평화로운 시간을 즐기는 '집순이/집돌이' 커플 타입이에요!`);
    interpretation.push(`☕ 하지만 가끔은 함께 밖으로 나가서 새로운 자극을 받는 것도 좋아요! 활발한 친구들과 어울리거나, 새로운 취미에 도전해보세요. 약간의 스파이스가 관계를 더 풍성하게 해줄 거예요!`);
  } else {
    energyCompatibility = 60;
    interpretation.push(`⚖️ ${p1DayMaster}일간(${p1DayState || '중간'})과 ${p2DayMaster}일간(${p2DayState || '중간'}), 에너지 레벨이 적당히 균형 잡혀 있어요! 극과 극이 아니라서 서로를 이해하기 쉽고, 비슷한 페이스로 함께 걸어갈 수 있어요.`);
    interpretation.push(`🎵 마치 템포가 비슷한 두 노래가 자연스럽게 어우러지는 것처럼, 무리 없이 조화로운 관계를 만들어갈 수 있어요. 안정감 속에서 천천히 깊어지는 사랑이에요!`);
  }

  return {
    person1States: p1States,
    person2States: p2States,
    energyCompatibility,
    interpretation,
  };
}

function calculateTwelveStates(
  profile: SajuProfile
): { pillar: string; state: TwelveState; meaning: string }[] {
  const results: { pillar: string; state: TwelveState; meaning: string }[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  // 12운성 표 (일간 기준, 각 지지에서의 상태)
  const twelveStatesTable: Record<string, Record<string, TwelveState>> = {
    wood: {
      '亥': '장생', '子': '목욕', '丑': '관대', '寅': '건록', '卯': '제왕', '辰': '쇠',
      '巳': '병', '午': '사', '未': '묘', '申': '절', '酉': '태', '戌': '양',
    },
    fire: {
      '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠',
      '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양',
    },
    earth: {
      '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠',
      '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양',
    },
    metal: {
      '巳': '장생', '午': '목욕', '未': '관대', '申': '건록', '酉': '제왕', '戌': '쇠',
      '亥': '병', '子': '사', '丑': '묘', '寅': '절', '卯': '태', '辰': '양',
    },
    water: {
      '申': '장생', '酉': '목욕', '戌': '관대', '亥': '건록', '子': '제왕', '丑': '쇠',
      '寅': '병', '卯': '사', '辰': '묘', '巳': '절', '午': '태', '未': '양',
    },
  };

  const stateMeanings: Record<TwelveState, string> = {
    '장생': '새로운 시작의 에너지',
    '목욕': '정화와 변화의 에너지',
    '관대': '성장과 발전의 에너지',
    '건록': '안정과 실력의 에너지',
    '제왕': '최고의 왕성한 에너지',
    '쇠': '서서히 줄어드는 에너지',
    '병': '쇠약해지는 에너지',
    '사': '끝나가는 에너지',
    '묘': '저장과 휴식의 에너지',
    '절': '완전한 휴지기',
    '태': '새 생명 잉태의 에너지',
    '양': '양육받는 에너지',
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const pillar of pillars) {
    const branch = profile.pillars[pillar].branch;
    const table = twelveStatesTable[dm];
    const state = table?.[branch] || '건록';

    results.push({
      pillar,
      state,
      meaning: stateMeanings[state],
    });
  }

  return results;
}
