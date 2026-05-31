/**
 * @file Ultra Precision Engine Constants
 * 초정밀 타이밍 엔진 상수 정의
 */

import type { ShinsalRule } from './ultra-precision-types';
import { STEM_NAMES, BRANCH_NAMES, JIJANGGAN_ORDERED } from '@/lib/saju/constants';

// ============================================================
// 천간/지지 기본 상수
// ============================================================
// 이름 배열은 saju/constants 정본에서 파생 — 천간/지지 글자·순서를 한 곳에서만
// 관리한다 (복사본을 따로 적지 않아 갈라지지 않음). 새 배열로 복사해 소비처의
// 우발적 변형이 정본에 새지 않게 한다.

export const STEMS = [...STEM_NAMES];
export const BRANCHES = [...BRANCH_NAMES];
export const HOUR_BRANCHES = [...BRANCH_NAMES];

// ============================================================
// 지장간 (지지 속에 숨은 천간)
// ============================================================
// 정본 JIJANGGAN 에서 파생한 강도 순서(정기→중기→여기) 배열. 별도 복사본을 두지
// 않아 정본과 갈라지지 않는다. (hiddenStems[0]=본기 가정 — strength 계산부 참조.)

export const HIDDEN_STEMS: Record<string, string[]> = JIJANGGAN_ORDERED;

// ============================================================
// 공망 - 지지별 영향 영역
// ============================================================

export const BRANCH_MEANINGS: Record<string, string[]> = {
  '子': ['재물', '시작'],
  '丑': ['재물', '축적'],
  '寅': ['활동', '사업'],
  '卯': ['문서', '계약'],
  '辰': ['변화', '이동'],
  '巳': ['문서', '학업'],
  '午': ['명예', '승진'],
  '未': ['인간관계', '협력'],
  '申': ['변화', '이동'],
  '酉': ['결실', '수확'],
  '戌': ['저장', '마무리'],
  '亥': ['은밀', '계획'],
};

// ============================================================
// 십신 점수
// ============================================================

export const SIBSIN_SCORES: Record<string, number> = {
  '정관': 15, '정재': 12, '정인': 10, '식신': 8,
  '편관': 5, '편재': 5, '편인': 3, '상관': 0,
  '비견': -3, '겁재': -8,
};

// ============================================================
// 신살 규칙
// ============================================================

export const SHINSAL_RULES: ShinsalRule[] = [
  // 길신
  {
    name: '천을귀인',
    type: 'lucky',
    check: (_day, _target) => {
      // 일간 기준으로 확인해야 하지만, 여기서는 간략화
      return false; // 일간 정보 필요
    },
    score: 20,
    description: '귀인의 도움을 받는 날',
    affectedArea: '전반적 행운',
  },
  {
    name: '역마',
    type: 'special',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '申', '申': '寅', '巳': '亥', '亥': '巳',
        '子': '午', '午': '子', '卯': '酉', '酉': '卯',
        '辰': '戌', '戌': '辰', '丑': '未', '未': '丑',
      };
      return rules[day] === target;
    },
    score: 10,
    description: '이동, 변화, 활동이 활발한 날',
    affectedArea: '이동/변화',
  },
  {
    name: '도화',
    type: 'special',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '卯', '午': '卯', '戌': '卯',
        '申': '酉', '子': '酉', '辰': '酉',
        '巳': '午', '酉': '午', '丑': '午',
        '亥': '子', '卯': '子', '未': '子',
      };
      return rules[day] === target;
    },
    score: 5,
    description: '매력, 인기, 연애운이 높은 날',
    affectedArea: '연애/인기',
  },
  {
    name: '화개',
    type: 'lucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '戌', '午': '戌', '戌': '戌',
        '申': '辰', '子': '辰', '辰': '辰',
        '巳': '丑', '酉': '丑', '丑': '丑',
        '亥': '未', '卯': '未', '未': '未',
      };
      return rules[day] === target;
    },
    score: 12,
    description: '학문, 예술, 영성이 빛나는 날',
    affectedArea: '학문/예술',
  },
  // 흉신
  {
    name: '겁살',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '亥', '午': '亥', '戌': '亥',
        '申': '巳', '子': '巳', '辰': '巳',
        '巳': '寅', '酉': '寅', '丑': '寅',
        '亥': '申', '卯': '申', '未': '申',
      };
      return rules[day] === target;
    },
    score: -15,
    description: '손실, 위험에 주의해야 하는 날',
    affectedArea: '재물/안전',
  },
  {
    name: '재살',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '子', '午': '子', '戌': '子',
        '申': '午', '子': '午', '辰': '午',
        '巳': '卯', '酉': '卯', '丑': '卯',
        '亥': '酉', '卯': '酉', '未': '酉',
      };
      return rules[day] === target;
    },
    score: -12,
    description: '재물 손실, 분쟁에 주의',
    affectedArea: '재물/분쟁',
  },
  {
    name: '백호',
    type: 'unlucky',
    check: (day, target) => {
      const rules: Record<string, string> = {
        '寅': '申', '午': '申', '戌': '申',
        '申': '寅', '子': '寅', '辰': '寅',
        '巳': '亥', '酉': '亥', '丑': '亥',
        '亥': '巳', '卯': '巳', '未': '巳',
      };
      return rules[day] === target;
    },
    score: -18,
    description: '사고, 건강 문제에 각별히 주의',
    affectedArea: '건강/안전',
  },
];

// ============================================================
// 행성 이름 (한/영)
// ============================================================

export const PLANET_NAMES: Record<string, string> = {
  'Sun': '태양',
  'Moon': '달',
  'Mars': '화성',
  'Mercury': '수성',
  'Jupiter': '목성',
  'Venus': '금성',
  'Saturn': '토성',
};

// 요일별 행성
export const DAY_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
