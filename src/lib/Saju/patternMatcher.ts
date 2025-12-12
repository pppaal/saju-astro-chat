// src/lib/Saju/patternMatcher.ts
// 사주 패턴 매칭 엔진 (500% 급 모듈)

import { FiveElement, SajuPillars, SibsinKind, PillarKind } from './types';
import { STEMS, BRANCHES, JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';

// ============================================================
// 헬퍼 함수
// ============================================================

function getStemElement(stem: string): FiveElement {
  const found = STEMS.find(s => s.name === stem);
  return found?.element as FiveElement || '토';
}

function getBranchElement(branch: string): FiveElement {
  const found = BRANCHES.find(b => b.name === branch);
  return found?.element as FiveElement || '토';
}

function getStemYinYang(stem: string): '양' | '음' {
  const found = STEMS.find(s => s.name === stem);
  return found?.yin_yang || '양';
}

// ============================================================
// 타입 정의
// ============================================================

/** 패턴 카테고리 */
export type PatternCategory =
  | 'special_structure'  // 특수 구조 (종격, 화격 등)
  | 'element_balance'    // 오행 균형
  | 'interaction'        // 합충형파해
  | 'sibsin'             // 십성 패턴
  | 'celebrity'          // 유명인 패턴
  | 'fortune'            // 운세 패턴
  | 'compatibility';     // 궁합 패턴

/** 패턴 매치 결과 */
export interface PatternMatch {
  patternId: string;
  patternName: string;
  category: PatternCategory;
  matchScore: number;       // 0-100
  description: string;
  interpretation: string;
  keywords: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
}

/** 패턴 정의 */
export interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  rarity: PatternMatch['rarity'];
  matchFunction: (pillars: SajuPillars) => { matched: boolean; score: number; details?: string };
  interpretation: string;
  keywords: string[];
}

/** 패턴 분석 결과 */
export interface PatternAnalysis {
  pillars: SajuPillars;
  matchedPatterns: PatternMatch[];
  topPattern: PatternMatch | null;
  patternSummary: string;
  uniqueTraits: string[];
  compatiblePatterns: string[];  // 상성이 좋은 패턴 ID
}

/** 유명인 프로필 */
export interface CelebrityProfile {
  name: string;
  birthYear: number;
  pillars: Partial<SajuPillars>;
  occupation: string;
  description: string;
  keyPatterns: string[];
}

// ============================================================
// 패턴 정의
// ============================================================

const PATTERN_DEFINITIONS: PatternDefinition[] = [
  // === 특수 구조 패턴 ===
  {
    id: 'pure_element',
    name: '일행득기격 (一行得氣格)',
    category: 'special_structure',
    description: '한 오행이 압도적으로 강한 구조',
    rarity: 'rare',
    matchFunction: (pillars) => {
      const counts = countElements(pillars);
      const max = Math.max(...Object.values(counts));
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const ratio = max / total;
      return { matched: ratio >= 0.6, score: Math.round(ratio * 100), details: `최대 오행 비율: ${(ratio * 100).toFixed(1)}%` };
    },
    interpretation: '한 방향으로 집중된 에너지를 가져 해당 분야에서 특출한 능력을 발휘합니다.',
    keywords: ['집중', '전문성', '특화'],
  },
  {
    id: 'balanced_elements',
    name: '중화격 (中和格)',
    category: 'element_balance',
    description: '오행이 골고루 분포된 균형 구조',
    rarity: 'uncommon',
    matchFunction: (pillars) => {
      const counts = countElements(pillars);
      const values = Object.values(counts);
      const avg = values.reduce((a, b) => a + b, 0) / 5;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 5;
      const balanced = variance < 2;
      return { matched: balanced, score: Math.round(100 - variance * 20), details: `분산: ${variance.toFixed(2)}` };
    },
    interpretation: '균형 잡힌 오행으로 다방면에서 안정적으로 활동할 수 있습니다.',
    keywords: ['균형', '안정', '다재다능'],
  },
  {
    id: 'all_stems_different',
    name: '사주독립격',
    category: 'special_structure',
    description: '천간 4개가 모두 다른 구조',
    rarity: 'common',
    matchFunction: (pillars) => {
      const stems = [
        pillars.year.heavenlyStem.name,
        pillars.month.heavenlyStem.name,
        pillars.day.heavenlyStem.name,
        pillars.time.heavenlyStem.name,
      ];
      const unique = new Set(stems).size;
      return { matched: unique === 4, score: unique * 25, details: `고유 천간 수: ${unique}` };
    },
    interpretation: '독립적이고 개성적인 성격으로, 자기만의 길을 개척합니다.',
    keywords: ['독립', '개성', '창의'],
  },
  // === 합 패턴 ===
  {
    id: 'double_yukhap',
    name: '쌍육합격',
    category: 'interaction',
    description: '지지에 육합이 2개 이상 있는 구조',
    rarity: 'rare',
    matchFunction: (pillars) => {
      const branches = [
        pillars.year.earthlyBranch.name,
        pillars.month.earthlyBranch.name,
        pillars.day.earthlyBranch.name,
        pillars.time.earthlyBranch.name,
      ];
      const YUKHAP_MAP: Record<string, string> = {
        '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
        '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
        '巳': '申', '申': '巳', '午': '未', '未': '午',
      };
      let hapCount = 0;
      for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
          if (YUKHAP_MAP[branches[i]] === branches[j]) hapCount++;
        }
      }
      return { matched: hapCount >= 2, score: hapCount * 40, details: `육합 수: ${hapCount}` };
    },
    interpretation: '인복이 많고 대인관계가 원만합니다. 협력을 통해 성공합니다.',
    keywords: ['인복', '화합', '협력'],
  },
  {
    id: 'samhap_formation',
    name: '삼합격',
    category: 'interaction',
    description: '삼합이 완성된 구조',
    rarity: 'uncommon',
    matchFunction: (pillars) => {
      const branches = [
        pillars.year.earthlyBranch.name,
        pillars.month.earthlyBranch.name,
        pillars.day.earthlyBranch.name,
        pillars.time.earthlyBranch.name,
      ];
      const SAMHAP_GROUPS = [
        ['寅', '午', '戌'],
        ['巳', '酉', '丑'],
        ['申', '子', '辰'],
        ['亥', '卯', '未'],
      ];
      for (const group of SAMHAP_GROUPS) {
        const matches = group.filter(b => branches.includes(b)).length;
        if (matches === 3) {
          return { matched: true, score: 90, details: `${group.join('')} 삼합 완성` };
        }
      }
      return { matched: false, score: 0 };
    },
    interpretation: '강력한 합의 에너지로 큰 일을 이룰 수 있는 잠재력이 있습니다.',
    keywords: ['대성', '잠재력', '통합'],
  },
  // === 충 패턴 ===
  {
    id: 'double_chung',
    name: '쌍충격',
    category: 'interaction',
    description: '충이 2개 이상 있는 구조',
    rarity: 'uncommon',
    matchFunction: (pillars) => {
      const branches = [
        pillars.year.earthlyBranch.name,
        pillars.month.earthlyBranch.name,
        pillars.day.earthlyBranch.name,
        pillars.time.earthlyBranch.name,
      ];
      const CHUNG_MAP: Record<string, string> = {
        '子': '午', '午': '子', '丑': '未', '未': '丑',
        '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
        '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
      };
      let chungCount = 0;
      for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
          if (CHUNG_MAP[branches[i]] === branches[j]) chungCount++;
        }
      }
      return { matched: chungCount >= 2, score: chungCount * 35, details: `충 수: ${chungCount}` };
    },
    interpretation: '변화가 많은 인생으로 역동적인 삶을 살게 됩니다. 적응력이 필요합니다.',
    keywords: ['변화', '역동', '적응'],
  },
  // === 십성 패턴 ===
  {
    id: 'gwansal_heavy',
    name: '관살혼잡격',
    category: 'sibsin',
    description: '편관과 정관이 함께 있는 구조',
    rarity: 'uncommon',
    matchFunction: (pillars) => {
      const sibsinList = getAllSibsin(pillars);
      const hasGwan = sibsinList.includes('정관');
      const hasSal = sibsinList.includes('편관');
      return { matched: hasGwan && hasSal, score: 70, details: '정관과 편관 동시 존재' };
    },
    interpretation: '권력과 책임이 따르지만 복잡한 상황에 처할 수 있습니다.',
    keywords: ['권력', '책임', '복잡'],
  },
  {
    id: 'siksang_prominent',
    name: '식상격',
    category: 'sibsin',
    description: '식신이나 상관이 강한 구조',
    rarity: 'common',
    matchFunction: (pillars) => {
      const sibsinList = getAllSibsin(pillars);
      const count = sibsinList.filter(s => s === '식신' || s === '상관').length;
      return { matched: count >= 2, score: count * 30, details: `식상 수: ${count}` };
    },
    interpretation: '표현력이 뛰어나고 창의적입니다. 예술이나 기획 분야에 적합합니다.',
    keywords: ['창의', '표현', '예술'],
  },
  {
    id: 'insung_strong',
    name: '인수격',
    category: 'sibsin',
    description: '인성이 강한 구조',
    rarity: 'common',
    matchFunction: (pillars) => {
      const sibsinList = getAllSibsin(pillars);
      const count = sibsinList.filter(s => s === '정인' || s === '편인').length;
      return { matched: count >= 2, score: count * 30, details: `인성 수: ${count}` };
    },
    interpretation: '학문과 지식을 좋아하며 선생님, 연구자 등에 적합합니다.',
    keywords: ['학문', '지혜', '교육'],
  },
  {
    id: 'jaesung_strong',
    name: '재성격',
    category: 'sibsin',
    description: '재성이 강한 구조',
    rarity: 'common',
    matchFunction: (pillars) => {
      const sibsinList = getAllSibsin(pillars);
      const count = sibsinList.filter(s => s === '정재' || s === '편재').length;
      return { matched: count >= 2, score: count * 30, details: `재성 수: ${count}` };
    },
    interpretation: '재물 복이 있고 사업 수완이 좋습니다.',
    keywords: ['재물', '사업', '실용'],
  },
  // === 특수 조합 ===
  {
    id: 'day_time_harmony',
    name: '일시합격',
    category: 'special_structure',
    description: '일주와 시주가 천간합 또는 지지합을 이루는 구조',
    rarity: 'uncommon',
    matchFunction: (pillars) => {
      const dayStem = pillars.day.heavenlyStem.name;
      const timeStem = pillars.time.heavenlyStem.name;
      const dayBranch = pillars.day.earthlyBranch.name;
      const timeBranch = pillars.time.earthlyBranch.name;

      const STEM_HAP: Record<string, string> = {
        '甲': '己', '己': '甲', '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊',
      };
      const YUKHAP_MAP: Record<string, string> = {
        '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
        '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
        '巳': '申', '申': '巳', '午': '未', '未': '午',
      };

      const stemHap = STEM_HAP[dayStem] === timeStem;
      const branchHap = YUKHAP_MAP[dayBranch] === timeBranch;

      if (stemHap && branchHap) {
        return { matched: true, score: 95, details: '천간합 + 지지합' };
      } else if (stemHap || branchHap) {
        return { matched: true, score: 70, details: stemHap ? '천간합' : '지지합' };
      }
      return { matched: false, score: 0 };
    },
    interpretation: '말년이 평안하고 자녀복이 있습니다. 내면의 조화가 좋습니다.',
    keywords: ['말년복', '자녀', '조화'],
  },
  {
    id: 'yang_dominant',
    name: '순양격',
    category: 'element_balance',
    description: '양의 기운이 압도적인 구조',
    rarity: 'rare',
    matchFunction: (pillars) => {
      const stems = [
        pillars.year.heavenlyStem.name,
        pillars.month.heavenlyStem.name,
        pillars.day.heavenlyStem.name,
        pillars.time.heavenlyStem.name,
      ];
      const yangCount = stems.filter(s => getStemYinYang(s) === '양').length;
      return { matched: yangCount >= 4, score: yangCount * 25, details: `양 천간 수: ${yangCount}` };
    },
    interpretation: '활동적이고 진취적입니다. 리더십이 강하고 추진력이 있습니다.',
    keywords: ['활동', '리더십', '추진력'],
  },
  {
    id: 'yin_dominant',
    name: '순음격',
    category: 'element_balance',
    description: '음의 기운이 압도적인 구조',
    rarity: 'rare',
    matchFunction: (pillars) => {
      const stems = [
        pillars.year.heavenlyStem.name,
        pillars.month.heavenlyStem.name,
        pillars.day.heavenlyStem.name,
        pillars.time.heavenlyStem.name,
      ];
      const yinCount = stems.filter(s => getStemYinYang(s) === '음').length;
      return { matched: yinCount >= 4, score: yinCount * 25, details: `음 천간 수: ${yinCount}` };
    },
    interpretation: '섬세하고 신중합니다. 내면의 힘이 강하고 지혜롭습니다.',
    keywords: ['섬세', '신중', '지혜'],
  },
];

// ============================================================
// 유틸리티 함수
// ============================================================

function countElements(pillars: SajuPillars): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];

  for (const pillar of allPillars) {
    counts[getStemElement(pillar.heavenlyStem.name)]++;
    counts[getBranchElement(pillar.earthlyBranch.name)]++;
  }

  return counts;
}

function getAllSibsin(pillars: SajuPillars): string[] {
  const result: string[] = [];
  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];

  for (const pillar of allPillars) {
    if (pillar.heavenlyStem.sibsin) {
      result.push(pillar.heavenlyStem.sibsin as string);
    }
    if (pillar.earthlyBranch.sibsin) {
      result.push(pillar.earthlyBranch.sibsin as string);
    }
  }

  return result;
}

// ============================================================
// 패턴 매칭 함수
// ============================================================

/**
 * 모든 패턴 매칭
 */
export function matchAllPatterns(pillars: SajuPillars): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const pattern of PATTERN_DEFINITIONS) {
    const result = pattern.matchFunction(pillars);
    if (result.matched) {
      matches.push({
        patternId: pattern.id,
        patternName: pattern.name,
        category: pattern.category,
        matchScore: result.score,
        description: pattern.description + (result.details ? ` (${result.details})` : ''),
        interpretation: pattern.interpretation,
        keywords: pattern.keywords,
        rarity: pattern.rarity,
      });
    }
  }

  // 점수 순 정렬
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 특정 카테고리 패턴 매칭
 */
export function matchPatternsByCategory(
  pillars: SajuPillars,
  category: PatternCategory
): PatternMatch[] {
  const patterns = PATTERN_DEFINITIONS.filter(p => p.category === category);
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    const result = pattern.matchFunction(pillars);
    if (result.matched) {
      matches.push({
        patternId: pattern.id,
        patternName: pattern.name,
        category: pattern.category,
        matchScore: result.score,
        description: pattern.description + (result.details ? ` (${result.details})` : ''),
        interpretation: pattern.interpretation,
        keywords: pattern.keywords,
        rarity: pattern.rarity,
      });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 종합 패턴 분석
 */
export function analyzePatterns(pillars: SajuPillars): PatternAnalysis {
  const matchedPatterns = matchAllPatterns(pillars);
  const topPattern = matchedPatterns.length > 0 ? matchedPatterns[0] : null;

  // 고유 특성 추출
  const uniqueTraits = matchedPatterns
    .filter(p => p.rarity === 'rare' || p.rarity === 'very_rare' || p.rarity === 'legendary')
    .map(p => p.patternName);

  // 상성 패턴 찾기
  const compatiblePatterns = findCompatiblePatterns(matchedPatterns);

  // 요약 생성
  const patternSummary = generatePatternSummary(matchedPatterns);

  return {
    pillars,
    matchedPatterns,
    topPattern,
    patternSummary,
    uniqueTraits,
    compatiblePatterns,
  };
}

function findCompatiblePatterns(matches: PatternMatch[]): string[] {
  const compatible: string[] = [];

  // 합 패턴이 있으면 협력 관련 패턴과 상성
  if (matches.some(m => m.patternId.includes('hap') || m.patternId.includes('yukhap'))) {
    compatible.push('samhap_formation', 'double_yukhap');
  }

  // 균형 패턴이 있으면 다양한 패턴과 상성
  if (matches.some(m => m.patternId === 'balanced_elements')) {
    compatible.push('siksang_prominent', 'insung_strong', 'jaesung_strong');
  }

  return compatible;
}

function generatePatternSummary(matches: PatternMatch[]): string {
  if (matches.length === 0) {
    return '특별한 패턴이 감지되지 않았습니다. 평범하지만 안정적인 구조입니다.';
  }

  const top3 = matches.slice(0, 3);
  const keywords = Array.from(new Set(top3.flatMap(m => m.keywords))).slice(0, 5);

  return `주요 패턴: ${top3.map(m => m.patternName).join(', ')}. ` +
    `핵심 키워드: ${keywords.join(', ')}. ` +
    `총 ${matches.length}개의 패턴이 감지되었습니다.`;
}

/**
 * 두 사주 간 패턴 비교
 */
export function comparePatterns(
  pillars1: SajuPillars,
  pillars2: SajuPillars
): {
  commonPatterns: string[];
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  compatibilityBonus: number;
} {
  const patterns1 = matchAllPatterns(pillars1).map(p => p.patternId);
  const patterns2 = matchAllPatterns(pillars2).map(p => p.patternId);

  const commonPatterns = patterns1.filter(p => patterns2.includes(p));
  const uniqueToFirst = patterns1.filter(p => !patterns2.includes(p));
  const uniqueToSecond = patterns2.filter(p => !patterns1.includes(p));

  // 공통 패턴이 많을수록 보너스
  const compatibilityBonus = commonPatterns.length * 10;

  return { commonPatterns, uniqueToFirst, uniqueToSecond, compatibilityBonus };
}

/**
 * 패턴 기반 추천
 */
export function getPatternRecommendations(
  patterns: PatternMatch[]
): {
  careers: string[];
  activities: string[];
  cautions: string[];
} {
  const careers: string[] = [];
  const activities: string[] = [];
  const cautions: string[] = [];

  for (const pattern of patterns) {
    if (pattern.keywords.includes('창의') || pattern.keywords.includes('표현')) {
      careers.push('예술가', '작가', '디자이너');
      activities.push('창작 활동', '글쓰기');
    }
    if (pattern.keywords.includes('리더십') || pattern.keywords.includes('권력')) {
      careers.push('경영자', '정치인', '리더');
      activities.push('팀 활동', '조직 관리');
    }
    if (pattern.keywords.includes('학문') || pattern.keywords.includes('지혜')) {
      careers.push('연구원', '교수', '컨설턴트');
      activities.push('독서', '학습');
    }
    if (pattern.keywords.includes('재물') || pattern.keywords.includes('사업')) {
      careers.push('사업가', '투자자', '금융인');
      activities.push('재테크', '네트워킹');
    }
    if (pattern.keywords.includes('변화') || pattern.keywords.includes('역동')) {
      cautions.push('급격한 변화 주의', '안정적인 기반 마련');
    }
  }

  return {
    careers: Array.from(new Set(careers)),
    activities: Array.from(new Set(activities)),
    cautions: Array.from(new Set(cautions)),
  };
}

/**
 * 사용자 정의 패턴 생성
 */
export function createCustomPattern(
  definition: Omit<PatternDefinition, 'matchFunction'> & {
    conditions: {
      type: 'stem' | 'branch' | 'element' | 'sibsin';
      target: string;
      count?: number;
      operator?: '>=' | '>' | '=' | '<' | '<=';
    }[];
  }
): PatternDefinition {
  const matchFunction = (pillars: SajuPillars) => {
    let matched = true;
    let score = 0;

    for (const condition of definition.conditions) {
      if (condition.type === 'element') {
        const counts = countElements(pillars);
        const count = counts[condition.target as FiveElement] || 0;
        const target = condition.count || 1;
        const op = condition.operator || '>=';

        const result = evalOperator(count, target, op);
        if (!result) matched = false;
        else score += 25;
      }
      // 다른 조건 타입도 구현 가능
    }

    return { matched, score };
  };

  return {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    rarity: definition.rarity,
    matchFunction,
    interpretation: definition.interpretation,
    keywords: definition.keywords,
  };
}

function evalOperator(value: number, target: number, op: string): boolean {
  switch (op) {
    case '>=': return value >= target;
    case '>': return value > target;
    case '=': return value === target;
    case '<': return value < target;
    case '<=': return value <= target;
    default: return false;
  }
}

/**
 * 패턴 검색
 */
export function searchPatterns(query: string): PatternDefinition[] {
  const lowerQuery = query.toLowerCase();
  return PATTERN_DEFINITIONS.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 희귀도별 패턴 필터
 */
export function getPatternsByRarity(rarity: PatternMatch['rarity']): PatternDefinition[] {
  return PATTERN_DEFINITIONS.filter(p => p.rarity === rarity);
}

/**
 * 패턴 통계
 */
export function getPatternStatistics(patterns: PatternMatch[]): {
  totalCount: number;
  byCategory: Record<PatternCategory, number>;
  byRarity: Record<string, number>;
  averageScore: number;
} {
  const byCategory: Record<PatternCategory, number> = {
    special_structure: 0,
    element_balance: 0,
    interaction: 0,
    sibsin: 0,
    celebrity: 0,
    fortune: 0,
    compatibility: 0,
  };

  const byRarity: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    very_rare: 0,
    legendary: 0,
  };

  for (const pattern of patterns) {
    byCategory[pattern.category]++;
    byRarity[pattern.rarity]++;
  }

  const averageScore = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.matchScore, 0) / patterns.length
    : 0;

  return {
    totalCount: patterns.length,
    byCategory,
    byRarity,
    averageScore,
  };
}
