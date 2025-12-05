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
    'Йжc': 'wood',
    'бT"': 'fire',
    'б+ ': 'earth',
    'И,^': 'metal',
    'Н^~': 'water',
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

