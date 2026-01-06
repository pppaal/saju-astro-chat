/**
 * Advanced Saju Analysis for Compatibility
 * 심화 사주 분석: 십성, 신살, 육합/삼합/충/형/파/해, 용신, 희신 등
 */

import { SajuProfile } from './cosmicCompatibility';
import { FiveElement } from '../Saju/types';

// Normalize FiveElement (internal codes) to the English keys this module uses.
// This avoids type mismatches without changing the underlying logic.
const normalizeElement = (el: FiveElement | string): string => {
  const map: Record<string, string> = {
    '목': 'wood',
    '화': 'fire',
    '토': 'earth',
    '금': 'metal',
    '수': 'water',
  };
  return map[el] ?? (el as string);
};

// ============================================================
// 십성 (Ten Gods) 분석
// ============================================================

export type TenGod =
  | '비견' | '겁재'      // 比劫 (Self)
  | '식신' | '상관'      // 食傷 (Output)
  | '편재' | '정재'      // 財 (Wealth)
  | '편관' | '정관'      // 官 (Authority)
  | '편인' | '정인';     // 印 (Resource)

export interface TenGodAnalysis {
  person1Primary: TenGod[];
  person2Primary: TenGod[];
  interaction: {
    supports: string[];      // 서로 돕는 관계
    conflicts: string[];     // 충돌 관계
    balance: number;         // 0-100
  };
  relationshipDynamics: string;
}

export function analyzeTenGods(p1: SajuProfile, p2: SajuProfile): TenGodAnalysis {
  // 각자의 주요 십성 추출 (실제로는 pillars에서 계산)
  const p1Primary = extractPrimaryTenGods(p1);
  const p2Primary = extractPrimaryTenGods(p2);

  const supports: string[] = [];
  const conflicts: string[] = [];

  // 재성-관성 조화 (재생관)
  if (hasTenGod(p1Primary, ['편재', '정재']) && hasTenGod(p2Primary, ['편관', '정관'])) {
    supports.push('Person1의 재성이 Person2의 관성을 생하여 사회적 성공을 돕습니다');
  }

  // 인성-비겁 조화
  if (hasTenGod(p1Primary, ['편인', '정인']) && hasTenGod(p2Primary, ['비견', '겁재'])) {
    supports.push('Person1이 Person2에게 정신적 지원과 지혜를 제공합니다');
  }

  // 식상-재성 조화 (식상생재)
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    supports.push('Person1의 창의성이 Person2의 물질적 성공으로 이어집니다');
  }

  // 관성-인성 조화 (관인상생)
  if (hasTenGod(p1Primary, ['편관', '정관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    supports.push('권위와 학문이 조화를 이루어 서로 고양시킵니다');
  }

  // 비겁-재성 충돌 (겁재탈재)
  if (hasTenGod(p1Primary, ['비견', '겁재']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    conflicts.push('재물 문제로 경쟁이나 갈등이 발생할 수 있습니다');
  }

  // 식상-인성 충돌 (식신제살)
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    conflicts.push('사고방식의 차이로 의견 충돌이 있을 수 있습니다');
  }

  const balance = calculateTenGodBalance(supports.length, conflicts.length);

  let relationshipDynamics = '';
  if (balance >= 80) {
    relationshipDynamics = '십성의 조화가 완벽하여 서로를 크게 발전시키는 관계';
  } else if (balance >= 60) {
    relationshipDynamics = '십성이 대체로 조화로워 안정적인 관계를 유지';
  } else if (balance >= 40) {
    relationshipDynamics = '십성의 충돌이 있으나 이해와 조율로 극복 가능';
  } else {
    relationshipDynamics = '십성의 불균형이 커서 신중한 접근이 필요';
  }

  return {
    person1Primary: p1Primary,
    person2Primary: p2Primary,
    interaction: { supports, conflicts, balance },
    relationshipDynamics,
  };
}

function extractPrimaryTenGods(profile: SajuProfile): TenGod[] {
  // 실제로는 pillars의 천간지지를 일간과 비교하여 십성 계산
  // 간단히 오행 기반으로 추정
  const primary: TenGod[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  // 예시: 목 일간인 경우
  if (dm === 'wood') {
    if (profile.elements.wood >= 2) primary.push('비견');
    if (profile.elements.fire >= 2) primary.push('식신');
    if (profile.elements.earth >= 2) primary.push('편재');
    if (profile.elements.metal >= 2) primary.push('편관');
    if (profile.elements.water >= 2) primary.push('정인');
  }

  return primary.slice(0, 3); // 상위 3개
}

function hasTenGod(list: TenGod[], targets: TenGod[]): boolean {
  return list.some(tg => targets.includes(tg));
}

function calculateTenGodBalance(supports: number, conflicts: number): number {
  const total = supports + conflicts;
  if (total === 0) return 50;
  return Math.round((supports / total) * 100);
}

// ============================================================
// 신살 (Divine Spirits) 분석
// ============================================================

export interface ShinsalAnalysis {
  person1Shinsals: string[];
  person2Shinsals: string[];
  luckyInteractions: string[];
  unluckyInteractions: string[];
  overallImpact: 'very_positive' | 'positive' | 'neutral' | 'challenging';
}

export function analyzeShinsals(p1: SajuProfile, p2: SajuProfile): ShinsalAnalysis {
  const p1Shinsals = extractKeyShinsals(p1);
  const p2Shinsals = extractKeyShinsals(p2);

  const luckyInteractions: string[] = [];
  const unluckyInteractions: string[] = [];

  // 천을귀인 (天乙貴人) - 최고 길신
  if (p1Shinsals.includes('천을귀인') || p2Shinsals.includes('천을귀인')) {
    luckyInteractions.push('천을귀인의 보호로 귀인의 도움을 받는 관계');
  }

  // 천덕귀인 (天德貴人)
  if (p1Shinsals.includes('천덕귀인') && p2Shinsals.includes('천덕귀인')) {
    luckyInteractions.push('양측 모두 천덕의 가호로 덕망있는 관계');
  }

  // 문창귀인 (文昌貴人)
  if (p1Shinsals.includes('문창귀인') || p2Shinsals.includes('문창귀인')) {
    luckyInteractions.push('학문과 문화 활동에서 빛을 발하는 관계');
  }

  // 도화살 (桃花殺)
  if (p1Shinsals.includes('도화살') && p2Shinsals.includes('도화살')) {
    luckyInteractions.push('강한 이성적 끌림과 로맨틱한 분위기');
    unluckyInteractions.push('지나친 감정에 휘둘릴 위험');
  }

  // 역마살 (驛馬殺)
  if (p1Shinsals.includes('역마살') || p2Shinsals.includes('역마살')) {
    luckyInteractions.push('활동적이고 역동적인 관계');
    unluckyInteractions.push('안정성 부족, 이동과 변화가 잦을 수 있음');
  }

  // 양인살 (羊刃殺)
  if (p1Shinsals.includes('양인살') && p2Shinsals.includes('양인살')) {
    unluckyInteractions.push('양측의 강한 기운으로 충돌 가능성');
  }

  // 겁살 (劫殺)
  if (p1Shinsals.includes('겁살') || p2Shinsals.includes('겁살')) {
    unluckyInteractions.push('예상치 못한 변화나 손실에 주의');
  }

  let overallImpact: ShinsalAnalysis['overallImpact'] = 'neutral';
  const luckyCount = luckyInteractions.length;
  const unluckyCount = unluckyInteractions.length;

  if (luckyCount >= unluckyCount + 2) overallImpact = 'very_positive';
  else if (luckyCount > unluckyCount) overallImpact = 'positive';
  else if (unluckyCount > luckyCount + 1) overallImpact = 'challenging';

  return {
    person1Shinsals: p1Shinsals,
    person2Shinsals: p2Shinsals,
    luckyInteractions,
    unluckyInteractions,
    overallImpact,
  };
}

function extractKeyShinsals(profile: SajuProfile): string[] {
  // 실제로는 pillars 기반으로 신살 계산
  // 여기서는 예시
  const shinsals: string[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  // 간단히 오행 기반 추정
  if (dm === 'wood' && profile.elements.water >= 2) {
    shinsals.push('천을귀인');
  }

  if (profile.elements.fire >= 2) {
    shinsals.push('문창귀인');
  }

  // 도화살은 지지 기반 (子午卯酉)
  shinsals.push('도화살'); // 예시

  return shinsals;
}

// ============================================================
// 육합/삼합/방합 분석
// ============================================================

export interface HapAnalysis {
  yukhap: string[];        // 육합 (6 harmonies)
  samhap: string[];        // 삼합 (3 harmonies)
  banghap: string[];       // 방합 (directional harmonies)
  score: number;           // 0-100
  description: string;
}

export function analyzeHap(p1: SajuProfile, p2: SajuProfile): HapAnalysis {
  const yukhap: string[] = [];
  const samhap: string[] = [];
  const banghap: string[] = [];

  // 육합 관계 (地支 六合)
  const yukhapPairs: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
  };

  // 각 기둥의 지지 비교
  const pillars = ['year', 'month', 'day', 'time'] as const;
  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (yukhapPairs[b1] === b2) {
      yukhap.push(`${p} 기둥 육합 (${b1}-${b2})`);
    }
  }

  // 삼합 관계 (申子辰, 寅午戌, 巳酉丑, 亥卯未)
  const samhapGroups = [
    ['申', '子', '辰'],
    ['寅', '午', '戌'],
    ['巳', '酉', '丑'],
    ['亥', '卯', '未'],
  ];

  const allBranches = [
    ...pillars.map(p => p1.pillars[p].branch),
    ...pillars.map(p => p2.pillars[p].branch),
  ];

  for (const group of samhapGroups) {
    const matches = group.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      samhap.push(`삼합 ${matches.join('-')} 형성`);
    }
  }

  // 방합 (方合: 寅卯辰=木, 巳午未=火, 申酉戌=金, 亥子丑=水)
  const banghapGroups = [
    { name: '목방합', branches: ['寅', '卯', '辰'] },
    { name: '화방합', branches: ['巳', '午', '未'] },
    { name: '금방합', branches: ['申', '酉', '戌'] },
    { name: '수방합', branches: ['亥', '子', '丑'] },
  ];

  for (const group of banghapGroups) {
    const matches = group.branches.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      banghap.push(`${group.name} 형성`);
    }
  }

  const score = Math.min(100, yukhap.length * 30 + samhap.length * 25 + banghap.length * 15);

  let description = '';
  if (score >= 70) {
    description = '강력한 합 관계로 서로를 크게 도우며 발전시킵니다';
  } else if (score >= 40) {
    description = '적절한 합 관계로 조화롭게 지낼 수 있습니다';
  } else {
    description = '합 관계가 약하나 다른 요소로 보완 가능합니다';
  }

  return { yukhap, samhap, banghap, score, description };
}

// ============================================================
// 충/형/파/해 분석 (부정적 상호작용)
// ============================================================

export interface ConflictAnalysis {
  chung: string[];         // 충 (clash)
  hyeong: string[];        // 형 (punishment)
  pa: string[];            // 파 (break)
  hae: string[];           // 해 (harm)
  totalConflicts: number;
  severity: 'severe' | 'moderate' | 'mild' | 'minimal';
  mitigationAdvice: string[];
}

export function analyzeConflicts(p1: SajuProfile, p2: SajuProfile): ConflictAnalysis {
  const chung: string[] = [];
  const hyeong: string[] = [];
  const pa: string[] = [];
  const hae: string[] = [];

  // 충 관계 (地支 相沖)
  const chungPairs: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳',
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;
  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (chungPairs[b1] === b2) {
      chung.push(`${p} 기둥 충 (${b1}-${b2})`);
    }
  }

  // 형 관계 (복잡하므로 주요 관계만)
  const hyeongGroups = [
    ['寅', '巳', '申'],  // 무은지형
    ['丑', '未', '戌'],  // 지세지형
  ];

  const allBranches = pillars.flatMap(p => [p1.pillars[p].branch, p2.pillars[p].branch]);

  for (const group of hyeongGroups) {
    const matches = group.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      hyeong.push(`형 관계 ${matches.join('-')}`);
    }
  }

  // 파 관계
  const paPairs: Record<string, string> = {
    '子': '酉', '酉': '子',
    '午': '卯', '卯': '午',
    '巳': '申', '申': '巳',
    '亥': '寅', '寅': '亥',
  };

  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (paPairs[b1] === b2) {
      pa.push(`${p} 기둥 파 (${b1}-${b2})`);
    }
  }

  // 해 관계
  const haePairs: Record<string, string> = {
    '子': '未', '未': '子',
    '丑': '午', '午': '丑',
    '寅': '巳', '巳': '寅',
    '卯': '辰', '辰': '卯',
    '申': '亥', '亥': '申',
    '酉': '戌', '戌': '酉',
  };

  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (haePairs[b1] === b2) {
      hae.push(`${p} 기둥 해 (${b1}-${b2})`);
    }
  }

  const totalConflicts = chung.length + hyeong.length + pa.length + hae.length;

  let severity: ConflictAnalysis['severity'] = 'minimal';
  if (totalConflicts >= 4 || chung.length >= 2) severity = 'severe';
  else if (totalConflicts >= 2) severity = 'moderate';
  else if (totalConflicts >= 1) severity = 'mild';

  const mitigationAdvice: string[] = [];
  if (chung.length > 0) {
    mitigationAdvice.push('충이 있으므로 서로의 차이를 인정하고 독립적인 공간을 존중하세요');
  }
  if (hyeong.length > 0) {
    mitigationAdvice.push('형이 있어 갈등 발생 시 제3자의 중재가 도움될 수 있습니다');
  }
  if (pa.length > 0) {
    mitigationAdvice.push('파가 있으므로 신뢰를 쌓고 배신감을 주지 않도록 주의하세요');
  }
  if (hae.length > 0) {
    mitigationAdvice.push('해가 있어 서로의 발목을 잡지 않도록 지나친 간섭을 피하세요');
  }

  return { chung, hyeong, pa, hae, totalConflicts, severity, mitigationAdvice };
}

// ============================================================
// 종합 고급 사주 궁합 분석
// ============================================================

export interface ComprehensiveSajuCompatibility {
  tenGods: TenGodAnalysis;
  shinsals: ShinsalAnalysis;
  harmonies: HapAnalysis;
  conflicts: ConflictAnalysis;
  overallScore: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  detailedInsights: string[];
}

export function performComprehensiveSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile
): ComprehensiveSajuCompatibility {
  const tenGods = analyzeTenGods(p1, p2);
  const shinsals = analyzeShinsals(p1, p2);
  const harmonies = analyzeHap(p1, p2);
  const conflicts = analyzeConflicts(p1, p2);

  // 종합 점수 계산
  const tenGodScore = tenGods.interaction.balance;
  const shinsalScore = shinsals.overallImpact === 'very_positive' ? 90
    : shinsals.overallImpact === 'positive' ? 75
    : shinsals.overallImpact === 'neutral' ? 50 : 30;
  const harmonyScore = harmonies.score;
  const conflictPenalty = conflicts.severity === 'severe' ? -30
    : conflicts.severity === 'moderate' ? -15
    : conflicts.severity === 'mild' ? -5 : 0;

  const overallScore = Math.max(0, Math.min(100,
    tenGodScore * 0.35 +
    shinsalScore * 0.25 +
    harmonyScore * 0.25 +
    conflictPenalty + 15
  ));

  let grade: ComprehensiveSajuCompatibility['grade'];
  if (overallScore >= 95) grade = 'S+';
  else if (overallScore >= 85) grade = 'S';
  else if (overallScore >= 75) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else if (overallScore >= 35) grade = 'D';
  else grade = 'F';

  // 요약
  let summary = '';
  if (grade === 'S+' || grade === 'S') {
    summary = '사주 명리학적으로 매우 훌륭한 궁합입니다. 십성의 조화, 길한 신살, 강력한 합 관계가 모두 갖춰져 있습니다.';
  } else if (grade === 'A' || grade === 'B') {
    summary = '사주상 좋은 궁합입니다. 일부 충돌이 있을 수 있으나 전반적으로 조화롭습니다.';
  } else if (grade === 'C') {
    summary = '사주상 보통의 궁합입니다. 노력과 이해가 필요하지만 발전 가능성이 있습니다.';
  } else {
    summary = '사주상 어려움이 있는 궁합입니다. 깊은 이해와 많은 조율이 필요합니다.';
  }

  // 상세 인사이트
  const detailedInsights: string[] = [
    `십성 분석: ${tenGods.relationshipDynamics}`,
    `신살 영향: ${shinsals.luckyInteractions[0] || '특별한 길신 없음'}`,
    `합 관계: ${harmonies.description}`,
  ];

  if (conflicts.totalConflicts > 0) {
    detailedInsights.push(`충돌: ${conflicts.totalConflicts}개의 충형파해가 있어 주의 필요`);
  }

  return {
    tenGods,
    shinsals,
    harmonies,
    conflicts,
    overallScore: Math.round(overallScore),
    grade,
    summary,
    detailedInsights,
  };
}

// ============================================================
// 용신/희신 (Yongsin/Huisin) 궁합 분석
// ============================================================

export interface YongsinAnalysis {
  person1Yongsin: string;       // Person1의 용신 (필요한 오행)
  person1Huisin: string;        // Person1의 희신 (좋은 오행)
  person2Yongsin: string;       // Person2의 용신
  person2Huisin: string;        // Person2의 희신
  mutualSupport: boolean;       // 서로의 용신을 제공하는지
  compatibility: number;        // 0-100
  interpretation: string[];
}

export function analyzeYongsinCompatibility(p1: SajuProfile, p2: SajuProfile): YongsinAnalysis {
  // 일간 기준으로 용신 계산 (간략화된 버전)
  const p1Yongsin = calculateYongsin(p1);
  const p1Huisin = calculateHuisin(p1, p1Yongsin);
  const p2Yongsin = calculateYongsin(p2);
  const p2Huisin = calculateHuisin(p2, p2Yongsin);

  const interpretation: string[] = [];
  let compatibility = 50;

  // Person2가 Person1의 용신을 가지고 있는지
  const p2HasP1Yongsin = getElementStrength(p2, p1Yongsin) >= 2;
  // Person1이 Person2의 용신을 가지고 있는지
  const p1HasP2Yongsin = getElementStrength(p1, p2Yongsin) >= 2;

  const mutualSupport = p2HasP1Yongsin && p1HasP2Yongsin;

  if (mutualSupport) {
    compatibility = 95;
    interpretation.push('서로의 용신을 채워주는 최상의 궁합');
    interpretation.push('함께 있으면 서로의 부족한 기운이 보완됨');
  } else if (p2HasP1Yongsin || p1HasP2Yongsin) {
    compatibility = 75;
    if (p2HasP1Yongsin) {
      interpretation.push(`Person2가 Person1에게 필요한 ${p1Yongsin} 기운을 제공`);
    }
    if (p1HasP2Yongsin) {
      interpretation.push(`Person1이 Person2에게 필요한 ${p2Yongsin} 기운을 제공`);
    }
  } else {
    compatibility = 45;
    interpretation.push('용신 측면에서 보완 관계가 약함');
    interpretation.push('각자의 방식으로 부족한 기운을 채워야 함');
  }

  // 희신 검사
  if (getElementStrength(p2, p1Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`Person2가 Person1의 희신(${p1Huisin})을 보유`);
  }
  if (getElementStrength(p1, p2Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`Person1이 Person2의 희신(${p2Huisin})을 보유`);
  }

  return {
    person1Yongsin: p1Yongsin,
    person1Huisin: p1Huisin,
    person2Yongsin: p2Yongsin,
    person2Huisin: p2Huisin,
    mutualSupport,
    compatibility: Math.min(100, compatibility),
    interpretation,
  };
}

function calculateYongsin(profile: SajuProfile): string {
  const dm = normalizeElement(profile.dayMaster.element);
  const elements = profile.elements;

  // 일간의 강약 판단
  const selfStrength = elements[dm as keyof typeof elements] || 0;
  const isStrong = selfStrength >= 3;

  // 오행 생극 관계로 용신 결정
  const yongsinMap: Record<string, { strong: string; weak: string }> = {
    wood: { strong: 'metal', weak: 'water' },  // 강하면 금(관성), 약하면 수(인성)
    fire: { strong: 'water', weak: 'wood' },
    earth: { strong: 'wood', weak: 'fire' },
    metal: { strong: 'fire', weak: 'earth' },
    water: { strong: 'earth', weak: 'metal' },
  };

  return yongsinMap[dm]?.[isStrong ? 'strong' : 'weak'] || 'earth';
}

function calculateHuisin(profile: SajuProfile, yongsin: string): string {
  // 희신은 용신을 생하는 오행
  const generateMap: Record<string, string> = {
    wood: 'water',
    fire: 'wood',
    earth: 'fire',
    metal: 'earth',
    water: 'metal',
  };
  return generateMap[yongsin] || 'earth';
}

function getElementStrength(profile: SajuProfile, element: string): number {
  return profile.elements[element as keyof typeof profile.elements] || 0;
}

// ============================================================
// 대운 (Daeun/Major Fortune) 흐름 비교
// ============================================================

export interface DaeunCompatibility {
  person1CurrentDaeun: DaeunPeriod;
  person2CurrentDaeun: DaeunPeriod;
  harmonicPeriods: string[];      // 두 사람의 대운이 조화로운 시기
  challengingPeriods: string[];   // 대운 충돌 시기
  currentSynergy: number;         // 현재 대운 시너지 0-100
  futureOutlook: string;
}

export interface DaeunPeriod {
  stem: string;
  branch: string;
  element: string;
  startAge: number;
  endAge: number;
  theme: string;
}

export function analyzeDaeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number,
  p2Age: number
): DaeunCompatibility {
  // 현재 대운 계산
  const p1CurrentDaeun = getCurrentDaeun(p1, p1Age);
  const p2CurrentDaeun = getCurrentDaeun(p2, p2Age);

  const harmonicPeriods: string[] = [];
  const challengingPeriods: string[] = [];

  // 현재 대운의 오행 비교
  const p1El = p1CurrentDaeun.element;
  const p2El = p2CurrentDaeun.element;

  let currentSynergy = 50;

  // 오행 조화 검사
  if (p1El === p2El) {
    currentSynergy = 75;
    harmonicPeriods.push(`현재: 두 사람 모두 ${p1El}의 시기로 공감대 형성`);
  } else if (areElementsHarmonious(p1El, p2El)) {
    currentSynergy = 85;
    harmonicPeriods.push(`현재: ${p1El}와 ${p2El}가 상생하여 서로 도움`);
  } else if (areElementsClashing(p1El, p2El)) {
    currentSynergy = 35;
    challengingPeriods.push(`현재: ${p1El}와 ${p2El}가 상극하여 마찰 가능`);
  }

  // 용신과 대운 비교
  const p1Yongsin = calculateYongsin(p1);
  const p2Yongsin = calculateYongsin(p2);

  if (p2CurrentDaeun.element === p1Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push('Person2의 대운이 Person1의 용신을 충족');
  }
  if (p1CurrentDaeun.element === p2Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push('Person1의 대운이 Person2의 용신을 충족');
  }

  // 미래 전망
  let futureOutlook = '';
  if (currentSynergy >= 80) {
    futureOutlook = '현재 대운의 조화가 뛰어나 함께 성장하는 시기입니다';
  } else if (currentSynergy >= 60) {
    futureOutlook = '대운상 무난한 시기이며 서로 지지하며 나아갈 수 있습니다';
  } else if (currentSynergy >= 40) {
    futureOutlook = '대운의 기류가 다소 다르나 이해와 배려로 극복 가능합니다';
  } else {
    futureOutlook = '대운의 방향이 달라 각자의 영역에서 성장이 필요한 시기입니다';
  }

  return {
    person1CurrentDaeun: p1CurrentDaeun,
    person2CurrentDaeun: p2CurrentDaeun,
    harmonicPeriods,
    challengingPeriods,
    currentSynergy: Math.min(100, currentSynergy),
    futureOutlook,
  };
}

function getCurrentDaeun(profile: SajuProfile, age: number): DaeunPeriod {
  // 대운 시작 나이 계산 (간략화)
  const startAge = Math.floor(age / 10) * 10;
  const stemIndex = Math.floor(age / 10) % 10;
  const branchIndex = Math.floor(age / 10) % 12;

  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const stem = stems[stemIndex];
  const branch = branches[branchIndex];

  // 천간의 오행
  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const element = stemElements[stem] || 'earth';

  const themes: Record<string, string> = {
    wood: '성장과 발전의 시기',
    fire: '열정과 표현의 시기',
    earth: '안정과 수확의 시기',
    metal: '결실과 정리의 시기',
    water: '지혜와 준비의 시기',
  };

  return {
    stem,
    branch,
    element,
    startAge,
    endAge: startAge + 10,
    theme: themes[element] || '변화의 시기',
  };
}

function areElementsHarmonious(el1: string, el2: string): boolean {
  const harmonious: Record<string, string[]> = {
    wood: ['water', 'fire'],
    fire: ['wood', 'earth'],
    earth: ['fire', 'metal'],
    metal: ['earth', 'water'],
    water: ['metal', 'wood'],
  };
  return harmonious[el1]?.includes(el2) ?? false;
}

function areElementsClashing(el1: string, el2: string): boolean {
  const clashing: Record<string, string> = {
    wood: 'metal',
    fire: 'water',
    earth: 'wood',
    metal: 'fire',
    water: 'earth',
  };
  return clashing[el1] === el2 || clashing[el2] === el1;
}

// ============================================================
// 세운 (Seun/Annual Fortune) 비교
// ============================================================

export interface SeunCompatibility {
  year: number;
  yearStem: string;
  yearBranch: string;
  yearElement: string;
  person1Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  person2Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  combinedOutlook: string;
  advice: string[];
}

export function analyzeSeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  year: number
): SeunCompatibility {
  // 해당 연도의 천간지지 계산
  const yearData = getYearStemBranch(year);

  const p1Impact = calculateYearImpact(p1, yearData.element);
  const p2Impact = calculateYearImpact(p2, yearData.element);

  const advice: string[] = [];

  // 올해 궁합 영향
  let combinedOutlook = '';

  const impactScore = (impact: string): number => {
    const scores: Record<string, number> = {
      very_favorable: 5,
      favorable: 4,
      neutral: 3,
      challenging: 2,
      very_challenging: 1,
    };
    return scores[impact] || 3;
  };

  const avgScore = (impactScore(p1Impact) + impactScore(p2Impact)) / 2;

  if (avgScore >= 4.5) {
    combinedOutlook = `${year}년은 두 분 모두에게 매우 좋은 해로, 함께 큰 발전을 이룰 수 있습니다`;
    advice.push('새로운 시작, 중요한 결정에 좋은 해');
    advice.push('함께하는 활동에서 시너지 극대화');
  } else if (avgScore >= 3.5) {
    combinedOutlook = `${year}년은 무난한 해로, 꾸준한 노력이 결실을 맺습니다`;
    advice.push('안정적인 계획 실행에 적합');
  } else if (avgScore >= 2.5) {
    combinedOutlook = `${year}년은 다소 주의가 필요한 해입니다`;
    advice.push('큰 변화보다는 현상 유지 권장');
    advice.push('서로에 대한 이해와 인내 필요');
  } else {
    combinedOutlook = `${year}년은 어려움이 예상되나 함께 극복하면 더 강해집니다`;
    advice.push('중요한 결정은 내년으로 연기 고려');
    advice.push('건강 관리와 안전에 신경');
  }

  return {
    year,
    yearStem: yearData.stem,
    yearBranch: yearData.branch,
    yearElement: yearData.element,
    person1Impact: p1Impact,
    person2Impact: p2Impact,
    combinedOutlook,
    advice,
  };
}

function getYearStemBranch(year: number): { stem: string; branch: string; element: string } {
  const stems = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const branches = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];

  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;

  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const stem = stems[stemIndex];

  return {
    stem,
    branch: branches[branchIndex],
    element: stemElements[stem] || 'earth',
  };
}

function calculateYearImpact(
  profile: SajuProfile,
  yearElement: string
): 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging' {
  const yongsin = calculateYongsin(profile);
  const huisin = calculateHuisin(profile, yongsin);
  const dm = normalizeElement(profile.dayMaster.element);

  if (yearElement === yongsin) return 'very_favorable';
  if (yearElement === huisin) return 'favorable';
  if (areElementsHarmonious(yearElement, dm)) return 'favorable';
  if (areElementsClashing(yearElement, dm)) return 'challenging';
  if (yearElement === dm) return 'neutral';

  return 'neutral';
}

// ============================================================
// 공망 (Gongmang/Empty Branches) 분석
// ============================================================

export interface GongmangAnalysis {
  person1Gongmang: string[];      // Person1의 공망 지지
  person2Gongmang: string[];      // Person2의 공망 지지
  person1InP2Gongmang: boolean;   // Person1의 일지가 Person2 공망에 해당
  person2InP1Gongmang: boolean;   // Person2의 일지가 Person1 공망에 해당
  impact: 'positive' | 'neutral' | 'negative';
  interpretation: string[];
}

export function analyzeGongmang(p1: SajuProfile, p2: SajuProfile): GongmangAnalysis {
  const p1Gongmang = calculateGongmang(p1.pillars.day.stem, p1.pillars.day.branch);
  const p2Gongmang = calculateGongmang(p2.pillars.day.stem, p2.pillars.day.branch);

  const p1DayBranch = p1.pillars.day.branch;
  const p2DayBranch = p2.pillars.day.branch;

  const person1InP2Gongmang = p2Gongmang.includes(p1DayBranch);
  const person2InP1Gongmang = p1Gongmang.includes(p2DayBranch);

  const interpretation: string[] = [];
  let impact: GongmangAnalysis['impact'] = 'neutral';

  if (person1InP2Gongmang && person2InP1Gongmang) {
    impact = 'negative';
    interpretation.push('서로의 공망에 해당하여 인연이 약할 수 있음');
    interpretation.push('관계 유지에 특별한 노력 필요');
    interpretation.push('다만 공망이 해소되면 오히려 특별한 인연이 될 수 있음');
  } else if (person1InP2Gongmang || person2InP1Gongmang) {
    impact = 'neutral';
    if (person1InP2Gongmang) {
      interpretation.push('Person2 입장에서 Person1을 잊기 쉬울 수 있음');
    }
    if (person2InP1Gongmang) {
      interpretation.push('Person1 입장에서 Person2를 잊기 쉬울 수 있음');
    }
    interpretation.push('의식적인 관심과 노력으로 극복 가능');
  } else {
    impact = 'positive';
    interpretation.push('공망 충돌 없이 안정적인 인연');
    interpretation.push('서로에 대한 존재감이 확실함');
  }

  return {
    person1Gongmang: p1Gongmang,
    person2Gongmang: p2Gongmang,
    person1InP2Gongmang,
    person2InP1Gongmang,
    impact,
    interpretation,
  };
}

function calculateGongmang(stem: string, branch: string): string[] {
  // 일주 기준 공망 계산
  // 10개 천간과 12개 지지에서 남는 2개 지지가 공망
  const gongmangTable: Record<string, string[]> = {
    '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'],
    '己巳': ['戌', '亥'], '庚午': ['申', '酉'], '辛未': ['申', '酉'], '壬申': ['申', '酉'], '癸酉': ['申', '酉'],
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['午', '未'], '丁丑': ['午', '未'], '戊寅': ['午', '未'],
    '己卯': ['午', '未'], '庚辰': ['午', '未'], '辛巳': ['午', '未'], '壬午': ['辰', '巳'], '癸未': ['辰', '巳'],
    '甲申': ['辰', '巳'], '乙酉': ['辰', '巳'], '丙戌': ['辰', '巳'], '丁亥': ['辰', '巳'], '戊子': ['寅', '卯'],
    '己丑': ['寅', '卯'], '庚寅': ['寅', '卯'], '辛卯': ['寅', '卯'], '壬辰': ['寅', '卯'], '癸巳': ['寅', '卯'],
    '甲午': ['子', '丑'], '乙未': ['子', '丑'], '丙申': ['子', '丑'], '丁酉': ['子', '丑'], '戊戌': ['子', '丑'],
    '己亥': ['子', '丑'], '庚子': ['戌', '亥'], '辛丑': ['戌', '亥'], '壬寅': ['戌', '亥'], '癸卯': ['戌', '亥'],
  };

  const key = `${stem}${branch}`;
  return gongmangTable[key] || ['戌', '亥'];
}

// ============================================================
// 천간합 (Heavenly Stem Combination) 분석
// ============================================================

export interface GanHapAnalysis {
  combinations: GanHapCombination[];
  totalHarmony: number;
  significance: string;
}

export interface GanHapCombination {
  stem1: string;
  stem2: string;
  pillar1: string;
  pillar2: string;
  resultElement: string;
  description: string;
}

export function analyzeGanHap(p1: SajuProfile, p2: SajuProfile): GanHapAnalysis {
  const combinations: GanHapCombination[] = [];

  // 천간합 관계: 甲己合土, 乙庚合金, 丙辛合水, 丁壬合木, 戊癸合火
  const ganHapPairs: Record<string, { partner: string; result: string }> = {
    '甲': { partner: '己', result: 'earth' },
    '己': { partner: '甲', result: 'earth' },
    '乙': { partner: '庚', result: 'metal' },
    '庚': { partner: '乙', result: 'metal' },
    '丙': { partner: '辛', result: 'water' },
    '辛': { partner: '丙', result: 'water' },
    '丁': { partner: '壬', result: 'wood' },
    '壬': { partner: '丁', result: 'wood' },
    '戊': { partner: '癸', result: 'fire' },
    '癸': { partner: '戊', result: 'fire' },
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const p1Pillar of pillars) {
    const p1Stem = p1.pillars[p1Pillar].stem;
    const hapInfo = ganHapPairs[p1Stem];

    if (hapInfo) {
      for (const p2Pillar of pillars) {
        const p2Stem = p2.pillars[p2Pillar].stem;

        if (p2Stem === hapInfo.partner) {
          combinations.push({
            stem1: p1Stem,
            stem2: p2Stem,
            pillar1: p1Pillar,
            pillar2: p2Pillar,
            resultElement: hapInfo.result,
            description: `${p1Pillar} ${p1Stem}와 ${p2Pillar} ${p2Stem}가 합하여 ${hapInfo.result} 생성`,
          });
        }
      }
    }
  }

  // 일간 합은 특별히 의미가 큼
  const dayHap = combinations.find(c => c.pillar1 === 'day' || c.pillar2 === 'day');

  let totalHarmony = combinations.length * 20;
  let significance = '';

  if (dayHap) {
    totalHarmony += 30;
    significance = '일간의 천간합으로 깊은 인연과 강한 끌림이 있습니다. 서로를 운명적으로 느낄 수 있습니다.';
  } else if (combinations.length >= 2) {
    significance = '여러 천간합으로 다양한 측면에서 조화를 이룹니다.';
  } else if (combinations.length === 1) {
    significance = '천간합이 있어 특정 영역에서 좋은 협력이 가능합니다.';
  } else {
    significance = '천간합은 없으나 다른 요소로 궁합을 평가합니다.';
  }

  return {
    combinations,
    totalHarmony: Math.min(100, totalHarmony),
    significance,
  };
}

// ============================================================
// 격국 (Gyeokguk/Chart Pattern) 비교
// ============================================================

export type GyeokgukType =
  | '정관격' | '편관격' | '정인격' | '편인격'
  | '정재격' | '편재격' | '식신격' | '상관격'
  | '건록격' | '양인격' | '종격';

export interface GyeokgukAnalysis {
  person1Gyeokguk: GyeokgukType;
  person2Gyeokguk: GyeokgukType;
  compatibility: 'excellent' | 'good' | 'neutral' | 'challenging';
  dynamics: string;
  strengths: string[];
  challenges: string[];
}

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
    dynamics = '격국의 완벽한 조화로 서로의 장점을 극대화';
    strengths.push('사회적 성공을 함께 이룰 수 있는 조합');
    strengths.push('서로의 부족한 부분을 자연스럽게 보완');
  } else if (goodCombos.includes(combo)) {
    compatibility = 'good';
    dynamics = '격국의 조화가 좋아 안정적인 관계 유지';
    strengths.push('서로 다른 강점으로 협력 가능');
  } else if (challengingCombos.includes(combo)) {
    compatibility = 'challenging';
    dynamics = '격국의 충돌로 갈등이 발생할 수 있음';
    challenges.push('가치관과 행동 방식의 차이');
    challenges.push('권력 다툼이나 주도권 경쟁 가능');
  } else if (p1Gyeokguk === p2Gyeokguk) {
    compatibility = 'good';
    dynamics = '같은 격국으로 서로를 잘 이해함';
    strengths.push('비슷한 가치관과 목표');
    challenges.push('너무 비슷하여 자극이 부족할 수 있음');
  } else {
    dynamics = '서로 다른 격국으로 다양성이 있는 관계';
    strengths.push('다양한 관점에서 서로 배움');
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
  if (dayMaster === target) return '비겁';

  const generates: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };
  const controls: Record<string, string> = {
    wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
  };

  if (generates[dayMaster] === target) return '식상';
  if (generates[target] === dayMaster) return '인성';
  if (controls[dayMaster] === target) return '재성';
  if (controls[target] === dayMaster) return '관성';

  return '비겁';
}

// ============================================================
// 12운성 (Twelve States) 분석
// ============================================================

export type TwelveState =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

export interface TwelveStatesAnalysis {
  person1States: { pillar: string; state: TwelveState; meaning: string }[];
  person2States: { pillar: string; state: TwelveState; meaning: string }[];
  energyCompatibility: number;
  interpretation: string[];
}

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

  if (p1Strong && p2Strong) {
    energyCompatibility = 85;
    interpretation.push('두 분 모두 왕성한 에너지로 활기찬 관계');
    interpretation.push('서로 자극하며 발전하지만 주도권 경쟁 주의');
  } else if (p1Strong && p2Weak) {
    energyCompatibility = 70;
    interpretation.push('Person1이 Person2를 이끌어주는 관계');
    interpretation.push('보호자-피보호자 역할 분담이 자연스러움');
  } else if (p1Weak && p2Strong) {
    energyCompatibility = 70;
    interpretation.push('Person2가 Person1을 이끌어주는 관계');
  } else if (p1Weak && p2Weak) {
    energyCompatibility = 45;
    interpretation.push('서로 의지하며 조용한 관계');
    interpretation.push('외부 자극이나 도움이 필요할 수 있음');
  } else {
    energyCompatibility = 60;
    interpretation.push('적당한 에너지 균형으로 안정적인 관계');
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

// ============================================================
// 확장된 종합 사주 궁합 분석
// ============================================================

export interface ExtendedSajuCompatibility extends ComprehensiveSajuCompatibility {
  yongsin: YongsinAnalysis;
  daeun: DaeunCompatibility;
  seun: SeunCompatibility;
  gongmang: GongmangAnalysis;
  ganHap: GanHapAnalysis;
  gyeokguk: GyeokgukAnalysis;
  twelveStates: TwelveStatesAnalysis;
}

export function performExtendedSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number = 30,
  p2Age: number = 30,
  currentYear: number = new Date().getFullYear()
): ExtendedSajuCompatibility {
  // 기존 분석
  const baseAnalysis = performComprehensiveSajuAnalysis(p1, p2);

  // 확장 분석
  const yongsin = analyzeYongsinCompatibility(p1, p2);
  const daeun = analyzeDaeunCompatibility(p1, p2, p1Age, p2Age);
  const seun = analyzeSeunCompatibility(p1, p2, currentYear);
  const gongmang = analyzeGongmang(p1, p2);
  const ganHap = analyzeGanHap(p1, p2);
  const gyeokguk = analyzeGyeokguk(p1, p2);
  const twelveStates = analyzeTwelveStates(p1, p2);

  // 확장된 점수 계산
  const extendedScore =
    baseAnalysis.overallScore * 0.4 +
    yongsin.compatibility * 0.15 +
    daeun.currentSynergy * 0.1 +
    ganHap.totalHarmony * 0.1 +
    (gyeokguk.compatibility === 'excellent' ? 100 :
      gyeokguk.compatibility === 'good' ? 75 :
      gyeokguk.compatibility === 'neutral' ? 50 : 30) * 0.1 +
    twelveStates.energyCompatibility * 0.1 +
    (gongmang.impact === 'positive' ? 80 :
      gongmang.impact === 'neutral' ? 50 : 30) * 0.05;

  // 등급 재계산
  let grade: ComprehensiveSajuCompatibility['grade'];
  if (extendedScore >= 95) grade = 'S+';
  else if (extendedScore >= 85) grade = 'S';
  else if (extendedScore >= 75) grade = 'A';
  else if (extendedScore >= 65) grade = 'B';
  else if (extendedScore >= 50) grade = 'C';
  else if (extendedScore >= 35) grade = 'D';
  else grade = 'F';

  // 상세 인사이트 확장
  const detailedInsights = [
    ...baseAnalysis.detailedInsights,
    `용신 궁합: ${yongsin.mutualSupport ? '서로의 용신 충족 (최상)' : '부분적 용신 보완'}`,
    `대운 시너지: ${daeun.futureOutlook}`,
    `올해 전망: ${seun.combinedOutlook}`,
    `천간합: ${ganHap.significance}`,
    `격국 조화: ${gyeokguk.dynamics}`,
    ...gongmang.interpretation.slice(0, 1),
    ...twelveStates.interpretation.slice(0, 1),
  ];

  return {
    ...baseAnalysis,
    overallScore: Math.round(extendedScore),
    grade,
    detailedInsights,
    yongsin,
    daeun,
    seun,
    gongmang,
    ganHap,
    gyeokguk,
    twelveStates,
  };
}
