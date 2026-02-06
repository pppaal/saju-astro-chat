// src/lib/Saju/compatibility/constants.ts
// 궁합 분석 상수

import { FiveElement } from '../types';

/** 천간합 */
export const STEM_HAP: Record<string, { partner: string; result: FiveElement }> = {
  '甲': { partner: '己', result: '토' },
  '己': { partner: '甲', result: '토' },
  '乙': { partner: '庚', result: '금' },
  '庚': { partner: '乙', result: '금' },
  '丙': { partner: '辛', result: '수' },
  '辛': { partner: '丙', result: '수' },
  '丁': { partner: '壬', result: '목' },
  '壬': { partner: '丁', result: '목' },
  '戊': { partner: '癸', result: '화' },
  '癸': { partner: '戊', result: '화' },
};

/** 천간충 */
export const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲',
  '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙',
  '丁': '癸', '癸': '丁',
};

/** 지지육합 */
export const BRANCH_YUKHAP: Record<string, { partner: string; result: FiveElement }> = {
  '子': { partner: '丑', result: '토' },
  '丑': { partner: '子', result: '토' },
  '寅': { partner: '亥', result: '목' },
  '亥': { partner: '寅', result: '목' },
  '卯': { partner: '戌', result: '화' },
  '戌': { partner: '卯', result: '화' },
  '辰': { partner: '酉', result: '금' },
  '酉': { partner: '辰', result: '금' },
  '巳': { partner: '申', result: '수' },
  '申': { partner: '巳', result: '수' },
  '午': { partner: '未', result: '토' },
  '未': { partner: '午', result: '토' },
};

/** 지지삼합 */
export const BRANCH_SAMHAP: Array<{ branches: string[]; result: FiveElement }> = [
  { branches: ['寅', '午', '戌'], result: '화' },
  { branches: ['巳', '酉', '丑'], result: '금' },
  { branches: ['申', '子', '辰'], result: '수' },
  { branches: ['亥', '卯', '未'], result: '목' },
];

/** 지지충 */
export const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

/** 지지형 */
export const BRANCH_HYEONG: Array<{ branches: string[]; type: string }> = [
  { branches: ['寅', '巳', '申'], type: '무은지형' },
  { branches: ['丑', '戌', '未'], type: '지세지형' },
  { branches: ['子', '卯'], type: '무례지형' },
  { branches: ['辰', '辰'], type: '자형' },
  { branches: ['午', '午'], type: '자형' },
  { branches: ['酉', '酉'], type: '자형' },
  { branches: ['亥', '亥'], type: '자형' },
];

/** 지지해 */
export const BRANCH_HAE: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
};

/** 일간 관계별 기본 점수 */
export const DAY_MASTER_RELATION_SCORES: Record<string, number> = {
  '비화': 70,
  '생조': 85,
  '설기': 65,
  '극출': 55,
  '극입': 45,
};

/** 카테고리별 가중치 */
export const CATEGORY_WEIGHTS: Record<string, { element: number; stem: number; branch: number; dayMaster: number }> = {
  love: { element: 0.2, stem: 0.2, branch: 0.3, dayMaster: 0.3 },
  business: { element: 0.3, stem: 0.25, branch: 0.25, dayMaster: 0.2 },
  friendship: { element: 0.25, stem: 0.2, branch: 0.3, dayMaster: 0.25 },
  family: { element: 0.2, stem: 0.2, branch: 0.35, dayMaster: 0.25 },
  work: { element: 0.3, stem: 0.25, branch: 0.2, dayMaster: 0.25 },
};

/** 카테고리별 조언 */
export const CATEGORY_ADVICE: Record<string, string> = {
  love: '서로의 다름을 인정하고 소통을 많이 하세요.',
  business: '역할 분담을 명확히 하고 각자의 강점을 살리세요.',
  friendship: '적당한 거리감을 유지하면서 깊은 우정을 나누세요.',
  family: '세대 차이를 이해하고 존중하는 마음을 가지세요.',
  work: '업무적 관계를 우선하고 감정적 충돌을 피하세요.',
};
