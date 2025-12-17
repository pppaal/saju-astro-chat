// src/lib/destiny-matrix/data/layer1-element-core.ts
// Layer 1: Element Core Grid (기운핵심격자) - 오행 ↔ 4원소 교차

import type { ElementCoreGrid, InteractionCode, WesternElement } from '../types';
import type { FiveElement } from '../../Saju/types';

// Helper to create interaction codes
const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string
): InteractionCode => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
});

// 오행-서양4원소 상호작용 매핑
// 목(Wood): 성장/확장 - Fire와 증폭, Water와 지원
// 화(Fire): 열정/에너지 - Fire와 극강, Water와 상극
// 토(Earth): 안정/중심 - Earth와 안정, Air와 분산
// 금(Metal): 결단/정리 - Earth와 강화, Fire와 상극
// 수(Water): 지혜/유동 - Water와 공명, Fire와 상극

export const ELEMENT_CORE_GRID: ElementCoreGrid = {
  '목': {
    fire: c('amplify', 8, '🚀', 'green', '증폭', 'Amplify'),
    earth: c('balance', 6, '⚖️', 'blue', '보완', 'Complement'),
    air: c('clash', 5, '🌀', 'yellow', '충돌', 'Clash'),
    water: c('amplify', 7, '💎', 'green', '지원', 'Support'),
  },
  '화': {
    fire: c('extreme', 10, '💥', 'purple', '극강', 'Extreme'),
    earth: c('clash', 5, '🔄', 'yellow', '소모', 'Drain'),
    air: c('amplify', 7, '⚡', 'green', '자극', 'Stimulate'),
    water: c('conflict', 2, '❌', 'red', '상극', 'Conflict'),
  },
  '토': {
    fire: c('amplify', 7, '🔥', 'green', '열화', 'Heat'),
    earth: c('extreme', 9, '🏔️', 'purple', '안정', 'Stable'),
    air: c('clash', 4, '💨', 'yellow', '분산', 'Disperse'),
    water: c('clash', 4, '🌊', 'yellow', '침식', 'Erode'),
  },
  '금': {
    fire: c('conflict', 2, '❌', 'red', '상극', 'Conflict'),
    earth: c('amplify', 8, '💎', 'green', '강화', 'Strengthen'),
    air: c('balance', 6, '⚖️', 'blue', '균형', 'Balance'),
    water: c('amplify', 7, '💧', 'green', '생성', 'Generate'),
  },
  '수': {
    fire: c('conflict', 2, '❌', 'red', '상극', 'Conflict'),
    earth: c('balance', 5, '🌱', 'blue', '흡수', 'Absorb'),
    air: c('balance', 6, '🌀', 'blue', '확산', 'Spread'),
    water: c('extreme', 9, '🌊', 'purple', '공명', 'Resonate'),
  },
};

// 서양 별자리 → 원소 매핑
export const SIGN_TO_ELEMENT: Record<string, WesternElement> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
};

// 오행 상생/상극 관계
export const FIVE_ELEMENT_RELATIONS = {
  generates: {
    '목': '화', // 목생화
    '화': '토', // 화생토
    '토': '금', // 토생금
    '금': '수', // 금생수
    '수': '목', // 수생목
  } as Record<FiveElement, FiveElement>,
  controls: {
    '목': '토', // 목극토
    '토': '수', // 토극수
    '수': '화', // 수극화
    '화': '금', // 화극금
    '금': '목', // 금극목
  } as Record<FiveElement, FiveElement>,
};

// 서양 원소 상성 관계
export const WESTERN_ELEMENT_RELATIONS = {
  harmonious: {
    fire: ['air'],
    air: ['fire'],
    earth: ['water'],
    water: ['earth'],
  } as Record<WesternElement, WesternElement[]>,
  neutral: {
    fire: ['fire'],
    air: ['air'],
    earth: ['earth'],
    water: ['water'],
  } as Record<WesternElement, WesternElement[]>,
  challenging: {
    fire: ['water', 'earth'],
    air: ['earth', 'water'],
    earth: ['fire', 'air'],
    water: ['fire', 'air'],
  } as Record<WesternElement, WesternElement[]>,
};
