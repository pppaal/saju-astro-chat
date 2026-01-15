// src/lib/Saju/compatibilityEngine.ts
// 궁합 심층 분석 엔진 (500% 급 모듈)

import { FiveElement, SajuPillars, PillarData, SibsinKind, PillarKind } from './types';
import { JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';
import { getStemElement, getBranchElement, getStemYinYang, getBranchYinYang } from './stemBranchUtils';

// ============================================================
// 타입 정의
// ============================================================

/** 궁합 대상 정보 */
export interface CompatibilitySubject {
  id: string;
  name?: string;
  pillars: SajuPillars;
  gender?: 'male' | 'female';
  birthYear?: number;
}

/** 오행 궁합 분석 */
export interface ElementCompatibility {
  score: number;                    // 0-100
  harmony: FiveElement[];           // 조화로운 오행
  conflict: FiveElement[];          // 충돌하는 오행
  missing: FiveElement[];           // 부족한 오행
  complementary: FiveElement[];     // 서로 보완하는 오행
  analysis: string;
}

/** 천간 궁합 */
export interface StemCompatibility {
  score: number;
  hapPairs: Array<{ stem1: string; stem2: string; result: string }>;  // 합
  chungPairs: Array<{ stem1: string; stem2: string }>;                // 충
  analysis: string;
}

/** 지지 궁합 */
export interface BranchCompatibility {
  score: number;
  yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }>;  // 육합
  samhapGroups: Array<{ branches: string[]; result: FiveElement }>;               // 삼합
  chungPairs: Array<{ branch1: string; branch2: string }>;                        // 충
  hyeongPairs: Array<{ branch1: string; branch2: string; type: string }>;         // 형
  haePairs: Array<{ branch1: string; branch2: string }>;                          // 해
  analysis: string;
}

/** 일간 관계 분석 */
export interface DayMasterRelation {
  person1DayMaster: string;
  person2DayMaster: string;
  relation: string;           // 비화, 생조, 극입 등
  sibsin: SibsinKind;         // 상대방이 나에게 어떤 십성인지
  reverseSibsin: SibsinKind;  // 내가 상대방에게 어떤 십성인지
  dynamics: string;           // 관계 역학 설명
  score: number;
}

/** 궁합 카테고리 */
export type CompatibilityCategory =
  | 'love'       // 연애/결혼
  | 'business'   // 사업/동업
  | 'friendship' // 우정
  | 'family'     // 가족
  | 'work';      // 직장 동료

/** 카테고리별 궁합 결과 */
export interface CategoryCompatibility {
  category: CompatibilityCategory;
  score: number;
  strengths: string[];
  challenges: string[];
  advice: string;
}

/** 시간대별 궁합 변화 */
export interface TemporalCompatibility {
  period: string;           // 대운/세운 기간
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  keyEvents: string[];
  advice: string;
}

/** 종합 궁합 결과 */
export interface ComprehensiveCompatibility {
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  elementCompatibility: ElementCompatibility;
  stemCompatibility: StemCompatibility;
  branchCompatibility: BranchCompatibility;
  dayMasterRelation: DayMasterRelation;
  categoryScores: CategoryCompatibility[];
  temporalAnalysis?: TemporalCompatibility[];
  summary: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

/** 다자간 궁합 (3인 이상) */
export interface MultiPersonCompatibility {
  participants: CompatibilitySubject[];
  pairwiseScores: Array<{ person1: string; person2: string; score: number }>;
  groupHarmony: number;
  groupDynamics: string;
  bestPairs: string[];
  challengingPairs: string[];
  recommendations: string[];
}

// ============================================================
// 상수
// ============================================================

/** 천간합 */
const STEM_HAP: Record<string, { partner: string; result: FiveElement }> = {
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
const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲',
  '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙',
  '丁': '癸', '癸': '丁',
};

/** 지지육합 */
const BRANCH_YUKHAP: Record<string, { partner: string; result: FiveElement }> = {
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
const BRANCH_SAMHAP: Array<{ branches: string[]; result: FiveElement }> = [
  { branches: ['寅', '午', '戌'], result: '화' },
  { branches: ['巳', '酉', '丑'], result: '금' },
  { branches: ['申', '子', '辰'], result: '수' },
  { branches: ['亥', '卯', '未'], result: '목' },
];

/** 지지충 */
const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

/** 지지형 */
const BRANCH_HYEONG: Array<{ branches: string[]; type: string }> = [
  { branches: ['寅', '巳', '申'], type: '무은지형' },
  { branches: ['丑', '戌', '未'], type: '지세지형' },
  { branches: ['子', '卯'], type: '무례지형' },
  { branches: ['辰', '辰'], type: '자형' },
  { branches: ['午', '午'], type: '자형' },
  { branches: ['酉', '酉'], type: '자형' },
  { branches: ['亥', '亥'], type: '자형' },
];

/** 지지해 */
const BRANCH_HAE: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
};

// ============================================================
// 핵심 분석 함수
// ============================================================

/**
 * 오행 궁합 분석
 */
export function analyzeElementCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): ElementCompatibility {
  const elements1 = countElements(person1);
  const elements2 = countElements(person2);

  const harmony: FiveElement[] = [];
  const conflict: FiveElement[] = [];
  const missing: FiveElement[] = [];
  const complementary: FiveElement[] = [];

  const allElements: FiveElement[] = ['목', '화', '토', '금', '수'];

  for (const element of allElements) {
    const count1 = elements1[element];
    const count2 = elements2[element];

    // 둘 다 강한 오행 = 조화
    if (count1 >= 2 && count2 >= 2) {
      harmony.push(element);
    }

    // 한쪽은 많고 한쪽은 부족 = 보완
    if ((count1 >= 2 && count2 <= 1) || (count1 <= 1 && count2 >= 2)) {
      complementary.push(element);
    }

    // 둘 다 부족 = 부족
    if (count1 === 0 && count2 === 0) {
      missing.push(element);
    }

    // 상극 관계 확인
    const geukElement = FIVE_ELEMENT_RELATIONS['극하는관계'][element];
    if (count1 >= 2 && elements2[geukElement] >= 2) {
      conflict.push(element);
    }
  }

  // 점수 계산
  let score = 50;
  score += harmony.length * 10;
  score += complementary.length * 8;
  score -= conflict.length * 10;
  score -= missing.length * 5;
  score = Math.max(0, Math.min(100, score));

  const analysis = generateElementAnalysis(harmony, conflict, complementary, missing);

  return { score, harmony, conflict, missing, complementary, analysis };
}

function countElements(pillars: SajuPillars): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];

  for (const pillar of allPillars) {
    const stemElement = getStemElement(pillar.heavenlyStem.name);
    const branchElement = getBranchElement(pillar.earthlyBranch.name);
    counts[stemElement]++;
    counts[branchElement]++;
  }

  return counts;
}

function generateElementAnalysis(
  harmony: FiveElement[],
  conflict: FiveElement[],
  complementary: FiveElement[],
  missing: FiveElement[]
): string {
  const parts: string[] = [];

  if (harmony.length > 0) {
    parts.push(`${harmony.join(', ')} 오행에서 강한 조화를 이룹니다`);
  }
  if (complementary.length > 0) {
    parts.push(`${complementary.join(', ')} 오행에서 서로 보완합니다`);
  }
  if (conflict.length > 0) {
    parts.push(`${conflict.join(', ')} 오행에서 충돌 가능성이 있습니다`);
  }
  if (missing.length > 0) {
    parts.push(`${missing.join(', ')} 오행이 둘 다 부족하여 함께 보강이 필요합니다`);
  }

  return parts.join('. ') + '.';
}

/**
 * 천간 궁합 분석
 */
export function analyzeStemCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): StemCompatibility {
  const stems1 = [
    person1.year.heavenlyStem.name,
    person1.month.heavenlyStem.name,
    person1.day.heavenlyStem.name,
    person1.time.heavenlyStem.name,
  ];
  const stems2 = [
    person2.year.heavenlyStem.name,
    person2.month.heavenlyStem.name,
    person2.day.heavenlyStem.name,
    person2.time.heavenlyStem.name,
  ];

  const hapPairs: Array<{ stem1: string; stem2: string; result: string }> = [];
  const chungPairs: Array<{ stem1: string; stem2: string }> = [];

  for (const s1 of stems1) {
    for (const s2 of stems2) {
      // 합 체크
      const hapInfo = STEM_HAP[s1];
      if (hapInfo && hapInfo.partner === s2) {
        hapPairs.push({ stem1: s1, stem2: s2, result: `${hapInfo.result}으로 합화` });
      }

      // 충 체크
      if (STEM_CHUNG[s1] === s2) {
        chungPairs.push({ stem1: s1, stem2: s2 });
      }
    }
  }

  // 점수 계산
  let score = 50;
  score += hapPairs.length * 15;
  score -= chungPairs.length * 12;
  score = Math.max(0, Math.min(100, score));

  let analysis = '';
  if (hapPairs.length > 0) {
    analysis += `천간에서 ${hapPairs.length}개의 합이 형성되어 좋은 인연입니다. `;
  }
  if (chungPairs.length > 0) {
    analysis += `천간에서 ${chungPairs.length}개의 충이 있어 의견 충돌에 주의가 필요합니다.`;
  }
  if (hapPairs.length === 0 && chungPairs.length === 0) {
    analysis = '천간에서 특별한 합충 관계가 없어 평온한 관계입니다.';
  }

  return { score, hapPairs, chungPairs, analysis };
}

/**
 * 지지 궁합 분석
 */
export function analyzeBranchCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): BranchCompatibility {
  const branches1 = [
    person1.year.earthlyBranch.name,
    person1.month.earthlyBranch.name,
    person1.day.earthlyBranch.name,
    person1.time.earthlyBranch.name,
  ];
  const branches2 = [
    person2.year.earthlyBranch.name,
    person2.month.earthlyBranch.name,
    person2.day.earthlyBranch.name,
    person2.time.earthlyBranch.name,
  ];

  const allBranches = [...branches1, ...branches2];
  const yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }> = [];
  const samhapGroups: Array<{ branches: string[]; result: FiveElement }> = [];
  const chungPairs: Array<{ branch1: string; branch2: string }> = [];
  const hyeongPairs: Array<{ branch1: string; branch2: string; type: string }> = [];
  const haePairs: Array<{ branch1: string; branch2: string }> = [];

  // 육합 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      const yukhap = BRANCH_YUKHAP[b1];
      if (yukhap && yukhap.partner === b2) {
        yukhapPairs.push({ branch1: b1, branch2: b2, result: yukhap.result });
      }
    }
  }

  // 삼합 체크
  for (const samhap of BRANCH_SAMHAP) {
    const matchCount = samhap.branches.filter(b => allBranches.includes(b)).length;
    if (matchCount >= 2) {
      const matched = samhap.branches.filter(b => allBranches.includes(b));
      // 두 사람에게서 각각 하나씩 있어야 함
      const in1 = matched.filter(b => branches1.includes(b)).length;
      const in2 = matched.filter(b => branches2.includes(b)).length;
      if (in1 >= 1 && in2 >= 1) {
        samhapGroups.push({ branches: matched, result: samhap.result });
      }
    }
  }

  // 충 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (BRANCH_CHUNG[b1] === b2) {
        chungPairs.push({ branch1: b1, branch2: b2 });
      }
    }
  }

  // 형 체크
  for (const hyeong of BRANCH_HYEONG) {
    for (const b1 of branches1) {
      for (const b2 of branches2) {
        if (hyeong.branches.includes(b1) && hyeong.branches.includes(b2) && b1 !== b2) {
          hyeongPairs.push({ branch1: b1, branch2: b2, type: hyeong.type });
        }
      }
    }
  }

  // 해 체크
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (BRANCH_HAE[b1] === b2) {
        haePairs.push({ branch1: b1, branch2: b2 });
      }
    }
  }

  // 점수 계산
  let score = 50;
  score += yukhapPairs.length * 12;
  score += samhapGroups.length * 15;
  score -= chungPairs.length * 10;
  score -= hyeongPairs.length * 8;
  score -= haePairs.length * 5;
  score = Math.max(0, Math.min(100, score));

  const analysis = generateBranchAnalysis(yukhapPairs, samhapGroups, chungPairs, hyeongPairs, haePairs);

  return { score, yukhapPairs, samhapGroups, chungPairs, hyeongPairs, haePairs, analysis };
}

function generateBranchAnalysis(
  yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }>,
  samhapGroups: Array<{ branches: string[]; result: FiveElement }>,
  chungPairs: Array<{ branch1: string; branch2: string }>,
  hyeongPairs: Array<{ branch1: string; branch2: string; type: string }>,
  haePairs: Array<{ branch1: string; branch2: string }>
): string {
  const parts: string[] = [];

  if (yukhapPairs.length > 0) {
    parts.push(`지지 육합(${yukhapPairs.map(p => `${p.branch1}-${p.branch2}`).join(', ')})으로 깊은 정이 형성됩니다`);
  }
  if (samhapGroups.length > 0) {
    parts.push(`삼합이 형성되어 함께 할 때 큰 힘을 발휘합니다`);
  }
  if (chungPairs.length > 0) {
    parts.push(`지지 충(${chungPairs.map(p => `${p.branch1}-${p.branch2}`).join(', ')})이 있어 변동이나 갈등에 주의가 필요합니다`);
  }
  if (hyeongPairs.length > 0) {
    parts.push(`지지 형이 있어 서로 자극이 될 수 있습니다`);
  }
  if (haePairs.length > 0) {
    parts.push(`지지 해가 있어 은근한 불화에 주의하세요`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : '지지에서 특별한 합충 관계가 없어 무난한 관계입니다.';
}

/**
 * 일간 관계 분석
 */
export function analyzeDayMasterRelation(
  person1: SajuPillars,
  person2: SajuPillars
): DayMasterRelation {
  const dm1 = person1.day.heavenlyStem.name;
  const dm2 = person2.day.heavenlyStem.name;
  const element1 = getStemElement(dm1);
  const element2 = getStemElement(dm2);
  const yinYang1 = getStemYinYang(dm1);
  const yinYang2 = getStemYinYang(dm2);

  // 관계 판단
  let relation: string;
  let sibsin: SibsinKind;
  let reverseSibsin: SibsinKind;

  if (element1 === element2) {
    relation = '비화';
    sibsin = yinYang1 === yinYang2 ? '비견' : '겁재';
    reverseSibsin = sibsin;
  } else if (FIVE_ELEMENT_RELATIONS['생하는관계'][element1] === element2) {
    relation = '설기';
    sibsin = yinYang1 === yinYang2 ? '식신' : '상관';
    reverseSibsin = yinYang1 === yinYang2 ? '편인' : '정인';
  } else if (FIVE_ELEMENT_RELATIONS['생받는관계'][element1] === element2) {
    relation = '생조';
    sibsin = yinYang1 === yinYang2 ? '편인' : '정인';
    reverseSibsin = yinYang1 === yinYang2 ? '식신' : '상관';
  } else if (FIVE_ELEMENT_RELATIONS['극하는관계'][element1] === element2) {
    relation = '극출';
    sibsin = yinYang1 === yinYang2 ? '편재' : '정재';
    reverseSibsin = yinYang1 === yinYang2 ? '편관' : '정관';
  } else {
    relation = '극입';
    sibsin = yinYang1 === yinYang2 ? '편관' : '정관';
    reverseSibsin = yinYang1 === yinYang2 ? '편재' : '정재';
  }

  // 역학 설명
  const dynamics = generateDynamicsDescription(relation, sibsin, reverseSibsin);

  // 점수
  const scoreMap: Record<string, number> = {
    '비화': 70,
    '생조': 85,
    '설기': 65,
    '극출': 55,
    '극입': 45,
  };

  return {
    person1DayMaster: dm1,
    person2DayMaster: dm2,
    relation,
    sibsin,
    reverseSibsin,
    dynamics,
    score: scoreMap[relation] || 50,
  };
}

function generateDynamicsDescription(
  relation: string,
  sibsin: SibsinKind,
  reverseSibsin: SibsinKind
): string {
  const descriptions: Record<string, string> = {
    '비화': '서로 동등한 위치에서 경쟁하거나 협력하는 관계입니다. 비슷한 성향으로 이해가 쉽지만 충돌도 있을 수 있습니다.',
    '생조': '상대방이 나를 도와주는 관계입니다. 정서적 지지와 도움을 받을 수 있습니다.',
    '설기': '내가 상대방에게 에너지를 주는 관계입니다. 베푸는 입장이 될 수 있습니다.',
    '극출': '내가 상대방을 컨트롤하는 관계입니다. 주도권을 갖지만 부담도 있습니다.',
    '극입': '상대방이 나를 압도하는 관계입니다. 자극이 되지만 스트레스도 받을 수 있습니다.',
  };

  return descriptions[relation] || '평범한 관계입니다.';
}

/**
 * 카테고리별 궁합 분석
 */
export function analyzeByCategory(
  person1: SajuPillars,
  person2: SajuPillars,
  category: CompatibilityCategory
): CategoryCompatibility {
  const element = analyzeElementCompatibility(person1, person2);
  const stem = analyzeStemCompatibility(person1, person2);
  const branch = analyzeBranchCompatibility(person1, person2);
  const dayMaster = analyzeDayMasterRelation(person1, person2);

  // 카테고리별 가중치
  const weights: Record<CompatibilityCategory, { element: number; stem: number; branch: number; dayMaster: number }> = {
    love: { element: 0.2, stem: 0.2, branch: 0.3, dayMaster: 0.3 },
    business: { element: 0.3, stem: 0.25, branch: 0.25, dayMaster: 0.2 },
    friendship: { element: 0.25, stem: 0.2, branch: 0.3, dayMaster: 0.25 },
    family: { element: 0.2, stem: 0.2, branch: 0.35, dayMaster: 0.25 },
    work: { element: 0.3, stem: 0.25, branch: 0.2, dayMaster: 0.25 },
  };

  const w = weights[category];
  const score = Math.round(
    element.score * w.element +
    stem.score * w.stem +
    branch.score * w.branch +
    dayMaster.score * w.dayMaster
  );

  const { strengths, challenges, advice } = generateCategoryInsights(category, element, stem, branch, dayMaster);

  return { category, score, strengths, challenges, advice };
}

function generateCategoryInsights(
  category: CompatibilityCategory,
  element: ElementCompatibility,
  stem: StemCompatibility,
  branch: BranchCompatibility,
  dayMaster: DayMasterRelation
): { strengths: string[]; challenges: string[]; advice: string } {
  const strengths: string[] = [];
  const challenges: string[] = [];

  if (element.harmony.length > 0) {
    strengths.push(`${element.harmony.join(', ')} 오행의 조화`);
  }
  if (stem.hapPairs.length > 0) {
    strengths.push('천간합으로 인한 끌림');
  }
  if (branch.yukhapPairs.length > 0 || branch.samhapGroups.length > 0) {
    strengths.push('지지 합으로 인한 깊은 인연');
  }
  if (dayMaster.relation === '생조') {
    strengths.push('일간이 서로 도움을 주는 관계');
  }

  if (element.conflict.length > 0) {
    challenges.push(`${element.conflict.join(', ')} 오행 충돌 가능성`);
  }
  if (stem.chungPairs.length > 0) {
    challenges.push('천간충으로 인한 의견 대립');
  }
  if (branch.chungPairs.length > 0) {
    challenges.push('지지충으로 인한 갈등 가능성');
  }
  if (dayMaster.relation === '극입') {
    challenges.push('일간 관계에서 압박감');
  }

  const categoryAdvice: Record<CompatibilityCategory, string> = {
    love: '서로의 다름을 인정하고 소통을 많이 하세요.',
    business: '역할 분담을 명확히 하고 각자의 강점을 살리세요.',
    friendship: '적당한 거리감을 유지하면서 깊은 우정을 나누세요.',
    family: '세대 차이를 이해하고 존중하는 마음을 가지세요.',
    work: '업무적 관계를 우선하고 감정적 충돌을 피하세요.',
  };

  return { strengths, challenges, advice: categoryAdvice[category] };
}

/**
 * 종합 궁합 분석
 */
export function analyzeComprehensiveCompatibility(
  person1: CompatibilitySubject,
  person2: CompatibilitySubject,
  options?: {
    categories?: CompatibilityCategory[];
    includeTemporalAnalysis?: boolean;
  }
): ComprehensiveCompatibility {
  const elementCompatibility = analyzeElementCompatibility(person1.pillars, person2.pillars);
  const stemCompatibility = analyzeStemCompatibility(person1.pillars, person2.pillars);
  const branchCompatibility = analyzeBranchCompatibility(person1.pillars, person2.pillars);
  const dayMasterRelation = analyzeDayMasterRelation(person1.pillars, person2.pillars);

  // 카테고리별 점수
  const categories = options?.categories || ['love', 'business', 'friendship'] as CompatibilityCategory[];
  const categoryScores = categories.map(cat => analyzeByCategory(person1.pillars, person2.pillars, cat));

  // 종합 점수
  const overallScore = Math.round(
    elementCompatibility.score * 0.25 +
    stemCompatibility.score * 0.2 +
    branchCompatibility.score * 0.3 +
    dayMasterRelation.score * 0.25
  );

  // 등급
  let grade: ComprehensiveCompatibility['grade'];
  if (overallScore >= 85) grade = 'S';
  else if (overallScore >= 75) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 55) grade = 'C';
  else if (overallScore >= 45) grade = 'D';
  else grade = 'F';

  // 강점/약점 수집
  const strengths: string[] = [];
  const challenges: string[] = [];
  const recommendations: string[] = [];

  for (const cat of categoryScores) {
    strengths.push(...cat.strengths);
    challenges.push(...cat.challenges);
  }

  // 추천 생성
  if (branchCompatibility.yukhapPairs.length > 0) {
    recommendations.push('육합의 인연을 살려 깊은 관계를 맺어보세요.');
  }
  if (branchCompatibility.chungPairs.length > 0) {
    recommendations.push('충 관계가 있으니 갈등 상황에서 한 발 물러서세요.');
  }
  if (elementCompatibility.missing.length > 0) {
    recommendations.push(`함께 ${elementCompatibility.missing.join(', ')} 오행을 보강하는 활동을 해보세요.`);
  }

  const summary = `종합 궁합 ${overallScore}점(${grade}등급). ${dayMasterRelation.dynamics}`;

  return {
    overallScore,
    grade,
    elementCompatibility,
    stemCompatibility,
    branchCompatibility,
    dayMasterRelation,
    categoryScores,
    summary,
    strengths: Array.from(new Set(strengths)),
    challenges: Array.from(new Set(challenges)),
    recommendations,
  };
}

/**
 * 다자간 궁합 분석 (3인 이상)
 */
export function analyzeMultiPersonCompatibility(
  participants: CompatibilitySubject[]
): MultiPersonCompatibility {
  if (participants.length < 2) {
    throw new Error('최소 2명 이상의 참가자가 필요합니다.');
  }

  const pairwiseScores: Array<{ person1: string; person2: string; score: number }> = [];

  // 모든 쌍에 대해 궁합 분석
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const result = analyzeComprehensiveCompatibility(participants[i], participants[j]);
      pairwiseScores.push({
        person1: participants[i].id,
        person2: participants[j].id,
        score: result.overallScore,
      });
    }
  }

  // 그룹 조화도 (평균)
  const groupHarmony = Math.round(
    pairwiseScores.reduce((sum, p) => sum + p.score, 0) / pairwiseScores.length
  );

  // 최고/최저 쌍
  const sortedPairs = [...pairwiseScores].sort((a, b) => b.score - a.score);
  const bestPairs = sortedPairs.slice(0, 2).map(p => `${p.person1}-${p.person2} (${p.score}점)`);
  const challengingPairs = sortedPairs.slice(-2).map(p => `${p.person1}-${p.person2} (${p.score}점)`);

  const groupDynamics = groupHarmony >= 70
    ? '전체적으로 조화로운 그룹입니다. 함께 활동할 때 시너지가 발휘됩니다.'
    : groupHarmony >= 50
    ? '보통 수준의 그룹 조화입니다. 일부 관계에서 조율이 필요합니다.'
    : '그룹 내 갈등 요소가 있습니다. 중재자 역할이 필요합니다.';

  const recommendations = [
    '정기적인 소통으로 오해를 방지하세요.',
    '각자의 강점을 살리는 역할 분담을 하세요.',
  ];

  return {
    participants,
    pairwiseScores,
    groupHarmony,
    groupDynamics,
    bestPairs,
    challengingPairs,
    recommendations,
  };
}
