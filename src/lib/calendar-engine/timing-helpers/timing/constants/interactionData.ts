/**
 * interactionData.ts - 합/충/형 데이터
 */

import type { FiveElement } from '../types';

// 육합 (지지 1:1 합)
export const YUKAP: Record<string, { partner: string; result: FiveElement }> = {
  '子': { partner: '丑', result: '토' },
  '丑': { partner: '子', result: '토' },
  '寅': { partner: '亥', result: '목' },
  '卯': { partner: '戌', result: '화' },
  '辰': { partner: '酉', result: '금' },
  '巳': { partner: '申', result: '수' },
  '午': { partner: '未', result: '화' },
  '未': { partner: '午', result: '화' },
  '申': { partner: '巳', result: '수' },
  '酉': { partner: '辰', result: '금' },
  '戌': { partner: '卯', result: '화' },
  '亥': { partner: '寅', result: '목' },
};

// 삼합 (지지 3개 합)
export const SAMHAP: { branches: string[]; result: FiveElement }[] = [
  { branches: ['申', '子', '辰'], result: '수' },  // 수국
  { branches: ['寅', '午', '戌'], result: '화' },  // 화국
  { branches: ['亥', '卯', '未'], result: '목' },  // 목국
  { branches: ['巳', '酉', '丑'], result: '금' },  // 금국
];

// 방합 (계절 방위 합)
export const BANGHAP: { branches: string[]; result: FiveElement }[] = [
  { branches: ['寅', '卯', '辰'], result: '목' },  // 동방 목
  { branches: ['巳', '午', '未'], result: '화' },  // 남방 화
  { branches: ['申', '酉', '戌'], result: '금' },  // 서방 금
  { branches: ['亥', '子', '丑'], result: '수' },  // 북방 수
];

// 충 (대립)
export const CHUNG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
  '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

// 형 (충돌)
export const HYEONG: { branches: string[]; type: string }[] = [
  { branches: ['寅', '巳', '申'], type: '무은지형' },  // 삼형
  { branches: ['丑', '戌', '未'], type: '무례지형' },  // 삼형
  { branches: ['子', '卯'], type: '무례지형' },        // 이형
  { branches: ['辰', '辰'], type: '자형' },            // 자형
  { branches: ['午', '午'], type: '자형' },
  { branches: ['酉', '酉'], type: '자형' },
  { branches: ['亥', '亥'], type: '자형' },
];
