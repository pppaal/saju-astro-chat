/**
 * twelveStageData.ts - 12운성 관련 상수
 */

import type { TwelveStageLocal } from '../types';

// 각 천간별 12운성 시작 지지 (장생 위치)
export const TWELVE_STAGE_START: Record<string, string> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
  '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
  '壬': '申', '癸': '卯',
};

export const TWELVE_STAGES_ORDER: TwelveStageLocal[] = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'
];

export const STAGE_METADATA: Record<TwelveStageLocal, { energy: 'rising' | 'peak' | 'declining' | 'dormant'; score: number; lifePhase: string }> = {
  '장생': { energy: 'rising', score: 75, lifePhase: '탄생/시작기 - 새로운 가능성의 시작' },
  '목욕': { energy: 'rising', score: 55, lifePhase: '유아기 - 불안정하나 정화의 시기' },
  '관대': { energy: 'rising', score: 85, lifePhase: '청년기 - 자립과 성장의 시기' },
  '건록': { energy: 'peak', score: 95, lifePhase: '장년기 - 왕성한 활동력과 성취' },
  '제왕': { energy: 'peak', score: 100, lifePhase: '전성기 - 최고 정점의 시기' },
  '쇠': { energy: 'declining', score: 65, lifePhase: '성숙기 - 안정과 수확의 시기' },
  '병': { energy: 'declining', score: 45, lifePhase: '쇠퇴기 - 휴식과 재충전 필요' },
  '사': { energy: 'declining', score: 35, lifePhase: '정리기 - 마무리와 해방의 시기' },
  '묘': { energy: 'dormant', score: 25, lifePhase: '잠복기 - 저장과 보존의 시기' },
  '절': { energy: 'dormant', score: 40, lifePhase: '단절기 - 과거와의 단절, 새 시작 준비' },
  '태': { energy: 'rising', score: 50, lifePhase: '잉태기 - 새로운 구상과 계획' },
  '양': { energy: 'rising', score: 65, lifePhase: '양육기 - 성장 준비와 역량 축적' },
};

export const STAGE_ADVICE_MAP: Record<TwelveStageLocal, string> = {
  '장생': '새로운 시작에 유리합니다. 계획을 세우고 첫 발을 내딛으세요.',
  '목욕': '변화와 정화의 시기입니다. 불안정하나 새로워지는 과정입니다.',
  '관대': '자립과 성장의 시기입니다. 자신감을 갖고 도전하세요.',
  '건록': '활동력이 최고조입니다. 적극적으로 추진하세요.',
  '제왕': '정점의 시기입니다. 큰 결정과 성취를 이루세요.',
  '쇠': '성숙기입니다. 무리하지 말고 유지에 집중하세요.',
  '병': '휴식이 필요합니다. 건강 관리와 재충전에 집중하세요.',
  '사': '정리의 시기입니다. 불필요한 것을 내려놓으세요.',
  '묘': '잠복기입니다. 내면에 집중하고 때를 기다리세요.',
  '절': '전환점입니다. 과거를 정리하고 새 시작을 준비하세요.',
  '태': '구상의 시기입니다. 아이디어를 키우고 계획을 세우세요.',
  '양': '준비의 시기입니다. 역량을 쌓고 기반을 다지세요.',
};
