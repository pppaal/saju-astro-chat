/**
 * Group Compatibility Analysis (그룹 궁합 분석)
 * 3-4명의 사주/점성학 기반 그룹 전체 궁합 분석
 */

import { SajuProfile, AstrologyProfile } from './cosmicCompatibility';
import { performComprehensiveSajuAnalysis } from './advancedSajuAnalysis';
import { performComprehensiveAstrologyAnalysis } from './advancedAstrologyAnalysis';

// ============================================================
// 공통 타입 정의
// ============================================================

export interface GroupMember {
  id: string;
  name: string;
  sajuProfile?: SajuProfile;
  astrologyProfile?: AstrologyProfile;
}

export interface PairwiseCompatibility {
  member1Id: string;
  member2Id: string;
  member1Name: string;
  member2Name: string;
  sajuScore?: number;
  astrologyScore?: number;
  combinedScore: number;
  relationship: 'excellent' | 'good' | 'neutral' | 'challenging';
  keyInsight: string;
}

export interface GroupRole {
  memberId: string;
  memberName: string;
  primaryRole: string;
  secondaryRole?: string;
  strengthsInGroup: string[];
  potentialChallenges: string[];
  compatibleWith: string[];  // 가장 잘 맞는 멤버들
  needsAttentionWith: string[];  // 주의가 필요한 멤버들
}

// ============================================================
// 그룹 사주 궁합 분석
// ============================================================

export interface GroupSajuAnalysis {
  groupSize: number;
  pairwiseResults: PairwiseCompatibility[];
  elementBalance: {
    element: string;
    count: number;
    percentage: number;
  }[];
  groupDynamics: {
    dominantElement: string;
    missingElement: string | null;
    balanceScore: number;
    interpretation: string;
  };
  memberRoles: GroupRole[];
  overallHarmony: number;
  strengths: string[];
  challenges: string[];
  advice: string[];
}

export function analyzeGroupSajuCompatibility(members: GroupMember[]): GroupSajuAnalysis {
  if (members.length < 2 || members.length > 6) {
    throw new Error('그룹 분석은 2-6명 사이에서 가능합니다');
  }

  const sajuMembers = members.filter(m => m.sajuProfile);
  if (sajuMembers.length < 2) {
    throw new Error('사주 분석을 위해 최소 2명의 사주 정보가 필요합니다');
  }

  // 1. 쌍별 궁합 분석
  const pairwiseResults: PairwiseCompatibility[] = [];
  for (let i = 0; i < sajuMembers.length; i++) {
    for (let j = i + 1; j < sajuMembers.length; j++) {
      const m1 = sajuMembers[i];
      const m2 = sajuMembers[j];

      if (m1.sajuProfile && m2.sajuProfile) {
        const analysis = performComprehensiveSajuAnalysis(m1.sajuProfile, m2.sajuProfile);

        let relationship: PairwiseCompatibility['relationship'];
        if (analysis.overallScore >= 80) {relationship = 'excellent';}
        else if (analysis.overallScore >= 65) {relationship = 'good';}
        else if (analysis.overallScore >= 45) {relationship = 'neutral';}
        else {relationship = 'challenging';}

        pairwiseResults.push({
          member1Id: m1.id,
          member2Id: m2.id,
          member1Name: m1.name,
          member2Name: m2.name,
          sajuScore: analysis.overallScore,
          combinedScore: analysis.overallScore,
          relationship,
          keyInsight: analysis.summary,
        });
      }
    }
  }

  // 2. 오행 밸런스 분석
  const elementCounts: Record<string, number> = {
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
  };

  for (const member of sajuMembers) {
    if (member.sajuProfile) {
      const dm = normalizeElement(member.sajuProfile.dayMaster.element);
      elementCounts[dm] = (elementCounts[dm] || 0) + 1;

      // 사주 전체 오행도 고려
      for (const [el, count] of Object.entries(member.sajuProfile.elements)) {
        elementCounts[el] = (elementCounts[el] || 0) + (count as number) * 0.5;
      }
    }
  }

  const totalElements = Object.values(elementCounts).reduce((a, b) => a + b, 0);
  const elementBalance = Object.entries(elementCounts)
    .map(([element, count]) => ({
      element,
      count: Math.round(count * 10) / 10,
      percentage: Math.round((count / totalElements) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominantElement = elementBalance[0].element;
  const missingElement = elementBalance.find(e => e.count < 1)?.element || null;

  // 밸런스 점수 (고르게 분포할수록 높음)
  const idealPercentage = 100 / 5;
  const variance = elementBalance.reduce((sum, e) =>
    sum + Math.pow(e.percentage - idealPercentage, 2), 0) / 5;
  const balanceScore = Math.max(0, 100 - Math.sqrt(variance) * 3);

  let balanceInterpretation = '';
  if (balanceScore >= 80) {
    balanceInterpretation = '오행이 고르게 분포하여 그룹 내 다양한 역할이 잘 조화됩니다';
  } else if (balanceScore >= 60) {
    balanceInterpretation = `${dominantElement}(${getElementKorean(dominantElement)}) 기운이 강하여 해당 특성이 그룹을 이끕니다`;
  } else if (balanceScore >= 40) {
    balanceInterpretation = `${dominantElement}(${getElementKorean(dominantElement)}) 편중이 있어 ${missingElement ? getElementKorean(missingElement) + ' 기운이 보완되면 좋습니다' : '균형이 필요합니다'}`;
  } else {
    balanceInterpretation = '오행 불균형이 심하여 특정 방향으로만 흐를 수 있습니다';
  }

  // 3. 멤버별 역할 분석
  const memberRoles = analyzeMemberRolesInGroup(sajuMembers, pairwiseResults);

  // 4. 전체 조화도 계산
  const avgPairScore = pairwiseResults.reduce((sum, p) => sum + p.combinedScore, 0) / pairwiseResults.length;
  const overallHarmony = Math.round(avgPairScore * 0.6 + balanceScore * 0.4);

  // 5. 강점, 도전, 조언
  const strengths: string[] = [];
  const challenges: string[] = [];
  const advice: string[] = [];

  // 최고 궁합 쌍
  const bestPair = pairwiseResults.reduce((best, p) =>
    p.combinedScore > best.combinedScore ? p : best);
  strengths.push(`${bestPair.member1Name}님과 ${bestPair.member2Name}님의 케미가 뛰어남 (${bestPair.combinedScore}점)`);

  // 가장 도전적인 쌍
  const challengingPair = pairwiseResults.reduce((worst, p) =>
    p.combinedScore < worst.combinedScore ? p : worst);
  if (challengingPair.combinedScore < 50) {
    challenges.push(`${challengingPair.member1Name}님과 ${challengingPair.member2Name}님 사이 조율 필요`);
  }

  // 오행 기반 강점
  if (elementBalance[0].percentage >= 35) {
    const dominant = getElementKorean(dominantElement);
    strengths.push(`${dominant} 기운이 강하여 ${getElementStrength(dominantElement)}`);
  }

  if (missingElement) {
    advice.push(`${getElementKorean(missingElement)} 기운을 보완하면 그룹 역량이 향상됩니다`);
  }

  // 역할 기반 조언
  const leaderCount = memberRoles.filter(r => r.primaryRole.includes('리더') || r.primaryRole.includes('주도')).length;
  if (leaderCount === 0) {
    advice.push('명확한 리더 역할을 정하면 그룹 운영이 원활해집니다');
  } else if (leaderCount > 1) {
    advice.push('리더 성향의 멤버가 여럿이므로 역할 분담을 명확히 하세요');
  }

  return {
    groupSize: sajuMembers.length,
    pairwiseResults,
    elementBalance,
    groupDynamics: {
      dominantElement,
      missingElement,
      balanceScore: Math.round(balanceScore),
      interpretation: balanceInterpretation,
    },
    memberRoles,
    overallHarmony,
    strengths,
    challenges,
    advice,
  };
}

function analyzeMemberRolesInGroup(
  members: GroupMember[],
  pairwiseResults: PairwiseCompatibility[]
): GroupRole[] {
  return members.map(member => {
    const profile = member.sajuProfile!;
    const dm = normalizeElement(profile.dayMaster.element);

    // 역할 결정 (일간 기반)
    const roleMap: Record<string, { primary: string; secondary: string }> = {
      wood: { primary: '성장 촉진자', secondary: '아이디어 제안자' },
      fire: { primary: '열정적 리더', secondary: '분위기 메이커' },
      earth: { primary: '안정적 중재자', secondary: '실행 담당자' },
      metal: { primary: '원칙적 관리자', secondary: '품질 책임자' },
      water: { primary: '전략적 참모', secondary: '소통 담당자' },
    };

    const role = roleMap[dm] || { primary: '조화 담당자', secondary: '지원자' };

    // 강점
    const strengthsMap: Record<string, string[]> = {
      wood: ['새로운 시작을 이끔', '성장 방향 제시', '유연한 대처'],
      fire: ['팀 에너지 활성화', '빠른 결정력', '열정 전파'],
      earth: ['갈등 중재', '꾸준한 실행', '안정감 제공'],
      metal: ['명확한 기준 제시', '효율적 진행', '결과 도출'],
      water: ['깊은 분석력', '숨은 문제 발견', '지혜로운 조언'],
    };

    // 해당 멤버의 쌍별 결과 분석
    const memberPairs = pairwiseResults.filter(
      p => p.member1Id === member.id || p.member2Id === member.id
    );

    const compatibleWith = memberPairs
      .filter(p => p.relationship === 'excellent' || p.relationship === 'good')
      .map(p => p.member1Id === member.id ? p.member2Name : p.member1Name);

    const needsAttentionWith = memberPairs
      .filter(p => p.relationship === 'challenging')
      .map(p => p.member1Id === member.id ? p.member2Name : p.member1Name);

    // 도전 과제
    const challengeMap: Record<string, string[]> = {
      wood: ['성급한 추진으로 갈등 유발 가능', '너무 많은 아이디어로 집중 분산'],
      fire: ['다른 의견 무시 가능성', '급한 성격으로 충돌'],
      earth: ['변화에 느린 적응', '우유부단해 보일 수 있음'],
      metal: ['융통성 부족으로 갈등', '지나친 비판'],
      water: ['결정 회피 경향', '감정적 영향 받음'],
    };

    return {
      memberId: member.id,
      memberName: member.name,
      primaryRole: role.primary,
      secondaryRole: role.secondary,
      strengthsInGroup: strengthsMap[dm] || ['조화로운 협력'],
      potentialChallenges: challengeMap[dm] || ['특별한 주의사항 없음'],
      compatibleWith,
      needsAttentionWith,
    };
  });
}

// ============================================================
// 그룹 점성학 궁합 분석
// ============================================================

export interface GroupAstrologyAnalysis {
  groupSize: number;
  pairwiseResults: PairwiseCompatibility[];
  elementDistribution: {
    element: string;
    count: number;
    percentage: number;
    members: string[];
  }[];
  modalityDistribution: {
    modality: string;
    count: number;
    members: string[];
  }[];
  groupEnergy: {
    dominantElement: string;
    dominantModality: string;
    groupPersonality: string;
    interpretation: string;
  };
  memberRoles: GroupRole[];
  synergyAspects: {
    type: string;
    members: string[];
    description: string;
  }[];
  overallHarmony: number;
  strengths: string[];
  challenges: string[];
  advice: string[];
}

export function analyzeGroupAstrologyCompatibility(members: GroupMember[]): GroupAstrologyAnalysis {
  if (members.length < 2 || members.length > 6) {
    throw new Error('그룹 분석은 2-6명 사이에서 가능합니다');
  }

  const astroMembers = members.filter(m => m.astrologyProfile);
  if (astroMembers.length < 2) {
    throw new Error('점성학 분석을 위해 최소 2명의 점성학 정보가 필요합니다');
  }

  // 1. 쌍별 궁합 분석
  const pairwiseResults: PairwiseCompatibility[] = [];
  for (let i = 0; i < astroMembers.length; i++) {
    for (let j = i + 1; j < astroMembers.length; j++) {
      const m1 = astroMembers[i];
      const m2 = astroMembers[j];

      if (m1.astrologyProfile && m2.astrologyProfile) {
        const analysis = performComprehensiveAstrologyAnalysis(
          m1.astrologyProfile,
          m2.astrologyProfile
        );

        let relationship: PairwiseCompatibility['relationship'];
        if (analysis.overallScore >= 80) {relationship = 'excellent';}
        else if (analysis.overallScore >= 65) {relationship = 'good';}
        else if (analysis.overallScore >= 45) {relationship = 'neutral';}
        else {relationship = 'challenging';}

        pairwiseResults.push({
          member1Id: m1.id,
          member2Id: m2.id,
          member1Name: m1.name,
          member2Name: m2.name,
          astrologyScore: analysis.overallScore,
          combinedScore: analysis.overallScore,
          relationship,
          keyInsight: analysis.summary,
        });
      }
    }
  }

  // 2. 원소 분포 분석
  const elementGroups: Record<string, string[]> = {
    fire: [], earth: [], air: [], water: [],
  };

  for (const member of astroMembers) {
    if (member.astrologyProfile) {
      const sunElement = member.astrologyProfile.sun.element;
      elementGroups[sunElement]?.push(member.name);
    }
  }

  const elementDistribution = Object.entries(elementGroups)
    .map(([element, memberNames]) => ({
      element,
      count: memberNames.length,
      percentage: Math.round((memberNames.length / astroMembers.length) * 100),
      members: memberNames,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. 모달리티 분포 분석
  const modalityGroups: Record<string, string[]> = {
    cardinal: [], fixed: [], mutable: [],
  };

  const signModality: Record<string, string> = {
    Aries: 'cardinal', Taurus: 'fixed', Gemini: 'mutable',
    Cancer: 'cardinal', Leo: 'fixed', Virgo: 'mutable',
    Libra: 'cardinal', Scorpio: 'fixed', Sagittarius: 'mutable',
    Capricorn: 'cardinal', Aquarius: 'fixed', Pisces: 'mutable',
  };

  for (const member of astroMembers) {
    if (member.astrologyProfile) {
      const sunSign = member.astrologyProfile.sun.sign;
      const modality = signModality[sunSign] || 'mutable';
      modalityGroups[modality]?.push(member.name);
    }
  }

  const modalityDistribution = Object.entries(modalityGroups)
    .map(([modality, memberNames]) => ({
      modality,
      count: memberNames.length,
      members: memberNames,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. 그룹 에너지 분석
  const dominantElement = elementDistribution[0].element;
  const dominantModality = modalityDistribution[0].modality;

  const groupPersonalities: Record<string, Record<string, string>> = {
    fire: {
      cardinal: '적극적 선구자 그룹',
      fixed: '열정적 지속형 그룹',
      mutable: '다재다능한 모험가 그룹',
    },
    earth: {
      cardinal: '목표 지향적 실행 그룹',
      fixed: '안정적 신뢰 그룹',
      mutable: '유연한 실용주의 그룹',
    },
    air: {
      cardinal: '혁신적 아이디어 그룹',
      fixed: '지적 탐구 그룹',
      mutable: '소통과 연결의 그룹',
    },
    water: {
      cardinal: '감성적 리더십 그룹',
      fixed: '깊은 유대의 그룹',
      mutable: '직관적 협력 그룹',
    },
  };

  const groupPersonality = groupPersonalities[dominantElement]?.[dominantModality] || '균형 잡힌 그룹';

  const elementInterpretations: Record<string, string> = {
    fire: '열정과 행동력이 넘치는 그룹으로, 새로운 도전에 강합니다',
    earth: '실용적이고 안정적인 그룹으로, 목표 달성에 강합니다',
    air: '아이디어와 소통이 활발한 그룹으로, 지적 협력에 강합니다',
    water: '감정적 유대가 깊은 그룹으로, 직관적 이해에 강합니다',
  };

  // 5. 시너지 Aspects 분석
  const synergyAspects = analyzeGroupSynergyAspects(astroMembers);

  // 6. 멤버 역할 분석
  const memberRoles = analyzeAstroMemberRoles(astroMembers, pairwiseResults);

  // 7. 전체 조화도
  const avgPairScore = pairwiseResults.reduce((sum, p) => sum + p.combinedScore, 0) / pairwiseResults.length;
  const elementBalance = 100 - (elementDistribution[0].percentage - 25) * 2;
  const overallHarmony = Math.round(avgPairScore * 0.7 + Math.max(0, elementBalance) * 0.3);

  // 8. 강점, 도전, 조언
  const strengths: string[] = [];
  const challenges: string[] = [];
  const advice: string[] = [];

  // 최고 궁합 쌍
  const bestPair = pairwiseResults.reduce((best, p) =>
    p.combinedScore > best.combinedScore ? p : best);
  strengths.push(`${bestPair.member1Name}님과 ${bestPair.member2Name}님의 시너지가 뛰어남`);

  // 원소 기반 강점
  if (elementDistribution[0].count >= 2) {
    strengths.push(`${getAstroElementKorean(dominantElement)} 에너지가 강하여 ${elementInterpretations[dominantElement].split(',')[0]}`);
  }

  // 시너지 aspects 기반 강점
  if (synergyAspects.length > 0) {
    strengths.push(synergyAspects[0].description);
  }

  // 도전 과제
  const missingElement = elementDistribution.find(e => e.count === 0);
  if (missingElement) {
    challenges.push(`${getAstroElementKorean(missingElement.element)} 에너지 부족으로 해당 영역 보완 필요`);
  }

  const challengingPairs = pairwiseResults.filter(p => p.relationship === 'challenging');
  if (challengingPairs.length > 0) {
    challenges.push(`${challengingPairs.length}쌍의 관계에서 조율이 필요합니다`);
  }

  // 조언
  const modalityKorean: Record<string, string> = {
    cardinal: '추진력', fixed: '지속력', mutable: '적응력',
  };
  const weakModality = modalityDistribution.find(m => m.count === 0);
  if (weakModality) {
    advice.push(`${modalityKorean[weakModality.modality]}을 의식적으로 개발하세요`);
  }

  advice.push(`그룹의 ${getAstroElementKorean(dominantElement)} 성향을 살려 ${getElementActivity(dominantElement)} 활동이 효과적입니다`);

  return {
    groupSize: astroMembers.length,
    pairwiseResults,
    elementDistribution,
    modalityDistribution,
    groupEnergy: {
      dominantElement,
      dominantModality,
      groupPersonality,
      interpretation: elementInterpretations[dominantElement] || '균형 잡힌 에너지',
    },
    memberRoles,
    synergyAspects,
    overallHarmony,
    strengths,
    challenges,
    advice,
  };
}

function analyzeGroupSynergyAspects(members: GroupMember[]): {
  type: string;
  members: string[];
  description: string;
}[] {
  const aspects: { type: string; members: string[]; description: string }[] = [];

  // 같은 원소 그룹 찾기
  const elementGroups: Record<string, string[]> = {};
  for (const member of members) {
    if (member.astrologyProfile) {
      const el = member.astrologyProfile.sun.element;
      if (!elementGroups[el]) {elementGroups[el] = [];}
      elementGroups[el].push(member.name);
    }
  }

  for (const [element, names] of Object.entries(elementGroups)) {
    if (names.length >= 2) {
      aspects.push({
        type: 'element_harmony',
        members: names,
        description: `${names.join(', ')}님이 같은 ${getAstroElementKorean(element)} 에너지로 자연스러운 조화`,
      });
    }
  }

  // Grand Trine 가능성 체크 (3명이 같은 원소)
  for (const [element, names] of Object.entries(elementGroups)) {
    if (names.length >= 3) {
      aspects.push({
        type: 'grand_trine',
        members: names.slice(0, 3),
        description: `${names.slice(0, 3).join(', ')}님이 Grand Trine을 형성하여 강력한 ${getAstroElementKorean(element)} 시너지`,
      });
    }
  }

  return aspects;
}

function analyzeAstroMemberRoles(
  members: GroupMember[],
  pairwiseResults: PairwiseCompatibility[]
): GroupRole[] {
  return members.map(member => {
    const profile = member.astrologyProfile!;
    const sunElement = profile.sun.element;
    const sunSign = profile.sun.sign;

    // 역할 결정 (태양 원소 기반)
    const roleMap: Record<string, { primary: string; secondary: string }> = {
      fire: { primary: '행동 리더', secondary: '동기 부여자' },
      earth: { primary: '실행 관리자', secondary: '안정 제공자' },
      air: { primary: '아이디어 창출자', secondary: '소통 담당자' },
      water: { primary: '감성 중재자', secondary: '직관적 조언자' },
    };

    const role = roleMap[sunElement] || { primary: '협력자', secondary: '지원자' };

    // 강점
    const strengthsMap: Record<string, string[]> = {
      fire: ['팀 에너지 활성화', '빠른 의사결정 추진', '새로운 방향 제시'],
      earth: ['계획의 실현', '자원 관리', '현실적 조언'],
      air: ['창의적 해결책', '효과적 소통', '네트워크 확장'],
      water: ['팀원 감정 케어', '숨은 문제 감지', '깊은 유대 형성'],
    };

    // 해당 멤버의 쌍별 결과
    const memberPairs = pairwiseResults.filter(
      p => p.member1Id === member.id || p.member2Id === member.id
    );

    const compatibleWith = memberPairs
      .filter(p => p.relationship === 'excellent' || p.relationship === 'good')
      .map(p => p.member1Id === member.id ? p.member2Name : p.member1Name);

    const needsAttentionWith = memberPairs
      .filter(p => p.relationship === 'challenging')
      .map(p => p.member1Id === member.id ? p.member2Name : p.member1Name);

    const challengeMap: Record<string, string[]> = {
      fire: ['성급한 결정으로 충돌', '다른 의견 경청 필요'],
      earth: ['변화 저항', '고집으로 인한 갈등'],
      air: ['실행력 부족', '감정적 깊이 부족'],
      water: ['감정적 휘둘림', '결정 회피'],
    };

    return {
      memberId: member.id,
      memberName: member.name,
      primaryRole: role.primary,
      secondaryRole: role.secondary,
      strengthsInGroup: strengthsMap[sunElement] || ['유연한 협력'],
      potentialChallenges: challengeMap[sunElement] || ['특별한 주의사항 없음'],
      compatibleWith,
      needsAttentionWith,
    };
  });
}

// ============================================================
// 종합 그룹 궁합 분석
// ============================================================

export interface ComprehensiveGroupAnalysis {
  groupSize: number;
  analysisType: 'saju_only' | 'astrology_only' | 'combined';
  sajuAnalysis?: GroupSajuAnalysis;
  astrologyAnalysis?: GroupAstrologyAnalysis;
  combinedPairwiseMatrix: {
    member1: string;
    member2: string;
    score: number;
    relationship: string;
  }[];
  overallGroupScore: number;
  groupGrade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  groupType: string;
  coreStrengths: string[];
  mainChallenges: string[];
  actionableAdvice: string[];
  bestPairs: { names: string; score: number }[];
  needsWorkPairs: { names: string; score: number }[];
}

export function analyzeGroupCompatibility(members: GroupMember[]): ComprehensiveGroupAnalysis {
  if (members.length < 2) {
    throw new Error('최소 2명의 멤버가 필요합니다');
  }

  const hasSaju = members.some(m => m.sajuProfile);
  const hasAstrology = members.some(m => m.astrologyProfile);

  let sajuAnalysis: GroupSajuAnalysis | undefined;
  let astrologyAnalysis: GroupAstrologyAnalysis | undefined;
  let analysisType: ComprehensiveGroupAnalysis['analysisType'] = 'combined';

  // 사주 분석
  if (hasSaju && members.filter(m => m.sajuProfile).length >= 2) {
    try {
      sajuAnalysis = analyzeGroupSajuCompatibility(members);
    } catch (e) {
      // 사주 분석 실패 시 무시
    }
  }

  // 점성학 분석
  if (hasAstrology && members.filter(m => m.astrologyProfile).length >= 2) {
    try {
      astrologyAnalysis = analyzeGroupAstrologyCompatibility(members);
    } catch (e) {
      // 점성학 분석 실패 시 무시
    }
  }

  if (sajuAnalysis && !astrologyAnalysis) {analysisType = 'saju_only';}
  else if (!sajuAnalysis && astrologyAnalysis) {analysisType = 'astrology_only';}
  else if (sajuAnalysis && astrologyAnalysis) {analysisType = 'combined';}

  // 종합 쌍별 매트릭스
  const combinedPairwiseMatrix: ComprehensiveGroupAnalysis['combinedPairwiseMatrix'] = [];
  const pairScores: Map<string, number[]> = new Map();

  // 사주 쌍별 점수 수집
  if (sajuAnalysis) {
    for (const pair of sajuAnalysis.pairwiseResults) {
      const key = [pair.member1Name, pair.member2Name].sort().join('-');
      if (!pairScores.has(key)) {pairScores.set(key, []);}
      pairScores.get(key)!.push(pair.sajuScore || pair.combinedScore);
    }
  }

  // 점성학 쌍별 점수 수집
  if (astrologyAnalysis) {
    for (const pair of astrologyAnalysis.pairwiseResults) {
      const key = [pair.member1Name, pair.member2Name].sort().join('-');
      if (!pairScores.has(key)) {pairScores.set(key, []);}
      pairScores.get(key)!.push(pair.astrologyScore || pair.combinedScore);
    }
  }

  // 평균 점수로 매트릭스 생성
  for (const [key, scores] of pairScores) {
    const [m1, m2] = key.split('-');
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let relationship = 'neutral';
    if (avgScore >= 80) {relationship = 'excellent';}
    else if (avgScore >= 65) {relationship = 'good';}
    else if (avgScore < 45) {relationship = 'challenging';}

    combinedPairwiseMatrix.push({
      member1: m1,
      member2: m2,
      score: avgScore,
      relationship,
    });
  }

  // 전체 그룹 점수
  const sajuScore = sajuAnalysis?.overallHarmony || 0;
  const astroScore = astrologyAnalysis?.overallHarmony || 0;

  let overallGroupScore: number;
  if (analysisType === 'combined') {
    overallGroupScore = Math.round(sajuScore * 0.5 + astroScore * 0.5);
  } else if (analysisType === 'saju_only') {
    overallGroupScore = sajuScore;
  } else {
    overallGroupScore = astroScore;
  }

  // 등급
  let groupGrade: ComprehensiveGroupAnalysis['groupGrade'];
  if (overallGroupScore >= 90) {groupGrade = 'S+';}
  else if (overallGroupScore >= 80) {groupGrade = 'S';}
  else if (overallGroupScore >= 70) {groupGrade = 'A';}
  else if (overallGroupScore >= 60) {groupGrade = 'B';}
  else if (overallGroupScore >= 45) {groupGrade = 'C';}
  else {groupGrade = 'D';}

  // 그룹 타입 결정
  let groupType = '';
  if (sajuAnalysis && astrologyAnalysis) {
    const sajuDominant = sajuAnalysis.groupDynamics.dominantElement;
    const astroDominant = astrologyAnalysis.groupEnergy.dominantElement;

    if (sajuDominant === normalizeToAstroElement(astroDominant) ||
        astroDominant === normalizeToSajuElement(sajuDominant)) {
      groupType = `일관된 ${getElementKorean(sajuDominant)} 에너지의 그룹`;
    } else {
      groupType = `${getElementKorean(sajuDominant)}(사주)와 ${getAstroElementKorean(astroDominant)}(점성)의 복합 에너지 그룹`;
    }
  } else if (sajuAnalysis) {
    groupType = sajuAnalysis.groupDynamics.interpretation;
  } else if (astrologyAnalysis) {
    groupType = astrologyAnalysis.groupEnergy.groupPersonality;
  }

  // 핵심 강점 종합
  const coreStrengths: string[] = [];
  if (sajuAnalysis) {coreStrengths.push(...sajuAnalysis.strengths.slice(0, 2));}
  if (astrologyAnalysis) {coreStrengths.push(...astrologyAnalysis.strengths.slice(0, 2));}

  // 주요 도전 종합
  const mainChallenges: string[] = [];
  if (sajuAnalysis) {mainChallenges.push(...sajuAnalysis.challenges.slice(0, 2));}
  if (astrologyAnalysis) {mainChallenges.push(...astrologyAnalysis.challenges.slice(0, 2));}

  // 실행 가능한 조언
  const actionableAdvice: string[] = [];
  if (sajuAnalysis) {actionableAdvice.push(...sajuAnalysis.advice.slice(0, 2));}
  if (astrologyAnalysis) {actionableAdvice.push(...astrologyAnalysis.advice.slice(0, 2));}

  // 최고 궁합 쌍
  const sortedPairs = [...combinedPairwiseMatrix].sort((a, b) => b.score - a.score);
  const bestPairs = sortedPairs
    .slice(0, Math.min(3, sortedPairs.length))
    .map(p => ({ names: `${p.member1} & ${p.member2}`, score: p.score }));

  // 개선 필요 쌍
  const needsWorkPairs = sortedPairs
    .filter(p => p.score < 50)
    .slice(0, 2)
    .map(p => ({ names: `${p.member1} & ${p.member2}`, score: p.score }));

  return {
    groupSize: members.length,
    analysisType,
    sajuAnalysis,
    astrologyAnalysis,
    combinedPairwiseMatrix,
    overallGroupScore,
    groupGrade,
    groupType,
    coreStrengths,
    mainChallenges,
    actionableAdvice,
    bestPairs,
    needsWorkPairs,
  };
}

// ============================================================
// 헬퍼 함수들
// ============================================================

function normalizeElement(element: string): string {
  const mapping: Record<string, string> = {
    '목': 'wood', '木': 'wood', 'wood': 'wood',
    '화': 'fire', '火': 'fire', 'fire': 'fire',
    '토': 'earth', '土': 'earth', 'earth': 'earth',
    '금': 'metal', '金': 'metal', 'metal': 'metal',
    '수': 'water', '水': 'water', 'water': 'water',
  };
  return mapping[element.toLowerCase()] || element.toLowerCase();
}

function getElementKorean(element: string): string {
  const map: Record<string, string> = {
    wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
  };
  return map[element] || element;
}

function getAstroElementKorean(element: string): string {
  const map: Record<string, string> = {
    fire: '불(Fire)', earth: '흙(Earth)', air: '공기(Air)', water: '물(Water)',
  };
  return map[element] || element;
}

function getElementStrength(element: string): string {
  const map: Record<string, string> = {
    wood: '새로운 시작과 성장에 강합니다',
    fire: '열정과 추진력으로 목표 달성에 강합니다',
    earth: '안정적인 기반과 실행에 강합니다',
    metal: '결단력과 효율성에 강합니다',
    water: '지혜와 유연한 대처에 강합니다',
  };
  return map[element] || '균형 잡힌 역량을 보입니다';
}

function getElementActivity(element: string): string {
  const map: Record<string, string> = {
    fire: '야외 활동, 스포츠, 파티',
    earth: '등산, 캠핑, 요리',
    air: '토론, 여행, 소셜 이벤트',
    water: '명상, 예술 감상, 수상 활동',
  };
  return map[element] || '다양한';
}

function normalizeToAstroElement(sajuElement: string): string {
  const map: Record<string, string> = {
    wood: 'air', fire: 'fire', earth: 'earth', metal: 'earth', water: 'water',
  };
  return map[sajuElement] || sajuElement;
}

function normalizeToSajuElement(astroElement: string): string {
  const map: Record<string, string> = {
    fire: 'fire', earth: 'earth', air: 'wood', water: 'water',
  };
  return map[astroElement] || astroElement;
}
