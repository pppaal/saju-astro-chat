// src/lib/destiny-matrix/data/layer1-element-core.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Layer 1: Element Core Grid (기운핵심격자)
 * ============================================================================
 * © 2024 All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, distribution, or reverse engineering is prohibited.
 * ============================================================================
 */
// Layer 1: 오행 ↔ 4원소 교차

import type { ElementCoreGrid, InteractionCode, WesternElement } from '../types';
import type { FiveElement } from '../../Saju/types';

// Helper to create interaction codes with optional advice
const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string,
  advice?: string
): InteractionCode & { advice?: string } => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
  ...(advice && { advice }),
});

// 오행-서양4원소 상호작용 매핑
// 목(Wood): 성장/확장 - Fire와 증폭, Water와 지원
// 화(Fire): 열정/에너지 - Fire와 극강, Water와 상극
// 토(Earth): 안정/중심 - Earth와 안정, Air와 분산
// 금(Metal): 결단/정리 - Earth와 강화, Fire와 상극
// 수(Water): 지혜/유동 - Water와 공명, Fire와 상극

export const ELEMENT_CORE_GRID: ElementCoreGrid = {
  '목': {
    fire: c('amplify', 7, '🚀', 'green', '증폭', 'Amplify',
      '창의적 에너지가 폭발합니다. 새로운 프로젝트 시작에 유리하나, 과도한 열정으로 소진되지 않도록 주의하세요.'),
    earth: c('balance', 6, '⚖️', 'blue', '보완', 'Complement',
      '성장과 안정이 조화를 이룹니다. 꾸준한 발전을 추구하되, 현실적 기반을 잊지 마세요.'),
    air: c('balance', 5, '🌀', 'blue', '충돌', 'Clash',
      '아이디어와 행동 사이에 간극이 있을 수 있습니다. 생각을 구체화하고, 실행 가능한 계획을 세우세요.'),
    water: c('amplify', 7, '💎', 'green', '지원', 'Support',
      '성장의 기반이 탄탄해집니다. 장기적 계획을 세우고 꾸준히 실행하면 좋은 결과를 얻습니다.'),
  },
  '화': {
    fire: c('extreme', 9, '💥', 'purple', '극강', 'Extreme',
      '폭발적 에너지가 솟아납니다. 열정을 쏟을 프로젝트에 집중하되, 번아웃을 경계하고 적절히 쉬세요.'),
    earth: c('clash', 5, '🔄', 'yellow', '소모', 'Drain',
      '에너지가 소모되기 쉽습니다. 과도한 일정은 피하고, 휴식과 영양 보충에 신경 쓰세요.'),
    air: c('amplify', 7, '⚡', 'green', '자극', 'Stimulate',
      '아이디어가 활발해집니다. 창의적 활동과 소통이 시너지를 내지만, 산만해지지 않도록 우선순위를 정하세요.'),
    water: c('conflict', 2, '❌', 'red', '상극', 'Conflict',
      '상충되는 에너지로 혼란스러울 수 있습니다. 급한 결정은 피하고, 균형을 찾는 데 집중하세요.'),
  },
  '토': {
    fire: c('amplify', 7, '🔥', 'green', '열화', 'Heat',
      '안정 속에서 열정이 생깁니다. 기반을 다지면서도 새로운 시도를 두려워하지 마세요.'),
    earth: c('extreme', 9, '🏔️', 'purple', '안정', 'Stable',
      '최상의 안정기입니다. 장기 투자, 부동산, 경력 발전에 유리하며, 기반을 튼튼히 다질 수 있습니다.'),
    air: c('clash', 4, '💨', 'yellow', '분산', 'Disperse',
      '집중력이 흐트러질 수 있습니다. 한 가지에 집중하고, 멀티태스킹은 줄이세요.'),
    water: c('clash', 4, '🌊', 'yellow', '침식', 'Erode',
      '안정성이 위협받을 수 있습니다. 외부 변화에 유연하게 대처하되, 핵심 가치는 지키세요.'),
  },
  '금': {
    fire: c('conflict', 2, '❌', 'red', '상극', 'Conflict',
      '갈등과 마찰이 예상됩니다. 충동적 결정을 피하고, 냉정함을 유지하며 장기적 관점을 가지세요.'),
    earth: c('amplify', 7, '💎', 'green', '강화', 'Strengthen',
      '결단력과 안정성이 결합됩니다. 중요한 결정을 내리기 좋은 시기이며, 실행력이 빛을 발합니다.'),
    air: c('balance', 6, '⚖️', 'blue', '균형', 'Balance',
      '논리와 결단이 균형을 이룹니다. 합리적 판단으로 문제를 해결하되, 융통성도 유지하세요.'),
    water: c('amplify', 7, '💧', 'green', '생성', 'Generate',
      '지혜와 결단이 시너지를 냅니다. 직관과 논리를 결합해 새로운 해결책을 찾으세요.'),
  },
  '수': {
    fire: c('conflict', 2, '❌', 'red', '상극', 'Conflict',
      '극단적 대립이 예상됩니다. 감정 조절이 중요하며, 중재자를 통한 해결을 고려하세요.'),
    earth: c('balance', 5, '🌱', 'blue', '흡수', 'Absorb',
      '지혜가 안정으로 전환됩니다. 배운 것을 실용적으로 적용하고, 점진적 변화를 추구하세요.'),
    air: c('balance', 6, '🌀', 'blue', '확산', 'Spread',
      '아이디어가 널리 퍼집니다. 소통과 네트워킹에 유리하나, 핵심 메시지를 명확히 하세요.'),
    water: c('extreme', 9, '🌊', 'purple', '공명', 'Resonate',
      '직관과 감성이 최고조입니다. 명상, 예술, 영적 활동에 집중하면 깊은 통찰을 얻습니다.'),
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
