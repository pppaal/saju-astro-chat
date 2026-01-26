// src/lib/Saju/sibsinAnalysis.ts
// 십신(십성) 심층 분석 모듈 - 200% 급 상호작용 패턴 분석

import { FiveElement } from './types';
import { JIJANGGAN } from './constants';
import { getStemElement } from './stemBranchUtils';

// ============================================================
// 타입 정의
// ============================================================

export const SIBSIN_TYPES = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'
] as const;

export type SibsinType = typeof SIBSIN_TYPES[number];
export type SibsinCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

interface Pillar { stem: string; branch: string; }
interface SajuPillars { year: Pillar; month: Pillar; day: Pillar; hour: Pillar; }

export interface SibsinPosition {
  position: '년간' | '월간' | '시간' | '년지장간' | '월지장간' | '일지장간' | '시지장간';
  sibsin: SibsinType;
  stem: string;
  hidden?: boolean;
}

export interface SibsinCount {
  비견: number; 겁재: number; 식신: number; 상관: number; 편재: number;
  정재: number; 편관: number; 정관: number; 편인: number; 정인: number;
}

export interface SibsinCategoryCount {
  비겁: number; 식상: number; 재성: number; 관성: number; 인성: number;
}

export interface SibsinPattern {
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
  implications: string[];
}

export interface SibsinInteraction {
  type: '생' | '극';
  from: SibsinType;
  to: SibsinType;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CareerAptitude {
  field: string;
  score: number;
  sibsinBasis: SibsinType[];
  description: string;
}

export interface RelationshipPattern {
  type: '부모' | '배우자' | '자녀' | '형제' | '친구' | '상사';
  sibsin: SibsinType;
  quality: 'excellent' | 'good' | 'neutral' | 'challenging';
  description: string;
}

export interface SibsinComprehensiveAnalysis {
  positions: SibsinPosition[];
  count: SibsinCount;
  categoryCount: SibsinCategoryCount;
  dominantSibsin: SibsinType[];
  missingSibsin: SibsinType[];
  patterns: SibsinPattern[];
  interactions: SibsinInteraction[];
  careerAptitudes: CareerAptitude[];
  relationships: RelationshipPattern[];
  personality: string[];
  strengths: string[];
  weaknesses: string[];
  lifeThemes: string[];
  advice: string[];
}

// ============================================================
// 음양 데이터
// ============================================================

const STEM_YIN_YANG: Record<string, '양' | '음'> = {
  '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
  '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'
};

// ============================================================
// 십신 계산 함수
// ============================================================

function getSibsin(dayStem: string, targetStem: string): SibsinType {
  const dayElement = getStemElement(dayStem);
  const targetElement = getStemElement(targetStem);
  const dayYinYang = STEM_YIN_YANG[dayStem];
  const targetYinYang = STEM_YIN_YANG[targetStem];
  const samePolarity = dayYinYang === targetYinYang;

  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const dayIdx = elements.indexOf(dayElement);
  const targetIdx = elements.indexOf(targetElement);

  const diff = (targetIdx - dayIdx + 5) % 5;
  const baseIndex = diff * 2;
  const sibsinIndex = samePolarity ? baseIndex : baseIndex + 1;

  return SIBSIN_TYPES[sibsinIndex];
}

function getSibsinCategory(sibsin: SibsinType): SibsinCategory {
  if (sibsin === '비견' || sibsin === '겁재') {return '비겁';}
  if (sibsin === '식신' || sibsin === '상관') {return '식상';}
  if (sibsin === '편재' || sibsin === '정재') {return '재성';}
  if (sibsin === '편관' || sibsin === '정관') {return '관성';}
  return '인성';
}

// ============================================================
// 십신 위치 분석
// ============================================================

export function analyzeSibsinPositions(pillars: SajuPillars): SibsinPosition[] {
  const positions: SibsinPosition[] = [];
  const dayStem = pillars.day.stem;

  // 천간 분석
  const pillarData: { position: SibsinPosition['position']; stem: string }[] = [
    { position: '년간', stem: pillars.year.stem },
    { position: '월간', stem: pillars.month.stem },
    { position: '시간', stem: pillars.hour.stem }
  ];

  for (const p of pillarData) {
    positions.push({ position: p.position, sibsin: getSibsin(dayStem, p.stem), stem: p.stem, hidden: false });
  }

  // 지장간 분석
  const branchData: { position: SibsinPosition['position']; branch: string }[] = [
    { position: '년지장간', branch: pillars.year.branch },
    { position: '월지장간', branch: pillars.month.branch },
    { position: '일지장간', branch: pillars.day.branch },
    { position: '시지장간', branch: pillars.hour.branch }
  ];

  for (const b of branchData) {
    const jijangganData = JIJANGGAN[b.branch];
    if (jijangganData) {
      // 정기만 사용
      const mainStem = jijangganData['정기'];
      if (mainStem) {
        positions.push({ position: b.position, sibsin: getSibsin(dayStem, mainStem), stem: mainStem, hidden: true });
      }
    }
  }

  return positions;
}

// ============================================================
// 십신 개수 계산
// ============================================================

export function countSibsin(positions: SibsinPosition[]): SibsinCount {
  const count: SibsinCount = {
    비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
    정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0
  };
  for (const pos of positions) { count[pos.sibsin]++; }
  return count;
}

export function countSibsinByCategory(count: SibsinCount): SibsinCategoryCount {
  return {
    비겁: count.비견 + count.겁재, 식상: count.식신 + count.상관,
    재성: count.편재 + count.정재, 관성: count.편관 + count.정관,
    인성: count.편인 + count.정인
  };
}

// ============================================================
// 십신 패턴 분석
// ============================================================

export function analyzeSibsinPatterns(count: SibsinCount, categoryCount: SibsinCategoryCount): SibsinPattern[] {
  const patterns: SibsinPattern[] = [];

  if (categoryCount.비겁 >= 4) {
    patterns.push({
      name: '비겁과다', description: '자아가 강하고 독립심이 높음', strength: 'strong',
      implications: ['자기주장이 강함', '형제자매와의 경쟁', '재물 지키기 어려움', '리더십 있으나 협동 어려움']
    });
  }

  if (categoryCount.식상 >= 4) {
    patterns.push({
      name: '식상과다', description: '표현력과 창의력이 뛰어남', strength: 'strong',
      implications: ['예술적 재능', '자유로운 사고', '지나친 비판 기질', '에너지 소모가 많음']
    });
  }

  if (categoryCount.재성 >= 4) {
    patterns.push({
      name: '재성과다', description: '재물에 대한 욕심과 현실 감각', strength: 'strong',
      implications: ['사업 수완', '물질적 성공 추구', '부친/배우자와 갈등 가능', '물질 중시']
    });
  }

  if (categoryCount.관성 >= 4) {
    patterns.push({
      name: '관살혼잡', description: '권위와 책임감이 과다함', strength: 'strong',
      implications: ['직업적 압박감', '사회적 지위 집착', '자유로운 표현 억압', '권위에 두려움/반발']
    });
  }

  if (categoryCount.인성 >= 4) {
    patterns.push({
      name: '인성과다', description: '학문적 성향과 의존성', strength: 'strong',
      implications: ['학습 능력 우수', '어머니 영향력 큼', '결정 장애', '실천력보다 이론 치중']
    });
  }

  if (categoryCount.비겁 + categoryCount.인성 >= 5) {
    patterns.push({
      name: '신강사주', description: '자아가 강하고 독립적', strength: 'strong',
      implications: ['자기 주도적 삶', '재성/관성 운에서 발복', '적극적 도전 정신']
    });
  }

  if (categoryCount.식상 + categoryCount.재성 + categoryCount.관성 >= 6) {
    patterns.push({
      name: '신약사주', description: '외부 환경에 영향 받기 쉬움', strength: 'strong',
      implications: ['인성/비겁 운에서 발복', '협력과 지원 중요', '건강 관리 필요']
    });
  }

  if (count.식신 >= 2 && count.편관 >= 2) {
    patterns.push({
      name: '식신제살', description: '식신이 편관(살)을 제어함', strength: 'moderate',
      implications: ['위기 상황에서 지혜 발휘', '어려움을 기회로 전환', '창의적 문제 해결']
    });
  }

  const values = Object.values(categoryCount);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max - min <= 2 && max <= 3) {
    patterns.push({
      name: '균형사주', description: '오행과 십신이 균형을 이룸', strength: 'moderate',
      implications: ['다재다능', '적응력 뛰어남', '안정적인 인생']
    });
  }

  return patterns;
}

// ============================================================
// 십신 상호작용 분석
// ============================================================

const SIBSIN_INTERACTIONS_MAP: Record<SibsinCategory, { generates: SibsinCategory; controls: SibsinCategory }> = {
  비겁: { generates: '식상', controls: '재성' },
  식상: { generates: '재성', controls: '관성' },
  재성: { generates: '관성', controls: '인성' },
  관성: { generates: '인성', controls: '비겁' },
  인성: { generates: '비겁', controls: '식상' }
};

export function analyzeSibsinInteractions(positions: SibsinPosition[]): SibsinInteraction[] {
  const interactions: SibsinInteraction[] = [];
  const sibsinSet = new Set<SibsinType>();
  for (const p of positions) { sibsinSet.add(p.sibsin); }
  const presentSibsins = Array.from(sibsinSet);

  for (const sibsin of presentSibsins) {
    const category = getSibsinCategory(sibsin);
    const generates = SIBSIN_INTERACTIONS_MAP[category].generates;
    const controls = SIBSIN_INTERACTIONS_MAP[category].controls;

    for (const targetSibsin of presentSibsins) {
      const targetCategory = getSibsinCategory(targetSibsin);
      if (targetCategory === generates) {
        interactions.push({
          type: '생', from: sibsin, to: targetSibsin,
          description: `${sibsin}이(가) ${targetSibsin}을(를) 생함`, impact: 'positive'
        });
      }
      if (targetCategory === controls) {
        interactions.push({
          type: '극', from: sibsin, to: targetSibsin,
          description: `${sibsin}이(가) ${targetSibsin}을(를) 극함`, impact: 'neutral'
        });
      }
    }
  }

  return interactions;
}

// ============================================================
// 직업 적성 분석
// ============================================================

export function analyzeCareerAptitude(count: SibsinCount, categoryCount: SibsinCategoryCount): CareerAptitude[] {
  const aptitudes: CareerAptitude[] = [];

  if (categoryCount.관성 >= 2) {
    aptitudes.push({ field: '공직/관리직', score: 70 + (categoryCount.관성 * 10), sibsinBasis: ['정관'], description: '조직 내 승진과 관리' });
    aptitudes.push({ field: '법률/행정', score: 65 + (categoryCount.관성 * 8), sibsinBasis: ['정관', '편관'], description: '규율과 질서' });
  }

  if (categoryCount.재성 >= 2) {
    aptitudes.push({ field: '사업/경영', score: 70 + (categoryCount.재성 * 10), sibsinBasis: ['편재'], description: '재물 운용' });
    aptitudes.push({ field: '금융/투자', score: 65 + (categoryCount.재성 * 8), sibsinBasis: ['편재'], description: '자금 운용' });
  }

  if (categoryCount.식상 >= 2) {
    aptitudes.push({ field: '예술/창작', score: 70 + (categoryCount.식상 * 10), sibsinBasis: ['식신', '상관'], description: '창의적 표현' });
    aptitudes.push({ field: '요식/서비스업', score: 60 + (count.식신 * 15), sibsinBasis: ['식신'], description: '음식과 서비스' });
  }

  if (categoryCount.인성 >= 2) {
    aptitudes.push({ field: '교육/학술', score: 70 + (categoryCount.인성 * 10), sibsinBasis: ['정인', '편인'], description: '가르치고 연구' });
    aptitudes.push({ field: '의료/상담', score: 65 + (categoryCount.인성 * 8), sibsinBasis: ['정인'], description: '돌봄과 치유' });
  }

  if (categoryCount.비겁 >= 2) {
    aptitudes.push({ field: '스포츠/체육', score: 60 + (categoryCount.비겁 * 10), sibsinBasis: ['비견', '겁재'], description: '경쟁과 신체 활동' });
    aptitudes.push({ field: '프리랜서/자영업', score: 65 + (categoryCount.비겁 * 8), sibsinBasis: ['비견'], description: '독립적 업무' });
  }

  return aptitudes.sort((a, b) => b.score - a.score);
}

// ============================================================
// 인간관계 패턴 분석
// ============================================================

export function analyzeRelationshipPatterns(count: SibsinCount, categoryCount: SibsinCategoryCount): RelationshipPattern[] {
  const patterns: RelationshipPattern[] = [];

  if (categoryCount.인성 >= 2) {
    patterns.push({ type: '부모', sibsin: '정인', quality: 'good', description: '어머니의 영향력이 크며, 부모의 지원을 받음' });
  } else if (categoryCount.인성 === 0) {
    patterns.push({ type: '부모', sibsin: '정인', quality: 'challenging', description: '부모와의 인연이 약하거나 일찍 독립' });
  }

  if (categoryCount.재성 >= 2) {
    patterns.push({ type: '배우자', sibsin: '정재', quality: count.정재 >= 2 ? 'excellent' : 'good', description: count.정재 >= 2 ? '안정적인 결혼 생활' : '배우자와의 인연이 강함' });
  }

  if (categoryCount.식상 >= 2) {
    patterns.push({ type: '자녀', sibsin: '식신', quality: count.식신 >= 2 ? 'excellent' : 'good', description: '자녀와의 인연이 깊음' });
  }

  if (categoryCount.비겁 >= 2) {
    patterns.push({ type: '형제', sibsin: '비견', quality: count.비견 >= 2 ? 'good' : 'neutral', description: count.비견 >= 2 ? '형제자매와의 협력' : '형제간 경쟁 가능' });
    patterns.push({ type: '친구', sibsin: '비견', quality: 'good', description: '동료와 친구 관계가 활발함' });
  }

  if (categoryCount.관성 >= 1) {
    patterns.push({ type: '상사', sibsin: count.정관 >= count.편관 ? '정관' : '편관', quality: count.정관 >= count.편관 ? 'good' : 'challenging', description: count.정관 >= count.편관 ? '상사의 인정과 지원' : '상사와의 갈등 가능성' });
  }

  return patterns;
}

// ============================================================
// 성격 특성 분석
// ============================================================

export function analyzePersonality(count: SibsinCount, categoryCount: SibsinCategoryCount): string[] {
  const traits: string[] = [];

  if (categoryCount.비겁 >= 3) {
    traits.push('독립심이 강하고 자기주장이 확실함');
    traits.push('경쟁심이 있으며 승부욕이 강함');
  }

  if (count.식신 >= 2) {
    traits.push('온화하고 낙천적인 성격');
    traits.push('표현력이 풍부함');
  }
  if (count.상관 >= 2) {
    traits.push('날카로운 비판력과 창의성');
    traits.push('기존 질서에 대한 반발 기질');
  }

  if (count.정재 >= 2) {
    traits.push('꼼꼼하고 계획적인 성격');
    traits.push('안정을 추구하며 현실적');
  }
  if (count.편재 >= 2) {
    traits.push('활동적이고 사교적인 성격');
    traits.push('모험심이 있음');
  }

  if (count.정관 >= 2) {
    traits.push('책임감이 강하고 원칙적');
  }
  if (count.편관 >= 2) {
    traits.push('결단력과 추진력이 강함');
  }

  if (count.정인 >= 2) {
    traits.push('학구적이고 사려 깊은 성격');
  }
  if (count.편인 >= 2) {
    traits.push('직관적이고 통찰력이 있음');
  }

  return traits;
}

// ============================================================
// 종합 분석 함수
// ============================================================

export function analyzeSibsinComprehensive(pillars: SajuPillars): SibsinComprehensiveAnalysis {
  const positions = analyzeSibsinPositions(pillars);
  const count = countSibsin(positions);
  const categoryCount = countSibsinByCategory(count);

  const dominantSibsin: SibsinType[] = [];
  const missingSibsin: SibsinType[] = [];

  for (const sibsin of SIBSIN_TYPES) {
    if (count[sibsin] >= 2) {dominantSibsin.push(sibsin);}
    if (count[sibsin] === 0) {missingSibsin.push(sibsin);}
  }

  const patterns = analyzeSibsinPatterns(count, categoryCount);
  const interactions = analyzeSibsinInteractions(positions);
  const careerAptitudes = analyzeCareerAptitude(count, categoryCount);
  const relationships = analyzeRelationshipPatterns(count, categoryCount);
  const personality = analyzePersonality(count, categoryCount);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (categoryCount.비겁 >= 2) {strengths.push('강한 자아와 독립심');}
  else if (categoryCount.비겁 === 0) {weaknesses.push('주체성 부족');}

  if (categoryCount.식상 >= 2) {strengths.push('창의력과 표현력');}
  else if (categoryCount.식상 === 0) {weaknesses.push('자기표현의 어려움');}

  if (categoryCount.재성 >= 2) {strengths.push('재물 관리와 현실 감각');}
  else if (categoryCount.재성 === 0) {weaknesses.push('재물 운용의 어려움');}

  if (categoryCount.관성 >= 2) {strengths.push('사회적 성취와 책임감');}
  else if (categoryCount.관성 === 0) {weaknesses.push('사회적 인정 부족 가능');}

  if (categoryCount.인성 >= 2) {strengths.push('학습 능력과 분석력');}
  else if (categoryCount.인성 === 0) {weaknesses.push('지원자 부족');}

  const lifeThemes: string[] = [];
  if (dominantSibsin.includes('정관') || dominantSibsin.includes('편관')) {lifeThemes.push('직업과 사회적 성취');}
  if (dominantSibsin.includes('정재') || dominantSibsin.includes('편재')) {lifeThemes.push('재물과 경제적 안정');}
  if (dominantSibsin.includes('식신') || dominantSibsin.includes('상관')) {lifeThemes.push('창작과 자기표현');}
  if (dominantSibsin.includes('정인') || dominantSibsin.includes('편인')) {lifeThemes.push('학문과 정신적 성장');}
  if (dominantSibsin.includes('비견') || dominantSibsin.includes('겁재')) {lifeThemes.push('독립과 자기 확립');}

  const advice: string[] = [];
  for (const missing of missingSibsin.slice(0, 2)) {
    const category = getSibsinCategory(missing);
    if (category === '비겁') {advice.push('자기 주장과 독립심을 키우세요');}
    else if (category === '식상') {advice.push('창의적 표현과 취미 활동을 늘리세요');}
    else if (category === '재성') {advice.push('재테크와 경제 관념을 길러세요');}
    else if (category === '관성') {advice.push('사회적 책임감과 직업 의식을 높이세요');}
    else if (category === '인성') {advice.push('학습과 자기계발에 투자하세요');}
  }

  return {
    positions, count, categoryCount, dominantSibsin, missingSibsin,
    patterns, interactions, careerAptitudes, relationships, personality,
    strengths, weaknesses, lifeThemes, advice
  };
}
